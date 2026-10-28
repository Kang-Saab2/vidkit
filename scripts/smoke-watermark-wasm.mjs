import { readFile,mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { buildWatermarkPlan,watermarkPosition } from '../src/services/watermarkOperations.js';
const cwd=resolve('.test-output/watermark');await mkdir(cwd,{recursive:true});
const png=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','color=white:s=16x12','-frames:v','1','-threads','1','mark.png'],{cwd,windowsHide:true,encoding:'utf8'});if(png.error)throw png.error;if(png.status!==0)throw new Error(png.stderr);
globalThis.self={location:{href:new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js',import.meta.url).href}};
const createCore=createRequire(import.meta.url)('@ffmpeg/core');
const wasmBinary=new Uint8Array(await readFile(new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm',import.meta.url)));
const sourceBytes=new Uint8Array(await readFile(new URL('../.test-output/edits/audio.mp4',import.meta.url)));
const silentBytes=new Uint8Array(await readFile(new URL('../.test-output/edits/silent.mp4',import.meta.url)));
let core;const logs=[];
const asset={width:16,height:12,blob:new Blob([await readFile(resolve(cwd,'mark.png'))])};
function exec(args){const code=core.exec(...args);core.reset();assert.equal(code,0,logs.join('\n'));}
async function run(plan){core=await createCore({wasmBinary});logs.length=0;core.setLogger(({message})=>{logs.push(message);if(logs.length>20)logs.shift();});core.FS.writeFile('source.mp4',sourceBytes);core.FS.writeFile('silent.mp4',silentBytes);for(const file of plan.binaryFiles)core.FS.writeFile(file.path,new Uint8Array(await file.blob.arrayBuffer()));for(const command of plan.commands)exec(command.args);core.ffprobe('-v','error','-show_streams','-show_format','-of','json','output.mp4','-o','probe.json');core.reset();return JSON.parse(new TextDecoder().decode(core.FS.readFile('probe.json')));}
function pixel(time,x,y,width){exec(['-ss',String(time),'-i','output.mp4','-frames:v','1','-f','rawvideo','-pix_fmt','rgb24','frame.rgb']);const bytes=core.FS.readFile('frame.rgb'),offset=(y*width+x)*3;return Array.from(bytes.slice(offset,offset+3));}
let info=await run(buildWatermarkPlan({input:'source.mp4',duration:1,width:96,height:64,asset,x:50,y:50,opacity:100}));
assert.ok(Math.abs(Number(info.format.duration)-1)<.15);assert.ok(info.streams.some(s=>s.codec_type==='audio'));
const center=watermarkPosition({width:96,height:64},asset,50,50);
for(const time of [0,.8])assert.ok(pixel(time,center.x+8,center.y+6,96).filter(v=>v>220).length===3,'Overlay must persist through the entire video');
info=await run(buildWatermarkPlan({input:'source.mp4',duration:1,width:96,height:64,asset,x:0,y:0,opacity:50,mute:true}));assert.ok(!info.streams.some(s=>s.codec_type==='audio'));
assert.ok(Math.abs(Number(info.format.duration)-1)<.15);assert.ok(Number(info.streams.find(s=>s.codec_type==='video').nb_frames)>=12);
const corner=watermarkPosition({width:96,height:64},asset,0,0),blended=pixel(.4,corner.x+8,corner.y+6,96);assert.ok(blended[0]>220&&blended[1]>90&&blended[1]<165&&blended[2]>90&&blended[2]<165,`Incorrect alpha blend: ${blended}`);
info=await run(buildWatermarkPlan({input:'silent.mp4',duration:1.5,width:64,height:96,asset,opacity:70}));assert.ok(!info.streams.some(s=>s.codec_type==='audio'));
console.log('Actual WASM watermark checks passed: pixel placement, alpha blending, full-duration overlay, audio preservation/removal, and silent portrait input.');

