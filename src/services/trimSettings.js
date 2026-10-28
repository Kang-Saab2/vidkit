export const MAX_FILE_BYTES = 200 * 1024 * 1024;
export const MAX_DURATION = 600;
export const MIN_CLIP = 0.1;
export const fastFormats = { mp4: 'video/mp4', mov: 'video/quicktime', webm: 'video/webm', mkv: 'video/x-matroska', m4v: 'video/mp4' };

export function extension(name) { return name.split('.').pop().toLowerCase(); }
export function formatTime(value, milliseconds = true) {
  const total = Math.max(0, Math.round((Number(value) || 0) * 1000));
  const h = Math.floor(total / 3600000), m = Math.floor(total / 60000) % 60, s = Math.floor(total / 1000) % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}${milliseconds ? `.${String(total % 1000).padStart(3, '0')}` : ''}`;
}
export function parseTime(text) {
  if (!/^\d+(?::[0-5]?\d){0,2}(?:\.\d{1,3})?$/.test(text.trim())) return NaN;
  return text.trim().split(':').reduce((total, part) => total * 60 + Number(part), 0);
}
export function validateRange(start, end, duration) {
  if (![start, end, duration].every(Number.isFinite) || start < 0 || end > duration + 0.001 || end - start < MIN_CLIP - 0.000001) {
    throw new Error('Choose an end time after the start, with at least 0.1 seconds selected and both times within the video.');
  }
}
export function buildTrimCommand({ start, end, duration, mode = 'precise', quality = 'balanced', mute = false, input, output }) {
  validateRange(start, end, duration);
  if (!['precise', 'fast'].includes(mode)) throw new Error('Choose a valid export mode.');
  const args = ['-ss', start.toFixed(3), '-i', input, '-t', (end - start).toFixed(3), '-map', '0:v:0', '-map_metadata', '-1'];
  if (!mute) args.push('-map', '0:a:0?');
  if (mode === 'fast') args.push('-c', 'copy', '-avoid_negative_ts', 'make_zero');
  else {
    const crf = { high: '18', balanced: '23', compact: '28' }[quality];
    if (!crf) throw new Error('Choose a valid quality preset.');
    args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-crf', crf, '-vf', 'scale=trunc(iw/2)*2:trunc(ih/2)*2', '-pix_fmt', 'yuv420p');
    if (!mute) args.push('-c:a', 'aac', '-b:a', '192k');
  }
  if (mute) args.push('-an');
  if (/\.(mp4|mov|m4v)$/.test(output)) args.push('-movflags', '+faststart');
  return [...args, output];
}
export function outputName(name, mode) {
  const base = name.replace(/\.[^.]*$/, '').replace(/[^a-zA-Z0-9_ -]/g, '').trim().slice(0, 80) || 'video';
  return `${base}-trimmed.${mode === 'fast' ? extension(name) : 'mp4'}`;
}
