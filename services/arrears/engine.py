"""Arrears reference build. All records are fictional; delivery is a captured outbox."""
import hashlib
import hmac
import json
import secrets
import sqlite3
import time
from contextlib import contextmanager
from datetime import date, datetime, timedelta, timezone

import stripe

CADENCE = (7, 14, 21, 28, 35, 42)
BASE_DATE = date(2026, 10, 4)
STAGES = {7: 'Gentle reminder', 14: 'Payment check-in', 21: 'Payment date request',
          28: 'Direct request', 35: 'Priority follow-up', 42: 'Final follow-up'}
COPY = {
    7: 'Just checking in on invoice {invoice} for {amount}. Please let us know if you need a copy or have any questions.',
    14: 'Invoice {invoice} for {amount} is now two weeks overdue. Could you confirm when we should expect payment?',
    21: 'Invoice {invoice} for {amount} is now three weeks overdue. Please reply with a payment date, or let us know if anything is holding it up.',
    28: 'Payment for invoice {invoice}, {amount}, is now four weeks overdue. Please arrange payment or reply today with a confirmed payment date.',
    35: 'We are following up again on invoice {invoice} for {amount}, now five weeks overdue. Please prioritise this payment and confirm your plan to settle it.',
    42: 'Invoice {invoice} for {amount} remains unpaid at six weeks overdue. Please reply today with a payment plan or details of any dispute so we can agree the next step.'}


def utcdate():
    return datetime.now(timezone.utc).date()


