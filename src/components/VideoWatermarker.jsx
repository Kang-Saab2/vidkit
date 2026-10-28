import { useEffect,useMemo,useRef,useState } from 'react';
import { Stamp,Upload,RefreshCw } from 'lucide-react';
import VideoToolWorkspace,{Setting} from './VideoToolWorkspace';
import { buildWatermarkPlan,renderWatermark,watermarkPosition,watermarkPercent } from '../services/watermarkOperations.js';
import './Watermarker.css';

const positions={tl:[0,0],tc:[50,0],tr:[100,0],ml:[0,50],center:[50,50],mr:[100,50],bl:[0,100],bc:[50,100],br:[100,100]};
const config={id:'watermark',title:'Add watermark',eyebrow:'MAKE YOUR MARK.',description:'A little signature. A video that feels like yours.',icon:Stamp,color:'teal',uploadTag:'YOUR STORY DESERVES YOUR SIGNATURE',uploadTitle:'Leave a little mark.',settingsTag:'YOUR SIGNATURE STYLE',settingsTitle:'Make it yours.',action:'Add watermark',suffix:'watermarked',extension:'mp4',resultTitle:'Signed, sealed, ready.',tipTitle:'Your mark, right where it belongs.',tip:'Add up to three lines of text or a transparent logo. Drag the watermark to position it, or use the presets and sliders. Arrow keys move a focused watermark by 2 pixels, or 10 with Shift. The mark appears throughout the full video.',summary:s=>[['Watermark',s.mode==='text'?'Text':'Logo'],['Opacity',`${s.opacity}%`],['Audio',s.mute?'Muted':'Keep if present']]};

