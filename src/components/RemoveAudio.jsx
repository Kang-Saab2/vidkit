import { VolumeX } from 'lucide-react';
import VideoToolWorkspace from './VideoToolWorkspace';
import { buildEditPlan } from '../services/editOperations.js';

const config={
  id:'mute',title:'Remove audio',eyebrow:'SOMETIMES, SILENCE IS GOLDEN.',description:'Keep the picture. Leave the soundtrack behind.',icon:VolumeX,color:'pink',
  uploadTag:'LET YOUR VIDEO SPEAK FOR ITSELF',uploadTitle:'A quieter kind of video.',settingsTag:'SILENCE, SIMPLIFIED',settingsTitle:'Picture perfect. Sound off.',
  action:'Remove audio',suffix:'muted',extension:'mp4',resultTitle:'A little peace and quiet.',preview:{muted:true},
  tipTitle:'Really remove the sound.',tip:'This export removes all audio tracks from the file. The video is re-encoded as a compatible H.264 MP4. Videos that are already silent work too.',
  summary:()=>[['Audio tracks','Removed'],['Video','H.264 MP4']],
};
export default function RemoveAudio(){return <VideoToolWorkspace config={config} settings={{}} createPlan={(input,context)=>buildEditPlan({input,...context,operation:'mute'})} controls={<div className="edit-explanation"><VolumeX size={30}/><strong>No audio. No extra steps.</strong><p>Choose a video and export a silent copy. Your original file stays untouched.</p><p>The source preview is muted. The downloaded file contains no audio track.</p></div>}/>;}
