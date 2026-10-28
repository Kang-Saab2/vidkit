export function readVideoMetadata(file, signal) {
  return new Promise((resolve,reject)=>{
    const video=document.createElement('video'),url=URL.createObjectURL(file);
    let finished=false,timer;
    function finish(error){
      if(finished)return;finished=true;clearTimeout(timer);signal.removeEventListener('abort',cancel);
      const info={duration:video.duration,width:video.videoWidth,height:video.videoHeight};
      video.onloadedmetadata=null;video.onerror=null;video.removeAttribute('src');video.load();URL.revokeObjectURL(url);
      if(error)reject(error);else resolve(info);
    }
    function cancel(){finish(new DOMException('Cancelled','AbortError'));}
    signal.addEventListener('abort',cancel,{once:true});
    video.preload='metadata';
    video.onloadedmetadata=()=>{
      if(!Number.isFinite(video.duration)||video.duration<.1||!video.videoWidth||!video.videoHeight)finish(new Error('No readable video track or duration.'));
      else finish();
    };
    video.onerror=()=>finish(new Error('Your browser cannot preview this file. Try an H.264 MP4 or WebM.'));
    timer=setTimeout(()=>finish(new Error('Reading this video timed out. Try another file.')),20000);
    if(signal.aborted)cancel();else video.src=url;
  });
}
