import { MAX_EXPORTED_FRAMES } from './playbackOperations.js';
import { extension } from './trimSettings.js';

export function selectFrameTimeline(probe,start,end){
 const offset=Number(probe.format?.start_time)||0;
 const packets=(probe.packets||[]).map(packet=>({time:Number(packet.pts_time)-offset,duration:Number(packet.duration_time)})).filter(packet=>Number.isFinite(packet.time)).sort((a,b)=>a.time-b.time);
 const unique=packets.filter((packet,index)=>index===0||Math.abs(packet.time-packets[index-1].time)>1e-7);
 if(!unique.length)throw new Error('This video does not expose readable frame timestamps. Choose a timed interval instead.');
 const times=[],seekTimes=[];
 for(let i=0;i<unique.length;i++){
  const packet=unique[i],next=unique[i+1]?.time;
  const finish=next??(Number.isFinite(packet.duration)&&packet.duration>0?packet.time+packet.duration:end);
  if(packet.time>=end-1e-7||finish<=start+1e-7)continue;
  const from=Math.max(start,packet.time,0),to=Math.min(end,finish);
  if(to<=from)continue;
  times.push(packet.time);seekTimes.push(from+(to-from)/2);
 }
 if(!times.length)throw new Error('No video frames were found in this selection.');
 if(times.length>MAX_EXPORTED_FRAMES)throw new Error(`Every frame would export ${times.length} images. Shorten the selection to ${MAX_EXPORTED_FRAMES} frames or fewer, or choose a timed interval.`);
 return {times,seekTimes};
}

export async function probeFrameTimeline({file,start,end,signal,onStatus=()=>{}}){
 let engine,timer;
 const check=()=>{if(signal.aborted)throw new DOMException('Cancelled','AbortError');};
 const stop=()=>engine?.terminate();
 async function bounded(operation,message){
  try{return await Promise.race([operation,new Promise((_,reject)=>{timer=setTimeout(()=>{reject(new Error(message));stop();},60000);})]);}finally{clearTimeout(timer);}
 }
 try{
  check();onStatus('Reading exact frame timestamps… Loading the local metadata engine.');
  const {FFmpeg}=await import('@ffmpeg/ffmpeg');check();engine=new FFmpeg();signal.addEventListener('abort',stop,{once:true});
  await bounded(engine.load({classWorkerURL:`${location.origin}/ffmpeg/worker.js`,coreURL:`${location.origin}/ffmpeg/ffmpeg-core.js`,wasmURL:`${location.origin}/ffmpeg/ffmpeg-core.wasm`}),'The frame metadata engine could not load. Try again or use a timed interval.');check();
  const input=`timeline.${extension(file.name)}`;
  await engine.writeFile(input,new Uint8Array(await file.arrayBuffer()));check();
  onStatus('Counting source frames in your selection…');
  // Packet presentation timestamps are read without decoding or encoding video.
  // Do not assume a frame rate: this also preserves variable-rate timelines.
  await bounded(engine.ffprobe(['-v','error','-select_streams','v:0','-show_packets','-show_entries','packet=pts_time,duration_time:format=start_time','-of','json',input,'-o','timeline.json']),'Reading frame timestamps timed out. Use a timed interval for this video.');check();
  const probe=JSON.parse(new TextDecoder().decode(await engine.readFile('timeline.json')));check();
  return selectFrameTimeline(probe,start,end);
 }catch(error){if(signal.aborted)throw new DOMException('Cancelled','AbortError');throw error instanceof Error?error:new Error('Frame timestamps could not be read. Choose a timed interval.');}
 finally{clearTimeout(timer);signal.removeEventListener('abort',stop);engine?.terminate();}
}
