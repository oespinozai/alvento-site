import importlib
import json
import pytest
from engine import sign

@pytest.fixture
def app(tmp_path, monkeypatch):
    monkeypatch.setenv('ARREARS_DB',str(tmp_path/'api.sqlite3'))
    monkeypatch.setenv('ARREARS_STRIPE_TEST_SECRET','external_test_secret')
    import app
    importlib.reload(app)
    return app


def test_public_flow_and_authorization(app):
    client=app.app.test_client()
    assert client.get('/state').status_code==401
    data=client.post('/session').get_json(); token=data['token']; headers={'Authorization':'Bearer '+token}
    assert len(data['invoices'])==7
    assert len(client.post('/action',json={'action':'run'},headers=headers).get_json()['outbox'])==6
    paid=client.post('/action',json={'action':'pay'},headers=headers).get_json()
    assert next(i for i in paid['invoices'] if i['id']=='1200')['status']=='paid'
    assert 'Repeated event ignored' in client.post('/action',json={'action':'pay'},headers=headers).get_json()['message']
    assert client.post('/action',json={'action':'bad'},headers=headers).status_code==400
    assert client.post('/action',json=[],headers=headers).status_code==400
    assert client.get('/state',headers=headers).headers['Cache-Control']=='no-store'


def test_actual_http_webhook_route(app):
    client=app.app.test_client(); token=client.post('/session').get_json()['token']
    payload=json.dumps(app.ledger.event(token)).encode(); url='/webhook/'+token
    assert client.post(url,data=payload).status_code==400
    assert client.post(url,data=payload,headers={'Stripe-Signature':sign(payload,app.SIM_SECRET)}).status_code==400
    response=client.post(url,data=payload,headers={'Stripe-Signature':sign(payload,'external_test_secret')})
    assert response.status_code==200
    assert response.get_json()['outcome']=='paid'
    assert client.post(url,data=payload,headers={'Stripe-Signature':sign(payload,'external_test_secret')}).get_json()['outcome']=='duplicate'


def test_webhook_disabled_without_external_secret(app,monkeypatch):
    monkeypatch.setattr(app,'STRIPE_SECRET',None)
    assert app.app.test_client().post('/webhook/test',data=b'{}').status_code==503
