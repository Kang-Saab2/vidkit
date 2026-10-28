import { copyFile, mkdir } from 'node:fs/promises';
const target = new URL('../public/ffmpeg/', import.meta.url);
await mkdir(target, { recursive: true });
for (const name of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) {
  await copyFile(new URL(`../node_modules/@ffmpeg/core/dist/esm/${name}`, import.meta.url), new URL(name, target));
}
for (const name of ['worker.js', 'const.js', 'errors.js']) {
  await copyFile(new URL(`../node_modules/@ffmpeg/ffmpeg/dist/esm/${name}`, import.meta.url), new URL(name, target));
}
console.log('Local FFmpeg worker and processing core prepared.');
