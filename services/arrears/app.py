import json
import os
import secrets
import threading
import time
from collections import defaultdict, deque
from pathlib import Path

from flask import Flask, jsonify, request
from werkzeug.exceptions import HTTPException
import stripe
from engine import Ledger, receive, sign

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16384
ledger = Ledger(os.environ.get('ARREARS_DB', '/tmp/arrears-demo.sqlite3'))
# Simulation and external Stripe webhook use separate secrets.
SIM_SECRET = os.environ.get('ARREARS_SIM_SECRET') or secrets.token_urlsafe(48)
STRIPE_SECRET = os.environ.get('ARREARS_STRIPE_TEST_SECRET')
limits = defaultdict(deque)
lock = threading.Lock()

@app.before_request
def throttle():
    if request.path == '/health':
        return
    now = time.monotonic()
    # Global cap bounds public resource use, with a tighter cap on new sessions.
    key = 'create' if request.path == '/session' else 'requests'
    cap = 30 if key == 'create' else 600
    with lock:
        bucket = limits[key]
        while bucket and bucket[0] < now-60:
            bucket.popleft()
        if len(bucket) >= cap:
            return jsonify(error='The demo is busy. Please try again in a minute.'), 429
        bucket.append(now)

@app.after_request
def headers(response):
    response.headers['Cache-Control'] = 'no-store'
    response.headers['X-Content-Type-Options'] = 'nosniff'
    return response

def token():
    value = request.headers.get('Authorization', '')
    if not value.startswith('Bearer ') or len(value) > 100:
        raise LookupError('Start a demo session first.')
    return value[7:]

@app.errorhandler(Exception)
def error(exc):
    if isinstance(exc, LookupError):
        return jsonify(error=str(exc)), 401
    if isinstance(exc, (ValueError, stripe.SignatureVerificationError)):
        return jsonify(error='Invalid request or webhook signature.' if isinstance(exc, stripe.SignatureVerificationError) else str(exc)), 400
    if isinstance(exc, HTTPException):
        return jsonify(error=exc.description), exc.code
    app.logger.exception('Arrears request failed')
    return jsonify(error='The demo could not complete that action. Please try again.'), 500

@app.get('/health')
def health():
    return jsonify(status='ok', mode='mock-only')

@app.post('/session')
def session():
    value = ledger.create()
    return jsonify(token=value, **ledger.snapshot(value))

@app.get('/state')
def state():
    return jsonify(**ledger.snapshot(token()))

@app.post('/action')
def action():
    value = token()
    body = request.get_json()
    if not isinstance(body, dict):
        raise ValueError('Expected an action.')
    command = body.get('action')
    if command in ('run', 'advance'):
        n = ledger.run(value, 7 if command == 'advance' else 0)
        message = f'{n} new reminder' + ('' if n == 1 else 's') + ' captured. No emails sent.'
    elif command == 'pay':
        payload = json.dumps(ledger.event(value), separators=(',', ':')).encode()
        outcome = receive(ledger, value, payload, sign(payload, SIM_SECRET), SIM_SECRET)
        message = {'paid': 'Signed test payment matched to #1200. Paid status saved; reminders stopped.',
                   'duplicate': 'Repeated event ignored. The invoice stays paid.'}.get(outcome, outcome)
    else:
        raise ValueError('Unknown demo action.')
    return jsonify(message=message, **ledger.snapshot(value))

@app.post('/webhook/<session_id>')
def webhook(session_id):
    # Optional operator-configured Stripe test-mode endpoint. Never accepts the demo signing key.
    if not STRIPE_SECRET:
        return jsonify(error='External Stripe test webhook is not configured.'), 503
    result = receive(ledger, session_id, request.get_data(), request.headers.get('Stripe-Signature', ''), STRIPE_SECRET)
    return jsonify(outcome=result)


class PrefixMiddleware:
    """Expose the dedicated backend through an existing tunnel hostname."""
    def __init__(self, application):
        self.application = application

    def __call__(self, environ, start_response):
        prefix = '/arrears-demo'
        if environ.get('PATH_INFO', '').startswith(prefix + '/'):
            environ['PATH_INFO'] = environ['PATH_INFO'][len(prefix):]
            environ['SCRIPT_NAME'] = prefix
        return self.application(environ, start_response)


app.wsgi_app = PrefixMiddleware(app.wsgi_app)
