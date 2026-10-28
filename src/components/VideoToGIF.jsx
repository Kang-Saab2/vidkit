import { useState } from 'react';
import { Image } from 'lucide-react';
import VideoToolWorkspace, { Setting } from './VideoToolWorkspace';
import { buildGIFPlan } from '../services/mediaOperations.js';

const config={
  id:'gif',title:'Video to GIF',eyebrow:'A LITTLE MOMENT. ON REPEAT.',description:'Turn a favorite moment into a little loop.',icon:Image,color:'yellow',segment:true,initialLength:5,
  uploadTag:'WORTH WATCHING AGAIN. AND AGAIN.',uploadTitle:'Make a moment. Make it loop.',settingsTag:'SMALL DETAILS. BIG PERSONALITY.',settingsTitle:'Set it in motion.',
  action:'Create GIF',suffix:'animated',extension:'gif',resultTitle:'A moment worth repeating.',
  tipTitle:'Keep it short and sweet.',tip:'GIFs have no sound and can be larger than videos. Try 3–5 seconds at 480px and 10 fps. Clips are limited to 30 seconds, with a maximum height of 720px to keep memory use manageable.',
  summary:settings=>[['Frame rate',`${settings.fps} fps`],['Playback',settings.loop?'Loop forever':'Play once']],
};
export default function VideoToGIF(){
  const [width,setWidth]=useState('480'),[fps,setFPS]=useState('10'),[colors,setColors]=useState('256'),[loop,setLoop]=useState(true);
  const settings={width,fps,colors,loop};
  return <VideoToolWorkspace config={config} settings={settings} createPlan={(input,context)=>buildGIFPlan({input,...context,...settings})} controls={<>
    <Setting id="gif-width" label="Maximum width" value={width} onChange={setWidth} options={['240','360','480','640','720'].map(n=>[n,`${n}px${n==='480'?' · recommended':''}`])} help="Keeps the aspect ratio. Never upscales; very tall videos are also capped at 720px high."/>
    <Setting id="gif-fps" label="Frame rate" value={fps} onChange={setFPS} options={['5','10','15','20','24'].map(n=>[n,`${n} fps${n==='10'?' · balanced':''}`])} help="More frames look smoother but increase file size and processing time."/>
    <Setting id="gif-colors" label="Color palette" value={colors} onChange={setColors} options={[["64","64 colors · simpler"],["128","128 colors · balanced"],["256","256 colors · more detail"]]}/>
    <label className="check-label audio-option"><input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/> Loop forever</label>
  </>}/>;
}
