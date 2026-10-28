import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowLeft, ArrowUp, ArrowUpRight, Check, Combine, Download, Film, Info, LoaderCircle, Plus, ShieldCheck, Upload, X } from 'lucide-react';
import { Setting, fileSize } from './VideoToolWorkspace';
import { formatTime, MAX_FILE_BYTES } from '../services/trimSettings.js';
import { MAX_MERGE_CLIPS, buildMergePlan, inspectMergeInputs, mergeCanvases } from '../services/editOperations.js';
import { readVideoMetadata } from '../services/readVideoMetadata.js';
import { runMediaJob } from '../services/runMediaJob.js';
import './VideoMerger.css';

function useURL(file){const [url,setURL]=useState('');useEffect(()=>{if(!file){setURL('');return;}const url=URL.createObjectURL(file);setURL(url);return()=>URL.revokeObjectURL(url);},[file]);return url;}
export default function VideoMerger(){
 const [clips,setClips]=useState([]),[active,setActive]=useState(null),[reading,setReading]=useState(false),[busy,setBusy]=useState(false),[dragging,setDragging]=useState(false);
 const [canvas,setCanvas]=useState('landscape'),[fps,setFPS]=useState('30'),[mute,setMute]=useState(false);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[status,setStatus]=useState(''),[progress,setProgress]=useState(null),[result,setResult]=useState(null);
 const picker=useRef(null),job=useRef(null),metadataJob=useRef(null),adding=useRef(false),mounted=useRef(true),player=useRef(null);
 const selected=clips.find(c=>c.id===active)||clips[0];
 const source=useURL(selected?.file),output=useURL(result?.blob);
 const duration=clips.reduce((sum,c)=>sum+(c.info?.duration||0),0),bytes=clips.reduce((sum,c)=>sum+c.file.size,0);
 const locked=reading||busy;
 const canMerge=clips.length>=2&&clips.every(c=>c.info&&!c.error)&&duration<=600&&!locked;
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;metadataJob.current?.abort();job.current?.abort();};},[]);
 async function addFiles(list){
  if(locked||adding.current)return;
  const files=Array.from(list||[]);if(!files.length)return;
  setError('');setNotice('');
  if(files.length+clips.length>MAX_MERGE_CLIPS)return setError('Add up to 8 clips in total.');
  if(bytes+files.reduce((sum,f)=>sum+f.size,0)>MAX_FILE_BYTES)return setError('Keep all selected clips under 200 MB combined.');
  if(files.some(f=>!f.size||(!f.type.startsWith('video/')&&!/\.(mp4|mov|m4v|webm|mkv|avi|ogv)$/i.test(f.name))))return setError('Choose non-empty video files only.');
  adding.current=true;setReading(true);setResult(null);
  const controller=new AbortController();metadataJob.current=controller;
  const entries=files.map(file=>({id:crypto.randomUUID(),file,info:null,error:''}));
  setClips(current=>[...current,...entries]);if(!active)setActive(entries[0].id);
  try{
    for(const entry of entries){
      try{
        const info=await readVideoMetadata(entry.file,controller.signal);
        if(!mounted.current||controller.signal.aborted)return;
        setClips(current=>current.map(c=>c.id===entry.id?{...c,info}:c));
      }catch(e){
        if(e.name==='AbortError')return;
        if(mounted.current)setClips(current=>current.map(c=>c.id===entry.id?{...c,error:e.message}:c));
      }
    }
  }finally{adding.current=false;if(mounted.current)setReading(false);}
 }
 function move(index,offset){if(locked)return;setClips(current=>{const next=[...current];[next[index],next[index+offset]]=[next[index+offset],next[index]];return next;});}
 function remove(id){if(locked)return;player.current?.pause();setClips(current=>current.filter(c=>c.id!==id));if(active===id)setActive(null);setError('');}
 function clear(){if(locked)return;player.current?.pause();setClips([]);setActive(null);setResult(null);setError('');setNotice('');}
 async function merge(e){
  e.preventDefault();if(!canMerge||job.current)return;
  const controller=new AbortController();job.current=controller;setBusy(true);setProgress(null);setError('');setNotice('');setResult(null);player.current?.pause();
  const snapshot={canvas,fps,mute,count:clips.length};
  try{
    const blob=await runMediaJob({files:clips.map(c=>c.file),signal:controller.signal,createPlan:async(inputs,engine)=>buildMergePlan({clips:await inspectMergeInputs(engine,inputs),canvas,fps,mute}),
      onStatus:value=>{if(mounted.current&&!controller.signal.aborted)setStatus(value);},onProgress:value=>{if(mounted.current&&!controller.signal.aborted)setProgress(previous=>Math.max(previous||0,value));},
    });
    if(!mounted.current||controller.signal.aborted)return;
    setResult({blob,...snapshot});setNotice('Your clips are joined. Preview the result and download your video.');
  }catch(e){if(mounted.current){if(e.name==='AbortError')setNotice('Merge cancelled. Your clips and order are ready to try again.');else setError(e.message||'Merge failed. Try fewer or smaller clips.');}}
  finally{if(job.current===controller)job.current=null;if(mounted.current){setBusy(false);setStatus('');}}
 }
 return <div className="trimmer-page media-tool media-merge">
  <Link className="trimmer-back" to="/tools"><ArrowLeft size={15}/> All tools</Link>
  <section className="trimmer-heading"><div><span className="eyebrow">BRING YOUR CLIPS TOGETHER.</span><h1>Video merger<span className="media-title-icon"><Combine size={30}/></span></h1><p>Little moments. One bigger story.</p></div><span className="trimmer-private"><ShieldCheck size={16}/> 100% on your device</span></section>
  <input ref={picker} type="file" multiple accept="video/*,.mkv,.avi" className="trimmer-file-input" aria-label="Choose videos to merge" onChange={e=>{addFiles(e.target.files);e.target.value='';}}/>
  {error&&<div className="trimmer-alert error" role="alert"><Info size={18}/><p>{error}</p><button type="button" onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
  {notice&&<div className="trimmer-alert success" role="status"><Check size={18}/><p>{notice}</p></div>}
  <form className="trimmer-workspace" onSubmit={merge}><div className="merge-source">
    {!clips.length?<section className={`trimmer-upload ${dragging?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);addFiles(e.dataTransfer.files);}}><div className="upload-illustration"><Film size={55} strokeWidth={1.3}/><span><Combine size={27}/></span></div><span className="pill">EVERY CLIP HAS A PART TO PLAY</span><h2>A few clips. One good story.</h2><p>Drop your videos here, in the order you want them.</p><button className="light-button" type="button" onClick={()=>picker.current.click()}><Upload size={17}/> Choose videos<ArrowUpRight size={16}/></button><small>2–8 clips · 200 MB combined · Up to 10 minutes total</small></section>:<>
    <div className="merge-preview"><div className="merge-preview-title"><Film size={15}/><span>Clip preview · {selected?.file.name}</span></div><video key={source} ref={player} src={source||undefined} controls playsInline preload="metadata" muted={mute}/></div>
    <section className="merge-list" aria-label="Clips in merge order"><div className="merge-list-heading"><h2>Your story, in order.</h2><button disabled={locked} type="button" onClick={clear}>Clear all <X size={13}/></button></div><p>Use the arrows to reorder. The first clip plays first.</p>
    <ol>{clips.map((clip,index)=><li key={clip.id} className={selected?.id===clip.id?'selected':''}><span className="merge-number">{String(index+1).padStart(2,'0')}</span><button type="button" disabled={busy} onClick={()=>{player.current?.pause();setActive(clip.id);}} className="merge-clip-name"><strong title={clip.file.name}>{clip.file.name}</strong><small>{clip.error||(!clip.info?'Reading video…':`${formatTime(clip.info.duration,false)} · ${clip.info.width} × ${clip.info.height} · ${fileSize(clip.file.size)}`)}</small></button><div className="merge-order-buttons"><button type="button" disabled={locked||index===0} onClick={()=>move(index,-1)} aria-label={`Move clip ${index+1} up`}><ArrowUp size={15}/></button><button type="button" disabled={locked||index===clips.length-1} onClick={()=>move(index,1)} aria-label={`Move clip ${index+1} down`}><ArrowDown size={15}/></button><button type="button" disabled={locked} onClick={()=>remove(clip.id)} aria-label={`Remove clip ${index+1}`}><X size={15}/></button></div></li>)}</ol>
    <button type="button" className="merge-add" disabled={locked||clips.length>=8} onClick={()=>picker.current.click()}><Plus size={16}/> Add more clips <span>{clips.length}/8</span></button>
    {reading&&<p className="merge-reading" role="status"><LoaderCircle size={14} className="spin"/> Reading your clips…</p>}
    {duration>600&&<p className="range-error" role="alert">The combined duration exceeds 10 minutes. Remove a clip to continue.</p>}
    {clips.some(c=>c.error)&&<p className="range-error" role="alert">Remove unreadable clips before merging.</p>}
    </section></>}
    <div className="media-tip"><Combine size={21}/><div><strong>Different clips. A consistent finish.</strong><p>We fit each clip inside your chosen canvas with black padding, normalize the frame rate, and join them in order. Clips without audio get silence so sound stays aligned. Export may take longer than the simpler tools.</p></div></div>
  </div><aside className="trimmer-export"><span className="eyebrow">PUT IT ALL TOGETHER</span><h2>One story. Your way.</h2><fieldset disabled={locked}>
    <Setting id="merge-canvas" label="Output canvas" value={canvas} onChange={setCanvas} options={[["landscape","Landscape · 1280 × 720"],["portrait","Portrait · 720 × 1280"],["square","Square · 720 × 720"]]} help="Videos are fitted with padding. No cropping or stretching."/>
    <Setting id="merge-fps" label="Output frame rate" value={fps} onChange={setFPS} options={[["24","24 fps"],["30","30 fps"]]}/>
    <label className="check-label audio-option"><input type="checkbox" checked={!mute} onChange={e=>setMute(!e.target.checked)}/> Keep audio where available</label>
  </fieldset><div className="trim-summary"><div><span>Clips</span><strong>{clips.length} / 8</strong></div><div><span>Combined duration</span><strong>{formatTime(duration,false)}</strong></div><div><span>Input size</span><strong>{fileSize(bytes)}</strong></div><div><span>Output</span><strong>H.264 MP4</strong></div></div>
  {busy?<div className="export-progress" role="status" aria-live="polite"><div><LoaderCircle size={17} className="spin"/><strong>{progress===null?'Getting ready…':`${Math.floor(progress)}%`}</strong></div><progress aria-label="Merge progress" max="100" {...(progress===null?{}:{value:progress})}/><p>{status}</p><button type="button" onClick={()=>job.current?.abort()}>Cancel merge <X size={13}/></button></div>:<button className="light-button export-button" type="submit" disabled={!canMerge}><Combine size={17}/> Merge videos<ArrowUpRight size={16}/></button>}
  <p className="export-private"><ShieldCheck size={13}/> Your videos stay on this device.</p></aside></form>
  {result&&output&&<section className="trim-result"><div className="result-heading"><span className="result-check"><Check size={22}/></span><div><span className="eyebrow">BETTER TOGETHER</span><h2>Your story is ready.</h2></div><a className="light-button" href={output} download="vidkit-merged.mp4"><Download size={16}/> Download MP4</a></div><video src={output} key={output} controls playsInline preload="metadata"/><div className="result-details"><strong>vidkit-merged.mp4</strong><span>{fileSize(result.blob.size)} · {result.count} clips · {mergeCanvases[result.canvas].join(' × ')} · {result.fps} fps</span></div><p className="setting-help">This result uses the order and settings from your last merge. Merge again to apply changes.</p></section>}
  <div className="trimmer-footnote"><Info size={15}/><p>Short clips work best. Keep this tab open while merging. Removing files or leaving the tool releases their browser references; leaving also cancels any active merge.</p></div>
 </div>;
}
