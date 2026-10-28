import test from 'node:test';
import assert from 'node:assert/strict';
import { buildResizePlan,buildCropPlan,centeredCrop,adjustCrop,validateCrop,validateSize } from '../src/services/spatialOperations.js';

test('resize requires bounded even dimensions and explicit fit modes',()=>{
 for(const [w,h] of [[0,720],[1279,720],[NaN,720],[4000,2160],[3840,3840]])assert.throws(()=>validateSize(w,h));
 assert.doesNotThrow(()=>validateSize(3840,2160));
 const contain=buildResizePlan({input:'input.mp4',duration:1,width:720,height:1280}).commands[0].args;
 assert.match(contain[contain.indexOf('-vf')+1],/pad=720:1280/);assert.ok(contain.includes('0:a:0?'));
 const cover=buildResizePlan({input:'input.mp4',duration:1,width:720,height:720,fit:'cover',mute:true}).commands[0].args;
 assert.match(cover[cover.indexOf('-vf')+1],/increase.*crop=720:720/);assert.ok(cover.includes('-an'));
 assert.throws(()=>buildResizePlan({input:'x',duration:1,width:100,height:100,fit:'invalid'}));
});
test('centered crop presets stay inside odd source dimensions on the pixel grid',()=>{
 for(const source of [{width:1921,height:1081},{width:1081,height:1921}])for(const ratio of [null,1,16/9,9/16,4/3]){
  const crop=centeredCrop(source,ratio);assert.doesNotThrow(()=>validateCrop(crop,source));
  if(ratio)assert.ok(Math.abs(crop.width/crop.height-ratio)<.01);
 }
});
test('moving or resizing any corner cannot escape the source, even with extreme drags',()=>{
 const source={width:1920,height:1080},crop={x:400,y:200,width:640,height:360};
 for(const kind of ['move','nw','ne','sw','se'])for(const delta of [-10000,-25,0,35,10000])for(const ratio of [null,1,16/9,9/16]){
  assert.doesNotThrow(()=>validateCrop(adjustCrop(crop,kind,delta,-delta,source,ratio),source));
 }
});
test('crop export rejects invalid bounds and uses exact source pixel coordinates',()=>{
 const source={width:96,height:64};
 for(const crop of [null,{x:-2,y:0,width:48,height:32},{x:49,y:0,width:48,height:32},{x:60,y:0,width:48,height:32},{x:0,y:0,width:0,height:0}])assert.throws(()=>validateCrop(crop,source));
 const plan=buildCropPlan({input:'input.mp4',duration:1,...source,crop:{x:48,y:32,width:48,height:32}});
 assert.ok(plan.commands[0].args.includes('crop=48:32:48:32,setsar=1'));
});
