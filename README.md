# VidKit

A React + Vite interface for the VidKit video toolkit. Inspired by the supplied dark dashboard reference, with colorful tool cards, custom SVG illustrations, and locally served fonts.

## Run locally

```sh
npm install
npm run dev
```

## Production build

```sh
npm run build
npm run preview
```

Deploy to Vercel using `npm run build` and the `dist` output directory. The included `vercel.json` supports page refreshes on client-side routes.

## Pages and interactions

- `/`: homepage, featured cards, all 15 tool cards
- `/tools`: searchable tool catalog with category filters
- `/favorites`: tools saved in the browser's local storage
- `/tools/video-trimmer`: precise MP4 or original-format cuts, selection preview, audio options
- `/tools/video-compressor`: quality presets, resolution and frame-rate settings, audio toggle, measured size comparison
- `/tools/video-to-mp3`: clip selection, 128–320 kbps bitrate, sample rate, mono/stereo audio, MP3 playback
- `/tools/video-to-gif`: clip selection, width, frame rate, palette size, loop or play-once, animated preview
- `/tools/video-merger`: 2–8 clips, ordering controls, per-clip preview, landscape/portrait/square canvas, audio normalization and silence for missing audio
- `/tools/remove-audio`: remove every audio track, muted source preview, compatible MP4 output
- `/tools/video-rotator`: 90°/180°/270° clockwise rotations, live preview, optional audio removal
- `/tools/video-flipper`: horizontal/vertical/both-axis flips, live preview, optional audio removal
- `/tools/video-resizer`: size presets, custom dimensions, source aspect lock, fit/fill/stretch preview, optional audio removal
- `/tools/video-cropper`: draggable crop region and corner handles, ratio presets, pixel inputs, keyboard controls, optional audio removal
- `/tools/video-speed-changer`: 0.25×–4×, selected intervals, live speed preview, pitch-preserving audio, optional mute
- `/tools/video-reverser`: selected clips up to 15 seconds, output size limits, reversed/forward/muted audio
- `/tools/video-to-frames`: JPEG/PNG sampling, interval and size settings, ZIP with timestamps, first 12 frame previews/downloads
- `/tools/video-converter`: MP4, WebM, MOV, MKV with defined codecs, quality/size settings, optional mute
- `/tools/add-watermark`: text or image logo, live overlay preview, drag/keyboard positioning, nine presets, size/color/opacity settings, optional audio removal
- `/about`: project introduction and development status
- `/privacy`: privacy notice describing this release
- All other paths: custom 404 page

Keyboard users can press `/` to focus tool search. Tool details use a native dialog with Escape dismissal.

Most of these fifteen tools use a locally hosted FFmpeg.wasm core, loaded only when exporting. Video to Frames uses native browser decoding and canvas capture. Video files are read and processed on the user's device. Inputs are limited to 200 MB and 10 minutes, and must be playable by the browser. The merger applies these limits to all clips combined. GIF selections are limited to 30 seconds and outputs are capped at 720px high. Smaller clips are recommended, especially on mobile.

Each tool includes file validation, file management, errors, processing progress, cancellation, output previews, and downloads. Starting a new export replaces the previous result. Leaving the page cancels active processing and releases file object URLs. Compression is quality-based and does not guarantee a smaller result or an exact target size.

Merging normalizes each clip to H.264 video and optional stereo AAC audio before joining. Clips fit inside the selected canvas with black padding. Clips without audio get a silent audio track when audio is enabled. Rotation, flipping, and audio removal export re-encoded H.264 MP4 files; odd video dimensions are adjusted to even dimensions. These operations do not alter the source files.

The resizer accepts even dimensions from 2–3840 pixels, up to 8.3 megapixels total. Fit pads with black, fill crops the edges, and stretch can distort the original aspect. The cropper operates in source pixel coordinates, snapping positions and dimensions to even pixels. Its focused region/corners support arrow keys (2 pixels, or 10 with Shift). Pixel edits apply on blur or Enter. Both tools export the full video as H.264 MP4 and can preserve audio when present.

