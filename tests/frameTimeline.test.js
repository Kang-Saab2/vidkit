import test from 'node:test';
import assert from 'node:assert/strict';
import { selectFrameTimeline } from '../src/services/frameTimeline.js';

test('every-frame selection preserves variable presentation times in playback order',()=>{
 const probe={packets:[{pts_time:'0.100'},{pts_time:'0.000'},{pts_time:'0.040'},{pts_time:'0.100'},{pts_time:'0.190',duration_time:'0.060'}]};
 const result=selectFrameTimeline(probe,0,.25);
 assert.deepEqual(result.times,[0,.04,.1,.19]);
 assert.deepEqual(result.seekTimes,[.02,.07,.14500000000000002,.22]);
});
test('a frame already visible at the selection start is included once',()=>{
 const result=selectFrameTimeline({packets:[{pts_time:'0'},{pts_time:'.1'},{pts_time:'.2',duration_time:'.1'}]},.05,.2);
 assert.deepEqual(result.times,[0,.1]);assert.deepEqual(result.seekTimes,[.07500000000000001,.15000000000000002]);
});
test('timeline offsets are normalized and excessive exports are rejected before capture',()=>{
 const result=selectFrameTimeline({format:{start_time:'5'},packets:[{pts_time:'5',duration_time:'.1'}]},0,.1);
 assert.deepEqual(result.times,[0]);
 assert.throws(()=>selectFrameTimeline({packets:Array.from({length:121},(_,i)=>({pts_time:String(i/30),duration_time:String(1/30)}))},0,5),/121 images/);
 assert.throws(()=>selectFrameTimeline({packets:[{}]},0,1),/readable frame timestamps/);
});
