import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import JSZip from 'jszip';
import { buildSpeedPlan,buildReversePlan,buildFramesPlan,buildConversionPlan } from '../src/services/playbackOperations.js';
import { collectFrames } from '../src/services/collectFrames.js';

const cwd=resolve('.test-output/playback');await mkdir(cwd,{recursive:true});
const colors=[[255,0,0],[0,255,0],[0,0,255]],rgb=Buffer.alloc(96*64*3*12);
for(let f=0;f<12;f++)for(let p=0;p<96*64;p++)rgb.set(colors[Math.floor(f/4)],(f*96*64+p)*3);
await writeFile(resolve(cwd,'sequence.rgb'),rgb);
function native(args){const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{cwd,windowsHide:true,encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw new Error(result.stderr);}
native(['-f','rawvideo','-pix_fmt','rgb24','-s','96x64','-r','12','-i','sequence.rgb','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','source.mp4']);
native(['-i','source.mp4','-an','-c:v','copy','silent.mp4']);
globalThis.self={location:{href:new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js',import.meta.url).href}};
const createCore=createRequire(import.meta.url)('@ffmpeg/core');
const core=await createCore({wasmBinary:new Uint8Array(await readFile(new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm',import.meta.url)))});
const logs=[];core.setLogger(({message})=>{logs.push(message);if(logs.length>25)logs.shift();});
core.FS.writeFile('source.mp4',new Uint8Array(await readFile(resolve(cwd,'source.mp4'))));core.FS.writeFile('silent.mp4',new Uint8Array(await readFile(resolve(cwd,'silent.mp4'))));
function exec(args){let code;try{code=core.exec(...args);}catch(error){console.error('Failed command:',args.join(' '));console.error(logs.join('\n'));throw error;}core.reset();assert.equal(code,0,logs.join('\n'));}
function probe(file){core.ffprobe('-v','error','-show_streams','-show_format','-of','json',file,'-o','probe.json');core.reset();return JSON.parse(new TextDecoder().decode(core.FS.readFile('probe.json')));}
function run(plan){for(const command of plan.commands)exec(command.args);return plan.frameOutput?null:probe(plan.output);}
function frame(file,time=0){exec(['-ss',String(time),'-i',file,'-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','frame.rgb']);return core.FS.readFile('frame.rgb');}
const range={input:'source.mp4',start:0,end:1,duration:1};
for(const speed of [.25,.5,1,2,4]){
 const info=run(buildSpeedPlan({...range,speed}));assert.ok(Math.abs(Number(info.format.duration)-1/speed)<.2,`Incorrect duration at ${speed}x: ${info.format.duration}`);assert.ok(info.streams.some(s=>s.codec_type==='audio'));
 if(speed===.5||speed===2){
  exec(['-i','output.mp4','-map','0:a:0','-ac','1','-ar','48000','-f','s16le','audio.pcm']);
  const data=core.FS.readFile('audio.pcm'),view=new DataView(data.buffer,data.byteOffset,data.byteLength),start=Math.floor(data.length/2*.2),end=Math.floor(data.length/2*.8);let crossings=0;
  for(let i=start+1;i<end;i++)if(view.getInt16((i-1)*2,true)<=0&&view.getInt16(i*2,true)>0)crossings++;
  const frequency=crossings/((end-start)/48000);assert.ok(Math.abs(frequency-440)<25,`Pitch changed at ${speed}x: ${frequency} Hz`);
 }
}
let info=run(buildSpeedPlan({...range,input:'silent.mp4',speed:2}));assert.ok(!info.streams.some(s=>s.codec_type==='audio'));
for(const audio of ['reverse','keep','mute']){
 info=run(buildReversePlan({...range,width:96,height:64,audio}));assert.equal(info.streams.some(s=>s.codec_type==='audio'),audio!=='mute');
 const bytes=frame('output.mp4'),center=(32*96+48)*3;assert.ok(bytes[center+2]>180&&bytes[center]<60,'Reversed video must begin with the blue final frames');
}
info=run(buildReversePlan({...range,input:'silent.mp4',width:96,height:64}));assert.ok(!info.streams.some(s=>s.codec_type==='audio'));
for(const format of ['mp4','webm','mov','mkv']){
 info=run(buildConversionPlan({input:'source.mp4',duration:1,format}));assert.equal(info.streams.find(s=>s.codec_type==='video').codec_name,format==='webm'?'vp8':'h264');assert.equal(info.streams.find(s=>s.codec_type==='audio').codec_name,format==='webm'?'opus':'aac');assert.ok(Math.abs(Number(info.format.duration)-1)<.2);
}
const engine={listDir:async()=>core.FS.readdir('/').map(name=>({name,isDir:core.FS.isDir(core.FS.stat('/'+name).mode)})),readFile:async name=>core.FS.readFile(name),deleteFile:async name=>core.FS.unlink(name)};
for(const format of ['jpg','png']){
 const plan=buildFramesPlan({...range,step:'0.5',format});run(plan);
 const result=await collectFrames(engine,plan.frameOutput);assert.equal(result.count,2);
 const zip=await JSZip.loadAsync(await result.blob.arrayBuffer());assert.ok(zip.file(`frame-000001.${format}`));assert.ok(zip.file('frames.json'));
 core.FS.writeFile('image.'+format,new Uint8Array(await result.images[0].blob.arrayBuffer()));const first=probe('image.'+format).streams[0];assert.equal(first.width,96);assert.equal(first.height,64);
}
console.log('Actual WASM checks passed: speed duration and audio pitch, silent inputs, reverse frame order and all audio modes, four converter codec pairs, JPEG/PNG extraction and ZIP timestamps.');


