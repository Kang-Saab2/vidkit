import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import VideoToolWorkspace,{Setting} from './VideoToolWorkspace';
import { buildConversionPlan,conversionFormats } from '../services/playbackOperations.js';
import './AdvancedTools.css';

const base={id:'convert',title:'Video converter',eyebrow:'NEW FORMAT. NEW POSSIBILITIES.',description:'Give your video a format that fits.',icon:RefreshCw,color:'yellow',uploadTag:'THE SAME STORY. A DIFFERENT FORMAT.',uploadTitle:'A new home for your video.',settingsTag:'CHOOSE YOUR NEXT FORMAT',settingsTitle:'Make the switch.',action:'Convert video',suffix:'converted',resultTitle:'A fresh new format.',tipTitle:'A format is more than a filename.',tip:'Each export re-encodes the video using codecs supported by our local engine. MP4 is a good starting point for browser playback. MOV and MKV may need an external player. Inputs must be previewable by your browser.',summary:s=>[['Codec',conversionFormats[s.format].codec],['Quality',{high:'High',balanced:'Balanced',small:'Smaller file'}[s.quality]],['Audio',s.mute?'Muted':'Keep if present']]};
export default function VideoConverter(){
 const [format,setFormat]=useState('mp4'),[quality,setQuality]=useState('balanced'),[edge,setEdge]=useState('original'),[mute,setMute]=useState(false);
 const settings={format,quality,edge,mute},config={...base,extension:format};
 return <VideoToolWorkspace config={config} settings={settings} createPlan={(input,context)=>buildConversionPlan({input,...context,...settings})} controls={<>
  <Setting id="convert-format" label="Output format" value={format} onChange={setFormat} options={Object.entries(conversionFormats).map(([key,v])=>[key,`${v.label} · ${v.codec}`])}/>
  <Setting id="convert-quality" label="Video quality" value={quality} onChange={setQuality} options={[["high","High quality"],["balanced","Balanced"],["small","Smaller file"]]} help="Re-encoding may change quality and file size. A higher setting cannot restore missing source detail."/>
  <Setting id="convert-size" label="Maximum output size" value={edge} onChange={setEdge} options={[["original","Keep original dimensions"],["1280","720p · longest edge 1280px"],["854","480p · longest edge 854px"]]} help="Keeps the aspect ratio and never upscales."/>
  <label className="check-label audio-option"><input type="checkbox" checked={!mute} onChange={e=>setMute(!e.target.checked)}/> Keep original audio</label>
 </>}/>;
}
