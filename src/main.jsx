import React, { useEffect, useState } from 'react';
import '@fontsource-variable/dm-sans';
import '@fontsource-variable/space-grotesk';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowUpRight, ArrowRight, AudioLines, Scissors, Combine, Minimize2, VolumeX, Image, Expand, Crop, RotateCw, FlipHorizontal2, Gauge, Rewind, Layers, Stamp, RefreshCw, Search, Grid2X2, Heart, Info, ShieldCheck, X, Menu, ChevronRight, Sparkles, Play, Check, Film, Upload, Download } from 'lucide-react';
import './styles.css';
import VideoTrimmer from './components/VideoTrimmer';
import VideoCompressor from './components/VideoCompressor';
import VideoToMP3 from './components/VideoToMP3';
import VideoToGIF from './components/VideoToGIF';
import VideoMerger from './components/VideoMerger';
import RemoveAudio from './components/RemoveAudio';
import VideoRotator from './components/VideoRotator';
import VideoFlipper from './components/VideoFlipper';
import VideoResizer from './components/VideoResizer';
import VideoCropper from './components/VideoCropper';
import VideoSpeedChanger from './components/VideoSpeedChanger';
import VideoReverser from './components/VideoReverser';
import VideoToFrames from './components/VideoToFrames';
import VideoConverter from './components/VideoConverter';
import VideoWatermarker from './components/VideoWatermarker';

const toolRoutes = { trim: '/tools/video-trimmer', compress: '/tools/video-compressor', mp3: '/tools/video-to-mp3', gif: '/tools/video-to-gif', merge:'/tools/video-merger', mute:'/tools/remove-audio', rotate:'/tools/video-rotator', flip:'/tools/video-flipper', resize:'/tools/video-resizer', crop:'/tools/video-cropper', speed:'/tools/video-speed-changer', reverse:'/tools/video-reverser', frames:'/tools/video-to-frames', convert:'/tools/video-converter', watermark:'/tools/add-watermark' };
const toolPages = { '/tools/video-trimmer': VideoTrimmer, '/tools/video-compressor': VideoCompressor, '/tools/video-to-mp3': VideoToMP3, '/tools/video-to-gif': VideoToGIF, '/tools/video-merger':VideoMerger, '/tools/remove-audio':RemoveAudio, '/tools/video-rotator':VideoRotator, '/tools/video-flipper':VideoFlipper, '/tools/video-resizer':VideoResizer, '/tools/video-cropper':VideoCropper, '/tools/video-speed-changer':VideoSpeedChanger, '/tools/video-reverser':VideoReverser, '/tools/video-to-frames':VideoToFrames, '/tools/video-converter':VideoConverter, '/tools/add-watermark':VideoWatermarker };
const toolTitles = { '/tools/video-trimmer': 'Video trimmer', '/tools/video-compressor': 'Video compressor', '/tools/video-to-mp3': 'Video to MP3', '/tools/video-to-gif': 'Video to GIF', '/tools/video-merger':'Video merger', '/tools/remove-audio':'Remove audio', '/tools/video-rotator':'Video rotator', '/tools/video-flipper':'Video flipper', '/tools/video-resizer':'Video resizer', '/tools/video-cropper':'Video cropper', '/tools/video-speed-changer':'Video speed changer', '/tools/video-reverser':'Video reverser', '/tools/video-to-frames':'Video to frames', '/tools/video-converter':'Video converter', '/tools/add-watermark':'Add watermark' };

const tools = [
  ['trim','Video trimmer','Just the good parts.','Edit',Scissors,'pink'],
  ['compress','Video compressor','Less size. Same big ideas.','Optimize',Minimize2,'teal'],
  ['mp3','Video to MP3','Let the audio do the talking.','Audio',AudioLines,'orange'],
  ['gif','Video to GIF','A little moment. On repeat.','Convert',Image,'yellow'],
  ['merge','Video merger','Bring your clips together.','Edit',Combine,'yellow'],
  ['mute','Remove audio','Sometimes, silence is golden.','Audio',VolumeX,'pink'],
  ['resize','Video resizer','Find the perfect fit.','Edit',Expand,'orange'],
  ['crop','Video cropper','Focus on what matters.','Edit',Crop,'teal'],
  ['rotate','Video rotator','A fresh perspective.','Edit',RotateCw,'teal'],
  ['flip','Video flipper','See the other side.','Edit',FlipHorizontal2,'yellow'],
  ['speed','Speed changer','Go at your own pace.','Edit',Gauge,'pink'],
  ['reverse','Video reverser','Play it back. Backwards.','Edit',Rewind,'orange'],
  ['frames','Video to frames','Every frame tells a story.','Utilities',Layers,'orange'],
  ['watermark','Add watermark','Make your mark.','Edit',Stamp,'teal'],
  ['convert','Video converter','New format. New possibilities.','Convert',RefreshCw,'yellow'],
].map(([id,name,description,category,icon,color])=>({id,name,description,category,icon,color}));

