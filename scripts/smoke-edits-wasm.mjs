import { readFile,writeFile,mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { buildEditPlan,buildMergePlan,inspectMergeInputs } from '../src/services/editOperations.js';

// Generates local fixtures using native FFmpeg, then tests the installed WASM core.
const cwd=resolve('.test-output/edits');await mkdir(cwd,{recursive:true});
const rgb=Buffer.alloc(96*64*3),palette=[[255,0,0],[0,255,0],[0,0,255],[255,255,0]];
for(let y=0;y<64;y++)for(let x=0;x<96;x++)rgb.set(palette[(y>=32?2:0)+(x>=48?1:0)],(y*96+x)*3);
await writeFile(resolve(cwd,'quadrants.rgb'),rgb);
function native(args){const result=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{cwd,windowsHide:true,encoding:'utf8'});if(result.error)throw result.error;if(result.status!==0)throw new Error(result.stderr);}
native(['-f','rawvideo','-pix_fmt','rgb24','-s','96x64','-r','12','-i','quadrants.rgb','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','audio.mp4']);
native(['-f','lavfi','-i','color=c=magenta:s=64x96:r=24','-t','1.5','-c:v','libx264','-pix_fmt','yuv420p','silent.mp4']);
globalThis.self={location:{href:new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js',import.meta.url).href}};
const createCore=createRequire(import.meta.url)('@ffmpeg/core');
const core=await createCore({wasmBinary:new Uint8Array(await readFile(new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm',import.meta.url)))});
const logs=[];core.setLogger(({message})=>{logs.push(message);if(logs.length>20)logs.shift();});
const engine={ffprobe:async args=>{const code=core.ffprobe(...args);core.reset();return code;},readFile:async name=>core.FS.readFile(name)};
function exec(args){const code=core.exec(...args);core.reset();assert.equal(code,0,logs.join('\n'));}
function probe(name){core.ffprobe('-v','error','-show_streams','-show_format','-of','json',name,'-o','probe.json');core.reset();return JSON.parse(new TextDecoder().decode(core.FS.readFile('probe.json')));}
function run(plan){for(const file of plan.virtualFiles||[])core.FS.writeFile(file.path,new TextEncoder().encode(file.content));for(const command of plan.commands)exec(command.args);return probe(plan.output);}
const audio=await readFile(resolve(cwd,'audio.mp4')),silent=await readFile(resolve(cwd,'silent.mp4'));
core.FS.writeFile('source.mp4',audio);core.FS.writeFile('silent.mp4',silent);
let info=run(buildEditPlan({input:'source.mp4',duration:1,operation:'mute'}));assert.ok(!info.streams.some(s=>s.codec_type==='audio'));
info=run(buildEditPlan({input:'silent.mp4',duration:1.5,operation:'mute'}));assert.ok(!info.streams.some(s=>s.codec_type==='audio'));
function frame(time=0){exec(['-ss',String(time),'-i','output.mp4','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','frame.rgb']);return core.FS.readFile('frame.rgb');}
function nearest(pixel){return palette.map(c=>c.reduce((sum,value,i)=>sum+(value-pixel[i])**2,0)).reduce((best,value,i,all)=>value<all[best]?i:best,0);}
const cases=[
 [{operation:'rotate',rotation:'90'},[2,0,3,1],64,96],
 [{operation:'rotate',rotation:'180'},[3,2,1,0],96,64],
 [{operation:'rotate',rotation:'270'},[1,3,0,2],64,96],
 [{operation:'flip',horizontal:true,vertical:false},[1,0,3,2],96,64],
 [{operation:'flip',horizontal:false,vertical:true},[2,3,0,1],96,64],
 [{operation:'flip',horizontal:true,vertical:true},[3,2,1,0],96,64],
];
for(const [settings,expected,width,height] of cases){
 info=run(buildEditPlan({input:'source.mp4',duration:1,...settings}));const stream=info.streams.find(s=>s.codec_type==='video');assert.equal(stream.width,width);assert.equal(stream.height,height);assert.ok(info.streams.some(s=>s.codec_type==='audio'));
 const pixels=frame();const actual=[.25,.75].flatMap(y=>[.25,.75].map(x=>{const offset=(Math.floor(y*height)*width+Math.floor(x*width))*3;return nearest(pixels.slice(offset,offset+3));}));assert.deepEqual(actual,expected);
}
core.FS.writeFile('input-0.mp4',audio);core.FS.writeFile('input-1.mp4',silent);
const clips=await inspectMergeInputs(engine,['input-0.mp4','input-1.mp4']);
info=run(buildMergePlan({clips,canvas:'square',fps:'24'}));
assert.equal(info.streams.find(s=>s.codec_type==='video').width,720);assert.ok(Math.abs(Number(info.format.duration)-2.5)<.2);assert.ok(info.streams.some(s=>s.codec_type==='audio'));
// The second, portrait clip must appear after the first, with silent audio.
const pixels=frame(1.3),center=(360*720+360)*3;assert.ok(pixels[center]>180&&pixels[center+1]<50&&pixels[center+2]>180);
exec(['-ss','1.3','-i','output.mp4','-t','0.5','-map','0:a:0','-ac','1','-ar','48000','-f','s16le','silence.pcm']);
const pcm=core.FS.readFile('silence.pcm');let peak=0;const view=new DataView(pcm.buffer,pcm.byteOffset,pcm.byteLength);for(let i=0;i+1<pcm.length;i+=2)peak=Math.max(peak,Math.abs(view.getInt16(i,true)));assert.ok(peak<100,`Silent clip audio peak: ${peak}`);
info=run(buildMergePlan({clips,canvas:'landscape',fps:'30',mute:true}));assert.ok(!info.streams.some(s=>s.codec_type==='audio'));
console.log('Actual WASM checks passed: remove audio (including silent source), all rotations and flip axes verified by pixel colors, mixed-size/audio merge order, duration, silence alignment, and muted merge.');
