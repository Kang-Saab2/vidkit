import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { requireAudioTrack } from '../src/services/audioProbe.js';
import { buildMP3Plan } from '../src/services/mediaOperations.js';

// Run smoke-media.mjs first to generate local audio/silent video fixtures.
// Exercise the installed WebAssembly core directly: no browser or upload needed.
globalThis.self = { location: { href: new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.js', import.meta.url).href } };
const createCore = createRequire(import.meta.url)('@ffmpeg/core');
const core = await createCore({ wasmBinary: new Uint8Array(await readFile(new URL('../node_modules/@ffmpeg/core/dist/umd/ffmpeg-core.wasm', import.meta.url))) });
const logs=[];core.setLogger(({message})=>{logs.push(message);if(logs.length>25)logs.shift();});
const engine = {
  ffprobe: async args => { const code=core.ffprobe(...args);core.reset();return code; },
  readFile: async name => core.FS.readFile(name),
};
core.FS.writeFile('audio.mp4', new Uint8Array(await readFile(new URL('../.test-output/media/source.mp4', import.meta.url))));
core.FS.writeFile('silent.mp4', new Uint8Array(await readFile(new URL('../.test-output/media/silent.mp4', import.meta.url))));
await assert.doesNotReject(requireAudioTrack(engine, 'audio.mp4'));
for(const channels of ['mono','stereo']) {
  const plan=buildMP3Plan({input:'audio.mp4',start:1,end:3,duration:4,channels});
  for(const command of plan.commands){assert.equal(core.exec(...command.args),0,logs.join('\n'));core.reset();}
  const bytes=core.FS.readFile('output.mp3');assert.ok(bytes.length>1000);
  core.ffprobe('-v','error','-show_entries','stream=codec_name,channels,sample_rate:format=duration','-of','json','output.mp3','-o','result.json');core.reset();
  const result=JSON.parse(new TextDecoder().decode(core.FS.readFile('result.json')));
  assert.equal(result.streams[0].codec_name,'mp3');assert.equal(result.streams[0].channels,channels==='mono'?1:2);
  assert.equal(result.streams[0].sample_rate,'44100');assert.ok(Math.abs(Number(result.format.duration)-2)<.15);
}
await assert.rejects(requireAudioTrack(engine,'silent.mp4'),/no audio track/);
console.log('Actual WebAssembly regression passed: valid audio accepted; mono/stereo MP3 exports have correct codec, sample rate and duration; silent video rejected.');
