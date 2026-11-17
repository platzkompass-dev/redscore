import test from 'node:test';import assert from 'node:assert/strict';import {POST,certificateType} from '../api/rewards.js';
const original=globalThis.fetch;const before={...process.env};
test.beforeEach(()=>{process.env.SUPABASE_URL='https://example.supabase.co';process.env.SUPABASE_ANON_KEY='public-test-key'});
test.afterEach(()=>{globalThis.fetch=original;process.env.SUPABASE_URL=before.SUPABASE_URL||'';process.env.SUPABASE_ANON_KEY=before.SUPABASE_ANON_KEY||''});
const request=(input,headers={})=>new Request('https://www.redscore.de/api/rewards',{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer test-user-token',...headers},body:JSON.stringify(input)});
test('rewards reject missing authentication and foreign origins before any upstream call',async()=>{
 globalThis.fetch=()=>{throw Error('no network expected')};
 assert.equal((await POST(request({action:'snapshot'},{authorization:''}))).status,401);
 assert.equal((await POST(request({action:'snapshot'},{origin:'https://attacker.example'}))).status,403);
});
test('rewards forward only the validated user token; points are decided by the database',async()=>{
 const calls=[];globalThis.fetch=async(url,init)=>{calls.push({url:String(url),init});return String(url).includes('/auth/')?Response.json({id:'test-user'}):Response.json({ok:true})};
 const r=await POST(request({action:'earn',data:{activity:'profile',points:999999}}));assert.equal(r.status,200);assert.equal(calls.length,2);assert.ok(calls.every(c=>c.init.headers.authorization==='Bearer test-user-token'));assert.equal(JSON.parse(calls[1].init.body).p_action,'earn');assert.match(calls[1].url,/\/rpc\/red_rewards$/);
});
test('reward failures and malformed or oversized requests never award locally',async()=>{
 globalThis.fetch=async()=>Response.json({id:'test-user-2'});assert.equal((await POST(request({action:'invent_points'}))).status,400);
 assert.equal((await POST(request({action:'snapshot',data:{padding:'x'.repeat(9000)}}))).status,400);
 globalThis.fetch=async()=>new Response('{}',{status:401});assert.equal((await POST(request({action:'snapshot'}))).status,401);
});
test('certificate uploads accept only PDF, PNG and JPEG signatures',()=>{
 assert.equal(certificateType(Buffer.from('%PDF-1.7 file')).ext,'pdf');assert.equal(certificateType(Buffer.from([255,216,255,224])).ext,'jpg');assert.equal(certificateType(Buffer.from([137,80,78,71,13,10,26,10])).ext,'png');assert.equal(certificateType(Buffer.from('<svg onload="bad()">')),null);assert.equal(certificateType(Buffer.from('<html>')),null);
});
test('certificate submission stores a private owner path and server-derived SHA-256 before review',async()=>{
 const calls=[];globalThis.fetch=async(url,init)=>{const path=new URL(url).pathname;calls.push({path,init});if(path==='/auth/v1/user')return Response.json({id:'11111111-1111-4111-8111-111111111111'});if(path.endsWith('/rpc/red_rewards')){const b=JSON.parse(init.body);if(b.p_action==='snapshot')return Response.json({proofs:[]});assert.equal(b.p_action,'submit_proof');assert.match(b.p_data.path,/^11111111-1111-4111-8111-111111111111\/[a-f0-9-]+\.pdf$/);assert.match(b.p_data.hash,/^[a-f0-9]{64}$/);assert.equal(b.p_data.provider,'QA provider');assert.equal(b.p_data.points,undefined);return Response.json({ok:true});}assert.match(path,/\/storage\/v1\/object\/reward-proofs\//);assert.equal(init.headers['content-type'],'application/pdf');return Response.json({Key:'private-test'});};
 const form=new FormData();form.set('provider','QA provider');form.set('course_date','2026-11-01');form.set('certificate',new File(['%PDF-1.7 Synthetic certificate for tests only.'],'private-original-filename.pdf',{type:'application/pdf'}));
 const r=await POST(new Request('https://www.redscore.de/api/rewards',{method:'POST',headers:{authorization:'Bearer user-upload-token'},body:form}));assert.equal(r.status,200);assert.equal(calls.length,4);assert.ok(!JSON.stringify(calls.map(c=>c.path)).includes('private-original-filename'));
});
test('failed duplicate proof submission cleans up the unreferenced private upload',async()=>{
 let removed=false;globalThis.fetch=async(url,init)=>{const path=new URL(url).pathname;if(path==='/auth/v1/user')return Response.json({id:'22222222-2222-4222-8222-222222222222'});if(path.endsWith('/rpc/red_rewards')){const b=JSON.parse(init.body);return b.p_action==='snapshot'?Response.json({proofs:[]}):Response.json({message:'duplicate key value violates unique constraint'},{status:409});}if(init.method==='DELETE'){removed=true;assert.match(JSON.parse(init.body).prefixes[0],/^22222222-/);}return Response.json({ok:true});};
 const form=new FormData();form.set('provider','QA provider');form.set('course_date','2026-11-01');form.set('certificate',new File(['%PDF-1.7 Synthetic certificate for tests only.'],'test.pdf',{type:'application/pdf'}));const r=await POST(new Request('https://www.redscore.de/api/rewards',{method:'POST',headers:{authorization:'Bearer upload-duplicate-token'},body:form}));assert.equal(r.status,400);assert.equal(removed,true);
});
