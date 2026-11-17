import {createHash,randomUUID} from 'node:crypto';
const MAX=3*1024*1024;
const actions=new Set(['snapshot','earn','start_lesson','complete_lesson','redeem','review_proof','save_reward','fulfil','save_video','proof_url']);
const counters=new Map();
const json=(status,data)=>Response.json(data,{status,headers:{'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'}});
export function certificateType(bytes){
 if(bytes.length>=5&&Buffer.from(bytes.subarray(0,5)).toString()==='%PDF-')return {mime:'application/pdf',ext:'pdf'};
 if(bytes.length>=8&&Buffer.from(bytes.subarray(0,8)).equals(Buffer.from([137,80,78,71,13,10,26,10])))return {mime:'image/png',ext:'png'};
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return {mime:'image/jpeg',ext:'jpg'};
 return null;
}
async function boundedBody(request,max){const reader=request.body?.getReader();if(!reader)return new Uint8Array();const chunks=[];let size=0;while(true){const{done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw Error('Datei oder Anfrage ist zu groß.')}chunks.push(value);}return Buffer.concat(chunks);}
export async function POST(request){
 let base,key;
 try{base=new URL(process.env.SUPABASE_URL||'');key=process.env.SUPABASE_ANON_KEY||process.env.SUPABASE_PUBLISHABLE_KEY;if(base.protocol!=='https:'||!base.hostname.endsWith('.supabase.co')||!key)return json(503,{error:'RedRewards ist noch nicht verfügbar.'});}catch{return json(503,{error:'RedRewards ist noch nicht verfügbar.'});}
 const auth=request.headers.get('authorization')||'';if(!/^Bearer [A-Za-z0-9._~-]+$/.test(auth))return json(401,{error:'Bitte melde dich an.'});
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin&&!['https://www.redscore.de','https://redscore.de'].includes(origin))return json(403,{error:'Anfrage nicht erlaubt.'});
 const headers={apikey:key,authorization:auth};
 async function upstream(path,init={}){return fetch(new URL(path,base),{...init,headers:{...headers,...init.headers},signal:AbortSignal.timeout(15000),redirect:'error'});}
 async function rpc(action,data){const r=await upstream('/rest/v1/rpc/red_rewards',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({p_action:action,p_data:data||{}})});const result=await r.json();if(!r.ok){const safe=String(result.message||'Aktion konnte nicht ausgeführt werden.');throw Error(/duplicate key/i.test(safe)?'Dieser Nachweis wurde bereits eingereicht.':safe.includes('constraint')?'Bitte prüfe deine Eingaben.':safe);}return result;}
 try{
  const userResponse=await upstream('/auth/v1/user');if(!userResponse.ok)return json(401,{error:'Deine Anmeldung ist abgelaufen. Bitte melde dich erneut an.'});const user=await userResponse.json();
  const now=Date.now(),counter=counters.get(user.id);if(counter&&now-counter.at<60000&&counter.count>=40)return json(429,{error:'Bitte warte einen Moment.'});counters.set(user.id,counter&&now-counter.at<60000?{at:counter.at,count:counter.count+1}:{at:now,count:1});if(counters.size>5000)for(const[id,v]of counters)if(now-v.at>60000)counters.delete(id);
  if((request.headers.get('content-type')||'').startsWith('multipart/form-data')){
   const raw=await boundedBody(request,MAX+16000);const form=await new Request(request.url,{method:'POST',headers:{'content-type':request.headers.get('content-type')},body:raw}).formData();const file=form.get('certificate');
   if(!file||typeof file==='string'||file.size<20||file.size>MAX)return json(400,{error:'Bitte lade eine PDF-, JPG- oder PNG-Datei bis 3 MB hoch.'});
   const provider=String(form.get('provider')||'').trim(),date=String(form.get('course_date')||'');if(provider.length<2||provider.length>120||!/^\d{4}-\d{2}-\d{2}$/.test(date))return json(400,{error:'Bitte Kursanbieter und Kursdatum angeben.'});
   const bytes=new Uint8Array(await file.arrayBuffer()),type=certificateType(bytes);if(!type)return json(400,{error:'Dateiformat nicht unterstützt. Erlaubt sind PDF, JPG und PNG.'});
   const snapshot=await rpc('snapshot');if(snapshot.proofs.filter(p=>p.status==='pending').length>=3)return json(400,{error:'Es sind bereits drei Nachweise in Prüfung.'});
   const path=`${user.id}/${randomUUID()}.${type.ext}`;const upload=await upstream('/storage/v1/object/reward-proofs/'+path,{method:'POST',headers:{'content-type':type.mime,'x-upsert':'false'},body:bytes});if(!upload.ok)throw Error('Nachweis konnte nicht sicher gespeichert werden.');
   try{await rpc('submit_proof',{provider,course_date:date,path,hash:createHash('sha256').update(bytes).digest('hex')});}catch(error){try{await upstream('/storage/v1/object/reward-proofs',{method:'DELETE',headers:{'content-type':'application/json'},body:JSON.stringify({prefixes:[path]})});}catch{}throw error;}return json(200,{ok:true});
  }
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))return json(415,{error:'Ungültiges Anfrageformat.'});
  const input=JSON.parse(new TextDecoder().decode(await boundedBody(request,8000)));if(!actions.has(input.action))return json(400,{error:'Unbekannte Aktion.'});
  if(input.action==='proof_url'){const{path}=await rpc('proof_path',{id:input.data?.id});const r=await upstream('/storage/v1/object/sign/reward-proofs/'+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({expiresIn:60,download:true})});if(!r.ok)throw Error('Nachweis konnte nicht geöffnet werden.');const payload=await r.json();const url=new URL('/storage/v1'+payload.signedURL,base);if(url.origin!==base.origin)throw Error('Ungültiger Download.');return json(200,{url:url.href});}
  return json(200,await rpc(input.action,input.data));
 }catch(error){console.error('RedRewards request failed');const message=error instanceof Error?error.message:'';return json(400,{error:message&&message.length<200&&!/fetch|JSON|Unexpected|syntax|relation|column|permission/i.test(message)?message:'RedRewards ist vorübergehend nicht erreichbar. Bitte erneut versuchen.'});}
}
