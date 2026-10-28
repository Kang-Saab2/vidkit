import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { waitForMedia,encodeCanvas,captureVideoFrames } from '../src/services/browserFrames.js';

class SeekingVideo extends EventTarget {
 duration=10;videoWidth=1920;videoHeight=1080;readyState=2;seeking=false;time=0;seeks=[];
 get currentTime(){return this.time;}
 set currentTime(value){this.seeks.push(value);this.seeking=true;queueMicrotask(()=>{this.time=value;this.seeking=false;this.dispatchEvent(new Event('seeked'));});}
}
test('browser extraction seeks all five frames and produces image previews and a timestamp ZIP',async()=>{
 const video=new SeekingVideo(),drawn=[],stages=[],progress=[];
 const canvas={width:0,height:0,getContext:()=>({drawImage:(source,x,y,w,h)=>drawn.push([source.currentTime,w,h])}),toBlob:(callback,type)=>queueMicrotask(()=>callback(new Blob([String(video.currentTime)],{type})))};
 const result=await captureVideoFrames(video,canvas,{start:0,end:5,duration:10,step:'1',format:'jpg',edge:'640',quality:'4'},{signal:new AbortController().signal,onStatus:value=>stages.push(value),onProgress:value=>progress.push(value)});
 assert.deepEqual(video.seeks,[0,1,2,3,4]);assert.deepEqual(drawn.map(frame=>frame[0]),[0,1,2,3,4]);
 assert.ok(drawn.every(frame=>frame[1]===640&&frame[2]===360));assert.equal(result.count,5);assert.equal(result.images.length,5);
 assert.equal(stages[0],'Extracting frame 1 of 5…');assert.ok(stages.includes('Extracting frame 5 of 5…'));assert.ok(progress.at(-1)>98);
 const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());assert.equal(await zip.file('frame-000005.jpg').async('string'),'4');
 const manifest=JSON.parse(await zip.file('frames.json').async('string'));assert.equal(manifest.frames[4].scheduledTimeSeconds,4);
});
test('seeking to an already decoded time zero resolves without requiring a seeked event',async()=>{
 const video=new EventTarget();video.readyState=2;video.seeking=false;video.currentTime=0;
 await waitForMedia(video,{signal:new AbortController().signal,ready:()=>!video.seeking&&video.readyState>=2,timeoutMs:20});
});
test('every-frame capture uses source frame intervals and exports actual timestamps',async()=>{
 const video=new SeekingVideo(),drawn=[];
 const canvas={getContext:()=>({drawImage:source=>drawn.push(source.currentTime)}),toBlob:callback=>callback(new Blob(['image']))};
 const result=await captureVideoFrames(video,canvas,{start:0,end:.2,duration:10,step:'every',format:'png',timeline:{times:[0,.04,.1],seekTimes:[.02,.07,.15]}},{signal:new AbortController().signal});
 assert.deepEqual(drawn,[.02,.07,.15]);assert.equal(result.count,3);
 const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());const manifest=JSON.parse(await zip.file('frames.json').async('string'));
 assert.equal(manifest.mode,'every');assert.equal(manifest.intervalSeconds,null);assert.equal(manifest.frames[2].sourceTimeSeconds,.1);
});
test('cancelling during a seek rejects promptly',async()=>{
 const video=new EventTarget(),controller=new AbortController();
 const pending=waitForMedia(video,{signal:controller.signal,ready:()=>false,timeoutMs:20000});controller.abort();
 await assert.rejects(pending,{name:'AbortError'});
});
test('failed decoding and stalled canvas encoding report errors rather than waiting indefinitely',async()=>{
 const video=new EventTarget(),signal=new AbortController().signal;
 const pending=waitForMedia(video,{signal,ready:()=>false,timeoutMs:20});video.dispatchEvent(new Event('error'));
 await assert.rejects(pending,/could not decode/);
 await assert.rejects(encodeCanvas({toBlob:()=>{}},{type:'image/png',signal,timeoutMs:10}),/could not encode/);
});
