export const evenDown = value => Math.max(2, Math.floor(Number(value) / 2) * 2);
export const evenRound = value => Math.round(Number(value) / 2) * 2;
const clamp = (value,min,max) => Math.max(min,Math.min(max,value));
export const cropRatios = { free:null, original:null, square:1, landscape:16/9, portrait:9/16, classic:4/3 };
export function validateSize(width,height){
  if(![width,height].every(n=>Number.isInteger(n)&&n>=2&&n<=3840&&n%2===0)||width*height>8294400)throw new Error('Use even dimensions from 2 to 3840 pixels, up to 8.3 megapixels total.');
}
export function validateCrop(crop,source){
  if(!source||![source.width,source.height].every(n=>Number.isFinite(n)&&n>=2))throw new Error('Choose a video before selecting a crop.');
  if(!crop||![crop.x,crop.y,crop.width,crop.height].every(Number.isInteger)||crop.x<0||crop.y<0||crop.width<2||crop.height<2||[crop.x,crop.y,crop.width,crop.height].some(n=>n%2)||crop.x+crop.width>source.width||crop.y+crop.height>source.height)throw new Error('Keep the crop inside the video. Position and size must be even pixel values, with a minimum size of 2 × 2.');
}
export function centeredCrop(source,ratio=null){
  const maxW=evenDown(source.width),maxH=evenDown(source.height);
  let width=maxW,height=maxH;
  if(ratio){if(width/height>ratio)width=evenDown(height*ratio);else height=evenDown(width/ratio);}
  return {x:evenRound((maxW-width)/2),y:evenRound((maxH-height)/2),width,height};
}
export function adjustCrop(rect,kind,dx,dy,source,ratio=null){
  const maxW=evenDown(source.width),maxH=evenDown(source.height);
  if(kind==='move')return {...rect,x:clamp(evenRound(rect.x+dx),0,maxW-rect.width),y:clamp(evenRound(rect.y+dy),0,maxH-rect.height)};
  const east=kind.includes('e'),south=kind.includes('s');
  const anchorX=east?rect.x:rect.x+rect.width,anchorY=south?rect.y:rect.y+rect.height;
  const availableW=east?maxW-anchorX:anchorX,availableH=south?maxH-anchorY:anchorY;
  let width=clamp(evenRound(rect.width+(east?dx:-dx)),2,availableW),height=clamp(evenRound(rect.height+(south?dy:-dy)),2,availableH);
  if(ratio){
    if(Math.abs(dx)>=Math.abs(dy)*ratio)height=evenDown(width/ratio);else width=evenDown(height*ratio);
    if(width>availableW){width=availableW;height=evenDown(width/ratio);}
    if(height>availableH){height=availableH;width=evenDown(height*ratio);}
    width=clamp(width,2,availableW);height=clamp(height,2,availableH);
  }
  return {x:east?anchorX:anchorX-width,y:south?anchorY:anchorY-height,width,height};
}
function plan(input,duration,filters,mute,label){
  if(!Number.isFinite(duration)||duration<=0)throw new Error('Choose a video with a readable duration.');
  const args=['-i',input,'-map','0:v:0','-map_metadata','-1','-vf',filters,'-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p'];
  if(mute)args.push('-an');else args.push('-map','0:a:0?','-c:a','aac','-b:a','192k');
  args.push('-movflags','+faststart','output.mp4');
  return {commands:[{args,duration,label}],output:'output.mp4',mime:'video/mp4'};
}
export function buildResizePlan({input,duration,width,height,fit='contain',mute=false}){
  validateSize(width,height);
  if(!['contain','cover','stretch'].includes(fit))throw new Error('Choose a valid resize mode.');
  let filter;
  if(fit==='contain')filter=`scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black`;
  else if(fit==='cover')filter=`scale=${width}:${height}:force_original_aspect_ratio=increase:force_divisible_by=2,crop=${width}:${height}`;
  else filter=`scale=${width}:${height}`;
  return plan(input,duration,`${filter},setsar=1`,mute,'Resizing your video…');
}
export function buildCropPlan({input,duration,width,height,crop,mute=false}){
  validateCrop(crop,{width,height});
  return plan(input,duration,`crop=${crop.width}:${crop.height}:${crop.x}:${crop.y},setsar=1`,mute,'Cropping your video…');
}
