import test from 'node:test';
import assert from 'node:assert/strict';
import { buildCompressionPlan, buildMP3Plan, buildGIFPlan, mediaFilename } from '../src/services/mediaOperations.js';

test('compressor bounds portrait and landscape resolution without upscaling and maps optional audio',()=>{
  const plan=buildCompressionPlan({input:'input.mov',duration:8});
  const args=plan.commands[0].args;
  assert.match(args[args.indexOf('-vf')+1],/1280\/max\(iw,ih\)/);
  assert.match(args[args.indexOf('-vf')+1],/min\(1,/);
  assert.ok(args.includes('0:a:0?'));
  assert.ok(args.includes('libx264'));
  assert.equal(plan.mime,'video/mp4');
  const muted=buildCompressionPlan({input:'input.mp4',duration:8,mute:true,resolution:'original'}).commands[0].args;
  assert.ok(muted.includes('-an'));assert.ok(!muted.includes('0:a:0?'));
  assert.throws(()=>buildCompressionPlan({input:'x',duration:8,quality:'invalid'}));
});
test('MP3 requires an audio stream, bounds extraction, and uses selected audio encoding settings',()=>{
  const plan=buildMP3Plan({input:'input.mp4',start:1.25,end:3.75,duration:8,bitrate:'320',channels:'mono',sampleRate:'48000'});
  const args=plan.commands[0].args;
  assert.equal(args[args.indexOf('-t')+1],'2.500');
  assert.ok(plan.requiresAudio);assert.ok(args.includes('0:a:0'));assert.ok(args.includes('libmp3lame'));
  assert.ok(args.includes('320k'));assert.equal(args[args.indexOf('-ac')+1],'1');
  assert.throws(()=>buildMP3Plan({input:'x',start:5,end:3,duration:8}));
});
test('GIF limits duration and dimensions and generates a palette only from the selected clip',()=>{
  const plan=buildGIFPlan({input:'input.mp4',start:2,end:4,duration:8,width:'360',fps:'15',loop:false});
  assert.equal(plan.commands.length,2);
  const palette=plan.commands[0].args, gif=plan.commands[1].args;
  assert.ok(palette.indexOf('-t')<palette.indexOf('-i'));
  assert.match(palette[palette.indexOf('-vf')+1],/palettegen/);
  assert.match(gif[gif.indexOf('-filter_complex')+1],/min\(720,ih\)/);
  assert.ok(gif.includes('palette.png'));assert.ok(gif.includes('-an'));
  assert.equal(gif[gif.indexOf('-loop')+1],'-1');
  assert.throws(()=>buildGIFPlan({input:'x',start:0,end:31,duration:40}),/30 seconds/);
  assert.throws(()=>buildGIFPlan({input:'x',start:0,end:3,duration:8,width:'9000'}));
});
test('export names retain a readable basename without unsafe path characters',()=>{
  assert.equal(mediaFilename('../My <video>.mov','compressed','mp4'),'My video-compressed.mp4');
});
