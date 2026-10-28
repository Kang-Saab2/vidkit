import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { buildResizePlan,buildCropPlan } from '../src/services/spatialOperations.js';
// Run smoke-edits-wasm.mjs first to generate the colored-quadrant fixtures.
globalThis.self={location:{href:new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js',import.meta.url).href}};
const createCore=createRequire(import.meta.url)('@ffmpeg/core');
const core=await createCore({wasmBinary:new Uint8Array(await readFile(new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm',import.meta.url)))});
const logs=[];core.setLogger(({message})=>{logs.push(message);if(logs.length>20)logs.shift();});
core.FS.writeFile('source.mp4',new Uint8Array(await readFile(new URL('../.test-output/edits/audio.mp4',import.meta.url))));
core.FS.writeFile('silent.mp4',new Uint8Array(await readFile(new URL('../.test-output/edits/silent.mp4',import.meta.url))));
function exec(args){const code=core.exec(...args);core.reset();assert.equal(code,0,logs.join('\n'));}
function probe(){core.ffprobe('-v','error','-show_streams','-show_format','-of','json','output.mp4','-o','probe.json');core.reset();return JSON.parse(new TextDecoder().decode(core.FS.readFile('probe.json')));}
function run(plan){for(const command of plan.commands)exec(command.args);return probe();}
function pixels(){exec(['-i','output.mp4','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','frame.rgb']);return core.FS.readFile('frame.rgb');}
function pixel(data,width,x,y){const offset=(y*width+x)*3;return Array.from(data.slice(offset,offset+3));}
for(const fit of ['contain','cover','stretch']){
 const info=run(buildResizePlan({input:'source.mp4',duration:1,width:96,height:96,fit}));
 const video=info.streams.find(s=>s.codec_type==='video');assert.equal(video.width,96);assert.equal(video.height,96);assert.ok(info.streams.some(s=>s.codec_type==='audio'));assert.ok(Math.abs(Number(info.format.duration)-1)<.15);
 const top=pixel(pixels(),96,24,4);
 if(fit==='contain')assert.ok(top.every(v=>v<20),'Contain must pad the top with black');else assert.ok(top[0]>150&&top[1]<80&&top[2]<80,'Fill/stretch must occupy the output canvas');
}
for(const [crop,channel] of [[{x:0,y:0,width:48,height:32},0],[{x:48,y:0,width:48,height:32},1],[{x:0,y:32,width:48,height:32},2]]){
 const info=run(buildCropPlan({input:'source.mp4',duration:1,width:96,height:64,crop}));
 const video=info.streams.find(s=>s.codec_type==='video');assert.equal(video.width,48);assert.equal(video.height,32);assert.ok(info.streams.some(s=>s.codec_type==='audio'));
 const center=pixel(pixels(),48,24,16);assert.ok(center[channel]>180&&center.filter((_,i)=>i!==channel).every(v=>v<70),`Incorrect crop placement: ${center}`);
}
const muted=run(buildResizePlan({input:'source.mp4',duration:1,width:64,height:96,fit:'contain',mute:true}));assert.ok(!muted.streams.some(s=>s.codec_type==='audio'));
const silent=run(buildCropPlan({input:'silent.mp4',duration:1.5,width:64,height:96,crop:{x:0,y:0,width:32,height:48}}));assert.ok(!silent.streams.some(s=>s.codec_type==='audio'));
console.log('Actual WASM checks passed: all resize fit modes, exact output dimensions, padding pixels, crop placement by pixel colors, audio preservation, muted output, and silent sources.');
