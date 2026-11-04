import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisitHandler} from '../api/visit.js';
import {validVisit,PUBLIC_VISIT_ROUTES} from '../supabase/functions/_shared/visits.js';
const payload={route:'/',session:'11111111-1111-4111-8111-111111111111',consent:2};
let client=0;
const request=(body=payload,headers={},method='POST')=>new Request('https://www.redscore.de/api/visit',{
  method,headers:{origin:'https://www.redscore.de','content-type':'application/json','x-vercel-forwarded-for':`test-${++client}`,...headers},
  ...(method==='GET'?{}:{body:typeof body==='string'?body:JSON.stringify(body)}),
});
const env={SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:'server-only-test-key'};
test('visit validation rejects private paths, extra data and malformed sessions',()=>{
  assert.equal(PUBLIC_VISIT_ROUTES.size,10);
  for(const route of PUBLIC_VISIT_ROUTES)assert.ok(validVisit({...payload,route}));
  for(const bad of [null,[],{...payload,email:'secret@example.test'},{...payload,consent:1},{...payload,session:'x'},
    {...payload,route:'/settings'},{...payload,route:'/?email=secret'},{...payload,route:'/#/home'}])assert.ok(!validVisit(bad));
});
test('collector enforces origin, POST, JSON, payload size and content',async()=>{
  const handler=createVisitHandler({env,fetchImpl:()=>assert.fail('must not forward')});
  for(const [req,status] of [[request(payload,{},'GET'),405],[request(payload,{origin:'https://evil.test'}),403],
    [request(payload,{'sec-fetch-site':'cross-site'}),403],[request(payload,{'content-type':'text/plain'}),415],
    [request(payload,{'content-length':'2048'}),413],[request(' '.repeat(1025)),413],[request('{'),400],
    [request({...payload,location:'private'}),400]])assert.equal((await handler(req)).status,status);
});
test('collector forwards validated events with server-side credentials',async()=>{
  let forwarded;
  const handler=createVisitHandler({env,fetchImpl:async(url,options)=>{forwarded={url:String(url),...options};return new Response(null,{status:204});}});
  const result=await handler(request());assert.equal(result.status,204);assert.equal(result.headers.get('cache-control'),'no-store');
  assert.equal(forwarded.url,'https://example.supabase.co/functions/v1/public-visit');
  assert.deepEqual(JSON.parse(forwarded.body),payload);assert.equal(forwarded.headers.authorization,'Bearer server-only-test-key');
  assert.equal(forwarded.redirect,'error');assert.ok(forwarded.signal instanceof AbortSignal);assert.equal(await result.text(),'');
});
test('collector fails closed on upstream or configuration errors',async()=>{
  for(const options of [{env:{},fetchImpl:()=>assert.fail()},
    {env:{...env,SUPABASE_URL:'https://evil.test'},fetchImpl:()=>assert.fail()},
    {env,fetchImpl:async()=>new Response(null,{status:500})},
    {env,fetchImpl:async()=>{throw Error('secret upstream failure');}}]){
    const response=await createVisitHandler(options)(request());assert.equal(response.status,503);assert.equal(await response.text(),'');
  }
});
test('collector limits bursts and resets the minute bucket',async()=>{
  let time=1_000_000;
  const handler=createVisitHandler({env,now:()=>time,fetchImpl:async()=>new Response(null,{status:204})});
  for(let i=0;i<60;i++)assert.equal((await handler(request(payload,{'x-vercel-forwarded-for':'rate-test'}))).status,204);
  assert.equal((await handler(request(payload,{'x-vercel-forwarded-for':'rate-test'}))).status,429);
  time+=60001;assert.equal((await handler(request(payload,{'x-vercel-forwarded-for':'rate-test'}))).status,204);
});
