import test from 'node:test';
import assert from 'node:assert/strict';
import {createHealthHandler} from '../api/health.js';
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'test-key'};
const healthy={status:'healthy',enabledSources:9,freshSources:9,staleSources:0,failedSources:0,lastSuccessfulSync:'2026-11-05T12:00:00Z'};
test('health requires a real database response and strips unknown upstream fields',async()=>{
  let call;
  const handler=createHealthHandler({env,fetchImpl:async(url,options)=>{call={url:String(url),options};return Response.json({...healthy,secret:'not public'});}});
  const response=await handler(),data=await response.json();
  assert.equal(response.status,200);assert.equal(data.databaseReachable,true);assert.deepEqual(data.liveLage,healthy);assert.ok(!JSON.stringify(data).includes('not public'));
  assert.equal(call.url,'https://example.supabase.co/rest/v1/rpc/get_redscore_operational_health');assert.equal(call.options.redirect,'error');
});
test('stale feeds cause unavailable status, partial failures are degraded',async()=>{
  for(const [status,code] of [['unavailable',503],['degraded',200]]){
    const response=await createHealthHandler({env,fetchImpl:async()=>Response.json({...healthy,status})})();
    assert.equal(response.status,code);assert.equal((await response.json()).databaseReachable,true);
  }
});
test('health fails closed without leaking provider errors or credentials',async()=>{
  for(const options of [{env:{},fetchImpl:()=>assert.fail()},
    {env:{...env,SUPABASE_URL:'https://evil.test'},fetchImpl:()=>assert.fail()},
    {env,fetchImpl:async()=>new Response('private database error',{status:500})},
    {env,fetchImpl:async()=>{throw Error('secret');}},
    {env,fetchImpl:async()=>Response.json({status:'healthy'})}]){
    const response=await createHealthHandler(options)();assert.equal(response.status,503);const text=await response.text();assert.ok(!text.includes('private')&&!text.includes('test-key')&&!text.includes('secret'));
  }
});
test('health shares simultaneous checks and expires its brief process cache',async()=>{
  let time=0,calls=0;
  const handler=createHealthHandler({env,now:()=>time,fetchImpl:async()=>{calls++;return Response.json(healthy);}});
  await Promise.all([handler(),handler(),handler()]);assert.equal(calls,1);
  time=14000;await handler();assert.equal(calls,1);time=16000;await handler();assert.equal(calls,2);
});
