import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import {validVisit} from '../_shared/visits.js';
Deno.serve(async request=>{
  const reply=(status:number)=>new Response(null,{status,headers:{'cache-control':'no-store'}});
  if(request.method!=='POST')return reply(405);
  if(Number(request.headers.get('content-length')||0)>1024)return reply(413);
  try{
    const raw=await request.text();if(new TextEncoder().encode(raw).length>1024)return reply(413);
    const input=JSON.parse(raw);if(!validVisit(input))return reply(400);
    const result=await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/record_redscore_visit`,{
      method:'POST',signal:AbortSignal.timeout(4000),headers:{'content-type':'application/json',apikey:Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'',authorization:`Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||''}`},
      body:JSON.stringify({p_route:input.route,p_session:input.session}),
    });
    return reply(result.ok?204:503);
  }catch{return reply(503);}
});
