import {validVisit} from '../supabase/functions/_shared/visits.js';
const origins=new Set(['https://www.redscore.de','https://redscore.de']);
const hits=new Map();
const reply=status=>new Response(null,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
export function createVisitHandler({fetchImpl=fetch,env=process.env,now=Date.now}={}){
  return async request=>{
    if(request.method!=='POST')return reply(405);
    if(!origins.has(request.headers.get('origin'))||request.headers.get('sec-fetch-site')==='cross-site')return reply(403);
    if(!request.headers.get('content-type')?.startsWith('application/json'))return reply(415);
    if(Number(request.headers.get('content-length')||0)>1024)return reply(413);
    // Short-lived rate keys stay only in this server process, never in the DB.
    const ip=request.headers.get('x-vercel-forwarded-for')||'unknown',time=now();
    for(const [key,bucket] of hits)if(bucket.until<time)hits.delete(key);
    if(hits.size>10000)return reply(429);
    const bucket=hits.get(ip)||{until:time+60000,count:0};bucket.count++;hits.set(ip,bucket);
    if(bucket.count>60)return reply(429);
    try{
      const raw=await request.text();if(new TextEncoder().encode(raw).length>1024)return reply(413);
      let input;try{input=JSON.parse(raw);}catch{return reply(400);}if(!validVisit(input))return reply(400);
      const url=new URL(env.SUPABASE_URL||'');const key=env.SUPABASE_ANON_KEY||env.SUPABASE_PUBLISHABLE_KEY;
      if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.username||url.password||url.port||!key)return reply(503);
      const result=await fetchImpl(new URL('/functions/v1/public-visit',url),{method:'POST',redirect:'error',signal:AbortSignal.timeout(5000),headers:{authorization:`Bearer ${key}`,apikey:key,'content-type':'application/json'},body:JSON.stringify(input)});
      return reply(result.ok?204:503);
    }catch{return reply(503);}
  };
}
export const POST=createVisitHandler();
