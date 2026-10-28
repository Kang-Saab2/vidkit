import test from 'node:test';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { tempoFilters,buildSpeedPlan,buildReversePlan,buildFramesPlan,buildConversionPlan } from '../src/services/playbackOperations.js';
import { collectFrames } from '../src/services/collectFrames.js';

test('speed extremes chain supported audio tempos and reject invalid rates',()=>{
 assert.equal(tempoFilters(.25),'atempo=0.5,atempo=0.5');assert.equal(tempoFilters(4),'atempo=2,atempo=2');
 assert.throws(()=>tempoFilters(0));assert.throws(()=>tempoFilters(NaN));
 const plan=buildSpeedPlan({input:'x.mp4',start:1,end:3,duration:4,speed:2});
 assert.equal(plan.commands[0].duration,1);assert.match(plan.commands[0].args.join(' '),/setpts=\(PTS-STARTPTS\)\/2/);
});
test('reverse bounds its decoded frame memory and can omit or preserve audio direction',()=>{
 const base={input:'x.mp4',start:0,end:5,duration:30,width:1920,height:1080};
 assert.throws(()=>buildReversePlan({...base,end:16}),/15 seconds/);
 assert.throws(()=>buildReversePlan({...base,width:1920,height:1920,edge:'720',end:15}),/memory/);
 const args=buildReversePlan({...base,audio:'keep'}).commands[0].args;
 assert.ok(!args.join(' ').includes('areverse'));assert.match(args.join(' '),/fps=24,reverse/);
 assert.ok(buildReversePlan({...base,audio:'mute'}).commands[0].args.includes('-an'));
});
test('frame extraction caps output count and uses numbered image files',()=>{
 const plan=buildFramesPlan({input:'x.mp4',start:2,end:5,duration:8,step:'0.5',format:'png'});
 assert.equal(plan.frameOutput.maxCount,6);assert.equal(plan.commands.length,6);
 assert.ok(plan.commands[0].args.includes('frame-000001.png'));
 assert.ok(plan.commands[5].args.includes('frame-000006.png'));
 assert.equal(plan.commands[5].args[plan.commands[5].args.indexOf('-ss')+1],'4.500');
 assert.ok(plan.commands.every(command=>command.timeoutMs===60000&&command.args[command.args.indexOf('-frames:v')+1]==='1'));
 assert.throws(()=>buildFramesPlan({input:'x',start:0,end:121,duration:200,step:'1'}),/120 frames/);
});
test('converter pairs container codecs and avoids MP4-only flags in WebM or MKV',()=>{
 for(const format of ['mp4','webm','mov','mkv']){
  const plan=buildConversionPlan({input:'x.mp4',duration:2,format});
  assert.equal(plan.output,`output.${format}`);
  assert.ok(plan.commands[0].args.includes(format==='webm'?'libvpx':'libx264'));
  assert.equal(plan.commands[0].args.includes('+faststart'),['mp4','mov'].includes(format));
 }
 assert.throws(()=>buildConversionPlan({input:'x',duration:2,format:'anything'}));
});
test('frame ZIP contains sorted images and timestamps and releases virtual files',async()=>{
 const deleted=[],files={'frame-000002.jpg':new Uint8Array([4,5,6]),'frame-000001.jpg':new Uint8Array([1,2,3])};
 const engine={listDir:async()=>[...Object.keys(files).map(name=>({name,isDir:false})),{name:'input.mp4',isDir:false}],readFile:async name=>files[name],deleteFile:async name=>deleted.push(name)};
 const result=await collectFrames(engine,{format:'jpg',start:2,step:.5,maxCount:2});
 assert.equal(result.count,2);assert.equal(result.images[1].time,2.5);assert.equal(deleted.length,2);
 const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());assert.ok(zip.file('frame-000001.jpg'));
 const manifest=JSON.parse(await zip.file('frames.json').async('string'));assert.equal(manifest.frames[1].scheduledTimeSeconds,2.5);
 await assert.rejects(collectFrames(engine,{format:'jpg',start:0,step:1,maxCount:2},{checkCancelled:()=>{throw new DOMException('Cancelled','AbortError');}}),{name:'AbortError'});
});

