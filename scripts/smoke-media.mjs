import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { buildCompressionPlan, buildMP3Plan, buildGIFPlan } from '../src/services/mediaOperations.js';

// Optional integration check: requires native ffmpeg and ffprobe on PATH.
// It validates the same command plans used by the browser; it does not exercise WebAssembly.
const cwd=resolve('.test-output/media');await mkdir(cwd,{recursive:true});
function run(command,args){const result=spawnSync(command,args,{cwd,encoding:'utf8',windowsHide:true});if(result.error)throw result.error;if(result.status!==0)throw new Error(result.stderr);return result.stdout;}
function probe(file){return JSON.parse(run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file]));}
function execute(plan){for(const {args} of plan.commands)run('ffmpeg',['-hide_banner','-loglevel','error','-y',...args]);return probe(plan.output);}
run('ffmpeg',['-hide_banner','-loglevel','error','-y','-f','lavfi','-i','testsrc2=size=640x360:rate=24','-f','lavfi','-i','sine=frequency=440:sample_rate=44100','-t','4','-c:v','libx264','-preset','ultrafast','-c:a','aac','source.mp4']);
const compressed=execute(buildCompressionPlan({input:'source.mp4',duration:4,resolution:'480',quality:'small',mute:true}));
assert.equal(compressed.streams[0].codec_name,'h264');assert.equal(compressed.streams.filter(s=>s.codec_type==='audio').length,0);
assert.ok(Math.abs(Number(compressed.format.duration)-4)<.15);
const mp3=execute(buildMP3Plan({input:'source.mp4',duration:4,start:1,end:3,channels:'mono',sampleRate:'48000'}));
assert.equal(mp3.streams[0].codec_name,'mp3');assert.equal(mp3.streams[0].channels,1);assert.equal(mp3.streams[0].sample_rate,'48000');assert.ok(Math.abs(Number(mp3.format.duration)-2)<.15);
const gif=execute(buildGIFPlan({input:'source.mp4',duration:4,start:1,end:3,width:'240',fps:'10',loop:true}));
assert.equal(gif.streams[0].codec_name,'gif');assert.equal(gif.streams[0].width,240);assert.ok(Math.abs(Number(gif.format.duration)-2)<.2);
assert.ok((await readFile(resolve(cwd,'output.gif'))).includes(Buffer.from('NETSCAPE2.0')));
execute(buildGIFPlan({input:'source.mp4',duration:4,start:0,end:1,width:'240',loop:false}));
assert.ok(!(await readFile(resolve(cwd,'output.gif'))).includes(Buffer.from('NETSCAPE2.0')));
// Silent input remains valid for video exports; audio extraction must fail.
await copyFile(resolve(cwd,'output.mp4'),resolve(cwd,'silent.mp4'));
const silent=execute(buildCompressionPlan({input:'silent.mp4',duration:4,mute:false}));
assert.ok(!silent.streams.some(s=>s.codec_type==='audio'));
const silentProbe=JSON.parse(run('ffprobe',['-v','error','-select_streams','a:0','-show_entries','stream=codec_type','-of','json','output.mp4']));
assert.equal(silentProbe.streams.length,0);
console.log('Native integration checks passed: H.264 compression, silent video, MP3 duration/channels/sample rate, GIF duration/dimensions, looping and play-once.');
