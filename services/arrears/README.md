# Arrears working reference build

Built 4 October 2026. This replaces the previously unverified marketing description with a working mock-data implementation. No earlier implementation was located. Alvento owns the build; it is not client work and supplies no evidence of client outcomes.

## What works

- A Flask API backed by persistent SQLite, separate random bearer-token sessions, 24-hour expiry and bounded public session creation.
- A fixed starting example date of 4 October 2026, plus elapsed UTC calendar days and visitor-controlled week advances. All clients, invoices and GBP amounts are fictional.
- Reminder stages at 7/14/21/28/35/42 days, progressively firmer message templates, and a captured email outbox. Nothing is emailed. Invoice/stage uniqueness and immediate SQLite transactions prevent duplicate captures, including concurrent runs.
- Catch-up scans generate only the current eligible stage, not a burst of every missed stage. Paid invoices are excluded. No additional stages after day 42.
- Payment signature verification using the Stripe Python SDK. Successful test events match invoice metadata (when supplied), customer, exact amount received and GBP currency. Ambiguous matches stay unpaid and are recorded for review. Duplicate event IDs and already-applied payment IDs are ignored.
- Daily systemd scans, plus the same workflow callable through the UI.
- The UI restores its token from sessionStorage. SQLite persists across refreshes and service restarts. New tabs/browsers normally get their own session; duplicated tabs can share sessionStorage initially.

## Limits and Stripe status

The public payment button creates a signed Stripe-format fixture and calls the same verifier and reconciliation functions. It does not call Stripe or move money. Its signing key is separate from the optional external Stripe test endpoint.

No Stripe account, test-mode endpoint secret or email delivery provider has been connected. `/webhook/<session_token>` returns 503 until `ARREARS_STRIPE_TEST_SECRET` is configured on the service. When configured, it accepts only `livemode: false` events. The test suite sends signed HTTP requests to this route, but this is not a Stripe-hosted end-to-end test.

For a Stripe sandbox integration, register the test endpoint, set its secret through a systemd environment file, and create test invoices with real sandbox customer IDs. Use metadata `invoice_id` and event type `payment_intent.succeeded`. Do not repurpose the mock public ledger for real invoices. Customer account controls, exception operations and actual email delivery are separate rollout work.

Signature handling follows the official [Stripe webhook guide](https://docs.stripe.com/webhooks) and [signature documentation](https://docs.stripe.com/webhooks/signature).

## Files and deployment

- `engine.py`: ledger schema, seed fixtures, cadence, outbox, payment matching and signature handling.
- `app.py`: session/state/action API, optional external test webhook and tunnel path adapter.
- `scheduler.py`: daily scan and expired-session cleanup.
- `requirements.txt`: pinned Python environment, including pytest for validation.
- `test_engine.py`, `test_api.py`: meaningful workflow, concurrency, signature, isolation and HTTP tests.
- `check-browser.cjs`: Playwright desktop/mobile workflow checks against `ARREARS_URL` (defaults to the live page).
- `export-ledger.cjs`: renders the same page ledger to the 1600px PNG using Playwright.
- `deploy/arrears-demo.service`, `deploy/arrears-cadence.service`, `deploy/arrears-cadence.timer`: systemd units.
- `../../api/arrears.js`: Vercel proxy for the three public demo routes.
- `../../case-studies/arrears/index.html`, `demo.js`, `assets/arrears-ledger.png`: case study, interactive UI and proposal image.

Runtime copies are installed at `/opt/arrears-demo/`, with a virtual environment at `.venv`. SQLite lives at `/var/lib/arrears-demo/ledger.sqlite3` (systemd StateDirectory). Gunicorn listens on 127.0.0.1:8411, one worker and eight threads. The dynamic service user has no access to home directories or unrelated files. The scan timer fires at 09:00 UTC daily.

Public requests go through the same-origin Vercel proxy to `https://reports.alvento.uk/arrears-demo/`. `/etc/cloudflared/config.yml` has one path-specific ingress entry before the existing reports catch-all, routing only `^/arrears-demo/.*` to port 8411. Existing reports routes are preserved. Creating a dedicated DNS hostname was attempted but the Cloudflare certificate returned an authentication error, so the existing tunnel hostname is used instead. No DNS route was created.

Run tests from this directory with `python -m pytest -q`. Export with `PLAYWRIGHT_MODULE=/path/to/playwright node export-ledger.cjs [page URL]`. The PNG uses the initial mock snapshot, with no browser chrome, cookie banner or controls.

Useful checks:

```sh
systemctl status arrears-demo.service arrears-cadence.timer
journalctl -u arrears-demo.service -u arrears-cadence.service
curl -s https://reports.alvento.uk/arrears-demo/health
```

To remove this deployment, first revert the Arrears page/proxy, disable the two units, and remove only its path-specific tunnel ingress. Preserve the database for review instead of deleting it.

## Validation on 4 October 2026

16 Python tests passed. Browser checks cover run, rerun, payment, replay, week advance, refresh persistence and reset at 1440px and 390px, with no page errors or document overflow. The daily scan was also invoked successfully through systemd. The proposal image is 1600 x 1065px.

## Ledger visual refresh

The ledger styling follows the supplied `case-studies/arrears/assets/Neon Arrears Invoice Ledger Dashboard.png`: separated dark panels, client initials, a cadence line, overdue progress indicators and status accents. The original reference image is preserved. `arrears-ledger.png` is an export of the functioning HTML ledger, not the supplied design image. Reminder and payment behaviour is unchanged.
