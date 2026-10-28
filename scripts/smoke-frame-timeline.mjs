import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { selectFrameTimeline } from '../src/services/frameTimeline.js';
// Uses the 12 fps generated clip from smoke-playback-wasm.mjs.
globalThis.self={location:{href:new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js',import.meta.url).href}};
const core=await createRequire(import.meta.url)('@ffmpeg/core')({wasmBinary:new Uint8Array(await readFile(new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm',import.meta.url)))});
core.FS.writeFile('input.mp4',new Uint8Array(await readFile(new URL('../.test-output/playback/source.mp4',import.meta.url))));
core.ffprobe('-v','error','-select_streams','v:0','-show_packets','-show_entries','packet=pts_time,duration_time:format=start_time','-of','json','input.mp4','-o','timeline.json');
const data=JSON.parse(new TextDecoder().decode(core.FS.readFile('timeline.json')));
const timeline=selectFrameTimeline(data,0,1);assert.equal(timeline.times.length,12);assert.equal(timeline.times[0],0);assert.ok(timeline.times.every((time,i)=>i===0||time>timeline.times[i-1]));
console.log('Actual WASM metadata check passed: all 12 source-frame timestamps, sorted correctly without decoding video.');