function Doodle({type}) {
  return <svg className="doodle" viewBox="0 0 260 190" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {type==='cut' ? <>
      <path d="M81 149 212 39M88 81l124 76"/><circle cx="60" cy="154" r="28"/><circle cx="60" cy="65" r="27"/><circle cx="123" cy="105" r="6"/>
      <path d="m179 28 5-16m22 15 12-12m-5 36 18-1M26 106l-12 4m18 13-9 13"/>
      <path d="m125 20 20 5-5 25-21-5zM122 26l19 5m-15 9 10 2"/><path d="M208 117c-22 16-35 33-31 47 3 13 28 14 45 1"/>
    </> : <>
      <path d="M49 53c0-11 8-19 19-19h139c10 0 17 8 17 18v98c0 10-8 18-18 18H69c-12 0-20-8-20-20z" fill="currentColor" fillOpacity=".08"/>
      <path d="M49 69h175M79 35 65 69m48-34L99 69m48-34-14 34m48-34-14 34m47-30-13 30"/>
      <path d="m121 94 38 22-38 23z" fill="currentColor"/>
      <path d="M51 107C4 109 5 164 53 158m-8-13 10 13-14 10M230 96l15-8m-11 30 17 3M26 36l-9-13m24 3 1-17"/>
    </>}
  </svg>;
}

