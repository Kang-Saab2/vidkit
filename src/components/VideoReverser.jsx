import { useState } from 'react';
import { Rewind } from 'lucide-react';
import VideoToolWorkspace,{Setting} from './VideoToolWorkspace';
import { buildReversePlan } from '../services/playbackOperations.js';
import './AdvancedTools.css';

const config={id:'reverse',title:'Video reverser',eyebrow:'PLAY IT BACK. BACKWARDS.',description:'A familiar moment. An unexpected direction.',icon:Rewind,color:'orange',segment:true,initialLength:5,uploadTag:'GOOD MOMENTS GO BOTH WAYS',uploadTitle:'Give your story a rewind.',settingsTag:'TURN BACK THE MOMENT',settingsTitle:'Go back a little.',action:'Reverse video',suffix:'reversed',extension:'mp4',resultTitle:'A different direction.',tipTitle:'Short clips. Better reversals.',tip:'Reverse buffers decoded frames in memory. Select up to 15 seconds and lower the output size if needed. Exports use 24 fps, preserve aspect ratio, and never upscale. The source preview plays forward; preview the reversed result after export.',summary:s=>[['Maximum edge',`${s.edge}px`],['Frame rate','24 fps'],['Audio',{reverse:'Reversed',keep:'Forward',mute:'Muted'}[s.audio]]]};
export default function VideoReverser(){
 const [edge,setEdge]=useState('480'),[audio,setAudio]=useState('reverse');
 const settings={edge,audio};
 return <VideoToolWorkspace config={config} settings={settings} createPlan={(input,context)=>buildReversePlan({input,...context,...settings})} controls={<>
  <Setting id="reverse-size" label="Maximum output edge" value={edge} onChange={setEdge} options={['320','480','640','720'].map(n=>[n,`${n}px${n==='480'?' · recommended':''}`])} help="The longest side is capped at this size. Smaller output needs much less memory."/>
  <Setting id="reverse-audio" label="Audio direction" value={audio} onChange={setAudio} options={[["reverse","Reverse with the video"],["keep","Keep original direction"],["mute","Remove audio"]]} help="Videos without audio can be reversed too."/>
  <div className="advanced-notice">Select 15 seconds or less. High-resolution output may require a shorter selection.</div>
 </>}/>;
}
