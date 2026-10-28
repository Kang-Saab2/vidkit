import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTrimCommand, formatTime, outputName, parseTime, validateRange } from '../src/services/trimSettings.js';

test('timecodes retain millisecond accuracy and reject invalid minutes or text', () => {
  assert.equal(parseTime('01:02:03.125'), 3723.125);
  assert.equal(parseTime('12.500'), 12.5);
  assert.equal(formatTime(59.9996), '00:01:00.000');
  assert.equal(formatTime(3723.125), '01:02:03.125');
  assert.ok(Number.isNaN(parseTime('00:65:00')));
  assert.ok(Number.isNaN(parseTime('invalid')));
  assert.ok(Number.isNaN(parseTime('-1')));
});
test('invalid, reversed, empty, and out-of-bounds selections cannot export', () => {
  for (const [start,end] of [[3,2],[2,2],[-1,2],[0,10.5],[NaN,2],[0,0.01]]) assert.throws(()=>validateRange(start,end,10));
  assert.doesNotThrow(()=>validateRange(1,1.1,10));
});
test('precise export cuts to duration, encodes H264, supports silent videos and strips metadata', () => {
  const args=buildTrimCommand({start:2.25,end:5.75,duration:8,input:'input.mov',output:'output.mp4'});
  assert.equal(args[args.indexOf('-t')+1],'3.500');
  assert.equal(args[args.indexOf('-ss')+1],'2.250');
  assert.ok(args.includes('0:a:0?'));
  assert.ok(args.includes('libx264'));
  assert.ok(args.includes('aac'));
  assert.ok(args.includes('yuv420p'));
  assert.ok(args.includes('+faststart'));
  assert.ok(args.includes('-map_metadata'));
});
test('fast cuts preserve original streams and mute excludes the audio track', () => {
  const args=buildTrimCommand({start:1,end:3,duration:5,mode:'fast',mute:true,input:'input.webm',output:'output.webm'});
  assert.ok(args.includes('copy'));assert.ok(args.includes('-an'));
  assert.ok(!args.includes('0:a:0?'));assert.ok(!args.includes('libx264'));assert.ok(!args.includes('-movflags'));
});
test('output names do not expose arbitrary path characters and keep the correct container', () => {
  assert.equal(outputName('My clip.mov','precise'),'My clip-trimmed.mp4');
  assert.equal(outputName('My clip.webm','fast'),'My clip-trimmed.webm');
  assert.equal(outputName('../unsafe<file>.mp4','precise'),'unsafefile-trimmed.mp4');
});
