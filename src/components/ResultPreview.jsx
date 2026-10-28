import { useEffect,useState } from 'react';
import { Download,Info } from 'lucide-react';
import { formatTime } from '../services/trimSettings.js';

function FrameImage({frame}){
 const [url,setURL]=useState('');
 useEffect(()=>{const next=URL.createObjectURL(frame.blob);setURL(next);return()=>URL.revokeObjectURL(next);},[frame.blob]);
 return <a className="exported-frame" href={url||undefined} download={frame.name}><img src={url||undefined} alt={`Video frame near ${formatTime(frame.time)}`}/><span>{formatTime(frame.time)}<Download size={12}/></span></a>;
}
export default function ResultPreview({result,url,Icon}){
 const [failed,setFailed]=useState(false);
 useEffect(()=>setFailed(false),[url]);
 if(result.previewType==='frames')return <div className="frames-result"><p>{result.count} frames in your ZIP, plus a timestamp manifest. Showing the first {result.images.length}; click a frame to download it individually.</p><div className="frames-gallery">{result.images.map(frame=><FrameImage key={frame.name} frame={frame}/>)}</div></div>;
 if(result.previewType==='image')return <div className="media-gif-result"><img key={url} src={url} alt="Your exported animated GIF"/></div>;
 if(result.previewType==='audio')return <div className="media-audio-result"><Icon size={45}/><audio key={url} controls preload="metadata" src={url}/></div>;
 if(failed)return <div className="output-preview-error"><Info size={22}/><p>This format cannot be previewed in your browser. Download the exported file to play it in a compatible player.</p></div>;
 return <video key={url} controls playsInline preload="metadata" src={url} onError={()=>setFailed(true)}/>;
}
