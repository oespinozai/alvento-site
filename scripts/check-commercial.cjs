const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs=require('fs');const out=process.env.QA_OUTPUT || '/tmp/alvento-commercial-qa'; fs.mkdirSync(out,{recursive:true});
(async()=>{
const browser=await chromium.launch({args:['--no-sandbox']});const results=[];
const ctx=await browser.newContext({reducedMotion:'reduce',viewport:{width:1440,height:1000},acceptDownloads:true});
const page=await ctx.newPage();page.setDefaultTimeout(10000);
async function check(name,fn){try{let detail=await fn();results.push({name,status:'pass',detail});}catch(e){results.push({name,status:'fail',detail:e.message.slice(0,700)});}}
function assert(v,msg){if(!v)throw Error(msg)}
// Actual live render before changes (no page content is taken from search snippets).
await check('Live desktop render',async()=>{await page.goto('https://alvento.uk/',{waitUntil:'domcontentloaded'});await page.screenshot({path:out+'/live-home-desktop.png'});return await page.locator('h1').innerText()});
const paths=['/','/case-studies/','/case-studies/staamp/','/case-studies/foyer/','/case-studies/arrears/','/case-studies/immunaris/','/tools/','/tools/pdf-to-markdown/','/tools/mdr-technical-file-index/','/tools/mdr-psur-outline-generator/','/tools/psbar-statement-generator/','/tools/cpd-tracker/','/aeo/','/website-audit/','/privacy/','/score-api/','/projects/psur-draft-generator/','/blog/get-cited-by-ai-search/','/clinical-registries/'];
const errors=[];page.on('pageerror',e=>errors.push({url:page.url(),message:e.message}));
for(const width of [1440,390]) {
 await page.setViewportSize({width,height:1000});
 for(const path of paths)await check(`${width}px ${path}`,async()=>{
  await page.goto((process.env.BASE_URL || 'http://127.0.0.1:8938')+path,{waitUntil:'domcontentloaded'});
  if(await page.getByRole('button',{name:'Decline',exact:true}).count())await page.getByRole('button',{name:'Decline',exact:true}).click();
  assert(await page.evaluate(()=>document.compatMode==='CSS1Compat'),'Quirks mode');
  assert(await page.locator('h1').count()===1,'Expected one h1');
  const size=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(size.scroll<=width+1,JSON.stringify(size));
  if(width===390&&await page.locator('nav .nav-toggle').count()){
   const btn=page.locator('nav .nav-toggle');await btn.click();assert(await btn.getAttribute('aria-expanded')==='true','Menu did not open');assert(await page.locator('nav .nav-links').isVisible(),'Menu not visible');await btn.press('Escape');assert(await btn.getAttribute('aria-expanded')==='false','Escape did not close');
  }
  await page.evaluate(async()=>{document.querySelectorAll('img').forEach(i=>i.loading='eager');await document.fonts.ready;await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
  if(['/', '/case-studies/','/aeo/','/case-studies/staamp/'].includes(path))await page.screenshot({path:out+'/'+(path==='/'?'home':path.replaceAll('/','_'))+width+'.png',fullPage:true});
  return size;
 });
}
await check('Technical index generates and downloads real .doc',async()=>{
 await page.goto((process.env.BASE_URL || 'http://127.0.0.1:8938')+'/tools/mdr-technical-file-index/');await page.getByRole('button',{name:'Generate Index',exact:true}).click();await page.getByRole('button',{name:'Word (.doc)',exact:true}).click();const pending=page.waitForEvent('download');await page.getByRole('button',{name:'Download .doc File',exact:true}).click();const dl=await pending;const data=fs.readFileSync(await dl.path(),'utf8');assert(dl.suggestedFilename()==='technical-file-index.doc','Wrong extension');assert(data.startsWith('<html>'),'Expected HTML .doc');assert(!data.includes('commercial.css'),'Website styles in document');return {filename:dl.suggestedFilename(),format:'HTML .doc'};
});
await check('Enquiry prompts contain all four requested details',async()=>{await page.goto((process.env.BASE_URL || 'http://127.0.0.1:8938')+'/');const links=await page.locator('a[href^="mailto:"]').evaluateAll(xs=>xs.map(x=>x.href));assert(links.length>=4,'Missing contextual mail links');for(const href of links){const u=new URL(href);assert(/Business and problem:/.test(u.searchParams.get('body')),'Missing enquiry prompt');}return links.length});
await check('Reference labels visible',async()=>{for(const slug of ['foyer','arrears','immunaris']){await page.goto((process.env.BASE_URL || 'http://127.0.0.1:8938')+'/case-studies/'+slug+'/');assert(await page.getByText('Reference build',{exact:true}).first().isVisible(),'Missing reference status '+slug);}return 'All three visible'});
// A fresh context and intercepted GA payload verify consent logic without sending analytics.
await check('Analytics fresh/decline/accept/withdraw',async()=>{
 const c=await browser.newContext();const p=await c.newPage();let requests=[];
 await c.route(/https:\/\/(www\.googletagmanager\.com|.*google-analytics\.com)\//,route=>{requests.push(route.request().url());return route.fulfill({status:200,contentType:'application/javascript',body:'/* analytics intercepted for QA */'});});
 await p.goto((process.env.BASE_URL || 'http://127.0.0.1:8938')+'/');await p.waitForTimeout(150);assert(requests.length===0,'GA before consent');await p.getByRole('button',{name:'Decline',exact:true}).click();await p.reload();assert(requests.length===0,'GA after decline');await p.getByRole('button',{name:'Cookie preferences',exact:true}).click();await p.getByRole('button',{name:'Accept analytics',exact:true}).click();await p.waitForTimeout(150);assert(requests.length===1,'GA not loaded once after acceptance');
 await p.evaluate(()=>{document.cookie='_ga=qa; path=/';document.cookie='_ga_XBMBRD8E00=qa; path=/'});await p.getByRole('button',{name:'Cookie preferences',exact:true}).click();await Promise.all([p.waitForEvent('load'),p.getByRole('button',{name:'Decline',exact:true}).click()]);assert((await c.cookies()).every(x=>!x.name.startsWith('_ga')),'GA cookies remain');assert(requests.length===1,'GA reloaded after withdrawal');await c.close();return 'No GA request before consent or after decline; one on accept; withdrawal clears cookies and stops reload';
});
results.push({name:'JavaScript page errors',status:errors.length?'fail':'pass',detail:errors});
await browser.close();fs.writeFileSync(out+'/browser-checks.json',JSON.stringify(results,null,2));console.log(JSON.stringify(results,null,2)); if(results.some(x=>x.status==='fail'))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
