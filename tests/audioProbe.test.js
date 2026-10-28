import test from 'node:test';
import assert from 'node:assert/strict';
import { requireAudioTrack } from '../src/services/audioProbe.js';

const engine = (code, data) => ({ ffprobe: async () => code, readFile: async () => new TextEncoder().encode(data) });
test('successful audio JSON is accepted even when the wasm probe returns -1', async () => {
  await assert.doesNotReject(requireAudioTrack(engine(-1, '{"streams":[{"codec_type":"audio"}]}'), 'input.mp4'));
});
test('silent video still gives an actionable missing audio error', async () => {
  await assert.rejects(requireAudioTrack(engine(-1, '{"streams":[]}'), 'input.mp4'), /no audio track/);
});
test('failed, malformed, and missing probe output cannot pass as valid audio', async () => {
  for (const data of ['{}', '', 'not json', '{"streams":null}']) {
    await assert.rejects(requireAudioTrack(engine(1, data), 'input.mp4'), /could not be read/);
  }
  await assert.rejects(requireAudioTrack({ffprobe: async()=>1, readFile:async()=>{throw new Error('No file');}},'input.mp4'),/could not be read/);
});
