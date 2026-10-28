import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, Download, Film, Info, LoaderCircle, Pause, Play, RefreshCw, ShieldCheck, Upload, X } from 'lucide-react';
import { formatTime, MAX_DURATION, MAX_FILE_BYTES, MIN_CLIP, parseTime, validateRange } from '../services/trimSettings.js';
import { mediaFilename } from '../services/mediaOperations.js';
import { runMediaJob } from '../services/runMediaJob.js';
import ResultPreview from './ResultPreview';
import './VideoTrimmer.css';
import './VideoToolWorkspace.css';

function useObjectURL(blob) {
  const [url, setURL] = useState('');
  useEffect(() => { if (!blob) { setURL(''); return; } const next = URL.createObjectURL(blob); setURL(next); return () => URL.revokeObjectURL(next); }, [blob]);
  return url;
}
export const fileSize = bytes => `${(bytes / 1024 / 1024).toFixed(2)} MB`;

export function Setting({ label, id, value, onChange, options, help }) {
  return <div className="media-setting"><label className="export-label" htmlFor={id}>{label}</label><select id={id} value={value} onChange={e=>onChange(e.target.value)}>{options.map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>{help&&<p className="setting-help">{help}</p>}</div>;
}

export default function VideoToolWorkspace({ config, settings, controls, createPlan, onInfoChange, renderSource, processFile }) {
  const [currentTime,setCurrentTime]=useState(0);
  const [file,setFile]=useState(null),[info,setInfo]=useState(null),[sourceError,setSourceError]=useState('');
  const [startText,setStartText]=useState(formatTime(0)),[endText,setEndText]=useState(formatTime(0));
  const [busy,setBusy]=useState(false),[status,setStatus]=useState(''),[progress,setProgress]=useState(null);
  const [error,setError]=useState(''),[notice,setNotice]=useState(''),[result,setResult]=useState(null),[dragging,setDragging]=useState(false),[playing,setPlaying]=useState(false);
  const input=useRef(null),video=useRef(null),abort=useRef(null),mounted=useRef(true),previewing=useRef(false);
  const source=useObjectURL(file),output=useObjectURL(result?.blob);
  const start=config.segment?parseTime(startText):0, end=config.segment?parseTime(endText):info?.duration;
  const context={start,end,duration:info?.duration,width:info?.width,height:info?.height};
  let validation='';
  if(info){try{validateRange(start,end,info.duration);createPlan('input.mp4',context);}catch(e){validation=e.message;}}
  const ready=Boolean(info&&!sourceError&&!validation);
  const length=ready?end-start:0;

  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abort.current?.abort();};},[]);
  useEffect(()=>{if(video.current){video.current.playbackRate=config.playbackRate||1;video.current.preservesPitch=true;}},[config.playbackRate,source,info]);
  useEffect(()=>{
    if(!source||info||sourceError)return;
    const timer=setTimeout(()=>setSourceError('The browser could not read this video. Try an H.264 MP4 or WebM file.'),20000);
    return()=>clearTimeout(timer);
  },[source,info,sourceError]);
  useEffect(()=>{
    if(!playing)return;
    let frame;
    const tick=()=>{const player=video.current;if(player&&previewing.current&&ready&&player.currentTime>=end){player.pause();previewing.current=false;}frame=requestAnimationFrame(tick);};
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[playing,end,ready]);

  function choose(next){
    if(busy||!next)return;
    setError('');setNotice('');
    if(!next.size)return setError('This file is empty. Choose a video with content.');
    if(next.size>MAX_FILE_BYTES)return setError('Choose a video under 200 MB.');
    if(!next.type.startsWith('video/')&&!/\.(mp4|m4v|mov|webm|mkv|avi|ogv)$/i.test(next.name))return setError('Choose a video file such as MP4, MOV, or WebM.');
    video.current?.pause();previewing.current=false;setPlaying(false);setCurrentTime(0);setInfo(null);setSourceError('');setResult(null);setFile(next);
    onInfoChange?.(null);
    setStartText(formatTime(0));setEndText(formatTime(0));
  }
  function metadata(event){
    const player=event.currentTarget;
    player.playbackRate=config.playbackRate||1;player.preservesPitch=true;
    if(!Number.isFinite(player.duration)||player.duration<MIN_CLIP||!player.videoWidth||!player.videoHeight)return setSourceError('This file has no readable video track or duration. Try another video.');
    if(player.duration>MAX_DURATION)return setSourceError('Choose a source video up to 10 minutes long.');
    const duration=Math.floor(player.duration*1000)/1000;
    setInfo({duration,width:player.videoWidth,height:player.videoHeight});setSourceError('');
    onInfoChange?.({duration,width:player.videoWidth,height:player.videoHeight});
    setStartText(formatTime(0));setEndText(formatTime(Math.min(duration,config.initialLength||duration)));
  }
  function seek(time){if(!video.current||!info||!Number.isFinite(time))return;video.current.currentTime=Math.max(0,Math.min(info.duration-.001,time));}
  function boundary(which,value){
    video.current?.pause();previewing.current=false;
    if(which==='start')setStartText(formatTime(value));else setEndText(formatTime(value));
    seek(value);
  }
  function editTime(which,text){
    video.current?.pause();previewing.current=false;
    if(which==='start')setStartText(text);else setEndText(text);
    const value=parseTime(text);if(value>=0&&value<=info.duration)seek(value);
  }
  async function preview(){
    if(!ready||!video.current)return;
    if(playing&&previewing.current){video.current.pause();previewing.current=false;return;}
    seek(start);previewing.current=true;
    try{await video.current.play();}catch{previewing.current=false;setError('Playback could not start. Try the player controls.');}
  }
  function remove(){video.current?.pause();previewing.current=false;setFile(null);setInfo(null);setResult(null);setSourceError('');setError('');setNotice('');setPlaying(false);onInfoChange?.(null);}
  async function process(event){
    event.preventDefault();if(!ready||busy||abort.current)return;
    const controller=new AbortController();abort.current=controller;
    const snapshot={...context,...settings};
    video.current?.pause();previewing.current=false;setBusy(true);setError('');setNotice('');setResult(null);setProgress(null);
    try{
      const processed=await (processFile||runMediaJob)({file,context,createPlan:input=>createPlan(input,context),signal:controller.signal,
        onStatus:value=>{if(mounted.current&&!controller.signal.aborted)setStatus(value);},
        onProgress:value=>{if(mounted.current&&!controller.signal.aborted)setProgress(previous=>Math.max(previous||0,value));},
      });
      if(!mounted.current||controller.signal.aborted)return;
      const data=processed instanceof Blob?{blob:processed}:processed;
      setResult({...data,extension:config.extension,previewType:config.resultType||(config.id==='gif'?'image':config.id==='mp3'?'audio':'video'),filename:mediaFilename(file.name,config.suffix,config.extension),sourceSize:file.size,settings:snapshot});setNotice('Your export is ready. Preview it below, then download.');setProgress(100);
    }catch(e){if(!mounted.current)return;if(e.name==='AbortError')setNotice('Export cancelled. Your file and settings are ready to try again.');else setError(e.message||'Export failed. Try a smaller file or lower output settings.');}
    finally{if(abort.current===controller)abort.current=null;if(mounted.current){setBusy(false);setStatus('');}}
  }
  const Icon=config.icon;
  const effect=config.preview||{};
  const turned=Boolean(effect.rotation%180);
  const aspect=info?(turned?info.height/info.width:info.width/info.height):1;
  const transformed=Boolean(info&&config.preview);
  const frameStyle=transformed?{aspectRatio:aspect,width:`min(100%, ${440*aspect}px)`}:undefined;
  const videoStyle=transformed?{width:turned?`${info.width/info.height*100}%`:'100%',height:turned?`${info.height/info.width*100}%`:'100%',transform:`translate(-50%, -50%) rotate(${effect.rotation||0}deg) scale(${effect.horizontal?-1:1}, ${effect.vertical?-1:1})`}:undefined;
  const sourceProps={source,info,busy,videoRef:video,onLoadedMetadata:metadata,onError:()=>setSourceError('This video cannot be previewed by your browser. Try an H.264 MP4 or WebM file.'),onTimeUpdate:e=>setCurrentTime(e.currentTarget.currentTime),onPlay:()=>setPlaying(true),onPause:()=>setPlaying(false),onEnded:()=>{previewing.current=false;setPlaying(false);}};
  return <div className={`trimmer-page media-tool media-${config.id}`}>
    <Link to="/tools" className="trimmer-back"><ArrowLeft size={15}/> All tools</Link>
    <section className="trimmer-heading"><div><span className="eyebrow">{config.eyebrow}</span><h1>{config.title}<span className="media-title-icon"><Icon size={30} strokeWidth={1.5}/></span></h1><p>{config.description}</p></div><span className="trimmer-private"><ShieldCheck size={16}/> 100% on your device</span></section>
    <input ref={input} className="trimmer-file-input" type="file" accept="video/*,.mkv,.avi" aria-label={`Choose video for ${config.title}`} onChange={e=>{choose(e.target.files?.[0]);e.target.value='';}}/>
    {(error||sourceError)&&<div className="trimmer-alert error" role="alert"><Info size={18}/><p>{sourceError||error}</p>{!sourceError&&<button type="button" onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button>}</div>}
    {notice&&<div className="trimmer-alert success" role="status"><Check size={18}/><p>{notice}</p></div>}
    {file&&<div className="trimmer-filebar"><span className={`file-icon ${config.color}`}><Film size={21}/></span><div><strong title={file.name}>{file.name}</strong><p>{fileSize(file.size)}{info&&` · ${info.width} × ${info.height} · ${formatTime(info.duration,false)}`}</p></div><button type="button" disabled={busy} onClick={()=>input.current.click()}><RefreshCw size={14}/> Replace</button><button type="button" disabled={busy} onClick={remove} aria-label="Remove video"><X size={18}/></button></div>}
    <form className="trimmer-workspace" onSubmit={process}>
      <div className="media-source-column">
        {!file?<section className={`trimmer-upload ${dragging?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer.files.length!==1){setError('Drop one video at a time.');return;}choose(e.dataTransfer.files[0]);}}><div className="upload-illustration"><Film size={55} strokeWidth={1.3}/><span className={config.color}><Icon size={27}/></span></div><span className="pill">{config.uploadTag}</span><h2>{config.uploadTitle}</h2><p>Drag a video here, or pick one from your device.</p><button type="button" className="light-button" onClick={()=>input.current.click()}><Upload size={17}/> Choose a video <ArrowUpRight size={16}/></button><small>Up to 200 MB · Source up to 10 minutes</small></section>:<div className="trimmer-editor">
          <div className="trimmer-player">{renderSource?renderSource(sourceProps):<div className={transformed?'media-transform-canvas':'media-source-frame'} style={frameStyle}><video key={source} ref={video} src={source||undefined} style={videoStyle} muted={Boolean(effect.muted)} controls={!transformed} onTimeUpdate={e=>setCurrentTime(e.currentTarget.currentTime)} playsInline preload="metadata" onLoadedMetadata={metadata} onError={()=>setSourceError('This video cannot be previewed by your browser. Try an H.264 MP4 or WebM file.')} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>{previewing.current=false;setPlaying(false);}}/></div>}{!info&&!sourceError&&<div className="metadata-loading"><LoaderCircle className="spin" size={20}/> Reading your video…</div>}</div>
          {info&&config.segment&&<fieldset disabled={busy} className="trimmer-edit-controls"><div className="selection-preview-control"><button type="button" className="selection-play" disabled={!ready} onClick={preview}>{playing&&previewing.current?<Pause size={15}/>:<Play size={15}/>} Preview selection</button></div><div className="timeline-heading"><span>CHOOSE YOUR MOMENT</span><strong>{length.toFixed(3)}s</strong></div><div className="trim-timeline" style={{'--start':`${(Number.isFinite(start)?start:0)/info.duration*100}%`,'--end':`${(Number.isFinite(end)?end:info.duration)/info.duration*100}%`}}><div className="timeline-filmstrip" aria-hidden="true">{Array.from({length:12},(_,i)=><Film key={i} size={24} strokeWidth={1}/>)}</div><div className="timeline-kept"/><input className="boundary start-boundary" aria-label="Selection start handle" type="range" min="0" max={info.duration} step="0.001" value={Number.isFinite(start)?start:0} onChange={e=>boundary('start',Math.max(0,Math.min(Number(e.target.value),(Number.isFinite(end)?end:info.duration)-MIN_CLIP)))}/><input className="boundary end-boundary" aria-label="Selection end handle" type="range" min="0" max={info.duration} step="0.001" value={Number.isFinite(end)?end:info.duration} onChange={e=>boundary('end',Math.min(info.duration,Math.max(Number(e.target.value),(Number.isFinite(start)?start:0)+MIN_CLIP)))}/></div><div className="timeline-times"><span>{formatTime(0,false)}</span><span>{formatTime(info.duration,false)}</span></div><div className="trim-time-fields"><label>Start time<input aria-label="Start time" value={startText} spellCheck="false" onChange={e=>editTime('start',e.target.value)}/><button type="button" onClick={()=>boundary('start',Math.max(0,Math.min(video.current.currentTime,(Number.isFinite(end)?end:info.duration)-MIN_CLIP)))}>Set to playhead</button></label><label>End time<input aria-label="End time" value={endText} spellCheck="false" onChange={e=>editTime('end',e.target.value)}/><button type="button" onClick={()=>boundary('end',Math.min(info.duration,Math.max(video.current.currentTime,(Number.isFinite(start)?start:0)+MIN_CLIP)))}>Set to playhead</button></label></div>{validation?<p className="range-error" role="alert">{validation}</p>:<p className="time-help">Use hh:mm:ss.mmm or seconds, e.g. 12.500.{config.id==='gif'?' GIF clips must be 30 seconds or less.':''}</p>}<button className="media-reset" type="button" onClick={()=>{boundary('start',0);setEndText(formatTime(Math.min(info.duration,config.initialLength||info.duration)));}}><RefreshCw size={13}/> Reset selection</button></fieldset>}
          {(transformed||renderSource)&&info&&<div className="media-transform-controls"><button type="button" disabled={busy} onClick={()=>{if(playing)video.current.pause();else video.current.play().catch(()=>setError('Playback could not start. Try another video.'));}}>{playing?<Pause size={14}/>:<Play size={14}/>} {playing?'Pause':'Play'}</button><input type="range" min="0" max={info.duration} step="0.01" value={currentTime} aria-label="Preview playhead" disabled={busy} onChange={e=>seek(Number(e.target.value))}/><span>{formatTime(currentTime,false)}</span></div>}
          {info&&!config.segment&&<div className="media-input-caption"><Film size={15}/><span>{config.preview||renderSource?'Live preview':'Original'} · {info.width} × {info.height} · {fileSize(file.size)}</span><span>Full video</span></div>}
        </div>}
        <div className="media-tip"><Icon size={21}/><div><strong>{config.tipTitle}</strong><p>{config.tip}</p></div></div>
      </div>
      <aside className="trimmer-export"><span className="eyebrow">{config.settingsTag}</span><h2>{config.settingsTitle}</h2><fieldset disabled={busy}>{controls}</fieldset>{validation&&!config.segment&&<p className="range-error" role="alert">{validation}</p>}<div className="trim-summary"><div><span>Output format</span><strong>{config.extension.toUpperCase()}</strong></div><div><span>{config.segment?'Selected duration':'Video duration'}</span><strong>{length.toFixed(3)}s</strong></div>{config.summary(settings,context).map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>{busy?<div className="export-progress" role="status" aria-live="polite"><div><LoaderCircle className="spin" size={17}/><strong>{progress===null?'Getting ready…':`${Math.floor(progress)}%`}</strong></div><progress max="100" aria-label="Export progress" {...(progress===null?{}:{value:progress})}/><p>{status}</p><button type="button" onClick={()=>abort.current?.abort()}>Cancel export <X size={13}/></button></div>:<button type="submit" className="light-button export-button" disabled={!ready}><Icon size={17}/>{config.action}<ArrowUpRight size={16}/></button>}<p className="export-private"><ShieldCheck size={13}/> Your video never leaves this device.</p></aside>
    </form>
    {result&&output&&<section className="trim-result"><div className="result-heading"><span className="result-check"><Check size={22}/></span><div><span className="eyebrow">THAT’S A WRAP</span><h2>{config.resultTitle}</h2></div><a className="light-button" href={output} download={result.filename}><Download size={16}/> Download {result.extension.toUpperCase()}</a></div><ResultPreview result={result} url={output} Icon={Icon}/><div className="result-details"><strong>{result.filename}</strong><span>{fileSize(result.blob.size)}</span></div>{config.id==='compress'&&<div className="compression-comparison"><div><span>Original</span><strong>{fileSize(result.sourceSize)}</strong></div><ArrowUpRight size={20}/><div><span>Result</span><strong>{fileSize(result.blob.size)}</strong></div><p>{result.blob.size<result.sourceSize?`${((1-result.blob.size/result.sourceSize)*100).toFixed(1)}% smaller · saved ${fileSize(result.sourceSize-result.blob.size)}`:'This export is not smaller. Try stronger compression or a lower resolution; your source may already be highly compressed.'}</p></div>}<p className="setting-help">This result uses your last exported settings. Export again to apply changes.</p></section>}
    <div className="trimmer-footnote"><Info size={15}/><p>Keep this tab open while exporting. Processing depends on your device and may take time. Remove or replace your video, or leave this tool, to release its files from memory.</p></div>
  </div>;
}





