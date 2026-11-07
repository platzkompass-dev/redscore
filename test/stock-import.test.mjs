import test from 'node:test';
import assert from 'node:assert/strict';
import {makeStockRows,planStockImport,waterFromRow} from '../dist/stock-import.js';
import {createScanHandler} from '../api/stock-list-scan.js';
const existing=[{id:'custom-test-1',label:'Reis',quantity:5,unit:'kg',category:'Versorgung',note:'Trocken lagern',createdAt:'2026-01-01'}];
const raw={label:'Reis',quantity:2,unit:'kg',category:'Versorgung',note:'',rawLine:'2 kg Reis',uncertain:false,litresPerContainer:null};
test('recognition drafts preserve missing quantities and require every row to be reviewed',()=>{
 const rows=makeStockRows([raw,{...raw,label:'Bohnen',quantity:null,unit:null}],existing);
 assert.equal(rows[0].target,'custom:custom-test-1');assert.equal(rows[1].quantity,'');assert.equal(rows[1].unit,'');
 assert.throws(()=>planStockImport(rows,existing),/pending/);
 rows[0].decision='keep';rows[1].decision='skip';const result=planStockImport(rows,existing);
 assert.equal(result.entries[0].quantity,2);assert.equal(existing[0].quantity,5);assert.equal(result.entries[0].id,existing[0].id);assert.equal(result.water,null);assert.equal(result.entries[0].note,'Trocken lagern');
});
test('water quantities retain containers until the user confirms the litre conversion',()=>{
 const rows=makeStockRows([{...raw,label:'Wasser',quantity:6,unit:'Flaschen',litresPerContainer:1.5},{...raw,label:'Trinkwasser',quantity:10,unit:'Liter'}]);
 assert.equal(rows[0].target,'water');assert.equal(waterFromRow(rows[0]),9);
 assert.equal(planStockImport(rows.map(row=>({...row,decision:'keep'})),[]).water,19);
 assert.throws(()=>planStockImport([{...rows[0],litresPerContainer:'',decision:'keep'}],[]),/water/);
});
test('invalid amounts, conflicting replacements and item limits cannot produce a partial plan',()=>{
 const row={...makeStockRows([raw],existing)[0],decision:'keep'};
 for(const quantity of ['','-1','1e3','NaN','1000000'])assert.throws(()=>planStockImport([{...row,quantity}],existing),/invalid/);
 assert.throws(()=>planStockImport([row,{...row}],existing),/duplicate/);
 assert.throws(()=>planStockImport([{...row,target:'custom:missing'}],existing),/target/);
 assert.throws(()=>planStockImport([{...row,target:'new'}],Array.from({length:100},()=>existing[0])),/capacity/);
 assert.throws(()=>planStockImport([{...row,decision:'skip'}],existing),/empty/);
});
const bytes=Buffer.alloc(200,0);bytes[0]=255;bytes[1]=216;bytes[2]=255;
const photo='data:image/jpeg;base64,'+bytes.toString('base64');
const env={SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'test-anon',AI_GATEWAY_API_KEY:'test-gateway'};
const request=(input={image:photo,language:'de'},headers={})=>new Request('https://www.redscore.de/api/stock-list-scan',{method:'POST',headers:{origin:'https://www.redscore.de','content-type':'application/json',authorization:'Bearer test-token',...headers},body:JSON.stringify(input)});
function handler(fetcher,extra={}){return createScanHandler({fetcher,env,buckets:new Map(),...extra});}
test('scan requires authenticated same-origin JSON and rejects arbitrary content before generation',async()=>{
 let generations=0;const get=handler(async url=>{if(String(url).includes('/auth/'))return Response.json({id:'qa-user'});generations++;throw Error('should not generate');});
 assert.equal((await get(request(undefined,{origin:'https://evil.test'}))).status,403);
 assert.equal((await get(request(undefined,{authorization:''}))).status,401);
 assert.equal((await get(request({image:'https://internal',language:'de'}))).status,400);
 assert.equal((await get(request({image:photo,command:'delete stock'}))).status,400);
 assert.equal((await get(request({image:'data:image/svg+xml;base64,abc'}))).status,400);
 assert.equal((await get(request({image:'x'.repeat(3_000_000)}))).status,413);assert.equal(generations,0);
 const anonymous=handler(async()=>Response.json({id:'anonymous',is_anonymous:true}));assert.equal((await anonymous(request())).status,401);
 const expired=handler(async()=>new Response(null,{status:401}));assert.equal((await expired(request())).status,401);
});
test('scan returns a sanitized review draft without storing or returning the photo',async()=>{
 const calls=[];const get=handler(async(url,init)=>{calls.push({url:String(url),init});if(String(url).includes('/auth/'))return Response.json({id:'qa-user'});return Response.json({choices:[{finish_reason:'stop',message:{content:JSON.stringify({purpose:'shopping',warning:'Bitte prüfen',items:[{...raw,label:'<b>Reis</b>',quantity:null}]})}}]});});
 const response=await get(request());assert.equal(response.status,200);const result=await response.json();assert.equal(result.purpose,'shopping');assert.equal(result.items[0].label,'Reis');assert.equal(result.items[0].quantity,null);assert.equal(result.items[0].uncertain,true);assert.equal(calls.length,2);assert.ok(calls[1].url.startsWith('https://ai-gateway.vercel.sh/'));assert.ok(!JSON.stringify(result).includes('base64'));assert.equal(response.headers.get('cache-control'),'no-store');
 const prompt=JSON.parse(calls[1].init.body);assert.equal(prompt.model,'openai/gpt-4.1');assert.match(prompt.messages[0].content,/Never invent/);
});
test('provider failures, excessive rows and per-user generation rate limits remain explicit',async()=>{
 const fail=handler(async url=>String(url).includes('/auth/')?Response.json({id:'qa-user'}):new Response('',{status:500}));assert.equal((await fail(request())).status,503);
 const truncated=handler(async url=>String(url).includes('/auth/')?Response.json({id:'qa-user'}):Response.json({choices:[{finish_reason:'length'}]}));assert.equal((await truncated(request())).status,422);
 const limited=handler(async()=>Response.json({id:'qa-user'}),{now:()=>0,buckets:new Map([['qa-user',{started:0,count:6}]])});assert.equal((await limited(request())).status,429);
});
