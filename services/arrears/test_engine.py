import copy
import json
import time
from concurrent.futures import ThreadPoolExecutor
import pytest
import stripe
from engine import Ledger, receive, sign

@pytest.fixture
def ledger(tmp_path):
    return Ledger(tmp_path/'ledger.sqlite3')


def test_cadence_persistence_and_payment_stop(ledger):
    token = ledger.create()
    initial = ledger.snapshot(token)
    assert [i['days'] for i in initial['invoices']] == [0,7,14,21,28,35,42]
    assert ledger.run(token) == 6
    assert ledger.run(token) == 0
    assert len(Ledger(ledger.path).snapshot(token)['outbox']) == 6
    assert ledger.reconcile(token, ledger.event(token)) == 'paid'
    assert ledger.reconcile(token, ledger.event(token)) == 'duplicate'
    assert ledger.run(token, 7) == 4
    state = ledger.snapshot(token)
    assert next(i for i in state['invoices'] if i['id']=='1200')['status'] == 'paid'
    assert len([e for e in state['outbox'] if e['invoice']=='1200']) == 1
    assert state['date'] == '2026-10-11'


def test_six_stages_and_beyond_day_42(ledger):
    token=ledger.create()
    for expected in (7,14,21,28,35,42):
        ledger.run(token)
        assert max(e['stage'] for e in ledger.snapshot(token)['outbox'] if e['invoice']=='1100') == expected
        ledger.run(token,7)
    assert ledger.run(token)==0
    assert len([e for e in ledger.snapshot(token)['outbox'] if e['invoice']=='1100'])==6
    with pytest.raises(ValueError): ledger.run(token,7)


def test_before_threshold_and_catchup(ledger):
    token=ledger.create()
    with ledger.db() as db:
        db.execute("UPDATE invoices SET due='2026-09-28' WHERE session=? AND id='1100'",(token,))
    ledger.run(token)
    assert not any(e['invoice']=='1100' for e in ledger.snapshot(token)['outbox'])
    with ledger.db() as db:
        db.execute('UPDATE sessions SET offset=22 WHERE token=?',(token,))
    ledger.run(token)
    messages=[e for e in ledger.snapshot(token)['outbox'] if e['invoice']=='1100']
    assert [e['stage'] for e in messages]==[28]


@pytest.mark.parametrize('field,value', [('currency','usd'),('amount_received',1),('customer','cus_wrong'),('metadata',{'invoice_id':'9999'})])
def test_mismatch_never_marks_paid(ledger,field,value):
    token=ledger.create(); event=ledger.event(token)
    event['data']['object'][field]=value
    assert ledger.reconcile(token,event)=='unmatched'
    assert next(i for i in ledger.snapshot(token)['invoices'] if i['id']=='1200')['status']=='unpaid'


def test_ambiguous_match_held_for_review(ledger):
    token=ledger.create(); event=ledger.event(token)
    event['data']['object']['metadata']={}
    with ledger.db() as db:
        db.execute("UPDATE invoices SET customer='cus_mock_2',amount=150000 WHERE session=? AND id='1300'",(token,))
    assert ledger.reconcile(token,event)=='unmatched'


def test_different_event_same_payment(ledger):
    token=ledger.create(); event=ledger.event(token)
    assert ledger.reconcile(token,event)=='paid'
    event['id']='evt_retry_new_id'
    event['data']['object'].update(customer='cus_mock_3',amount_received=200000,metadata={'invoice_id':'1300'})
    assert ledger.reconcile(token,event)=='duplicate_payment'
    assert next(i for i in ledger.snapshot(token)['invoices'] if i['id']=='1300')['status']=='unpaid'


def test_signed_webhook_and_bad_signatures(ledger):
    token=ledger.create(); payload=json.dumps(ledger.event(token)).encode(); secret='test_only_secret'
    with pytest.raises(stripe.SignatureVerificationError): receive(ledger,token,payload,sign(payload,'wrong'),secret)
    with pytest.raises(stripe.SignatureVerificationError): receive(ledger,token,payload,sign(payload,secret,int(time.time())-600),secret)
    with pytest.raises(stripe.SignatureVerificationError): receive(ledger,token,payload+b' ',sign(payload,secret),secret)
    assert receive(ledger,token,payload,sign(payload,secret),secret)=='paid'
    assert receive(ledger,token,payload,sign(payload,secret),secret)=='duplicate'


def test_live_events_rejected(ledger):
    token=ledger.create(); event=ledger.event(token); event['livemode']=True
    with pytest.raises(ValueError): ledger.reconcile(token,event)


def test_concurrent_cycles_and_sessions(ledger):
    a=ledger.create(); b=ledger.create()
    with ThreadPoolExecutor(max_workers=8) as pool:
        counts=list(pool.map(lambda _: ledger.run(a),range(8)))
    assert sum(counts)==6
    ledger.reconcile(a,ledger.event(a))
    assert next(i for i in ledger.snapshot(b)['invoices'] if i['id']=='1200')['status']=='unpaid'
    assert ledger.snapshot(b)['outbox']==[]


def test_expiry(ledger):
    token=ledger.create()
    with ledger.db() as db: db.execute('UPDATE sessions SET created=0 WHERE token=?',(token,))
    with pytest.raises(LookupError): ledger.snapshot(token)
    ledger.create()
    with ledger.db() as db: assert db.execute('SELECT count(*) FROM invoices WHERE session=?',(token,)).fetchone()[0]==0
