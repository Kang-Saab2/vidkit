import { useState } from 'react';
import { Gauge } from 'lucide-react';
import VideoToolWorkspace,{Setting} from './VideoToolWorkspace';
import { buildSpeedPlan } from '../services/playbackOperations.js';
import './AdvancedTools.css';

const base={id:'speed',title:'Video speed changer',eyebrow:'GO AT YOUR OWN PACE.',description:'Slow down the moment. Or pick up the pace.',icon:Gauge,color:'pink',segment:true,uploadTag:'A DIFFERENT KIND OF TIMING',uploadTitle:'Your moment. Your tempo.',settingsTag:'SET YOUR OWN RHYTHM',settingsTitle:'Find your pace.',action:'Change speed',suffix:'speed-adjusted',extension:'mp4',resultTitle:'Right on your time.',tipTitle:'Sound that keeps up.',tip:'Choose the whole video or a selected interval. Audio follows the new speed while preserving its pitch. The source preview uses your selected speed; the exported MP4 plays normally at its new duration and 30 fps.',summary:(s,c)=>[['Speed',`${s.speed}×`],['Output duration',Number.isFinite(c.end-c.start)?`${((c.end-c.start)/Number(s.speed)).toFixed(2)}s`:'—'],['Audio',s.mute?'Muted':'Pitch preserved']]};
export default function VideoSpeedChanger(){
 const [speed,setSpeed]=useState('1.5'),[mute,setMute]=useState(false);
 const settings={speed,mute},config={...base,playbackRate:Number(speed),preview:{muted:mute}};
 return <VideoToolWorkspace config={config} settings={settings} createPlan={(input,context)=>buildSpeedPlan({input,...context,speed:Number(speed),mute})} controls={<>
  <Setting id="video-speed" label="Playback speed" value={speed} onChange={setSpeed} options={['0.25','0.5','0.75','1','1.25','1.5','2','3','4'].map(n=>[n,`${n}×${Number(n)<1?' · slower':Number(n)>1?' · faster':' · original'}`])} help="0.5× doubles the duration; 2× halves it. Slowing down cannot add detail missing from the original frames."/>
  <div className="speed-readout"><Gauge size={32}/><strong>{speed}<span>×</span></strong></div>
  <label className="check-label audio-option"><input type="checkbox" checked={!mute} onChange={e=>setMute(!e.target.checked)}/> Keep audio · preserve pitch</label>
 </>}/>;
}
