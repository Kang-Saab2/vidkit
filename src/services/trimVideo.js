import { buildTrimCommand, extension, fastFormats } from './trimSettings';

// A worker belongs to one export. Terminating it releases its complete virtual filesystem.
export async function trimVideo({ file, start, end, duration, mode, quality, mute, signal, onStatus, onProgress }) {
  let engine;
  let loadTimer;
  const checkCancelled = () => { if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError'); };
  const stop = () => engine?.terminate();
  try {
    checkCancelled();
    onStatus('Loading the video engine… First load is about 32 MB.');
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    checkCancelled();
    engine = new FFmpeg();
    signal.addEventListener('abort', stop, { once: true });
    await Promise.race([
      engine.load({ classWorkerURL: `${location.origin}/ffmpeg/worker.js`, coreURL: `${location.origin}/ffmpeg/ffmpeg-core.js`, wasmURL: `${location.origin}/ffmpeg/ffmpeg-core.wasm` }),
      new Promise((_, reject) => { loadTimer = setTimeout(() => reject(new Error('The video engine could not load. Check your connection and try again.')), 90000); }),
    ]);
    clearTimeout(loadTimer);
    checkCancelled();
    onStatus('Preparing your video…');
    const input = `input.${extension(file.name)}`, output = `output.${mode === 'fast' ? extension(file.name) : 'mp4'}`;
    if (mode === 'fast' && !fastFormats[extension(file.name)]) throw new Error('Use precise MP4 export for this input format.');
    await engine.writeFile(input, new Uint8Array(await file.arrayBuffer()));
    checkCancelled();
    onStatus('Trimming your video…');
    engine.on('progress', ({ time }) => onProgress(Math.min(98, Math.max(0, time / 1000000 / (end - start) * 100))));
    const code = await engine.exec(buildTrimCommand({ start, end, duration, mode, quality, mute, input, output }), 600000);
    checkCancelled();
    if (code !== 0) throw new Error('This video could not be exported. Try precise MP4 mode or a shorter selection. The format may be unsupported or your device may be low on memory.');
    onStatus('Finishing your clip…');
    const data = await engine.readFile(output);
    checkCancelled();
    if (!data.byteLength) throw new Error('The exported clip is empty. Try a longer selection or precise mode.');
    return new Blob([data], { type: mode === 'fast' ? fastFormats[extension(file.name)] : 'video/mp4' });
  } catch (error) {
    if (signal.aborted) throw new DOMException('Export cancelled', 'AbortError');
    if (error instanceof Error && error.message && !/terminated|memory access|out of bounds|Aborted/i.test(error.message)) throw error;
    throw new Error('The video engine stopped. Try a smaller file or shorter clip, then export again.');
  } finally {
    clearTimeout(loadTimer);
    signal.removeEventListener('abort', stop);
    engine?.terminate();
  }
}
