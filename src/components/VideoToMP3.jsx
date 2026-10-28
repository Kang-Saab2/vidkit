import { useState } from 'react';
import { AudioLines } from 'lucide-react';
import VideoToolWorkspace, { Setting } from './VideoToolWorkspace';
import { buildMP3Plan } from '../services/mediaOperations.js';

const config={
  id:'mp3',title:'Video to MP3',eyebrow:'LET THE AUDIO DO THE TALKING.',description:'Your favorite sound, freed from the screen.',icon:AudioLines,color:'orange',segment:true,
  uploadTag:'GOOD SOUND DESERVES ITS OWN SPACE',uploadTitle:'Bring the video. Keep the sound.',settingsTag:'SOUND JUST RIGHT',settingsTitle:'Find your frequency.',
  action:'Extract MP3',suffix:'audio',extension:'mp3',resultTitle:'Sounds like a good idea.',
  tipTitle:'Just the part you want to hear.',tip:'Extract the whole soundtrack or choose a specific moment. Higher bitrates preserve more detail but cannot restore quality missing from the original audio. Videos without sound cannot create an MP3.',
  summary:settings=>[['Bitrate',`${settings.bitrate} kbps`],['Channels',settings.channels==='mono'?'Mono':'Stereo']],
};
export default function VideoToMP3(){
  const [bitrate,setBitrate]=useState('192'),[sampleRate,setSampleRate]=useState('44100'),[channels,setChannels]=useState('stereo');
  const settings={bitrate,sampleRate,channels};
  return <VideoToolWorkspace config={config} settings={settings} createPlan={(input,context)=>buildMP3Plan({input,...context,...settings})} controls={<>
    <Setting id="mp3-bitrate" label="Audio bitrate" value={bitrate} onChange={setBitrate} options={[["128","128 kbps · smaller file"],["192","192 kbps · balanced"],["256","256 kbps · high quality"],["320","320 kbps · highest bitrate"]]} help="192 kbps is a good starting point for music and everyday audio."/>
    <Setting id="mp3-sample-rate" label="Sample rate" value={sampleRate} onChange={setSampleRate} options={[["44100","44.1 kHz"],["48000","48 kHz"]]}/>
    <Setting id="mp3-channels" label="Audio channels" value={channels} onChange={setChannels} options={[["stereo","Stereo · 2 channels"],["mono","Mono · 1 channel"]]} help="Mono works well for spoken audio. Multichannel sound is downmixed to your chosen channel count."/>
  </>}/>;
}
