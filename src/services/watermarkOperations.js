export function watermarkPosition(source,overlay,xPercent=100,yPercent=100){
 const width=Math.floor(source.width/2)*2,height=Math.floor(source.height/2)*2;
 const availableX=Math.max(0,width-overlay.width),availableY=Math.max(0,height-overlay.height);
 const margin=Math.round(Math.min(width,height)*.025),mx=Math.min(margin,availableX/2),my=Math.min(margin,availableY/2);
 return {x:Math.round(mx+(availableX-2*mx)*Math.max(0,Math.min(100,xPercent))/100),y:Math.round(my+(availableY-2*my)*Math.max(0,Math.min(100,yPercent))/100)};
}
export function watermarkPercent(source,overlay,x,y){
 const width=Math.floor(source.width/2)*2,height=Math.floor(source.height/2)*2;
 const ax=Math.max(0,width-overlay.width),ay=Math.max(0,height-overlay.height),m=Math.round(Math.min(width,height)*.025),mx=Math.min(m,ax/2),my=Math.min(m,ay/2);
 return {x:ax>2*mx?Math.max(0,Math.min(100,(x-mx)/(ax-2*mx)*100)):50,y:ay>2*my?Math.max(0,Math.min(100,(y-my)/(ay-2*my)*100)):50};
}
export function buildWatermarkPlan({input,duration,width,height,asset,x=100,y=100,opacity=70,mute=false}){
 if(!Number.isFinite(duration)||duration<=0||![width,height].every(v=>Number.isFinite(v)&&v>=2))throw new Error('Choose a video before adding a watermark.');
 if(!asset?.blob||!Number.isInteger(asset.width)||!Number.isInteger(asset.height))throw new Error('Prepare your text or choose a logo to create the watermark preview.');
 if(asset.width<1||asset.height<1||asset.width>width||asset.height>height)throw new Error('The watermark must fit inside the video.');
 if(![x,y,opacity].every(Number.isFinite)||x<0||x>100||y<0||y>100||opacity<10||opacity>100)throw new Error('Choose valid watermark position and opacity settings.');
 const position=watermarkPosition({width,height},asset,x,y);
 const filters=`[0:v:0]scale=trunc(iw/2)*2:trunc(ih/2)*2,setsar=1[base];[1:v:0]format=rgba,colorchannelmixer=aa=${opacity/100}[mark];[base][mark]overlay=${position.x}:${position.y}:eof_action=repeat:shortest=0,format=yuv420p[out]`;
 const args=['-i',input,'-loop','1','-i','watermark.png','-filter_complex_threads','1','-filter_complex',filters,'-map','[out]','-t',String(duration),'-map_metadata','-1','-c:v','libx264','-preset','veryfast','-crf','23','-pix_fmt','yuv420p'];
 if(mute)args.push('-an');else args.push('-map','0:a:0?','-c:a','aac','-b:a','192k');
 args.push('-movflags','+faststart','output.mp4');
 return {commands:[{args,duration,label:'Adding your watermark…'}],binaryFiles:[{path:'watermark.png',blob:asset.blob}],output:'output.mp4',mime:'video/mp4'};
}

export async function renderWatermark({info,mode,text,color,textSize,logoSize,logo,background}){
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d');
 if(!context)throw new Error('Your browser cannot create a watermark image.');
 if(mode==='logo'){
  if(!logo)throw new Error('Choose a PNG, JPEG, or WebP logo.');
  const bitmap=await createImageBitmap(logo);
  try{
   if(bitmap.width>4096||bitmap.height>4096)throw new Error('Choose a logo no larger than 4096 × 4096 pixels.');
   const factor=Math.min(info.width*logoSize/100/bitmap.width,info.height*.8/bitmap.height,1);
   canvas.width=Math.max(1,Math.floor(bitmap.width*factor));canvas.height=Math.max(1,Math.floor(bitmap.height*factor));
   context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  }finally{bitmap.close();}
 }else{
  if(!text.trim())throw new Error('Enter some watermark text.');
  const lines=text.trim().split('\n').slice(0,3);
  await document.fonts.ready;
  let font=Math.max(8,Math.round(info.width*textSize/100));
  context.font=`700 ${font}px "DM Sans Variable", sans-serif`;
  const maxWidth=Math.max(...lines.map(line=>context.measureText(line).width));
  const factor=Math.min(1,info.width*.9/(maxWidth+font*.8),info.height*.8/(lines.length*font*1.3+font*.8));font=Math.max(1,Math.floor(font*factor));
  context.font=`700 ${font}px "DM Sans Variable", sans-serif`;
  const padding=Math.max(1,Math.ceil(font*.4));
  canvas.width=Math.min(Math.floor(info.width),Math.ceil(Math.max(...lines.map(line=>context.measureText(line).width)))+2*padding);
  canvas.height=Math.min(Math.floor(info.height),Math.ceil(lines.length*font*1.3+2*padding));
  context.font=`700 ${font}px "DM Sans Variable", sans-serif`;context.textBaseline='top';context.lineJoin='round';
  if(background){context.fillStyle='rgba(0,0,0,0.6)';context.fillRect(0,0,canvas.width,canvas.height);}
  context.fillStyle=color;context.strokeStyle='rgba(0,0,0,0.65)';context.lineWidth=Math.max(1,font*.055);
  lines.forEach((line,i)=>{const y=padding+i*font*1.3;context.strokeText(line,padding,y);context.fillText(line,padding,y);});
 }
 const blob=await new Promise((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error('The watermark image could not be created.')),'image/png'));
 return {blob,width:canvas.width,height:canvas.height};
}
