import { buildFramesPlan } from './playbackOperations.js';

const abortError=()=>new DOMException('Frame export cancelled','AbortError');

// Listeners are installed before changing src/currentTime, including at time 0.
export function waitForMedia(video,{signal,action,ready,timeoutMs=20000}){
 return new Promise((resolve,reject)=>{
  let timer;
  const events=['loadedmetadata','loadeddata','canplay','seeked'];
  const cleanup=()=>{clearTimeout(timer);for(const name of events)video.removeEventListener(name,check);video.removeEventListener('error',failed);signal.removeEventListener('abort',aborted);};
  const done=error=>{cleanup();if(error)reject(error);else resolve();};
  const check=()=>{if(ready())done();};
  const failed=()=>done(new Error('Your browser could not decode a frame from this video. Try an H.264 MP4 or WebM file.'));
  const aborted=()=>done(abortError());
  for(const name of events)video.addEventListener(name,check);
  video.addEventListener('error',failed);signal.addEventListener('abort',aborted,{once:true});
  timer=setTimeout(()=>done(new Error('The browser could not seek to this frame. Try a different selection or another video.')),timeoutMs);
  if(signal.aborted){aborted();return;}
  try{action?.();check();}catch(error){done(error);}
 });
}

export function encodeCanvas(canvas,{type,quality,signal,timeoutMs=20000}){
 return new Promise((resolve,reject)=>{
  let timer;
  const cleanup=()=>{clearTimeout(timer);signal.removeEventListener('abort',aborted);};
  const aborted=()=>{cleanup();reject(abortError());};
  signal.addEventListener('abort',aborted,{once:true});
  timer=setTimeout(()=>{cleanup();reject(new Error('The browser could not encode this frame. Try a smaller output size.'));},timeoutMs);
  if(signal.aborted){aborted();return;}
  try{canvas.toBlob(blob=>{cleanup();if(signal.aborted)reject(abortError());else if(blob)resolve(blob);else reject(new Error('The browser returned an empty frame. Try JPEG or a smaller size.'));},type,quality);}catch(error){cleanup();reject(error);}
 });
}

export async function captureVideoFrames(video,canvas,options,{signal,onStatus=()=>{},onProgress=()=>{}}){
 const checkCancelled=()=>{if(signal.aborted)throw abortError();};
 const metadata=buildFramesPlan({...options,input:'browser-video'}).frameOutput;
 if(metadata.mode==='every'){
  if(!options.timeline?.times?.length)throw new Error('Read the video frame timestamps before exporting every frame.');
  Object.assign(metadata,options.timeline,{maxCount:options.timeline.times.length});
 }
 checkCancelled();
 if(!Number.isFinite(video.duration)||video.videoWidth<2||video.videoHeight<2)throw new Error('The browser could not read the video dimensions or duration.');
 const factor=Math.min(1,Number(options.edge||'640')/Math.max(video.videoWidth,video.videoHeight));
 canvas.width=Math.max(2,Math.floor(video.videoWidth*factor/2)*2);canvas.height=Math.max(2,Math.floor(video.videoHeight*factor/2)*2);
 const context=canvas.getContext('2d',{alpha:false});
 if(!context)throw new Error('This browser cannot create frame images.');
 const frames=new Map();
 onProgress(0);
 for(let index=0;index<metadata.maxCount;index++){
  checkCancelled();
  const scheduled=metadata.seekTimes?.[index]??metadata.start+index*metadata.step;
  const time=Math.max(0,Math.min(scheduled,video.duration-.001));
  onStatus(`Extracting frame ${index+1} of ${metadata.maxCount}…`);
  await waitForMedia(video,{signal,action:()=>{video.currentTime=time;},ready:()=>!video.seeking&&video.readyState>=2&&Math.abs(video.currentTime-time)<.002});
  checkCancelled();context.drawImage(video,0,0,canvas.width,canvas.height);
  const blob=await encodeCanvas(canvas,{type:metadata.format==='png'?'image/png':'image/jpeg',quality:{'2':.95,'4':.85,'8':.65}[options.quality||'4'],signal});
  checkCancelled();frames.set(`frame-${String(index+1).padStart(6,'0')}.${metadata.format}`,blob);
  onProgress((index+1)/metadata.maxCount*98);
 }
 onStatus('Packaging your frames…');
 const { collectFrames }=await import('./collectFrames.js');checkCancelled();
 return collectFrames({
  listDir:async()=>Array.from(frames.keys(),name=>({name,isDir:false})),
  readFile:async name=>new Uint8Array(await frames.get(name).arrayBuffer()),
  deleteFile:async name=>frames.delete(name),
 },metadata,{checkCancelled,onStatus,onProgress});
}

export async function extractBrowserFrames({file,signal,onStatus=()=>{},onProgress=()=>{},...options}){
 // Validate settings before allocating a second decoder or an output canvas.
 buildFramesPlan({...options,input:'browser-video'});
 if(options.step==='every'){
  const {probeFrameTimeline}=await import('./frameTimeline.js');
  options.timeline=await probeFrameTimeline({file,start:options.start,end:options.end,signal,onStatus});
 }
 const video=document.createElement('video'),canvas=document.createElement('canvas'),url=URL.createObjectURL(file);
 video.muted=true;video.playsInline=true;video.preload='auto';video.setAttribute('aria-hidden','true');
 video.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;';
 document.body.appendChild(video);
 try{
  onStatus('Opening the browser video decoder…');onProgress(0);
  await waitForMedia(video,{signal,action:()=>{video.src=url;video.load();},ready:()=>video.readyState>=2&&!video.seeking});
  video.pause();
  return await captureVideoFrames(video,canvas,options,{signal,onStatus,onProgress});
 }finally{
  video.pause();video.removeAttribute('src');video.load();video.remove();URL.revokeObjectURL(url);canvas.width=0;canvas.height=0;
 }
}
