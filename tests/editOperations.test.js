import test from 'node:test';
import assert from 'node:assert/strict';
import { buildEditPlan, buildMergePlan, inspectMergeInputs } from '../src/services/editOperations.js';

test('muting removes every audio track without requiring an audio input',()=>{
 const args=buildEditPlan({input:'input.mp4',duration:2,operation:'mute'}).commands[0].args;
 assert.ok(args.includes('-an'));assert.ok(!args.includes('0:a:0?'));assert.ok(args.includes('libx264'));
});
test('all rotations and flip combinations map actual pixel filters and preserve optional audio',()=>{
 for(const rotation of ['90','180','270']){const args=buildEditPlan({input:'input.mp4',duration:2,operation:'rotate',rotation}).commands[0].args;assert.ok(args.includes('0:a:0?'));assert.match(args[args.indexOf('-vf')+1],/transpose|hflip/);}
 const flipped=buildEditPlan({input:'input.mp4',duration:2,operation:'flip',horizontal:true,vertical:true,mute:true}).commands[0].args;
 assert.match(flipped[flipped.indexOf('-vf')+1],/^hflip,vflip,/);assert.ok(flipped.includes('-an'));
 assert.throws(()=>buildEditPlan({input:'x',duration:2,operation:'flip',horizontal:false,vertical:false}));
 assert.throws(()=>buildEditPlan({input:'x',duration:2,operation:'rotate',rotation:'45'}));
});
test('merge normalizes frame rate, canvas and audio; silent clips get aligned silence',()=>{
 const plan=buildMergePlan({clips:[{input:'input-0.mp4',duration:2,hasAudio:true},{input:'input-1.webm',duration:3,hasAudio:false}],canvas:'portrait',fps:'24'});
 assert.equal(plan.commands.length,3);
 assert.match(plan.commands[0].args.join(' '),/pad=720:1280/);
 assert.match(plan.commands[0].args.join(' '),/fps=24/);
 assert.match(plan.commands[1].args.join(' '),/anullsrc=r=48000/);
 assert.match(plan.virtualFiles[0].content,/normalized-0.mp4.*\n.*normalized-1.mp4/);
 assert.equal(plan.commands[2].duration,5);assert.ok(plan.commands[2].args.includes('copy'));
 const muted=buildMergePlan({clips:[{input:'input-0.mp4',duration:2},{input:'input-1.mp4',duration:2}],mute:true});
 assert.ok(!muted.commands[0].args.join(' ').includes('anullsrc'));assert.ok(muted.commands[0].args.includes('-an'));
});
test('merge rejects missing clips, excessive durations, and unsafe virtual paths',()=>{
 assert.throws(()=>buildMergePlan({clips:[]}));
 assert.throws(()=>buildMergePlan({clips:[{input:'input-0.mp4',duration:301},{input:'input-1.mp4',duration:301}]}),/10 minutes/);
 assert.throws(()=>buildMergePlan({clips:[{input:'../unsafe.mp4',duration:1},{input:'input-1.mp4',duration:1}]}),/invalid/);
});
test('merge probing accepts valid JSON with a negative wasm probe return code',async()=>{
 const engine={ffprobe:async()=>-1,readFile:async()=>new TextEncoder().encode(JSON.stringify({format:{duration:'2.5'},streams:[{codec_type:'video'},{codec_type:'audio'}]}))};
 const clips=await inspectMergeInputs(engine,['input-0.mp4']);assert.equal(clips[0].duration,2.5);assert.equal(clips[0].hasAudio,true);
});
