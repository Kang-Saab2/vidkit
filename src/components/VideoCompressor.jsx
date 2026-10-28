import { useState } from 'react';
import { Minimize2 } from 'lucide-react';
import VideoToolWorkspace, { Setting } from './VideoToolWorkspace';
import { buildCompressionPlan } from '../services/mediaOperations.js';

const config = {
  id:'compress',title:'Video compressor',eyebrow:'SMALLER FILE. SAME ENERGY.',description:'Lighten the file. Keep the feeling.',icon:Minimize2,color:'teal',
  uploadTag:'A LITTLE LIGHTER GOES A LONG WAY',uploadTitle:'Big ideas. Smaller files.',settingsTag:'FIND YOUR BALANCE',settingsTitle:'Less is more.',
  action:'Compress video',suffix:'compressed',extension:'mp4',resultTitle:'A lighter take.',
  tipTitle:'A little room to breathe.',tip:'Higher compression and lower resolution usually reduce file size, with a trade-off in detail. Already compressed files can get larger. We’ll show the actual difference after export.',
  summary:settings=>[['Compression',{light:'Gentle',balanced:'Balanced',small:'Strong'}[settings.quality]],['Audio',settings.mute?'Muted':'Keep if present']],
};
export default function VideoCompressor(){
  const [quality,setQuality]=useState('balanced'),[resolution,setResolution]=useState('720'),[fps,setFPS]=useState('original'),[mute,setMute]=useState(false);
  const settings={quality,resolution,fps,mute};
  return <VideoToolWorkspace config={config} settings={settings} createPlan={(input,context)=>buildCompressionPlan({input,...context,...settings})} controls={<>
    <Setting id="compression-quality" label="Compression" value={quality} onChange={setQuality} options={[["light","Gentle · more detail"],["balanced","Balanced · recommended"],["small","Strong · smaller file"]]} help="Stronger compression trades some visual detail for a smaller file."/>
    <Setting id="compression-resolution" label="Maximum resolution" value={resolution} onChange={setResolution} options={[["original","Original resolution"],["1080","1080p · longest edge 1920px"],["720","720p · longest edge 1280px"],["480","480p · longest edge 854px"]]} help="Keeps the aspect ratio and never upscales. Applies equally to portrait and landscape videos."/>
    <Setting id="compression-fps" label="Frame rate" value={fps} onChange={setFPS} options={[["original","Keep source frame rate"],["24","24 fps"],["30","30 fps"]]}/>
    <label className="check-label audio-option"><input type="checkbox" checked={!mute} onChange={e=>setMute(!e.target.checked)}/> Keep original audio</label>
  </>}/>;
}