Speed exports use 30 fps and chain `atempo` filters to preserve audio pitch at the supported speed extremes. Reverse exports use 24 fps, cap the longest edge at 320–720px without upscaling, and reject selections over 15 seconds or an estimated 512 MB frame buffer. The source preview plays forward; preview the actual reversed result after export.

Frame extraction offers Every frame or timed samples every 0.5, 1, 2, 5, or 10 seconds, up to 120 frames, with a maximum edge of 1280px. Every frame reads packet presentation timestamps locally using FFprobe without decoding video; it handles variable-rate presentation order and counts the selection before capture. It captures inside each frame's display interval and stores source timestamps in the manifest. Timed modes do not load FFmpeg. The active UI uses a hidden local video element, direct seeks, and canvas JPEG/PNG encoding. It bypasses FFmpeg frame decoding and image encoding. Each seek and canvas encode has a deadline and supports cancellation. The interface reports the frame number and advances progress after each completed image. It builds a ZIP locally with numbered JPEG/PNG files and `frames.json`. The gallery retains only the first 12 image previews. Temporary image references are released while packaging. The hidden video element, object URL, and canvas are cleaned up on completion, failure, or cancellation.

Conversion uses H.264/AAC for MP4, MOV, and MKV, and VP8/Opus for WebM. The installed core's VP9 encoder failed real WASM checks, so it is not offered. A download remains available if the browser cannot preview a converted container. Results retain their exported file type when settings change.

Watermarking renders up to three lines of text (120 characters) or a PNG/JPEG/WebP logo to a transparent PNG on a local canvas. Logos are limited to 5 MB and 4096px per side, and are never upscaled. Preview and export share the same raster overlay. The watermark appears throughout the full video; position and opacity are adjustable, with optional text background and audio removal. Output is H.264/AAC MP4.

`predev` and `prebuild` copy the installed FFmpeg core and worker assets into `public/ffmpeg/`; do not commit those generated files. No cross-origin CDN is used for video processing.

## Checks

```sh
npm test
node scripts/smoke-media.mjs
node scripts/smoke-mp3-wasm.mjs
node scripts/smoke-edits-wasm.mjs
node scripts/smoke-spatial-wasm.mjs
node scripts/smoke-watermark-wasm.mjs
node scripts/smoke-playback-wasm.mjs
node scripts/smoke-frames-worker.mjs
```

The optional smoke check requires native `ffmpeg` and `ffprobe` on PATH. It generates its own sample videos under `.test-output/` and verifies the same command plans used in the app: video codec, silent-video handling, MP3 duration/channels/sample rate, and GIF dimensions/duration/loop behavior. It does not test browser WebAssembly execution.

After generating those fixtures, `smoke-mp3-wasm.mjs` runs the installed WebAssembly core directly to verify audio detection and real mono/stereo MP3 exports. It also checks that silent videos receive the correct error. The audio check validates the generated probe JSON because `@ffmpeg/core` 0.12.10 can return `-1` even for successful probes.

`smoke-edits-wasm.mjs` generates its own fixtures (native FFmpeg required) and tests the actual WebAssembly core. It verifies rotation and flip orientation by decoding colored quadrants, checks audio removal on audible and silent inputs, and verifies mixed-dimension merging, clip order, output duration, aligned silent audio, and muted merging.

After those fixtures exist, `smoke-spatial-wasm.mjs` tests the actual core for exact resize dimensions, fit/fill/stretch pixel behavior, crop placement, and audio preservation/removal.

`smoke-playback-wasm.mjs` generates local fixtures with native FFmpeg and verifies real WASM output: speed duration and preserved audio pitch, reverse frame order and audio modes, silent inputs, all four converter codec pairs, JPEG/PNG extraction, and ZIP timestamps.

After the playback fixtures exist, `smoke-frames-worker.mjs` runs the actual browser worker protocol in a local Node worker host and verifies individual frame extraction, directory listing, image reads/deletes, ZIP creation, and frame progress milestones. It uses local generated files and performs no browser upload.

After the edits fixtures exist, `smoke-watermark-wasm.mjs` verifies actual WASM exports: placement and opacity by pixel samples, full-duration overlays, audio preservation/removal, and silent portrait inputs. Native FFmpeg is required to generate the sample logo.

See `PROJECT.md` for the full processing roadmap.
