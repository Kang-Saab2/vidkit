import JSZip from 'jszip';
import { MAX_EXPORTED_FRAMES } from './playbackOperations.js';

export async function collectFrames(engine,options,{checkCancelled=()=>{},onStatus=()=>{},onProgress=()=>{}}={}){
 const entries=await engine.listDir('/');checkCancelled();
 const names=entries.filter(entry=>!entry.isDir&&new RegExp(`^frame-\\d{6}\\.${options.format}$`).test(entry.name)).map(entry=>entry.name).sort();
 if(!names.length)throw new Error('No frames were found. Choose a longer selection or a shorter interval.');
 if(names.length>MAX_EXPORTED_FRAMES||names.length>options.maxCount)throw new Error('Too many frames were produced. Use a longer interval.');
 const zip=new JSZip(),images=[];
 const manifest={format:options.format,mode:options.mode||'interval',intervalSeconds:options.step,selectionStartSeconds:options.start,frames:[]};
 onStatus('Packaging your frames…');
 for(let i=0;i<names.length;i++){
  checkCancelled();const bytes=await engine.readFile(names[i]);checkCancelled();
  const time=options.times?.[i]??options.start+i*options.step;
  zip.file(names[i],bytes);manifest.frames.push({file:names[i],[options.mode==='every'?'sourceTimeSeconds':'scheduledTimeSeconds']:Number(time.toFixed(6))});
  if(i<12)images.push({name:names[i],time,blob:new Blob([bytes],{type:options.format==='png'?'image/png':'image/jpeg'})});
  await engine.deleteFile(names[i]);checkCancelled();
 }
 zip.file('frames.json',JSON.stringify({...manifest,note:options.mode==='every'?'Source presentation timestamps; captured inside each frame display interval.':'Scheduled timestamps; frames are sampled from available decoded video frames.'},null,2));
 const blob=await zip.generateAsync({type:'blob',compression:'STORE'},({percent})=>{checkCancelled();onProgress(98+percent*.019);});
 checkCancelled();return {blob,images,count:names.length};
}
