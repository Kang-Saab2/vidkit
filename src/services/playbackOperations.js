import { validateRange } from './trimSettings.js';

const check=(value,allowed,label)=>{if(!allowed.includes(value))throw new Error(`Choose a valid ${label}.`);};
const evenScale=edge=>{const factor=edge?`min(1,${edge}/max(iw,ih))`:'1';return `scale=w='max(2,trunc(iw*${factor}/2)*2)':h='max(2,trunc(ih*${factor}/2)*2)',setsar=1`;};
const encode=['-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p'];
function interval({input,start,end,duration}){validateRange(start,end,duration);return ['-ss',start.toFixed(3),'-t',(end-start).toFixed(3),'-i',input];}
function finish(args,duration,label,output='output.mp4',mime='video/mp4'){return {commands:[{args,duration,label}],output,mime};}
export function tempoFilters(speed){
 if(!Number.isFinite(speed)||speed<.25||speed>4)throw new Error('Choose a speed from 0.25× to 4×.');
 const filters=[];let remaining=speed;
 while(remaining<.5){filters.push('atempo=0.5');remaining/=.5;}
 while(remaining>2){filters.push('atempo=2');remaining/=2;}
 filters.push(`atempo=${remaining}`);return filters.join(',');
}
export function buildSpeedPlan(options){
 const {speed=1,mute=false,start,end}=options,tempo=tempoFilters(speed);
 const args=[...interval(options),'-map','0:v:0','-map_metadata','-1','-vf',`setpts=(PTS-STARTPTS)/${speed},${evenScale()},fps=30`,...encode];
 if(mute)args.push('-an');else args.push('-map','0:a:0?','-af',`${tempo},asetpts=PTS-STARTPTS`,'-c:a','aac','-b:a','192k');
 args.push('-movflags','+faststart','output.mp4');
 return finish(args,(end-start)/speed,'Changing your video speed…');
}
export const MAX_REVERSE_SECONDS=15;
export function buildReversePlan(options){
 const {start,end,width,height,edge='480',audio='reverse'}=options;
 check(edge,['320','480','640','720'],'reverse resolution');check(audio,['reverse','keep','mute'],'audio mode');
 validateRange(start,end,options.duration);
 if(end-start>MAX_REVERSE_SECONDS+.000001)throw new Error('Choose 15 seconds or less to reverse.');
 if(![width,height].every(n=>Number.isFinite(n)&&n>=2))throw new Error('Choose a video with readable dimensions.');
 const factor=Math.min(1,Number(edge)/Math.max(width,height));
 if((end-start)*width*height*factor*factor*24*4>512*1024*1024)throw new Error('This selection needs too much memory. Choose a shorter clip or a smaller output size.');
 const args=[...interval(options),'-map','0:v:0','-map_metadata','-1','-vf',`${evenScale(Number(edge))},fps=24,reverse,setpts=PTS-STARTPTS`,...encode];
 if(audio==='mute')args.push('-an');else args.push('-map','0:a:0?','-af',`${audio==='reverse'?'areverse,':''}asetpts=PTS-STARTPTS`,'-c:a','aac','-b:a','192k');
 args.push('-movflags','+faststart','output.mp4');
 return finish(args,end-start,'Reversing your clip…');
}
export const MAX_EXPORTED_FRAMES=120;
export function buildFramesPlan(options){
 const {start,end,step='1',format='jpg',edge='640',quality='4'}=options;
 validateRange(start,end,options.duration);
 check(step,['every','0.5','1','2','5','10'],'frame interval');check(format,['jpg','png'],'image format');check(edge,['320','640','960','1280'],'frame size');check(quality,['2','4','8'],'JPEG quality');
 if(step==='every')return {commands:[],output:'frames.zip',mime:'application/zip',frameOutput:{start,step:null,mode:'every',format,maxCount:MAX_EXPORTED_FRAMES}};
 const count=Math.max(1,Math.ceil((end-start)/Number(step)-1e-9));
 if(count>MAX_EXPORTED_FRAMES)throw new Error(`Choose a longer interval or shorter selection. Export up to ${MAX_EXPORTED_FRAMES} frames at once.`);
 // Seek directly to each scheduled frame instead of waiting for the fps filter
 // to drain a selected interval. Image encoders may emit no usable progress.
 const commands=Array.from({length:count},(_,index)=>{
  const time=start+index*Number(step);
  const args=['-ss',time.toFixed(3),'-i',options.input,'-map','0:v:0','-an','-vf',evenScale(Number(edge)),'-frames:v','1','-threads','1'];
  if(format==='jpg')args.push('-q:v',quality);
  args.push(`frame-${String(index+1).padStart(6,'0')}.${format}`);
  return {args,duration:Number(step),timeoutMs:60000,label:`Extracting frame ${index+1} of ${count}…`};
 });
 return {commands,output:'frames.zip',mime:'application/zip',frameOutput:{start,step:Number(step),format,maxCount:count}};
}
export const conversionFormats={mp4:{label:'MP4',codec:'H.264 + AAC',mime:'video/mp4'},webm:{label:'WebM',codec:'VP8 + Opus',mime:'video/webm'},mov:{label:'MOV',codec:'H.264 + AAC',mime:'video/quicktime'},mkv:{label:'MKV',codec:'H.264 + AAC',mime:'video/x-matroska'}};
export function buildConversionPlan({input,duration,format='mp4',quality='balanced',edge='original',mute=false}){
 check(format,Object.keys(conversionFormats),'output format');check(quality,['high','balanced','small'],'quality');check(edge,['original','1280','854'],'output size');
 if(!Number.isFinite(duration)||duration<=0)throw new Error('Choose a video with a readable duration.');
 const args=['-i',input,'-map','0:v:0','-map_metadata','-1','-vf',evenScale(edge==='original'?undefined:Number(edge))];
 if(format==='webm')args.push('-c:v','libvpx','-threads','1','-deadline','realtime','-cpu-used','8','-crf',{high:'10',balanced:'20',small:'30'}[quality],'-b:v',{high:'2500k',balanced:'1500k',small:'800k'}[quality],'-pix_fmt','yuv420p');
 else args.push('-c:v','libx264','-preset','veryfast','-crf',{high:'18',balanced:'23',small:'28'}[quality],'-pix_fmt','yuv420p');
 if(mute)args.push('-an');else args.push('-map','0:a:0?','-c:a',format==='webm'?'libopus':'aac','-b:a','128k',...(format==='webm'?['-ar','48000']:[]));
 if(format==='mp4'||format==='mov')args.push('-movflags','+faststart');
 args.push(`output.${format}`);
 return finish(args,duration,'Converting your video…',`output.${format}`,conversionFormats[format].mime);
}