class Ledger:
    def __init__(self, path):
        self.path = str(path)
        with self.db() as db:
            db.executescript('''
            PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, created REAL NOT NULL,
                anchor TEXT NOT NULL, offset INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS invoices(session TEXT REFERENCES sessions(token) ON DELETE CASCADE,
                id TEXT, client TEXT NOT NULL, customer TEXT NOT NULL, amount INTEGER NOT NULL,
                due TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'unpaid', paid_on TEXT,
                PRIMARY KEY(session,id));
            CREATE TABLE IF NOT EXISTS outbox(session TEXT, invoice TEXT, stage INTEGER,
                subject TEXT NOT NULL, body TEXT NOT NULL, captured_on TEXT NOT NULL,
                PRIMARY KEY(session,invoice,stage),
                FOREIGN KEY(session,invoice) REFERENCES invoices(session,id) ON DELETE CASCADE);
            CREATE TABLE IF NOT EXISTS events(session TEXT REFERENCES sessions(token) ON DELETE CASCADE,
                id TEXT, payment TEXT NOT NULL, outcome TEXT NOT NULL, PRIMARY KEY(session,id));
            CREATE TABLE IF NOT EXISTS activity(id INTEGER PRIMARY KEY, session TEXT REFERENCES sessions(token) ON DELETE CASCADE,
                at TEXT NOT NULL, message TEXT NOT NULL);
            ''')

    @contextmanager
    def db(self):
        db = sqlite3.connect(self.path, timeout=15)
        db.row_factory = sqlite3.Row
        db.execute('PRAGMA foreign_keys=ON')
        try:
            with db:
                yield db
        finally:
            db.close()

    def _session(self, db, token):
        row = db.execute('SELECT * FROM sessions WHERE token=? AND created>?', (token, time.time()-86400)).fetchone()
        if not row:
            raise LookupError('Your demo session has expired. Start a fresh demo.')
        today = BASE_DATE + timedelta(days=row['offset'] + (utcdate()-date.fromisoformat(row['anchor'])).days)
        return row, today

    def _log(self, db, token, today, message):
        db.execute('INSERT INTO activity(session,at,message) VALUES(?,?,?)', (token, str(today), message))

    def create(self):
        token = secrets.token_urlsafe(32)
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            db.execute('DELETE FROM sessions WHERE created<?', (time.time()-86400,))
            if db.execute('SELECT count(*) FROM sessions').fetchone()[0] >= 3000:
                raise ValueError('The demo is busy. Please try again later.')
            db.execute('INSERT INTO sessions(token,created,anchor) VALUES(?,?,?)', (token, time.time(), str(utcdate())))
            clients = ['Example Studio', 'Example Workshop', 'Example Supply', 'Example Design',
                       'Example Print', 'Example Works', 'Example Trading']
            for i, days in enumerate((0, *CADENCE)):
                db.execute('INSERT INTO invoices VALUES(?,?,?,?,?,?,?,?)',
                           (token, str(1000+i*100), clients[i], f'cus_mock_{i}', (i+1)*50000,
                            str(BASE_DATE-timedelta(days=days)), 'paid' if i == 0 else 'unpaid',
                            str(BASE_DATE) if i == 0 else None))
            self._log(db, token, BASE_DATE, 'Mock ledger opened. Invoice #1000 is a seeded paid example.')
        return token

    def snapshot(self, token):
        with self.db() as db:
            _, today = self._session(db, token)
            invoices = []
            for row in db.execute('SELECT * FROM invoices WHERE session=? ORDER BY id', (token,)):
                item = dict(row)
                item.pop('session')
                days = max(0, (today-date.fromisoformat(item['due'])).days)
                stage = max((d for d in CADENCE if d <= days), default=0)
                item.update(days=0 if item['status']=='paid' else days,
                            stage=0 if item['status']=='paid' else stage,
                            stage_label='Complete' if item['status']=='paid' else STAGES.get(stage, 'Not due for follow-up'))
                invoices.append(item)
            return dict(date=str(today), invoices=invoices,
                        outbox=[dict(r) for r in db.execute('SELECT invoice,stage,subject,body,captured_on FROM outbox WHERE session=? ORDER BY captured_on DESC,stage DESC,invoice', (token,))],
                        activity=[dict(r) for r in db.execute('SELECT at,message FROM activity WHERE session=? ORDER BY id DESC LIMIT 12', (token,))])

    def run(self, token, advance=0):
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            session, today = self._session(db, token)
            if advance:
                if session['offset'] >= 42:
                    raise ValueError('This demo covers six weeks. Start a fresh demo to try again.')
                db.execute('UPDATE sessions SET offset=offset+? WHERE token=?', (advance, token))
                today += timedelta(days=advance)
                self._log(db, token, today, f'Demo clock advanced by {advance} days.')
            count = 0
            for row in db.execute("SELECT * FROM invoices WHERE session=? AND status='unpaid'", (token,)).fetchall():
                days = (today-date.fromisoformat(row['due'])).days
                stage = max((d for d in CADENCE if d <= days), default=0)
                if not stage:
                    continue
                # Catch up once at the current stage, never burst-send missed stages.
                previous = db.execute('SELECT max(stage) FROM outbox WHERE session=? AND invoice=?', (token, row['id'])).fetchone()[0] or 0
                if previous >= stage:
                    continue
                amount = f"£{row['amount']/100:,.0f}"
                body = f"Hello {row['client']},\n\n" + COPY[stage].format(invoice='#'+row['id'], amount=amount) + '\n\nThank you,\nAccounts team'
                db.execute('INSERT INTO outbox VALUES(?,?,?,?,?,?)', (token, row['id'], stage,
                           f"Invoice #{row['id']}: {STAGES[stage].lower()}", body, str(today)))
                count += 1
                self._log(db, token, today, f"#{row['id']}: day {stage} reminder captured in the demo outbox.")
            if count == 0:
                # Keep repeat clicks from filling the audit table.
                last = db.execute('SELECT message FROM activity WHERE session=? ORDER BY id DESC LIMIT 1', (token,)).fetchone()
                msg = 'Cadence checked. No new reminders due; paid invoices and captured stages were skipped.'
                if not last or last[0] != msg:
                    self._log(db, token, today, msg)
            return count

    def event(self, token, invoice='1200'):
        with self.db() as db:
            self._session(db, token)
            row = db.execute('SELECT * FROM invoices WHERE session=? AND id=?', (token, invoice)).fetchone()
            if not row or invoice == '1000':
                raise ValueError('Choose an invoice in this demo.')
            return dict(id='evt_demo_'+invoice, object='event', type='payment_intent.succeeded', livemode=False,
                        data={'object': dict(id='pi_demo_'+invoice, object='payment_intent', status='succeeded',
                              customer=row['customer'], amount_received=row['amount'], currency='gbp',
                              metadata={'invoice_id': invoice})})

    def reconcile(self, token, event):
        if not isinstance(event, dict) or not isinstance(event.get('id'), str) or len(event['id']) > 200:
            raise ValueError('Invalid event.')
        if event.get('livemode') is not False:
            raise ValueError('This reference build accepts test events only.')
        if event.get('type') != 'payment_intent.succeeded':
            return 'ignored'
        data = event.get('data')
        if not isinstance(data, dict):
            raise ValueError('Invalid event data.')
        payment = data.get('object', {})
        if not isinstance(payment, dict) or payment.get('status') != 'succeeded' or not isinstance(payment.get('id'), str):
            raise ValueError('Invalid payment.')
        if (not isinstance(payment.get('customer'), str) or
                type(payment.get('amount_received')) is not int or
                payment['amount_received'] <= 0):
            raise ValueError('Invalid customer or payment amount.')
        with self.db() as db:
            db.execute('BEGIN IMMEDIATE')
            _, today = self._session(db, token)
            if db.execute('SELECT 1 FROM events WHERE session=? AND id=?', (token, event['id'])).fetchone():
                return 'duplicate'
            reused = db.execute("SELECT 1 FROM events WHERE session=? AND payment=? AND outcome IN ('paid','already_paid')", (token,payment['id'])).fetchone()
            metadata = payment.get('metadata') or {}
            invoice = metadata.get('invoice_id') if isinstance(metadata, dict) else None
            matches = db.execute('SELECT * FROM invoices WHERE session=? AND customer=? AND amount=?',
                                 (token, payment.get('customer'), payment.get('amount_received'))).fetchall()
            if invoice:
                matches = [r for r in matches if r['id'] == invoice]
            if reused:
                outcome = 'duplicate_payment'
            elif payment.get('currency') != 'gbp' or len(matches) != 1:
                outcome = 'unmatched'
                self._log(db, token, today, 'Payment held for review: no unique invoice, customer, GBP amount match.')
            elif matches[0]['status'] == 'paid':
                outcome = 'already_paid'
            else:
                outcome = 'paid'
                db.execute("UPDATE invoices SET status='paid',paid_on=? WHERE session=? AND id=?", (str(today), token, matches[0]['id']))
                self._log(db, token, today, f"#{matches[0]['id']}: signed test payment matched. Status changed to paid; future reminders stop.")
            db.execute('INSERT INTO events VALUES(?,?,?,?)', (token, event['id'], payment['id'], outcome))
            return outcome


def sign(payload, secret, timestamp=None):
    timestamp = int(time.time()) if timestamp is None else timestamp
    digest = hmac.new(secret.encode(), str(timestamp).encode()+b'.'+payload, hashlib.sha256).hexdigest()
    return f't={timestamp},v1={digest}'


def receive(ledger, token, payload, signature, secret):
    if not secret:
        raise ValueError('Webhook signing is not configured.')
    event = stripe.Webhook.construct_event(payload, signature, secret, tolerance=300)
    return ledger.reconcile(token, event.to_dict())
