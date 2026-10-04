# Case study cover sources

These editorial covers frame existing product evidence. They are not full application screenshots.

- Staamp: `../staamp/img/oscar-loyalty-card.png`, the existing customer card.
- Foyer: `foyer-orb.png`, captured from the existing Foyer WebGL canvas. The waveform is decorative, not measured audio.
- Arrears: invoices #1000, #1200 and #1600 read directly from the initial mock ledger in `../arrears/index.html`.
- Immunaris: `../immunaris/img/hero-dashboard.png`, an existing reference interface, including its sample totals.

Run `PLAYWRIGHT_MODULE=/path/to/playwright node scripts/render-case-previews.cjs` from the repository root to render all four covers at 1200 x 720. Rendering requires access to Google Fonts. To refresh the Foyer source, serve the site locally and run `PREVIEW_BASE=http://localhost:8767 PLAYWRIGHT_MODULE=/path/to/playwright node scripts/capture-foyer-preview.cjs` first.
