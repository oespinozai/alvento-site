const {chromium}=require('/root/decision-as-a-service/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
const base=process.env.NULLKEY_PREVIEW_URL || 'http://127.0.0.1:8777';
const root=path.join(__dirname,'..');
const pages=[];function walk(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=path.join(p,e.name);if(e.isDirectory())walk(f);else if(e.name==='index.html')pages.push('/'+path.relative(root,f).replace(/index.html$/,''));}}walk(path.join(root,'nullkey'));pages.splice(pages.indexOf('/nullkey/privacy/'),1);
(async()=>{
 const browser=await chromium.launch({executablePath:'/root/.cache/ms-playwright/chromium_headless_shell-1217/chrome-headless-shell-linux64/chrome-headless-shell',headless:true,args:['--no-sandbox']});
 const page=await browser.newPage();const errors=[],violations=[];let checks=0;page.on('pageerror',e=>errors.push(e.message));
 for(const route of pages){
  assert((await page.goto(base+route)).ok(),route);
  await page.evaluate(async()=>{await Promise.all([...document.images].map(i=>{i.loading='eager';return i.decode();}));});
  for(const width of [320,390,768,1024,1440]){
   await page.setViewportSize({width,height:1000});
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),route+' overflow at '+width);
   assert(await page.evaluate(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0)),route+' broken image');checks++;
  }
  await page.addScriptTag({path:'/root/decision-as-a-service/node_modules/axe-core/axe.min.js'});
  const report=await page.evaluate(async()=>await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}}));
  for(const v of report.violations)violations.push({route,id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))});
 }
 await page.goto(base+'/nullkey/');await page.setViewportSize({width:1440,height:1000});
 fs.mkdirSync(path.join(root,'docs/nullkey-qa'),{recursive:true});
 await page.screenshot({path:path.join(root,'docs/nullkey-qa/desktop.png'),fullPage:true});
 await page.screenshot({path:path.join(root,'docs/nullkey-qa/hero.png')});
 const question=page.getByText('Can I download NullKey now?',{exact:true});await question.focus();await page.keyboard.press('Enter');assert(await question.locator('..').getAttribute('open')!==null);
 await page.reload();await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.textContent),'Skip to content');await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'main');
 await page.setViewportSize({width:390,height:844});await page.locator('.mobile-nav>summary').focus();await page.keyboard.press('Enter');assert(await page.getByRole('navigation',{name:'Mobile navigation'}).isVisible());
 assert.equal(await page.getByRole('navigation',{name:'Mobile navigation'}).getByRole('link',{name:'Products',exact:true}).getAttribute('href'),'https://alvento.uk/#lab');
 await page.keyboard.press('Escape');
 await page.getByRole('navigation',{name:'NullKey navigation'}).getByRole('link',{name:'Testing & availability'}).click();assert(page.url().endsWith('/nullkey/availability/'));
 assert((await page.getByRole('link',{name:/Ask about testing/}).getAttribute('href')).startsWith('mailto:hello@alvento.uk'));
 await page.locator('.mobile-nav>summary').click();await page.keyboard.press('Escape');assert(!(await page.locator('.mobile-nav').getAttribute('open')));
 await page.goto(base+'/nullkey/');await page.screenshot({path:path.join(root,'docs/nullkey-qa/mobile.png'),fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>getComputedStyle(document.documentElement).scrollBehavior),'auto');
 await page.setViewportSize({width:512,height:1000});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'512px reflow overflow');
 assert.equal(errors.length,0,errors.join('\n'));
 const result={pages:pages.length,responsiveChecks:checks,widths:[320,390,768,1024,1440],keyboard:'skip link, FAQ, mobile navigation and Escape passed',testingLink:'mailto enquiry; no automatic enrolment',reducedMotion:true,reflow512:true,consoleErrors:errors,axeViolations:violations};
 fs.writeFileSync(path.join(root,'docs/nullkey-qa/browser-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));await browser.close();if(violations.length)process.exit(1);
})().catch(e=>{console.error(e);process.exit(1)});
