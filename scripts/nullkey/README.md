# NullKey section of alvento.uk

Canonical public location: https://alvento.uk/nullkey/

This source generates the NullKey product pages inside the main Alvento repository and Vercel project. The existing `nullkey/privacy/index.html` is preserved byte for byte. Source assets and content are under this directory and excluded from hosting by the repository's `scripts/` rule in `.vercelignore`.

Build: `python3 scripts/nullkey/build.py`.
Check: `python3 scripts/nullkey/check.py`.
Browser QA: serve the repository on localhost:8777, then `node scripts/check-nullkey.cjs`. Uses the host's existing Playwright/Chromium/axe installation. Evidence is in `docs/nullkey-qa/` (excluded from deployment).

Content and release facts were checked against the public Google Play listing on 3 November 2026: version 0.4.3, Android 12L or later, package `uk.alvento.nullkeyapp`. `content/release.json` is a dated editorial snapshot, not a live Play API connection. Recheck it when the public listing changes. Screenshots use sample data and the app’s real interface.

Design follows Alvento's Instrument Serif / DM Sans / JetBrains Mono fonts, colours, width and footer. NullKey pages use their own product navigation without Alvento’s global navigation bar. The homepage and case-study product list link to the new section. No NullKey-specific tracking script was added, but the site-wide Google Analytics tag and consent banner load on these pages; analytics stays off until a visitor accepts.

Production baseline was verified on 29 October 2026: live homepage, case-study index, consent script and app privacy page matched GitHub master 02d75a4. This supersedes the older handoff that reported the privacy-prod branch as live.

The previous nullkey.alvento.uk Site is retained as a permanent redirect to this section after the Vercel deployment is verified. Commit and push, then deploy from a fresh clone of the exact commit.

Google Play badge: official unmodified English artwork from https://play.google.com/intl/en_us/badges/static/images/badges/en_badge_web_generic.png, retrieved 3 November 2026. Display preserves aspect ratio and supplied clear space.

Guide sitemap maintenance: after approved guide files are present, run `python3 scripts/nullkey/sitemap.py` and review the diff. It sorts only the contiguous NullKey block, uses the visible review date for guides and preserves existing non-guide metadata and all non-NullKey bytes. A review date must reflect a real content update before it is used as `lastmod` or `dateModified`. Builds do not update the sitemap automatically.
