import { useRef } from 'react';
import { adjustCrop } from '../services/spatialOperations.js';

function Video({source,videoRef,onLoadedMetadata,onError,onTimeUpdate,onPlay,onPause,onEnded,muted}){
 return <video key={source} src={source||undefined} ref={videoRef} playsInline preload="metadata" muted={muted} onLoadedMetadata={onLoadedMetadata} onError={onError} onTimeUpdate={onTimeUpdate} onPlay={onPlay} onPause={onPause} onEnded={onEnded}/>;
}
export function ResizePreview({width,height,fit,muted,...props}){
 const ratio=Number(width)>0&&Number(height)>0?Number(width)/Number(height):16/9;
 return <div className="spatial-preview resize-preview" style={{aspectRatio:ratio,width:`min(100%, ${440*ratio}px)`,'--resize-fit':{contain:'contain',cover:'cover',stretch:'fill'}[fit]}}><Video {...props} muted={muted}/><span className="spatial-preview-label">OUTPUT PREVIEW</span></div>;
}
export function CropPreview({crop,ratio,onChange,muted,...props}){
 const stage=useRef(null),drag=useRef(null),info=props.info;
 function start(event,kind){
  if(props.busy||!crop||!info||event.button!==0)return;
  event.preventDefault();event.stopPropagation();
  props.videoRef.current?.pause();
  const box=stage.current.getBoundingClientRect();
  drag.current={kind,crop:{...crop},x:event.clientX,y:event.clientY,scaleX:info.width/box.width,scaleY:info.height/box.height};
  stage.current.setPointerCapture(event.pointerId);
 }
 function move(event){const current=drag.current;if(!current||props.busy)return;onChange(adjustCrop(current.crop,current.kind,(event.clientX-current.x)*current.scaleX,(event.clientY-current.y)*current.scaleY,info,ratio));}
 function keyboard(event,kind){
  const directions={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};
  if(!directions[event.key]||props.busy||!info||!crop)return;
  event.preventDefault();const [dx,dy]=directions[event.key],step=event.shiftKey?10:2;
  onChange(adjustCrop(crop,kind,dx*step,dy*step,info,ratio));
 }
 const aspect=info?info.width/info.height:16/9;
 return <div ref={stage} className="spatial-preview crop-preview" style={{aspectRatio:aspect,width:`min(100%, ${440*aspect}px)`}} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}><Video {...props} muted={muted}/>{info&&crop&&<div className="crop-selection" style={{left:`${crop.x/info.width*100}%`,top:`${crop.y/info.height*100}%`,width:`${crop.width/info.width*100}%`,height:`${crop.height/info.height*100}%`}}><button type="button" className="crop-move" disabled={props.busy} aria-label="Move crop region" onPointerDown={e=>start(e,'move')} onKeyDown={e=>keyboard(e,'move')}><span className="crop-thirds"/><span className="crop-size-tag">{crop.width} × {crop.height}</span></button>{[['nw','top left'],['ne','top right'],['sw','bottom left'],['se','bottom right']].map(([kind,label])=><button type="button" key={kind} disabled={props.busy} className={`crop-handle ${kind}`} aria-label={`Resize crop from ${label}`} onPointerDown={e=>start(e,kind)} onKeyDown={e=>keyboard(e,kind)}/>)}</div>}</div>;
}
