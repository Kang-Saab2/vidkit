// FFmpeg's internal timeout cannot always interrupt a stalled decoder. This
// main-thread deadline also terminates the worker if it stops responding.
export async function executeMediaCommand(engine, command) {
  const timeout=command.timeoutMs||600000;
  let timer;
  try {
    return await Promise.race([
      engine.exec(command.args,timeout),
      new Promise((_,reject)=>{
        timer=setTimeout(()=>{
          reject(new Error('Frame extraction timed out. Try a smaller source video, an earlier selection, or a lower output size.'));
          engine.terminate();
        },timeout);
      }),
    ]);
  } finally { clearTimeout(timer); }
}
