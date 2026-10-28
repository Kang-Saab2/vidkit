import { useState } from 'react';
import { FlipHorizontal2 } from 'lucide-react';
import VideoToolWorkspace from './VideoToolWorkspace';
import { buildEditPlan } from '../services/editOperations.js';

const base={id:'flip',title:'Video flipper',eyebrow:'SEE THE OTHER SIDE.',description:'Mirror the moment. Change your perspective.',icon:FlipHorizontal2,color:'yellow',uploadTag:'A DIFFERENT WAY TO SEE IT',uploadTitle:'Your video, on the flip side.',settingsTag:'SWITCH YOUR PERSPECTIVE',settingsTitle:'Flip it your way.',action:'Flip video',suffix:'flipped',extension:'mp4',resultTitle:'A fresh point of view.',tipTitle:'A flip that follows through.',tip:'Horizontal mirrors left and right. Vertical turns top to bottom. Choose both for a 180° turn. The preview updates immediately and the exported MP4 applies your selected flips.',summary:s=>[['Direction',s.horizontal&&s.vertical?'Both axes':s.horizontal?'Horizontal':s.vertical?'Vertical':'Choose an axis'],['Audio',s.mute?'Muted':'Keep if present']]};
export default function VideoFlipper(){
 const [horizontal,setHorizontal]=useState(true),[vertical,setVertical]=useState(false),[mute,setMute]=useState(false);
 const settings={horizontal,vertical,mute},config={...base,preview:{horizontal,vertical,muted:mute}};
 return <VideoToolWorkspace config={config} settings={settings} createPlan={(input,context)=>buildEditPlan({input,...context,...settings,operation:'flip'})} controls={<><div className="flip-options"><label className="check-label"><input type="checkbox" checked={horizontal} onChange={e=>setHorizontal(e.target.checked)}/> Flip horizontally <span>Left ↔ right</span></label><label className="check-label"><input type="checkbox" checked={vertical} onChange={e=>setVertical(e.target.checked)}/> Flip vertically <span>Top ↔ bottom</span></label></div><p className="setting-help">Select one or both axes. The file keeps its original aspect ratio.</p><label className="check-label audio-option"><input type="checkbox" checked={!mute} onChange={e=>setMute(!e.target.checked)}/> Keep original audio</label></>}/>;
}
