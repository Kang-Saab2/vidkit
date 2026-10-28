import { validateRange } from './trimSettings.js';

export const GIF_MAX_DURATION = 30;
function choice(value, allowed, label) {
  if (!allowed.includes(value)) throw new Error(`Choose a valid ${label}.`);
  return value;
}
export function mediaFilename(name, suffix, extension) {
  const base = name.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9_ -]/g, '').trim().slice(0, 80) || 'video';
  return `${base}-${suffix}.${extension}`;
}
export function buildCompressionPlan({ input, duration, quality = 'balanced', resolution = '720', fps = 'original', mute = false }) {
  if (!Number.isFinite(duration) || duration <= 0) throw new Error('Choose a video with a readable duration.');
  choice(quality, ['light', 'balanced', 'small'], 'compression preset');
  choice(resolution, ['original', '1080', '720', '480'], 'resolution');
  choice(fps, ['original', '24', '30'], 'frame rate');
  const edge = { original: null, '1080': 1920, '720': 1280, '480': 854 }[resolution];
  const factor = edge ? `min(1,${edge}/max(iw,ih))` : '1';
  const scale = `scale=w='max(2,trunc(iw*${factor}/2)*2)':h='max(2,trunc(ih*${factor}/2)*2)'`;
  const args = ['-i', input, '-map', '0:v:0', '-map_metadata', '-1', '-vf', scale, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', { light: '23', balanced: '28', small: '32' }[quality], '-pix_fmt', 'yuv420p'];
  if (fps !== 'original') args.push('-r', fps);
  if (mute) args.push('-an'); else args.push('-map', '0:a:0?', '-c:a', 'aac', '-b:a', '128k');
  args.push('-movflags', '+faststart', 'output.mp4');
  return { commands: [{ args, duration, label: 'Compressing your video…' }], output: 'output.mp4', mime: 'video/mp4' };
}
export function buildMP3Plan({ input, start, end, duration, bitrate = '192', sampleRate = '44100', channels = 'stereo' }) {
  validateRange(start, end, duration);
  choice(bitrate, ['128', '192', '256', '320'], 'bitrate');
  choice(sampleRate, ['44100', '48000'], 'sample rate');
  choice(channels, ['mono', 'stereo'], 'audio channels');
  const args = ['-ss', start.toFixed(3), '-i', input, '-t', (end - start).toFixed(3), '-map', '0:a:0', '-vn', '-map_metadata', '-1', '-c:a', 'libmp3lame', '-b:a', `${bitrate}k`, '-ar', sampleRate];
  // MP3 supports at most two channels. Downmix multichannel input explicitly.
  args.push('-ac', channels === 'mono' ? '1' : '2', 'output.mp3');
  return { commands: [{ args, duration: end - start, label: 'Extracting your audio…' }], output: 'output.mp3', mime: 'audio/mpeg', requiresAudio: true };
}
export function buildGIFPlan({ input, start, end, duration, width = '480', fps = '10', colors = '256', loop = true }) {
  validateRange(start, end, duration);
  if (end - start > GIF_MAX_DURATION + 0.000001) throw new Error('Choose 30 seconds or less for a GIF. Short clips use less memory.');
  choice(width, ['240', '360', '480', '640', '720'], 'GIF width');
  choice(fps, ['5', '10', '15', '20', '24'], 'GIF frame rate');
  choice(colors, ['64', '128', '256'], 'color palette');
  const length = (end - start).toFixed(3);
  // Bound height too: very tall sources must not create unbounded GIF frame buffers.
  const filters = `fps=${fps},scale=w='min(${width},iw)':h='min(720,ih)':force_original_aspect_ratio=decrease:flags=lanczos`;
  const inputArgs = ['-ss', start.toFixed(3), '-t', length, '-i', input];
  return {
    commands: [
      { args: [...inputArgs, '-an', '-vf', `${filters},palettegen=max_colors=${colors}:stats_mode=diff`, '-frames:v', '1', '-threads', '1', 'palette.png'], duration: end - start, label: 'Finding the best colors…' },
      { args: ['-ss', start.toFixed(3), '-i', input, '-i', 'palette.png', '-t', length, '-filter_complex_threads', '1', '-filter_complex', `[0:v:0]${filters}[frames];[frames][1:v]paletteuse=dither=sierra2_4a`, '-an', '-map_metadata', '-1', '-loop', loop ? '0' : '-1', 'output.gif'], duration: end - start, label: 'Creating your GIF…' },
    ], output: 'output.gif', mime: 'image/gif',
  };
}
