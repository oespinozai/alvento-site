const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.BASE_URL || 'http://127.0.0.1:8938';
const output = process.env.QA_OUTPUT || '/tmp/alvento-tools-fixes';
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('alvento_consent', 'denied'));
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const results = [];
    async function wizard(indices) {
      await page.goto(base + '/tools/mdr-class-check/', { waitUntil: 'domcontentloaded' });
      for (const index of indices) {
        await page.locator('.option-btn').nth(index).click();
        await page.locator('#btnNext').click();
      }
      return page.locator('#resultClass').innerText();
    }
    assert.equal(await wizard([0, 3, 0, 0, 0]), 'Class III');
    assert.equal(await wizard([0, 3, 0, 0, 2]), 'Class III');
    assert.equal(await wizard([2, 3, 0, 0, 2]), 'Class III');
    assert.equal(await wizard([0, 0, 2, 0, 0]), 'Class IIa');
    let teaser = await page.locator('#psurTeaser').innerText();
    assert.ok(teaser.includes('outline'));
    assert.doesNotMatch(teaser, /under 30 minutes|drafts yours|Try PSUR Generator/i);
    assert.equal(await page.locator('#psurTeaser a').getAttribute('href'), '/tools/mdr-psur-outline-generator/');
    assert.equal(await wizard([0, 0, 0, 0, 0]), 'Class I');
    assert.match(await page.locator('#psurTeaser').innerText(), /Article 85/);
    results.push({ name: 'Real wizard severity/duration regressions and class-specific PSUR copy', status: 'pass' });
    for (const route of ['/tools/', '/tools/cpd-tracker/', '/tools/mdr-psur-outline-generator/', '/tools/psbar-statement-generator/', '/score-api/']) {
      await page.goto(base + route, { waitUntil: 'domcontentloaded' });
      assert.equal(await page.locator('main').count(), 1);
      assert.equal(await page.locator('main footer, main nav').count(), 0);
      const widths = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      assert.ok(widths.document <= widths.viewport + 1, JSON.stringify({ route, widths }));
      if (process.env.AXE_SOURCE) {
        await page.addScriptTag({ path: process.env.AXE_SOURCE });
        const violations = await page.evaluate(async () => (await axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast', 'heading-order', 'button-name', 'link-name', 'aria-valid-attr', 'aria-required-attr', 'landmark-one-main', 'label', 'image-alt'] } })).violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })));
        assert.deepEqual(violations, [], route);
      }
      results.push({ name: 'Main landmark, layout and selected accessibility checks: ' + route, status: 'pass' });
    }
    await page.goto(base + '/tools/cpd-tracker/');
    await page.getByPlaceholder('Activity Name').fill('Fictional regression activity');
    await page.getByLabel('Activity date', { exact: true }).fill(new Date().toISOString().slice(0, 10));
    await page.getByPlaceholder('Hours', { exact: true }).fill('2.5');
    await page.getByLabel('Activity category').selectOption('clinical');
    await page.getByLabel('Target College').selectOption('rcs');
    await page.getByRole('button', { name: 'Add Entry', exact: true }).click();
    assert.match(await page.locator('#logBody').innerText(), /Fictional regression activity/);
    await page.screenshot({ path: path.join(output, 'cpd-mobile.png'), fullPage: true });
    results.push({ name: 'CPD labelled inputs remain usable and save fictional activity', status: 'pass' });
    assert.deepEqual(errors, []);
    const report = { status: 'pass', checks: results, pageErrors: errors };
    fs.writeFileSync(path.join(output, 'tools-fixes.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
