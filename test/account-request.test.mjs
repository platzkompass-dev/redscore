import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const source=await readFile(new URL('../dist/app.js',import.meta.url),'utf8');
const requestSource=source.replaceAll('\r','').match(/async function accountRequest\([\s\S]*?\n}\n/)[0];
test('an HTML firewall rejection explains the wait in both languages without discarding its status',async()=>{
  for(const language of ['de','en']){
    const context=vm.createContext({session:null,AbortSignal,getLanguage:()=>language,fetch:async()=>new Response('<html>blocked</html>',{status:429})});
    vm.runInContext(requestSource,context);
    await assert.rejects(context.accountRequest('sign_in'),error=>error.status===429&&(language==='de'?error.message.includes('eine Minute'):error.message.includes('a minute'))&&!error.message.includes('<html>'));
  }
});
test('ordinary account errors retain the existing server explanation',async()=>{
  const context=vm.createContext({session:null,AbortSignal,getLanguage:()=> 'de',fetch:async()=>Response.json({error:'Link abgelaufen'},{status:401})});
  vm.runInContext(requestSource,context);
  await assert.rejects(context.accountRequest('check_password_reset'),error=>error.status===401&&error.message==='Link abgelaufen');
});
