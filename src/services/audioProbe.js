export async function requireAudioTrack(engine, input) {
  // @ffmpeg/core 0.12.10 can leave ret at -1 after a successful ffprobe.
  // Validate the generated JSON instead of relying on that return value.
  await engine.ffprobe(['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_type', '-of', 'json', input, '-o', 'audio-info.json']);
  let probe;
  try {
    probe = JSON.parse(new TextDecoder().decode(await engine.readFile('audio-info.json')));
  } catch {
    throw new Error('The audio track could not be read. Try another video.');
  }
  if (!Array.isArray(probe.streams)) throw new Error('The audio track could not be read. Try another video.');
  if (!probe.streams.some(stream => stream.codec_type === 'audio')) {
    throw new Error('This video has no audio track. Choose a video with sound to create an MP3.');
  }
}