function App(){
 const location=useLocation();
 const navigate=useNavigate();
 const [menu,setMenu]=useState(false),[query,setQuery]=useState(''),[category,setCategory]=useState('All tools'),[selected,setSelected]=useState(null);
 const [favorites,setFavorites]=useState(()=>{try {const v=JSON.parse(localStorage.getItem('vidkit-favorites')||'[]');return Array.isArray(v)?v:[]}catch{return []}});
 const path=location.pathname;
 const ToolPage=toolPages[path];
 const isCatalog=path==='/'||path==='/tools'||path==='/favorites';
 useEffect(()=>{function searchShortcut(e){if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)&&!document.querySelector('dialog[open]')){const input=document.querySelector('input[aria-label="Search tools"]');if(input){e.preventDefault();input.focus();}}}window.addEventListener('keydown',searchShortcut);return()=>window.removeEventListener('keydown',searchShortcut);},[]);
 useEffect(()=>{setMenu(false);setSelected(null);window.scrollTo(0,0); document.title=`${path==='/about'?'About':path==='/privacy'?'Privacy':path==='/favorites'?'Favorites':ToolPage?toolTitles[path]:isCatalog?'Your video toolkit':'Page not found'} — VidKit`;},[path]);
 useEffect(()=>{try{localStorage.setItem('vidkit-favorites',JSON.stringify(favorites))}catch{}},[favorites]);
 function favorite(id){setFavorites(v=>v.includes(id)?v.filter(x=>x!==id):[...v,id]);}
 const filtered=tools.filter(t=>(path!='/favorites'||favorites.includes(t.id))&&(category==='All tools'||category===t.category)&&`${t.name} ${t.description}`.toLowerCase().includes(query.toLowerCase()));
 return <div className="app-shell">
  <a href="#main" className="skip-link">Skip to content</a>
  <header className="mobile-header"><Link to="/" className="brand"><Film/>vidkit<span>®</span></Link><button className="icon-button" onClick={()=>setMenu(!menu)} aria-label="Toggle navigation" aria-expanded={menu}>{menu?<X/>:<Menu/>}</button></header>
  {menu&&<button className="nav-scrim" onClick={()=>setMenu(false)} aria-label="Close navigation"/>}
  <aside className={`sidebar ${menu?'open':''}`}>
   <Link to="/" className="brand"><Film size={29}/>vidkit<span>®</span></Link>
   <div className="nav-label">YOUR CREATIVE CORNER</div>
   <nav aria-label="Main navigation">
    <NavLink to="/" end><Grid2X2 size={18}/> For you <span className="active-dot"/></NavLink>
    <NavLink to="/tools"><Search size={18}/> All tools <small>15</small></NavLink>
    <NavLink to="/favorites"><Heart size={18}/> Favorites {favorites.length>0&&<small>{favorites.length}</small>}</NavLink>
    <div className="nav-divider"/>
    <NavLink to="/about"><Info size={18}/> About VidKit</NavLink>
    <NavLink to="/privacy"><ShieldCheck size={18}/> Privacy</NavLink>
   </nav>
   <div className="sidebar-note"><div className="note-icon"><Sparkles size={23}/><span>✦</span></div><strong>Big ideas.<br/>Small toolkit.</strong><p>A little less effort.<br/>A lot more creating.</p><Link to="/about">Meet VidKit <ArrowUpRight size={15}/></Link></div>
   <div className="sidebar-bottom"><span className="green-dot"/> Made for your browser <span className="version">V.01</span></div>
  </aside>
  <main id="main" className="main">
   <div className="topbar"><div className="breadcrumb">Your workspace <ChevronRight size={13}/><span>{path==='/about'?'About VidKit':path==='/privacy'?'Privacy':path==='/favorites'?'Favorites':ToolPage?toolTitles[path]:isCatalog?'Video toolkit':'Lost & found'}</span></div><div className="local-badge"><ShieldCheck size={14}/> Your files. Your device.</div></div>
   {isCatalog ? <>
    <section className="page-intro"><div><div className="eyebrow">LESS FUSS. MORE CREATING.</div><h1>{path==='/favorites'?'Your go-to tools.':path==='/tools'?'Small tools. Big possibilities.':'Make your next cut.'}<span className="yellow-text"> ✳</span></h1><p>{path==='/favorites'?'A little collection of your creative essentials.':'All the video tools you need. A little simpler. A lot more you.'}</p></div><span className="intro-tag">THE EVERYDAY VIDEO TOOLKIT <ArrowUpRight size={14}/></span></section>
    {path==='/'&&<section className="hero-grid" aria-label="Featured tools">
     <button className="hero-card yellow" onClick={()=>navigate('/tools/video-trimmer')}><span className="pill">A LITTLE OFF THE TOP <span>↗</span></span><h2>Good videos.<br/>Great cuts.</h2><p>Keep the moments that matter.</p><span className="black-button">Trim a video <ArrowUpRight size={15}/></span><Doodle type="cut"/></button>
     <button className="hero-card orange" onClick={()=>navigate(toolRoutes.compress)}><span className="pill">SMALLER FILE. SAME ENERGY. <span>↗</span></span><h2>Lighten the file.<br/>Keep the feeling.</h2><p>Make room for your next big idea.</p><span className="black-button">Compress a video <ArrowUpRight size={15}/></span><Doodle type="film"/></button>
    </section>}
    <section className="tools-section" id="tools">
     <div className="section-heading"><div><h2>{path==='/favorites'?'Saved for later':path==='/tools'?'The whole toolkit':'A tool for every take'} <span>{path==='/favorites'?favorites.length:'15'}</span></h2><p>Pick a tool. Make it yours.</p></div><label className="search"><Search size={16}/><input aria-label="Search tools" placeholder="Find your tool…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')} aria-label="Clear search"><X size={14}/></button>}<kbd>/</kbd></label></div>
     <div className="filter-row"><div className="filters" aria-label="Filter by category">{['All tools','Edit','Convert','Audio','Optimize','Utilities'].map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)} aria-pressed={category===c}>{c}</button>)}</div><span className="tool-count">{filtered.length} tools, endless possibilities <ArrowRight size={15}/></span></div>
     <div className="tool-grid">{filtered.map(t=><article className={`tool-card ${t.color}`} key={t.id}><button className="tool-open" onClick={()=>toolRoutes[t.id]?navigate(toolRoutes[t.id]):setSelected(t)} aria-label={`Explore ${t.name}`}><span className="tool-category">{t.category}</span><t.icon className="tool-art" size={48} strokeWidth={1.45}/><div className="tool-title"><h3>{t.name}</h3><ArrowUpRight size={20}/></div><p>{t.description}</p></button><button className={`favorite ${favorites.includes(t.id)?'saved':''}`} aria-label={`${favorites.includes(t.id)?'Remove':'Save'} ${t.name} ${favorites.includes(t.id)?'from':'to'} favorites`} aria-pressed={favorites.includes(t.id)} onClick={()=>favorite(t.id)}><Heart size={17} fill={favorites.includes(t.id)?'currentColor':'none'}/></button></article>)}</div>
     {!filtered.length&&<div className="empty-state"><Search size={35}/><h3>{path==='/favorites'&&!favorites.length?'Your favorites start here.':'No tools found.'}</h3><p>{path==='/favorites'&&!favorites.length?'Tap the heart on any tool to keep it close.':'Try a different search or category.'}</p><button className="light-button" onClick={()=>{setQuery('');setCategory('All tools')}}>Reset filters <RefreshCw size={15}/></button>{path==='/favorites'&&<Link className="text-link" to="/tools">Explore all tools <ArrowRight size={15}/></Link>}</div>}
    </section>
    <div className="bottom-banner"><span className="banner-icon"><ShieldCheck size={24}/></span><div><strong>Your creativity stays yours.</strong><p>Designed for browser-based processing. No account needed.</p></div><Link to="/privacy">Our privacy promise <ArrowUpRight size={16}/></Link></div>
   </> : ToolPage ? <ToolPage key={path}/> : path==='/about' ? <About/> : path==='/privacy' ? <Privacy/> : <NotFound/>}
   <footer><Link className="footer-brand" to="/">vidkit<span>✳</span></Link><span>A little toolkit for your next big idea.</span><div><Link to="/about">About</Link><Link to="/privacy">Privacy</Link><span>© {new Date().getFullYear()} VidKit</span></div></footer>
  </main>
  {selected&&<ToolDialog tool={selected} onClose={()=>setSelected(null)}/>}
 </div>
}

