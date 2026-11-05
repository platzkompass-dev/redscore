// Manual submission of public sitemap URLs only. Dry run unless --submit is set.
import {readFile} from 'node:fs/promises';
const host='www.redscore.de',origin=`https://${host}`;
const key=(await readFile(new URL('../dist/indexnow-key.txt',import.meta.url),'utf8')).trim();
if(!/^[a-f0-9]{32}$/.test(key))throw Error('Invalid IndexNow verification key');
const sitemap=await readFile(new URL('../dist/sitemap.xml',import.meta.url),'utf8');
const urlList=[...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match=>match[1]))];
if(!urlList.length||urlList.length>10000||urlList.some(value=>{const url=new URL(value);return url.origin!==origin||url.search||url.hash;}))throw Error('Only canonical public RedScore URLs may be submitted');
const payload={host,key,keyLocation:`${origin}/indexnow-key.txt`,urlList};
if(!process.argv.includes('--submit')){
  console.log(JSON.stringify({dryRun:true,host,urls:urlList},null,2));
}else{
  const verification=await fetch(payload.keyLocation,{redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!verification.ok||(await verification.text()).trim()!==key)throw Error('Published verification file does not match');
  const response=await fetch('https://api.indexnow.org/indexnow',{method:'POST',redirect:'error',headers:{'content-type':'application/json; charset=utf-8'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
  console.log(JSON.stringify({status:response.status,submittedUrls:urlList.length,accepted:[200,202].includes(response.status),indexingConfirmed:false}));
  if(![200,202].includes(response.status))process.exitCode=1;
}
