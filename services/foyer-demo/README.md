# Foyer demo service and sample calls

Source for the service installed at `/opt/foyer-demo` on friday. The existing
`foyer-demo.service` runs `server.js` as `siaapi`. Requires Node 22 and ffmpeg.
This directory is excluded from the static Vercel deployment.

Speech is generated with the existing local Pocket TTS service on gaia. Short
sentences are synthesized at normal speed, joined with 320ms of silence, and
encoded once. Phone digits are spoken in groups. The overall speech deadline is
30 seconds; the existing text response remains available if voice fails.

`node --test services/foyer-demo/speech.test.js` checks segmentation and measures
the actual inserted silence against a deterministic local speech fixture.

`node services/foyer-demo/build-calls.js` regenerates the two illustrative calls,
timing JSON, and HTML transcripts from `calls.json`. Generation is spaced out to
respect the shared TTS service's 30-request-per-minute limit. Foyer uses `jean`;
the callers use `cosette` and `marius`, as before.

The page's confirmation and practice summary are fictional examples. The demo
does not send messages, book a live calendar, or provide staff authentication.
Live delivery and an access-controlled transcript store require deployment-specific
integrations. Session conversations remain in memory only and expire after
30 minutes idle, checked every five minutes.

To deploy the backend, install `server.js`, `speech.js` and `phone.js` into `/opt/foyer-demo`
and restart `foyer-demo.service`, then check `/health/ready` and a `/chat` response.
Keep a copy of the previous installed files for rollback.
