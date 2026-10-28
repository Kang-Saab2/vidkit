import { useState } from 'react';
import { Expand, RefreshCw } from 'lucide-react';
import VideoToolWorkspace,{Setting} from './VideoToolWorkspace';
import { buildResizePlan,evenDown,evenRound } from '../services/spatialOperations.js';
import { ResizePreview } from './SpatialPreview';
import './SpatialTools.css';

const presets={'1080':[1920,1080],'720':[1280,720],'480':[854,480],portrait:[1080,1920],square:[1080,1080]};
const base={id:'resize',title:'Video resizer',eyebrow:'FIND THE PERFECT FIT.',description:'A new size. The same big idea.',icon:Expand,color:'orange',uploadTag:'A LITTLE ROOM TO RESHAPE THINGS',uploadTitle:'Every screen has its size.',settingsTag:'MAKE ROOM FOR YOUR VIDEO',settingsTitle:'Size it your way.',action:'Resize video',suffix:'resized',extension:'mp4',resultTitle:'A perfect new fit.',tipTitle:'Your canvas. Your choice.',tip:'Fit keeps all of your video with black padding. Fill covers the canvas by cropping the edges. Stretch uses the exact dimensions and can distort the picture. Larger exports take more time and memory.',summary:s=>[['Output size',`${s.width||'—'} × ${s.height||'—'}`],['Resize mode',{contain:'Fit with padding',cover:'Fill and crop',stretch:'Stretch'}[s.fit]],['Audio',s.mute?'Muted':'Keep if present']]};
export default function VideoResizer(){
 const [source,setSource]=useState(null),[preset,setPreset]=useState('720'),[width,setWidth]=useState('1280'),[height,setHeight]=useState('720'),[fit,setFit]=useState('contain'),[locked,setLocked]=useState(true),[mute,setMute]=useState(false);
 function sourceChanged(info){setSource(info);if(info&&preset==='original'){setWidth(String(evenDown(info.width)));setHeight(String(evenDown(info.height)));}}
 function choosePreset(value){setPreset(value);const next=value==='original'&&source?[evenDown(source.width),evenDown(source.height)]:presets[value];if(next){setWidth(String(next[0]));setHeight(String(next[1]));}}
 function edit(which,text){
  setPreset('custom');const ratio=source?source.width/source.height:Number(width)/Number(height);
  if(which==='width'){setWidth(text);if(locked&&Number(text)>=2&&Number.isFinite(ratio)&&ratio>0)setHeight(String(Math.max(2,evenRound(Number(text)/ratio))));}
  else{setHeight(text);if(locked&&Number(text)>=2&&Number.isFinite(ratio)&&ratio>0)setWidth(String(Math.max(2,evenRound(Number(text)*ratio))));}
 }
 const settings={width,height,fit,mute};
 return <VideoToolWorkspace config={base} settings={settings} onInfoChange={sourceChanged} createPlan={(input,context)=>buildResizePlan({input,...context,width:Number(width),height:Number(height),fit,mute})} renderSource={props=><ResizePreview {...props} width={width} height={height} fit={fit} muted={mute}/>} controls={<>
  <Setting id="resize-preset" label="Size preset" value={preset} onChange={choosePreset} options={[["720","Landscape · 1280 × 720"],["1080","Landscape · 1920 × 1080"],["480","Landscape · 854 × 480"],["portrait","Portrait · 1080 × 1920"],["square","Square · 1080 × 1080"],["original","Original dimensions"],["custom","Custom dimensions"]]}/>
  <div className="spatial-fields"><label>Width (px)<input type="number" min="2" max="3840" step="2" required aria-label="Output width" value={width} onChange={e=>edit('width',e.target.value)}/></label><span>×</span><label>Height (px)<input type="number" min="2" max="3840" step="2" required aria-label="Output height" value={height} onChange={e=>edit('height',e.target.value)}/></label></div>
  <label className="check-label spatial-lock"><input type="checkbox" checked={locked} onChange={e=>setLocked(e.target.checked)}/> Match source aspect when editing</label><p className="setting-help">Custom edits use the source aspect ratio once a video is loaded. Presets define an exact canvas. Dimensions must be even pixels.</p>
  <Setting id="resize-fit" label="How the video fits" value={fit} onChange={setFit} options={[["contain","Fit · keep all, add padding"],["cover","Fill · crop edges"],["stretch","Stretch · exact dimensions"]]} help="The preview shows how your video will fit the selected canvas."/>
  <label className="check-label audio-option"><input type="checkbox" checked={!mute} onChange={e=>setMute(!e.target.checked)}/> Keep original audio</label>
  <button type="button" className="media-reset" disabled={!source} onClick={()=>choosePreset('original')}><RefreshCw size={13}/> Use source dimensions</button>
 </>}/>;
}
