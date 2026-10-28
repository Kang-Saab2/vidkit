import { useState } from 'react';
import { RotateCw } from 'lucide-react';
import VideoToolWorkspace, { Setting } from './VideoToolWorkspace';
import { buildEditPlan } from '../services/editOperations.js';

const base={id:'rotate',title:'Video rotator',eyebrow:'A FRESH PERSPECTIVE.',description:'Get your video looking the right way up.',icon:RotateCw,color:'teal',uploadTag:'TURN THINGS AROUND',uploadTitle:'A new angle on your story.',settingsTag:'FIND YOUR ANGLE',settingsTitle:'Give it a turn.',action:'Rotate video',suffix:'rotated',extension:'mp4',resultTitle:'Looking the right way.',tipTitle:'A rotation that stays.',tip:'The rotation is applied to the actual video frames and saved as MP4. Quarter turns swap the video’s width and height; no content is cropped.',summary:s=>[['Rotation',`${s.rotation}° clockwise`],['Audio',s.mute?'Muted':'Keep if present']]};
export default function VideoRotator(){
 const [rotation,setRotation]=useState('90'),[mute,setMute]=useState(false);
 const settings={rotation,mute},config={...base,preview:{rotation:Number(rotation),muted:mute}};
 return <VideoToolWorkspace config={config} settings={settings} createPlan={(input,context)=>buildEditPlan({input,...context,...settings,operation:'rotate'})} controls={<><Setting id="rotate-angle" label="Rotation" value={rotation} onChange={setRotation} options={[["90","90° clockwise · turn right"],["180","180° · upside down"],["270","270° clockwise · turn left"]]} help="The source preview updates as you change the angle. Use the controls below for playback."/><label className="check-label audio-option"><input type="checkbox" checked={!mute} onChange={e=>setMute(!e.target.checked)}/> Keep original audio</label></>}/>;
}
