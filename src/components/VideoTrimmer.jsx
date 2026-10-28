import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight, Check, Download, Film, Info, LoaderCircle, Pause, Play, RefreshCw, Scissors, ShieldCheck, SkipBack, SkipForward, Upload, X } from 'lucide-react';
import { extension, fastFormats, formatTime, MAX_DURATION, MAX_FILE_BYTES, MIN_CLIP, outputName, parseTime, validateRange } from '../services/trimSettings';
import { trimVideo } from '../services/trimVideo';
import './VideoTrimmer.css';

function useObjectURL(blob) {
  const [url, setURL] = useState('');
  useEffect(() => {
    if (!blob) { setURL(''); return; }
    const next = URL.createObjectURL(blob); setURL(next);
    return () => URL.revokeObjectURL(next);
  }, [blob]);
  return url;
}
function size(bytes) { return `${(bytes / 1024 / 1024).toFixed(2)} MB`; }

export default function VideoTrimmer() {
  const [file, setFile] = useState(null), [info, setInfo] = useState(null);
  const [startText, setStartText] = useState(formatTime(0)), [endText, setEndText] = useState(formatTime(0));
  const [playhead, setPlayhead] = useState(0), [playing, setPlaying] = useState(false), [loop, setLoop] = useState(true);
  const [mode, setMode] = useState('precise'), [quality, setQuality] = useState('balanced'), [mute, setMute] = useState(false);
  const [output, setOutput] = useState(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false), [status, setStatus] = useState(''), [progress, setProgress] = useState(null), [dragging, setDragging] = useState(false);
  const video = useRef(null), picker = useRef(null), controller = useRef(null), mounted = useRef(true), selectionPreview = useRef(false);
  const source = useObjectURL(file), resultURL = useObjectURL(output?.blob);
  const start = parseTime(startText), end = parseTime(endText);
  let rangeError = '';
  if (info) { try { validateRange(start, end, info.duration); } catch (e) { rangeError = e.message; } }
  const ready = Boolean(info && !rangeError), selectedDuration = ready ? end - start : 0;
  const fastAvailable = Boolean(file && fastFormats[extension(file.name)]);

  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  useEffect(() => {
    if (!source || info) return;
    const timer = setTimeout(() => setError('The browser could not read this video. Try an MP4 with H.264 video or a WebM file.'), 20000);
    return () => clearTimeout(timer);
  }, [source, info]);

  function loadFile(next) {
    if (busy || !next) return;
    setError(''); setNotice('');
    if (next.size === 0) return setError('This file is empty. Choose a video with content.');
    if (next.size > MAX_FILE_BYTES) return setError('Choose a file under 200 MB. Smaller files work better in your browser.');
    if (!next.type.startsWith('video/') && !/\.(mp4|m4v|mov|webm|mkv|avi|ogv)$/i.test(next.name)) return setError('Please choose a video file, such as MP4, MOV, or WebM.');
    video.current?.pause(); selectionPreview.current = false;
    setFile(next); setInfo(null); setOutput(null); setPlayhead(0); setPlaying(false);
    setMode('precise'); setStartText(formatTime(0)); setEndText(formatTime(0));
  }
  function metadata(event) {
    const player = event.currentTarget;
    if (!Number.isFinite(player.duration) || player.duration < MIN_CLIP) return setError('The video has no readable duration, or is shorter than 0.1 seconds. Try another file.');
    if (player.duration > MAX_DURATION) return setError('This version supports videos up to 10 minutes. Choose a shorter source video.');
    if (!player.videoWidth || !player.videoHeight) return setError('No playable video track was found. Choose another file.');
    setInfo({ duration: player.duration, width: player.videoWidth, height: player.videoHeight });
    setStartText(formatTime(0));
    // Round down so the displayed end never extends past the actual duration.
    setEndText(formatTime(Math.floor(player.duration * 1000) / 1000));
    setError('');
  }
  function updateBoundary(which, value) {
    selectionPreview.current = false; video.current?.pause();
    if (which === 'start') setStartText(formatTime(value)); else setEndText(formatTime(value));
    // Seek precisely as the handle moves; fastSeek can land on a nearby keyframe.
    // Stay just inside the source at its end so the final frame remains visible.
    if (info) seek(Math.min(value, Math.max(0, info.duration - 0.001)));
  }
  function seek(value) { if (!video.current || !info) return; video.current.currentTime = Math.max(0, Math.min(info.duration, value)); setPlayhead(video.current.currentTime); }
  async function previewSelection() {
    if (!ready || !video.current) return;
    if (playing && selectionPreview.current) { video.current.pause(); return; }
    seek(start); selectionPreview.current = true;
    try { await video.current.play(); } catch { setError('Playback could not start. Use the player’s controls or try another video.'); }
  }
  function updatePlayback() {
    const player = video.current;
    if (!player) return;
    setPlayhead(player.currentTime);
    if (selectionPreview.current && ready && player.currentTime >= end - 0.025) {
      if (loop) { player.currentTime = start; if (player.paused) player.play().catch(() => {}); }
      else { player.pause(); player.currentTime = end; selectionPreview.current = false; }
    }
  }
  function resetSelection() {
    selectionPreview.current = false; video.current?.pause();
    setStartText(formatTime(0)); setEndText(formatTime(Math.floor(info.duration * 1000) / 1000)); seek(0); setError(''); setNotice('');
  }
  function removeFile() {
    video.current?.pause(); selectionPreview.current = false;
    setFile(null); setInfo(null); setOutput(null); setError(''); setNotice(''); setPlaying(false); setPlayhead(0);
    if (picker.current) picker.current.value = '';
  }
  async function exportClip(event) {
    event.preventDefault();
    if (!ready || busy || controller.current) return;
    const abort = new AbortController(); controller.current = abort;
    video.current?.pause(); selectionPreview.current = false;
    setBusy(true); setError(''); setNotice(''); setProgress(null); setOutput(null);
    const settings = { start, end, mode, quality, mute, duration: info.duration };
    try {
      const blob = await trimVideo({ file, ...settings, signal: abort.signal,
        onStatus: value => { if (mounted.current && !abort.signal.aborted) setStatus(value); },
        onProgress: value => { if (mounted.current && !abort.signal.aborted) setProgress(previous => Math.max(previous || 0, value)); },
      });
      if (!mounted.current || abort.signal.aborted) return;
      setOutput({ blob, filename: outputName(file.name, mode), ...settings }); setProgress(100); setNotice('Your clip is ready. Preview it below and download when you’re happy.');
    } catch (e) {
      if (!mounted.current) return;
      if (e.name === 'AbortError') setNotice('Export cancelled. Your video and selection are ready to try again.');
      else setError(e.message || 'Something went wrong. Try a smaller video or shorter selection.');
    } finally {
      if (controller.current === abort) controller.current = null;
      if (mounted.current) { setBusy(false); setStatus(''); }
    }
  }

  return <div className="trimmer-page">
    <Link to="/tools" className="trimmer-back"><ArrowLeft size={15}/> All tools</Link>
    <section className="trimmer-heading"><div><span className="eyebrow">A LITTLE OFF THE TOP</span><h1>Video trimmer<span className="yellow-text"> ✂</span></h1><p>Find your moment. Cut the rest.</p></div><span className="trimmer-private"><ShieldCheck size={16}/> 100% on your device</span></section>
    <input ref={picker} type="file" accept="video/*,.mkv,.avi" className="trimmer-file-input" aria-label="Choose video file" onChange={e=>{loadFile(e.target.files?.[0]);e.target.value='';}}/>
    {error && <div className="trimmer-alert error" role="alert"><Info size={18}/><p>{error}</p><button type="button" onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}
    {notice && <div className="trimmer-alert success" role="status"><Check size={18}/><p>{notice}</p></div>}
    {!file ? <>
      <section className={`trimmer-upload ${dragging?'dragging':''}`} onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget))setDragging(false);}} onDrop={e=>{e.preventDefault();setDragging(false);if(e.dataTransfer.files.length!==1){setError('Drop one video at a time.');return;}loadFile(e.dataTransfer.files[0]);}}>
        <div className="upload-illustration"><Film size={55} strokeWidth={1.3}/><span><Scissors size={27}/></span></div>
        <span className="pill">THE GOOD PART STARTS HERE</span><h2>Drop a video. Make the cut.</h2><p>Drag your file here, or choose one from your device.</p>
        <button type="button" className="light-button" onClick={()=>picker.current.click()}><Upload size={17}/> Choose a video <ArrowUpRight size={16}/></button>
        <small>MP4, MOV, WebM & more · Up to 200 MB · Up to 10 minutes</small>
      </section>
      <div className="trimmer-how">{[[Upload,'01','Bring your video','Choose a clip from your device.'],[Scissors,'02','Find your moment','Set the start and end of your cut.'],[Download,'03','Make it yours','Preview, export, and download.']].map(([Icon,n,title,body])=><article key={n}><span><Icon size={22}/><small>{n}</small></span><h3>{title}</h3><p>{body}</p></article>)}</div>
    </> : <>
      <div className="trimmer-filebar"><span className="file-icon pink"><Film size={21}/></span><div><strong title={file.name}>{file.name}</strong><p>{size(file.size)}{info && ` · ${info.width} × ${info.height} · ${formatTime(info.duration,false)}`}</p></div><button type="button" disabled={busy} onClick={()=>picker.current.click()}><RefreshCw size={14}/> Replace</button><button type="button" className="icon-button" disabled={busy} onClick={removeFile} aria-label="Remove video"><X size={18}/></button></div>
      <form className="trimmer-workspace" onSubmit={exportClip}>
        <div className="trimmer-editor">
          <div className="trimmer-player"><video key={source} ref={video} src={source || undefined} controls playsInline preload="metadata" muted={mute} onLoadedMetadata={metadata} onError={()=>setError('Your browser cannot play this file. Try an H.264 MP4 or WebM video.')} onTimeUpdate={updatePlayback} onEnded={()=>{if(selectionPreview.current&&loop&&ready){seek(start);video.current.play().catch(()=>{});}else setPlaying(false);}} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)}/>{!info&&!error&&<div className="metadata-loading"><LoaderCircle className="spin" size={21}/> Reading your video…</div>}</div>
          {info && <fieldset disabled={busy} className="trimmer-edit-controls">
            <div className="selection-preview-control"><button type="button" className="selection-play" disabled={!ready} onClick={previewSelection}>{playing&&selectionPreview.current?<Pause size={16}/>:<Play size={16}/>} Preview selection</button></div>
            <div className="timeline-heading"><span><Scissors size={15}/> YOUR SELECTION</span><strong>{selectedDuration.toFixed(3)}s <small>of {info.duration.toFixed(2)}s</small></strong></div>
            <div className="trim-timeline" style={{'--start':`${(Number.isFinite(start)?start:0)/info.duration*100}%`,'--end':`${(Number.isFinite(end)?end:info.duration)/info.duration*100}%`}}>
              <div className="timeline-filmstrip" aria-hidden="true">{Array.from({length:12},(_,i)=><Film key={i} size={24} strokeWidth={1}/>)}</div><div className="timeline-kept"/>
              <input aria-label="Trim start handle" className="boundary start-boundary" type="range" min="0" max={Math.max(0,info.duration-MIN_CLIP)} step="0.001" value={Number.isFinite(start)?start:0} onChange={e=>updateBoundary('start',Math.max(0,Math.min(Number(e.target.value),(Number.isFinite(end)?end:info.duration)-MIN_CLIP)))}/>
              <input aria-label="Trim end handle" className="boundary end-boundary" type="range" min={MIN_CLIP} max={info.duration} step="0.001" value={Number.isFinite(end)?end:info.duration} onChange={e=>updateBoundary('end',Math.min(info.duration,Math.max(Number(e.target.value),(Number.isFinite(start)?start:0)+MIN_CLIP)))}/>
            </div>
            <div className="timeline-times"><span>{formatTime(0,false)}</span><span>{formatTime(info.duration/2,false)}</span><span>{formatTime(info.duration,false)}</span></div>
            <label className="playhead-label">Playhead <span>{formatTime(playhead)}</span><input aria-label="Video playhead" type="range" min="0" max={info.duration} step="0.01" value={playhead} onChange={e=>{selectionPreview.current=false;seek(Number(e.target.value));}}/></label>
            <div className="preview-actions"><label className="check-label"><input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/> Loop</label><button className="reset-selection" type="button" onClick={resetSelection}><RefreshCw size={13}/> Reset</button></div>
            <div className="trim-time-fields"><label>Start time<input aria-label="Start time" value={startText} spellCheck="false" onChange={e=>{video.current?.pause();selectionPreview.current=false;setStartText(e.target.value);}}/><button type="button" onClick={()=>updateBoundary('start',Math.max(0,Math.min(playhead,(Number.isFinite(end)?end:info.duration)-MIN_CLIP)))}>Set to playhead</button></label><span><ArrowUpRight size={20}/></span><label>End time<input aria-label="End time" value={endText} spellCheck="false" onChange={e=>{video.current?.pause();selectionPreview.current=false;setEndText(e.target.value);}}/><button type="button" onClick={()=>updateBoundary('end',Math.min(info.duration,Math.max(playhead,(Number.isFinite(start)?start:0)+MIN_CLIP)))}>Set to playhead</button></label></div>
            {rangeError?<p className="range-error" role="alert">{rangeError}</p>:<p className="time-help">Hours:minutes:seconds.milliseconds, or enter seconds (e.g. 12.500).</p>}
            <div className="step-controls"><span>Nudge playhead</span><button type="button" onClick={()=>seek(playhead-0.1)} aria-label="Back 0.1 seconds"><SkipBack size={13}/> 0.1s</button><button type="button" onClick={()=>seek(playhead+0.1)} aria-label="Forward 0.1 seconds">0.1s <SkipForward size={13}/></button></div>
          </fieldset>}
        </div>
        <aside className="trimmer-export"><span className="eyebrow">THE FINISHING TOUCHES</span><h2>Make the cut.</h2><fieldset disabled={busy}>
          <label className="export-label" htmlFor="export-mode">Export mode</label><select id="export-mode" value={mode} onChange={e=>setMode(e.target.value)}><option value="precise">Precise cut · MP4</option><option value="fast" disabled={!fastAvailable}>Fast cut · original format</option></select>
          <p className="setting-help">{mode==='precise'?'Re-encodes for accurate cuts, within the source frame timing. Exports a widely compatible H.264 MP4.':'Copies the original streams without re-encoding. Cuts can start at a nearby keyframe and the result may be longer than your selection.'}</p>
          {mode==='precise'&&<><label className="export-label" htmlFor="export-quality">Video quality</label><select id="export-quality" value={quality} onChange={e=>setQuality(e.target.value)}><option value="high">High quality</option><option value="balanced">Balanced</option><option value="compact">Smaller file</option></select><p className="setting-help">Keeps the original resolution, adjusted to even dimensions if needed. File size depends on your video.</p></>}
          <label className="check-label audio-option"><input type="checkbox" checked={!mute} onChange={e=>setMute(!e.target.checked)}/> Keep original audio</label>
        </fieldset>
        <div className="trim-summary"><div><span>Selected duration</span><strong>{selectedDuration.toFixed(3)}s</strong></div><div><span>Output format</span><strong>{mode==='precise'?'MP4':extension(file.name).toUpperCase()}</strong></div><div><span>Audio</span><strong>{mute?'Muted':'Keep if present'}</strong></div></div>
        {busy ? <div className="export-progress" role="status" aria-live="polite"><div><LoaderCircle size={17} className="spin"/><strong>{progress===null?'Getting ready…':`${Math.floor(progress)}%`}</strong></div><progress aria-label="Export progress" max="100" {...(progress===null?{}:{value:progress})}/><p>{status}</p><button type="button" onClick={()=>controller.current?.abort()}>Cancel export <X size={13}/></button></div> : <button type="submit" className="light-button export-button" disabled={!ready}><Scissors size={17}/> Trim & export <ArrowUpRight size={17}/></button>}
        <p className="export-private"><ShieldCheck size={13}/> Your video never leaves this device.</p>
        </aside>
      </form>
      {output && resultURL && <section className="trim-result"><div className="result-heading"><span className="result-check"><Check size={22}/></span><div><span className="eyebrow">THAT’S A WRAP</span><h2>Your clip is ready.</h2></div><a href={resultURL} download={output.filename} className="light-button"><Download size={16}/> Download clip</a></div><video key={resultURL} controls playsInline preload="metadata" src={resultURL}/><div className="result-details"><strong>{output.filename}</strong><span>{size(output.blob.size)} · {formatTime(output.start)} → {formatTime(output.end)} · {output.mode==='fast'?'Keyframe cut':'Precise MP4'}</span></div>{output.mode==='fast'&&<p className="setting-help">Original-format files may not preview in every browser. Download the file to play it in a compatible player. Keyframe cuts can include extra footage.</p>}<p className="setting-help">This download uses the selection and settings from your last export. Export again to apply changes.</p></section>}
    </>}
    <div className="trimmer-footnote"><Info size={15}/><p>Short clips work best. Large or high-resolution videos can take longer, especially on mobile. Keep this tab open while exporting. Files stay in memory until you replace the video, remove it, or leave the page.</p></div>
  </div>;
}
