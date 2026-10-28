import { useState } from 'react';
import { Layers } from 'lucide-react';
import VideoToolWorkspace,{Setting} from './VideoToolWorkspace';
import { buildFramesPlan } from '../services/playbackOperations.js';
import { extractBrowserFrames } from '../services/browserFrames.js';
import './AdvancedTools.css';

const config={id:'frames',title:'Video to frames',eyebrow:'EVERY FRAME TELLS A STORY.',description:'Turn moving moments into a collection of stills.',icon:Layers,color:'orange',segment:true,initialLength:10,resultType:'frames',uploadTag:'ONE VIDEO. MANY LITTLE MOMENTS.',uploadTitle:'Take the story frame by frame.',settingsTag:'CHOOSE YOUR STILL MOMENTS',settingsTitle:'Make every frame count.',action:'Export frames',suffix:'frames',extension:'zip',resultTitle:'Your moments, collected.',tipTitle:'A little collection to keep.',tip:'Choose every source frame or a timed interval. The ZIP contains numbered images and a timestamp manifest. Preview and download the first 12 images individually; the ZIP includes them all. Export up to 120 frames at once.',summary:(s,c)=>[['Image format',s.format.toUpperCase()],['Interval',s.step==='every'?'Every source frame':`${s.step}s`],['Frames (up to)',s.step==='every'?'Counted during export':Number.isFinite(c.duration)&&c.end>c.start?String(Math.max(1,Math.ceil((c.end-c.start)/Number(s.step)-1e-9))):'—']]};
export default function VideoToFrames(){
 const [step,setStep]=useState('1'),[format,setFormat]=useState('jpg'),[edge,setEdge]=useState('640'),[quality,setQuality]=useState('4');
 const settings={step,format,edge,quality};
 return <VideoToolWorkspace config={config} settings={settings} processFile={({file,context,signal,onStatus,onProgress})=>extractBrowserFrames({file,...context,...settings,signal,onStatus,onProgress})} createPlan={(input,context)=>buildFramesPlan({input,...context,...settings})} controls={<>
  <Setting id="frames-interval" label="Capture interval" value={step} onChange={setStep} options={[["every","Every frame · source timestamps"],...['0.5','1','2','5','10'].map(n=>[n,`Every ${n} second${n==='1'?'':'s'}`])]} help={step==='every'?'Reads actual source timestamps without decoding frames in FFmpeg. Choose a short selection: up to 120 images per export.':'Capture one image at each selected interval.'}/>
  <Setting id="frames-format" label="Image format" value={format} onChange={setFormat} options={[["jpg","JPEG · smaller images"],["png","PNG · lossless images"]]} help="Frames are captured directly from the browser’s video decoder. PNG adds no image compression loss; video quality still depends on the source."/>
  <Setting id="frames-size" label="Maximum image edge" value={edge} onChange={setEdge} options={['320','640','960','1280'].map(n=>[n,`${n}px`])}/>
  {format==='jpg'&&<Setting id="frames-quality" label="JPEG quality" value={quality} onChange={setQuality} options={[["2","High detail"],["4","Balanced"],["8","Smaller images"]]}/>}
 </>}/>;
}



