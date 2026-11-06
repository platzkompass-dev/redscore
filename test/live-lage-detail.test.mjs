import test from 'node:test';
import assert from 'node:assert/strict';
import {createDetailHandler} from '../api/live-lage-detail.js';
const id='a8a81bb3-7461-4f45-a32d-e00dfc67af88';
const event={id,title:'Abyei: Drone strikes reported',summary:'UN officials reported at least 30 deaths last month.',tags:['source-language:en'],sources:[{name:'UN News',url:'https://news.un.org/en/story/test'}]};
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'test-anon',AI_GATEWAY_API_KEY:'test-only'};
const request=(language='de')=>new Request(`https://www.redscore.de/api/live-lage-detail?id=${id}&language=${language}`);
function handler(fetcher, overrides={}) { return createDetailHandler({fetcher,env,entries:new Map(),inFlight:new Map(),limits:new Map(),...overrides}); }
test('details accept only event IDs and never a caller supplied source URL',async()=>{
  const get=handler(()=>{throw Error('must not fetch');});
  assert.equal((await get(new Request('https://www.redscore.de/api/live-lage-detail?id=https://internal/'))).status,400);
});
test('translates a genuine excerpt once, coalesces requests and keeps attribution and original copy',async()=>{
  const calls=[];
  const get=handler(async(url,init)=>{calls.push({url:String(url),body:JSON.parse(init.body)});if(String(url).includes('supabase.co'))return Response.json(event);return Response.json({choices:[{message:{content:JSON.stringify({title:'Abyei: Drohnenangriffe gemeldet',summary:'UN-Vertreter meldeten für den vergangenen Monat mindestens 30 Todesopfer.'})}}]});});
  const results=await Promise.all([get(request()),get(request())]);
  const body=await results[0].json();
  assert.equal(body.translated,true);assert.equal(body.language,'de');assert.match(body.summary,/mindestens 30/);assert.deepEqual(body.original,{title:event.title,summary:event.summary});
  await get(request());assert.equal(calls.length,2);assert.deepEqual(calls[0].body,{p_id:id});assert.match(calls[1].body.messages[0].content,/uncertainty/);
});
test('same-language details need no translation and cache separately by language',async()=>{
  let calls=0;const get=handler(async()=>{calls++;return Response.json(event);});
  const body=await (await get(request('en'))).json();assert.equal(body.summary,event.summary);assert.equal(body.translated,false);assert.equal(calls,1);
});
test('failed or malformed translations preserve the genuine excerpt and are not CDN cached',async()=>{
  for(const output of [new Response('',{status:503}),Response.json({choices:[{message:{content:'{"title":"invented"}'}}]})]){
    const get=handler(async url=>String(url).includes('supabase.co')?Response.json(event):output);
    const response=await get(request());const body=await response.json();assert.equal(body.summary,event.summary);assert.equal(body.language,'en');assert.equal(body.translated,false);assert.equal(response.headers.get('cache-control'),'no-store');
  }
});
test('deleted or expired events return 404, including coalesced requests',async()=>{
  const get=handler(async()=>Response.json(null));const responses=await Promise.all([get(request()),get(request())]);assert.deepEqual(responses.map(r=>r.status),[404,404]);
});
test('detail failures and generation rate limits return usable errors',async()=>{
  assert.equal((await handler(async()=>{throw Error('timeout');})(request())).status,503);
  const get=handler(async()=>Response.json(event),{now:()=>0,limits:new Map([[0,20]])});assert.equal((await get(request())).status,429);
});