function ToolDialog({tool,onClose}){
 const ref=React.useRef(null);
 useEffect(()=>{ref.current.showModal();},[]);
 return <dialog ref={ref} aria-labelledby="tool-dialog-title" onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose()}} className="tool-dialog"><button className="dialog-close icon-button" onClick={onClose} aria-label="Close tool details"><X/></button><div className={`dialog-art ${tool.color}`}><tool.icon size={50} strokeWidth={1.5}/></div><span className="eyebrow">IN THE MAKING</span><h2 id="tool-dialog-title">{tool.name}</h2><p>{tool.description} This tool is part of the VidKit roadmap. Video uploads and processing will be available in a future release.</p><div className="dialog-note"><Info size={18}/> You're exploring the first version of our interface.</div><button autoFocus className="light-button" onClick={onClose}>Back to exploring <ArrowRight size={16}/></button></dialog>
}
function About(){return <>
 <section className="editorial-intro"><div className="eyebrow">HI, WE'RE VIDKIT.</div><h1>A little toolkit.<br/>For <span className="yellow-text">big ideas.</span></h1><p>For the assignment due tomorrow. The clip worth sharing.<br className="desktop-break"/> The idea that just can’t wait. A simpler way to make it happen.</p></section>
 <section className="about-feature yellow"><div><span className="pill">BUILT FOR THE EVERYDAY CREATOR</span><h2>You bring the story.<br/>We bring the tools.</h2><p>Video editing shouldn’t mean learning a complicated timeline. VidKit brings 15 focused tools into one friendly place, so the small edits don’t get in the way of the big ideas.</p></div><Doodle type="film"/></section>
 <section className="value-grid">{[[Scissors,'One task. Less friction.','Trim a moment, resize a clip, or pull out the audio. Simple tools built around the thing you want to do.'],[ShieldCheck,'Personal by design.','Our processing roadmap keeps video files on your device. Your ideas deserve their own space.'],[Sparkles,'Made to be approachable.','No account. No complicated workspace. Just a clear place to start, whether it’s your first edit or your fiftieth.']].map(([Icon,title,body])=><article key={title}><Icon size={27}/><h3>{title}</h3><p>{body}</p></article>)}</section>
 <section className="story-section"><div><span className="eyebrow">A PROJECT WITH A PURPOSE</span><h2>Small beginnings.<br/>Thoughtful possibilities.</h2></div><div><p>VidKit started as a college web development project: could everyday video editing feel a little more human?</p><p>Built with React and Vite, it’s growing toward a browser-based toolkit powered by FFmpeg.wasm. Fifteen tools, including trimming, compression, conversion, audio extraction, GIF creation, frame export, merging, muting, rotation, flipping, resizing, cropping, speed changes, reversing, and watermarking, support local files and browser-based exports. Text and logo watermarking are also processed on your device.</p><Link className="light-button" to="/tools">Explore the toolkit <ArrowUpRight size={16}/></Link></div></section>
 </>}
