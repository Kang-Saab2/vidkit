import { useEffect,useState } from 'react';
import { Crop,RefreshCw } from 'lucide-react';
import VideoToolWorkspace,{Setting} from './VideoToolWorkspace';
import { buildCropPlan,centeredCrop,cropRatios,evenDown,evenRound,adjustCrop } from '../services/spatialOperations.js';
import { CropPreview } from './SpatialPreview';
import './SpatialTools.css';

const base={id:'crop',title:'Video cropper',eyebrow:'FOCUS ON WHAT MATTERS.',description:'Frame the moment. Leave the rest behind.',icon:Crop,color:'teal',uploadTag:'LET THE GOOD PART TAKE THE FRAME',uploadTitle:'A little less around the edges.',settingsTag:'YOUR FRAME. YOUR FOCUS.',settingsTitle:'Make the frame yours.',action:'Crop video',suffix:'cropped',extension:'mp4',resultTitle:'Right in the frame.',tipTitle:'A frame you can feel.',tip:'Drag the selection to move it, or drag a corner to resize it. Arrow keys move a focused selection or corner by 2 pixels; hold Shift for 10. Cropping removes pixels outside your selection and exports the full video duration.',summary:s=>[['Crop size',s.crop?`${s.crop.width} × ${s.crop.height}`:'Choose a video'],['Position',s.crop?`${s.crop.x}, ${s.crop.y}`:'—'],['Audio',s.mute?'Muted':'Keep if present']]};
function CropField({label,value,onCommit,disabled}){
 const [text,setText]=useState(String(value));useEffect(()=>setText(String(value)),[value]);
 function commit(){const next=Number(text);if(text.trim()&&Number.isFinite(next))onCommit(next);setText(String(value));}
 return <label>{label}<input type="number" step="2" disabled={disabled} aria-label={label} value={text} onChange={e=>setText(e.target.value)} onBlur={commit} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}}}/></label>;
}
export default function VideoCropper(){
 const [source,setSource]=useState(null),[crop,setCrop]=useState(null),[preset,setPreset]=useState('free'),[mute,setMute]=useState(false);
 const ratio=preset==='original'&&source?source.width/source.height:cropRatios[preset];
 function sourceChanged(info){setSource(info);setCrop(info?centeredCrop(info,preset==='original'?info.width/info.height:cropRatios[preset]):null);}
 function choosePreset(value){setPreset(value);if(source&&value!=='free')setCrop(centeredCrop(source,value==='original'?source.width/source.height:cropRatios[value]));}
 function edit(key,value){
  if(!source||!crop)return;
  if(key==='x'||key==='y'){setCrop(adjustCrop(crop,'move',key==='x'?evenRound(value)-crop.x:0,key==='y'?evenRound(value)-crop.y:0,source));return;}
  const next=evenDown(value);
  if(ratio){setCrop(adjustCrop(crop,'se',key==='width'?next-crop.width:0,key==='height'?next-crop.height:0,source,ratio));}
  else setCrop({...crop,[key]:Math.min(next,key==='width'?evenDown(source.width)-crop.x:evenDown(source.height)-crop.y)});
 }
 const settings={crop,mute};
 return <VideoToolWorkspace config={base} settings={settings} onInfoChange={sourceChanged} createPlan={(input,context)=>buildCropPlan({input,...context,crop,mute})} renderSource={props=><CropPreview {...props} crop={crop} ratio={ratio} onChange={setCrop} muted={mute}/>} controls={<>
  <Setting id="crop-aspect" label="Aspect ratio" value={preset} onChange={choosePreset} options={[["free","Freeform"],["original","Original aspect"],["square","Square · 1:1"],["landscape","Landscape · 16:9"],["portrait","Portrait · 9:16"],["classic","Classic · 4:3"]]} help="A ratio preset creates a centered selection. Move it to choose what stays in the frame."/>
  <div className="crop-pixel-fields"><CropField label="Crop width" value={crop?.width||0} onCommit={v=>edit('width',v)} disabled={!source}/><CropField label="Crop height" value={crop?.height||0} onCommit={v=>edit('height',v)} disabled={!source}/><CropField label="Left offset" value={crop?.x||0} onCommit={v=>edit('x',v)} disabled={!source}/><CropField label="Top offset" value={crop?.y||0} onCommit={v=>edit('y',v)} disabled={!source}/></div>
  <p className="setting-help">Values are source pixels. Position and dimensions snap to even pixels for accurate H.264 output. Press Enter or leave a field to apply it.</p>
  <button type="button" className="media-reset" disabled={!source} onClick={()=>setCrop(centeredCrop(source,ratio))}><RefreshCw size={13}/> Reset centered crop</button>
  <label className="check-label audio-option spatial-audio"><input type="checkbox" checked={!mute} onChange={e=>setMute(!e.target.checked)}/> Keep original audio</label>
 </>}/>;
}
