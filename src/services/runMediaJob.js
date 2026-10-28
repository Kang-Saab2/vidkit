import { extension } from './trimSettings.js';
import { requireAudioTrack } from './audioProbe.js';
import { executeMediaCommand } from './executeMediaCommand.js';

// Each export owns one worker; cleanup also frees every temporary virtual file.
export async function runMediaJob({ file, files, createPlan, signal, onStatus = () => {}, onProgress = () => {} }) {
  let engine, timer;
  const cancelled = () => { if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError'); };
  const terminate = () => engine?.terminate();
  try {
    cancelled();
    const sources = files || [file];
    const inputs = sources.map((source, i) => `input-${i}.${extension(source.name)}`);
    onStatus('Loading the video engine… First load is about 32 MB.');
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    cancelled();
    engine = new FFmpeg();
    signal.addEventListener('abort', terminate, { once: true });
    await Promise.race([
      engine.load({ classWorkerURL: `${location.origin}/ffmpeg/worker.js`, coreURL: `${location.origin}/ffmpeg/ffmpeg-core.js`, wasmURL: `${location.origin}/ffmpeg/ffmpeg-core.wasm` }),
      new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('The processing engine could not load. Check your connection, then retry.')), 90000); }),
    ]);
    clearTimeout(timer); cancelled();
    for (let i = 0; i < sources.length; i++) {
      onStatus(`Reading video ${i + 1} of ${sources.length}…`);
      const buffer = await sources[i].arrayBuffer(); cancelled();
      await engine.writeFile(inputs[i], new Uint8Array(buffer)); cancelled();
    }
    const plan = await createPlan(files ? inputs : inputs[0], engine);
    cancelled();
    for (const entry of plan.virtualFiles || []) {
      await engine.writeFile(entry.path, new TextEncoder().encode(entry.content)); cancelled();
    }
    for(const entry of plan.binaryFiles||[]){
      await engine.writeFile(entry.path,new Uint8Array(await entry.blob.arrayBuffer()));cancelled();
    }
    if (plan.requiresAudio) {
      await requireAudioTrack(engine, inputs[0]);
      cancelled();
    }
    if(plan.frameOutput)onProgress(0);
    for (let i = 0; i < plan.commands.length; i++) {
      const command = plan.commands[i];
      const progress = ({ time }) => onProgress(Math.min(98, (i + Math.min(1, Math.max(0, time / 1000000 / command.duration))) / plan.commands.length * 100));
      cancelled(); onStatus(command.label); engine.on('progress', progress);
      let code;
      try { code = command.timeoutMs ? await executeMediaCommand(engine,command) : await engine.exec(command.args,600000); } finally { engine.off('progress', progress); }
      cancelled();
      if (code !== 0) throw new Error('Export failed. Try a smaller file, a shorter clip, or lower output settings. This file may use an unsupported codec.');
      if(plan.frameOutput)onProgress((i+1)/plan.commands.length*98);
      for (const path of command.deleteAfter || []) { await engine.deleteFile(path); cancelled(); }
    }
    if(plan.frameOutput){
      const { collectFrames } = await import('./collectFrames.js');cancelled();
      return await collectFrames(engine,plan.frameOutput,{checkCancelled:cancelled,onStatus,onProgress});
    }
    onStatus('Finishing your download…');
    const bytes = await engine.readFile(plan.output); cancelled();
    if (!bytes.byteLength) throw new Error('The result was empty. Try a longer selection or another input video.');
    return new Blob([bytes], { type: plan.mime });
  } catch (error) {
    if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
    if (error instanceof Error && !/terminated|out of bounds|memory access|Aborted/i.test(error.message)) throw error;
    throw new Error('The processing engine stopped. Try a smaller video or lower output settings.');
  } finally {
    clearTimeout(timer); signal.removeEventListener('abort', terminate); engine?.terminate();
  }
}
