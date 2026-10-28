import test from 'node:test';
import assert from 'node:assert/strict';
import { watermarkPosition,watermarkPercent,buildWatermarkPlan } from '../src/services/watermarkOperations.js';

test('watermark positions stay inside the video, including large overlays',()=>{
 for(const source of [{width:1920,height:1080},{width:721,height:1281}])for(const asset of [{width:100,height:50},{width:700,height:900}]){
  if(asset.height>source.height)continue;
  for(const x of [0,50,100])for(const y of [0,50,100]){const point=watermarkPosition(source,asset,x,y);assert.ok(point.x>=0&&point.y>=0);assert.ok(point.x+asset.width<=source.width);assert.ok(point.y+asset.height<=source.height);}
 }
});
test('dragging pixel positions maps back to percentage controls',()=>{
 const source={width:1920,height:1080},asset={width:200,height:80};
 const point=watermarkPosition(source,asset,25,75),percent=watermarkPercent(source,asset,point.x,point.y);
 assert.ok(Math.abs(percent.x-25)<.1);assert.ok(Math.abs(percent.y-75)<.1);
});
test('export uses a binary overlay with alpha and repeats it for the full video',()=>{
 const asset={width:100,height:50,blob:new Blob(['png'])};
 const plan=buildWatermarkPlan({input:'input.mp4',duration:3,width:1920,height:1080,asset,opacity:50});
 assert.equal(plan.binaryFiles[0].blob,asset.blob);
 assert.match(plan.commands[0].args.join(' '),/colorchannelmixer=aa=0.5/);
 assert.match(plan.commands[0].args.join(' '),/eof_action=repeat:shortest=0/);
 assert.match(plan.commands[0].args.join(' '),/-loop 1 -i watermark.png/);
 assert.match(plan.commands[0].args.join(' '),/-t 3/);
 assert.ok(plan.commands[0].args.includes('0:a:0?'));
 assert.ok(buildWatermarkPlan({input:'input.mp4',duration:3,width:1920,height:1080,asset,mute:true}).commands[0].args.includes('-an'));
});
test('watermark export rejects incomplete assets and invalid settings',()=>{
 const options={input:'x',duration:1,width:96,height:64};
 assert.throws(()=>buildWatermarkPlan(options),/Prepare/);
 const asset={width:16,height:16,blob:new Blob(['png'])};
 assert.throws(()=>buildWatermarkPlan({...options,asset,opacity:0}),/valid/);
 assert.throws(()=>buildWatermarkPlan({...options,asset:{...asset,width:100}}),/fit inside/);
});
