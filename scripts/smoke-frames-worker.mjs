import { Worker } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { buildFramesPlan } from '../src/services/playbackOperations.js';
import { collectFrames } from '../src/services/collectFrames.js';
import { executeMediaCommand } from '../src/services/executeMediaCommand.js';
const worker=new Worker(new URL('./ffmpeg-worker-test-host.mjs',import.meta.url));
let id=0,progressEvents=0;const pending=new Map();
worker.on('message',message=>{
 if(message.type==='PROGRESS'){progressEvents++;return;}
 if(message.type==='LOG')return;
 const operation=pending.get(message.id);if(!operation)return;
 pending.delete(message.id);clearTimeout(operation.timer);
 if(message.type==='ERROR')operation.reject(new Error(String(message.data)));else operation.resolve(message.data);
});
worker.on('error',error=>{for(const operation of pending.values()){clearTimeout(operation.timer);operation.reject(error);}pending.clear();});
function send(type,data){return new Promise((resolve,reject)=>{const messageId=id++;const timer=setTimeout(()=>{pending.delete(messageId);reject(new Error(`${type} did not respond`));},30000);pending.set(messageId,{resolve,reject,timer});worker.postMessage({id:messageId,type,data});});}
try{
 await send('LOAD',{coreURL:new URL('../public/ffmpeg/ffmpeg-core.js',import.meta.url).href,wasmURL:new URL('../public/ffmpeg/ffmpeg-core.wasm',import.meta.url).href});
 await send('WRITE_FILE',{path:'input.mp4',data:new Uint8Array(await readFile(new URL('../.test-output/playback/source.mp4',import.meta.url)))});
 const plan=buildFramesPlan({input:'input.mp4',start:0,end:1,duration:1,step:'0.5'});
 const completed=[];
 for(const command of plan.commands){
  assert.equal(await executeMediaCommand({exec:(args,timeout)=>send('EXEC',{args,timeout}),terminate:()=>worker.terminate()},command),0);
  completed.push(command.label);
 }
 assert.deepEqual(completed,['Extracting frame 1 of 2…','Extracting frame 2 of 2…']);
 const result=await collectFrames({listDir:path=>send('LIST_DIR',{path}),readFile:path=>send('READ_FILE',{path}),deleteFile:path=>send('DELETE_FILE',{path})},plan.frameOutput);
 const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());assert.equal(result.count,2);assert.ok(zip.file('frames.json'));
 console.log(`Actual worker protocol passed: ${result.count} frames, ZIP, previews. FFmpeg progress events: ${progressEvents}.`);
}finally{await worker.terminate();}