function MarkPreview({asset,x,y,opacity,muted,onMove,...props}){
 const stage=useRef(null),drag=useRef(null),[url,setURL]=useState('');
 useEffect(()=>{if(!asset){setURL('');return;}const next=URL.createObjectURL(asset.blob);setURL(next);return()=>URL.revokeObjectURL(next);},[asset]);
 const info=props.info,position=info&&asset?watermarkPosition(info,asset,x,y):null,ratio=info?info.width/info.height:16/9;
 function begin(e){if(props.busy||!position||e.button!==0)return;e.preventDefault();props.videoRef.current?.pause();const box=stage.current.getBoundingClientRect();drag.current={clientX:e.clientX,clientY:e.clientY,x:position.x,y:position.y,sx:info.width/box.width,sy:info.height/box.height};stage.current.setPointerCapture(e.pointerId);}
 function move(e){if(!drag.current||props.busy)return;const d=drag.current;onMove(watermarkPercent(info,asset,d.x+(e.clientX-d.clientX)*d.sx,d.y+(e.clientY-d.clientY)*d.sy));}
 function keyboard(e){const direction={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(!direction||!position||props.busy)return;e.preventDefault();const step=e.shiftKey?10:2;onMove(watermarkPercent(info,asset,position.x+direction[0]*step,position.y+direction[1]*step));}
 return <div ref={stage} className="watermark-stage" style={{aspectRatio:ratio,width:`min(100%, ${440*ratio}px)`}} onPointerMove={move} onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}><video key={props.source} ref={props.videoRef} src={props.source||undefined} muted={muted} playsInline preload="metadata" onLoadedMetadata={props.onLoadedMetadata} onError={props.onError} onTimeUpdate={props.onTimeUpdate} onPlay={props.onPlay} onPause={props.onPause} onEnded={props.onEnded}/>{position&&url&&<button type="button" className="watermark-move" disabled={props.busy} aria-label="Move watermark" onPointerDown={begin} onKeyDown={keyboard} style={{left:`${position.x/info.width*100}%`,top:`${position.y/info.height*100}%`,width:`${asset.width/info.width*100}%`,height:`${asset.height/info.height*100}%`}}><img src={url} alt="Watermark preview" draggable="false" style={{opacity:opacity/100}}/></button>}</div>;
}
export default function VideoWatermarker(){
 const [info,setInfo]=useState(null),[mode,setMode]=useState('text'),[text,setText]=useState('Made with VidKit'),[color,setColor]=useState('#ffffff'),[textSize,setTextSize]=useState(4),[logoSize,setLogoSize]=useState(20),[background,setBackground]=useState(false);
 const [logo,setLogo]=useState(null),[imageError,setImageError]=useState(''),[assetState,setAssetState]=useState(null),[assetError,setAssetError]=useState(''),[opacity,setOpacity]=useState(70),[preset,setPreset]=useState('br'),[x,setX]=useState(100),[y,setY]=useState(100),[mute,setMute]=useState(false);
 const picker=useRef(null);
 const renderKey=useMemo(()=>({info,mode,text,color,textSize,logoSize,logo,background}),[info,mode,text,color,textSize,logoSize,logo,background]);
 const asset=assetState?.key===renderKey?assetState.asset:null;
 useEffect(()=>{
  let cancelled=false;setAssetError('');
  if(!info)return;
  renderWatermark(renderKey).then(asset=>{if(!cancelled)setAssetState({key:renderKey,asset});}).catch(error=>{if(!cancelled)setAssetError(error.message);});
  return()=>{cancelled=true;};
 },[renderKey,info]);
 function chooseLogo(file){if(!file)return;setImageError('');if(!['image/png','image/jpeg','image/webp'].includes(file.type))return setImageError('Choose a PNG, JPEG, or WebP image.');if(!file.size||file.size>5*1024*1024)return setImageError('Choose a non-empty logo under 5 MB.');setLogo(file);}
 function move(position){setPreset('custom');setX(position.x);setY(position.y);}
 function choosePreset(value){setPreset(value);if(positions[value]){setX(positions[value][0]);setY(positions[value][1]);}}
 const settings={mode,opacity,mute};
 return <VideoToolWorkspace config={config} settings={settings} onInfoChange={setInfo} createPlan={(input,context)=>{if(assetError)throw new Error(assetError);return buildWatermarkPlan({input,...context,asset,x,y,opacity,mute});}} renderSource={props=><MarkPreview {...props} asset={asset} x={x} y={y} opacity={opacity} muted={mute} onMove={move}/>} controls={<>
  <Setting id="watermark-type" label="Watermark type" value={mode} onChange={setMode} options={[["text","Text signature"],["logo","Image / logo"]]}/>
  {mode==='text'?<><label className="watermark-text-label">Your text<textarea aria-label="Watermark text" maxLength={120} rows={3} value={text} onChange={e=>setText(e.target.value.split('\n').slice(0,3).join('\n'))}/></label><p className="setting-help">Up to 120 characters and 3 lines. Text is automatically fitted inside the video.</p><div className="watermark-color"><label htmlFor="watermark-color">Text color</label><input id="watermark-color" type="color" value={color} onChange={e=>setColor(e.target.value)}/></div><label className="watermark-slider">Text size <span>{textSize}% of video width</span><input aria-label="Watermark text size" type="range" min="2" max="12" step="0.5" value={textSize} onChange={e=>setTextSize(Number(e.target.value))}/></label><label className="check-label"><input type="checkbox" checked={background} onChange={e=>setBackground(e.target.checked)}/> Add a dark background</label></>:<>
   <input ref={picker} type="file" className="trimmer-file-input" aria-label="Choose watermark logo" accept="image/png,image/jpeg,image/webp" onChange={e=>{chooseLogo(e.target.files?.[0]);e.target.value='';}}/>
   <button type="button" className="watermark-logo-pick" onClick={()=>picker.current.click()}><Upload size={16}/>{logo?'Replace logo':'Choose a logo'}</button>{logo&&<p className="watermark-filename">{logo.name}</p>}<p className="setting-help">PNG, JPEG, or WebP · under 5 MB · max 4096px per side. Transparent PNG works well. Logos are never upscaled.</p>{imageError&&<p className="range-error" role="alert">{imageError}</p>}<label className="watermark-slider">Logo width <span>{logoSize}% of video width</span><input aria-label="Watermark logo size" type="range" min="5" max="60" step="1" value={logoSize} onChange={e=>setLogoSize(Number(e.target.value))}/></label>
  </>}
  <Setting id="watermark-position" label="Position" value={preset} onChange={choosePreset} options={[["tl","Top left"],["tc","Top center"],["tr","Top right"],["ml","Middle left"],["center","Center"],["mr","Middle right"],["bl","Bottom left"],["bc","Bottom center"],["br","Bottom right"],["custom","Custom position"]]}/>
  <label className="watermark-slider">Horizontal position <span>{Math.round(x)}%</span><input aria-label="Watermark horizontal position" type="range" min="0" max="100" step="0.1" value={x} onChange={e=>move({x:Number(e.target.value),y})}/></label>
  <label className="watermark-slider">Vertical position <span>{Math.round(y)}%</span><input aria-label="Watermark vertical position" type="range" min="0" max="100" step="0.1" value={y} onChange={e=>move({x,y:Number(e.target.value)})}/></label>
  <label className="watermark-slider">Opacity <span>{opacity}%</span><input aria-label="Watermark opacity" type="range" min="10" max="100" step="1" value={opacity} onChange={e=>setOpacity(Number(e.target.value))}/></label>
  <button type="button" className="media-reset" onClick={()=>{choosePreset('br');setOpacity(70);}}><RefreshCw size={13}/> Reset position and opacity</button>
  <label className="check-label audio-option watermark-audio"><input type="checkbox" checked={!mute} onChange={e=>setMute(!e.target.checked)}/> Keep original audio</label>
 </>}/>;
}
