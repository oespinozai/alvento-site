'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createFoyerServer}=require('./server');
const quiet={info(){},error(){}};
const healthy=async(_url,options)=>{
 const data=JSON.parse(options.body);
 assert.equal(data.options.num_ctx,8192);assert.equal(data.keep_alive,-1);
 return new Response(JSON.stringify({message:{content:'Friday at ten is available. What is your fictional name?'}}));
};
async function fixture(t,overrides={}){
 const server=createFoyerServer({fetchImpl:healthy,synthesizeImpl:async()=>Buffer.from('audio'),log:quiet,config:{llmMs:30,speechMs:20,warmupMs:60,probeMs:10000},...overrides});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));});
 const url=`http://127.0.0.1:${server.address().port}`;
 const get=()=>fetch(url+'/health/ready').then(async r=>({status:r.status,...await r.json()}));
 const post=body=>fetch(url+'/chat',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(async r=>({status:r.status,...await r.json()}));
 const waitReady=async()=>{for(let i=0;i<100;i++){const state=await get();if(state.ollama&&!state.warming)return state;await new Promise(r=>setTimeout(r,5));}throw Error('readiness did not settle');};
 return {get,post,waitReady};
}
test('readiness generates a real reply, and working chat returns audio',async t=>{
 const f=await fixture(t);assert.equal((await f.waitReady()).status,200);
 const reply=await f.post({message:'Friday at ten',track:'retail'});assert.equal(reply.status,200);assert.equal(reply.turnsLeft,11);assert.equal(reply.audioError,false);assert(reply.audio);
});
test('reachable but stalled inference is unready and visitors fail quickly',async t=>{
 const f=await fixture(t,{fetchImpl:(_u,{signal})=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason),{once:true}))});
 await new Promise(r=>setTimeout(r,80));assert.equal((await f.get()).status,503);
 const started=Date.now();assert.equal((await f.post({message:'Hello'})).status,503);assert(Date.now()-started<200);
});
test('failed turn does not consume quota or corrupt the next conversation',async t=>{
 let fail=false;let last;
 const f=await fixture(t,{fetchImpl:async(u,opts)=>{const payload=JSON.parse(opts.body);last=payload.messages;if(fail){fail=false;throw Error('runner stopped');}return healthy(u,opts);}});
 await f.waitReady();fail=true;
 const bad=await f.post({message:'FAILED MESSAGE',sessionId:'test-retry'});assert.equal(bad.status,503);await f.waitReady();
 const good=await f.post({message:'Friday at ten',sessionId:'test-retry'});assert.equal(good.turnsLeft,11);assert(!last.some(m=>m.content==='FAILED MESSAGE'));
});
test('speech failure preserves a useful text answer',async t=>{
 const f=await fixture(t,{synthesizeImpl:async()=>{throw Error('speech offline')}});assert.equal((await f.waitReady()).status,503);
 const answer=await f.post({message:'Friday at ten'});assert.equal(answer.status,200);assert(answer.reply);assert.equal(answer.audio,null);assert.equal(answer.audioError,true);
});
test('overlapping requests fail fast rather than building an inference queue',async t=>{
 let release;let hold=false;
 const f=await fixture(t,{fetchImpl:async(u,opts)=>{if(hold)await new Promise(r=>release=r);return healthy(u,opts);}});await f.waitReady();hold=true;
 const first=f.post({message:'Friday at ten',sessionId:'first'});while(!release)await new Promise(r=>setTimeout(r,2));
 assert.equal((await f.post({message:'Thursday at three',sessionId:'second'})).status,503);release();assert.equal((await first).status,200);
});