function Privacy(){return <>
 <section className="editorial-intro"><div className="eyebrow">YOUR FILES. YOUR BUSINESS.</div><h1>Keep your ideas.<br/><span className="yellow-text">And your privacy.</span></h1><p>Clear words about what this version does, what it stores,<br className="desktop-break"/> and how we’re building the next one.</p></section>
 <div className="privacy-highlight teal"><ShieldCheck size={54} strokeWidth={1.4}/><div><h2>A toolkit, with personal space.</h2><p>All fifteen tools process your selected video locally in your browser. Your video files and exported clips are not uploaded to us.</p></div><span className="pill">PRIVACY BY DESIGN</span></div>
 <section className="privacy-layout"><aside><span className="eyebrow">THE DETAILS</span>{['This version','Local preferences','Hosting & requests','Local processing','Your controls'].map((s,i)=><a href={`#privacy-${i}`} key={s}>{s}<ArrowUpRight size={13}/></a>)}</aside><div className="privacy-copy">
 <PrivacyBlock index={0} title="What this version collects">VidKit does not ask for an account, a name, or an email address. Videos you select for trimming are read locally on your device. This application does not include analytics, advertising scripts, or tracking cookies.</PrivacyBlock>
 <PrivacyBlock index={1} title="A little memory, on your device">When you save a favorite tool, VidKit stores its identifier in your browser’s local storage. This lets your favorites stay available when you return using the same browser. The application does not send your favorites to a server.</PrivacyBlock>
 <PrivacyBlock index={2} title="What happens when you visit">Your browser requests the website’s files from its hosting provider. Those requests include technical information such as your IP address and browser request headers. The host may retain access or security logs under its own policies. VidKit does not control your browser’s extensions or your hosting provider’s logging.</PrivacyBlock>
 <PrivacyBlock index={3} title="How local processing works">All fifteen tools process files locally. Most use FFmpeg.wasm in a browser worker, downloaded from this website when exporting. Video to Frames uses the browser’s own video decoder and canvas. Your video stays on your device. Input and output files are held in browser memory, not local storage. Leaving the tool releases the video references and cancels any active export. Text and logo watermarking are also processed on your device. If server uploads or other services are added, this notice must be updated.</PrivacyBlock>
 <PrivacyBlock index={4} title="You’re in control">You can remove favorites using the heart button on each tool. You can also clear this site’s stored data through your browser settings. Use Remove or Replace in any active tool, or leave the page, to release the current files. Clips you download remain in your downloads until you delete them.</PrivacyBlock>
 <div className="privacy-end"><Check size={18}/><span>This notice describes the current interface release.</span></div>
 </div></section>
 </>}
function PrivacyBlock({index,title,children}){return <article id={`privacy-${index}`}><span className="section-number">0{index+1}</span><h2>{title}</h2><p>{children}</p></article>}
function NotFound(){return <section className="not-found"><span className="pill">LOOKS LIKE A MISSING FRAME</span><div className="error-art"><span>4</span><div><Film size={93} strokeWidth={1.3}/><span className="error-play"><Play size={27} fill="currentColor"/></span></div><span>4</span><Sparkles className="error-spark" size={35}/></div><h1>This scene didn’t make the cut.</h1><p>The page you’re looking for has moved, or never made it<br className="desktop-break"/> out of the editing room. Let’s get you back to creating.</p><Link to="/" className="light-button">Back to the good stuff <ArrowUpRight size={17}/></Link><Link to="/tools" className="text-link">Or explore all 15 tools <ArrowRight size={16}/></Link></section>}

createRoot(document.getElementById('root')).render(<BrowserRouter><App/></BrowserRouter>);






