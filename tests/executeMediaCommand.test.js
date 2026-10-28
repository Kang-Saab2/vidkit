import test from 'node:test';
import assert from 'node:assert/strict';
import { executeMediaCommand } from '../src/services/executeMediaCommand.js';

test('unresponsive frame extraction rejects and terminates its worker',async()=>{
 let terminated=false;
 const engine={exec:()=>new Promise(()=>{}),terminate:()=>{terminated=true;}};
 await assert.rejects(executeMediaCommand(engine,{args:[],timeoutMs:10}),/extraction timed out/);
 assert.equal(terminated,true);
});
test('successful commands and command errors clear the wall-clock deadline',async()=>{
 let terminated=false;
 const engine={exec:async()=>0,terminate:()=>{terminated=true;}};
 assert.equal(await executeMediaCommand(engine,{args:[],timeoutMs:20}),0);
 engine.exec=async()=>{throw new Error('Decoder failed');};
 await assert.rejects(executeMediaCommand(engine,{args:[],timeoutMs:20}),/Decoder failed/);
 await new Promise(resolve=>setTimeout(resolve,30));assert.equal(terminated,false);
});
