import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';

test('local training media supports seeking, suffix ranges and captions',async()=>{
 const child=spawn(process.execPath,['server.mjs'],{cwd:new URL('..',import.meta.url),env:{...process.env,PORT:'0'},windowsHide:true,stdio:['ignore','pipe','pipe']});
 try {
  const base=await new Promise((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('Local media server did not start')),10000);
   child.once('error',reject);child.once('exit',code=>reject(Error('Local media server exited '+code)));
   child.stdout.on('data',chunk=>{const match=String(chunk).match(/http:\/\/127\.0\.0\.1:\d+/);if(match){clearTimeout(timeout);resolve(match[0]);}});
  });
  const path=base+'/media/training/redscore-erste-hilfe-de.mp4';
  const start=await fetch(path,{headers:{range:'bytes=0-127'}});
  assert.equal(start.status,206);assert.equal(start.headers.get('content-type'),'video/mp4');
  assert.match(start.headers.get('content-range'),/^bytes 0-127\/\d+$/);assert.equal((await start.arrayBuffer()).byteLength,128);
  const end=await fetch(path,{headers:{range:'bytes=-64'}});assert.equal(end.status,206);assert.equal((await end.arrayBuffer()).byteLength,64);
  const invalid=await fetch(path,{headers:{range:'bytes=999999999-'}});assert.equal(invalid.status,416);
  const captions=await fetch(base+'/media/training/redscore-erste-hilfe-de.vtt');assert.equal(captions.status,200);assert.match(captions.headers.get('content-type'),/^text\/vtt/);assert.ok((await captions.text()).startsWith('WEBVTT'));
 } finally {child.kill();}
});
