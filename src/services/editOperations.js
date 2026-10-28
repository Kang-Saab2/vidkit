const encode = ['-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-pix_fmt', 'yuv420p'];
const even = 'scale=trunc(iw/2)*2:trunc(ih/2)*2';
export function buildEditPlan({ input, duration, operation, rotation='90', horizontal=true, vertical=false, mute=false }) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Choose a valid video.');
  let filters=[], label;
  if(operation==='mute'){label='Removing the audio…';mute=true;}
  else if(operation==='rotate'){
    const rotations={'90':['transpose=clock'],'180':['hflip','vflip'],'270':['transpose=cclock']};
    if(!rotations[rotation])throw new Error('Choose a rotation of 90°, 180°, or 270°.');
    filters=rotations[rotation];label='Rotating your video…';
  }else if(operation==='flip'){
    if(!horizontal&&!vertical)throw new Error('Choose at least one flip direction.');
    if(horizontal)filters.push('hflip');if(vertical)filters.push('vflip');label='Flipping your video…';
  }else throw new Error('Choose a valid video operation.');
  const args=['-i',input,'-map','0:v:0','-map_metadata','-1','-vf',[...filters,even,'setsar=1'].join(','),...encode];
  if(mute)args.push('-an');else args.push('-map','0:a:0?','-c:a','aac','-b:a','192k');
  args.push('-movflags','+faststart','output.mp4');
  return {commands:[{args,duration,label}],output:'output.mp4',mime:'video/mp4'};
}

export const MAX_MERGE_CLIPS=8;
export const mergeCanvases={landscape:[1280,720],portrait:[720,1280],square:[720,720]};
export async function inspectMergeInputs(engine, inputs) {
  const clips=[];
  for(let i=0;i<inputs.length;i++){
    const output=`probe-${i}.json`;
    // This core's ffprobe return code is unreliable; validate its JSON instead.
    await engine.ffprobe(['-v','error','-show_entries','stream=codec_type,width,height:format=duration','-of','json',inputs[i],'-o',output]);
    let info;
    try{info=JSON.parse(new TextDecoder().decode(await engine.readFile(output)));}catch{throw new Error(`Clip ${i+1} could not be read. Replace it and try again.`);}
    const duration=Number(info.format?.duration);
    if(!info.streams?.some(s=>s.codec_type==='video')||!Number.isFinite(duration)||duration<=0)throw new Error(`Clip ${i+1} has no readable video track or duration.`);
    clips.push({input:inputs[i],duration,hasAudio:info.streams.some(s=>s.codec_type==='audio')});
  }
  return clips;
}
export function buildMergePlan({clips,canvas='landscape',fps='30',mute=false}){
  if(!Array.isArray(clips)||clips.length<2||clips.length>MAX_MERGE_CLIPS)throw new Error('Choose between 2 and 8 clips to merge.');
  if(!mergeCanvases[canvas]||!['24','30'].includes(fps))throw new Error('Choose valid output size and frame rate settings.');
  if(clips.some(c=>!Number.isFinite(c.duration)||c.duration<=0||!/^input-\d+\.[a-z0-9]+$/i.test(c.input)))throw new Error('One of the clips is invalid. Replace it and try again.');
  const duration=clips.reduce((sum,c)=>sum+c.duration,0);
  if(duration>600.001)throw new Error('Keep the combined video within 10 minutes.');
  const [width,height]=mergeCanvases[canvas];
  const commands=clips.map((clip,i)=>{
    const seconds=clip.duration.toFixed(3);
    const video=`[0:v:0]scale=${width}:${height}:force_original_aspect_ratio=decrease:force_divisible_by=2,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,setsar=1,fps=${fps},setpts=PTS-STARTPTS[v]`;
    const audio=clip.hasAudio?`[0:a:0]aresample=48000,aformat=channel_layouts=stereo,apad,atrim=duration=${seconds},asetpts=PTS-STARTPTS[a]`:`anullsrc=r=48000:cl=stereo,atrim=duration=${seconds},asetpts=PTS-STARTPTS[a]`;
    const args=['-i',clip.input,'-filter_complex_threads','1','-filter_complex',mute?video:`${video};${audio}`,'-map','[v]',...encode];
    if(mute)args.push('-an');else args.push('-map','[a]','-c:a','aac','-b:a','128k','-ar','48000','-ac','2');
    args.push('-map_metadata','-1','-t',seconds,`normalized-${i}.mp4`);
    return {args,duration:clip.duration,label:`Preparing clip ${i+1} of ${clips.length}…`,deleteAfter:[clip.input]};
  });
  commands.push({args:['-f','concat','-safe','1','-i','merge-list.txt','-map','0:v:0',...(!mute?['-map','0:a:0']:[]),'-c','copy','-map_metadata','-1','-movflags','+faststart','output.mp4'],duration,label:'Joining your clips…'});
  return {commands,virtualFiles:[{path:'merge-list.txt',content:clips.map((_,i)=>`file 'normalized-${i}.mp4'`).join('\n')}],output:'output.mp4',mime:'video/mp4'};
}
