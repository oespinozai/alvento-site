# NullKey section of alvento.uk

Canonical public location: https://alvento.uk/nullkey/

This source generates the 11 product pages inside the main Alvento repository and Vercel project. The existing `nullkey/privacy/index.html` is preserved byte for byte. Source assets and content are under this directory and excluded from hosting by the repository's `scripts/` rule in `.vercelignore`.

Build: `python3 scripts/nullkey/build.py`.
Check: `python3 scripts/nullkey/check.py`.
Browser QA: serve the repository on localhost:8777, then `node scripts/check-nullkey.cjs`. Uses the host's existing Playwright/Chromium/axe installation. Evidence is in `docs/nullkey-qa/` (excluded from deployment).

Content was imported from the reviewed NullKey product site, Sites commit 74195eb, and describes app version 0.4.2 (12), in internal testing. Screenshots use sample data and the new mark from Android app commit d25ce4d. The release status is a dated editorial snapshot, not a live Play API connection. Update `content/release.json` and availability copy when public distribution is confirmed.

Design follows Alvento's Instrument Serif / DM Sans / JetBrains Mono fonts, colours, width, global navigation and footer, with a secondary NullKey product navigation. The homepage and case-study product list link to the new section. No tracking script was added to these product pages.

Production baseline was verified on 29 October 2026: live homepage, case-study index, consent script and app privacy page matched GitHub master 02d75a4. This supersedes the older handoff that reported the privacy-prod branch as live.

The previous nullkey.alvento.uk Site is retained as a permanent redirect to this section after the Vercel deployment is verified. Commit and push, then deploy from a fresh clone of the exact commit.
