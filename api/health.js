const headers={'cache-control':'no-store','x-content-type-options':'nosniff'};
export function createHealthHandler({env=process.env,fetchImpl=fetch,now=Date.now}={}){
  let cached=null,expires=0,inFlight=null;
  return async()=>{
    let url;const key=env.SUPABASE_ANON_KEY||env.SUPABASE_PUBLISHABLE_KEY;
    try{url=new URL(env.SUPABASE_URL||'');if(url.protocol!=='https:'||!url.hostname.endsWith('.supabase.co')||url.username||url.password||url.port||!key)throw Error();}
    catch{return Response.json({ok:false,accountConfigured:false,liveLageConfigured:false,databaseReachable:false,checkedAt:new Date(now()).toISOString()},{status:503,headers});}
    async function inspect(){
      const base={accountConfigured:true,liveLageConfigured:true,checkedAt:new Date(now()).toISOString()};
      try{
        const response=await fetchImpl(new URL('/rest/v1/rpc/get_redscore_operational_health',url),{
          method:'POST',headers:{apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'},body:'{}',redirect:'error',signal:AbortSignal.timeout(3000),
        });
        if(!response.ok)throw Error();const value=await response.json();
        const fields=['enabledSources','freshSources','staleSources','failedSources'];
        if(!['healthy','degraded','unavailable'].includes(value.status)||fields.some(field=>!Number.isInteger(value[field])||value[field]<0||value[field]>1000))throw Error();
        const liveLage={status:value.status,...Object.fromEntries(fields.map(field=>[field,value[field]])),lastSuccessfulSync:typeof value.lastSuccessfulSync==='string'&&Number.isFinite(Date.parse(value.lastSuccessfulSync))?value.lastSuccessfulSync:null};
        return {...base,ok:liveLage.status!=='unavailable',databaseReachable:true,liveLage};
      }catch{return {...base,ok:false,databaseReachable:false,liveLage:{status:'unavailable'}};}
    }
    if(!cached||now()>=expires){
      if(!inFlight)inFlight=inspect().then(value=>{cached=value;expires=now()+(value.ok?15000:3000);return value;}).finally(()=>{inFlight=null;});
      await inFlight;
    }
    return Response.json(cached,{status:cached.ok?200:503,headers});
  };
}
export const GET=createHealthHandler();
