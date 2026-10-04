// Usage: PLAYWRIGHT_MODULE=/path/to/playwright node export-ledger.cjs [page URL]
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const path = require('node:path');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1664, height: 1100 }, deviceScaleFactor: 1 });
  await page.addInitScript(() => localStorage.setItem('alvento_consent', 'denied'));
  await page.goto(process.argv[2] || 'https://alvento.uk/case-studies/arrears/');
  await page.waitForFunction(() => document.querySelector('#demo-status').textContent.startsWith('Mock ledger ready'));
  await page.evaluate(() => document.fonts.ready);
  await page.addStyleTag({ content: 'nav{visibility:hidden}#ledger .container{max-width:none;padding:0 32px}.ledger-card{width:1600px}.ledger-table td{font-size:.95rem}.ledger-table th{font-size:.72rem}.ledger-table td small{font-size:.8rem}.ledger-table .invoice-id,.ledger-table .amount{font-size:.95rem}.ledger-kicker,.ledger-date{font-size:.8rem}.ledger-note{font-size:.72rem}' });
  const output = path.resolve(__dirname, '../../case-studies/arrears/assets/arrears-ledger.png');
  await page.locator('#ledger-view').screenshot({ path: output });
  console.log(output);
  await browser.close();
})().catch(error => { console.error(error); process.exit(1); });
