// Local test host for the actual browser worker protocol. No browser or uploads.
import { parentPort } from 'node:worker_threads';
import { readFile } from 'node:fs/promises';
const nativeFetch=globalThis.fetch;
globalThis.fetch=async(input,options)=>{
 const url=String(input);
 if(url.startsWith('file:'))return new Response(await readFile(new URL(url)),{headers:{'Content-Type':'application/wasm'}});
 return nativeFetch(input,options);
};
globalThis.self=globalThis;
self.location={href:new URL('../public/ffmpeg/worker.js',import.meta.url).href};
self.postMessage=(data,transfer)=>parentPort.postMessage(data,transfer);
await import('../public/ffmpeg/worker.js');
parentPort.on('message',data=>self.onmessage({data}));
