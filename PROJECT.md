# VidKit — Online Video Toolkit

## 1. Project Overview

**VidKit** is a browser-based video toolkit built as a college project. It helps students, content creators, social media users, and other everyday users perform common video-editing tasks without installing desktop software. Users select a tool, upload a video, adjust settings, preview the result when possible, process it, and download the output.

The project uses **React.js, Vite, and Tailwind CSS** and is intended to be hosted on **Vercel**. Video processing happens primarily in the user's browser using **FFmpeg.wasm**, so the initial version does not require a backend, database, user accounts, or server-side file storage.

## 2. Target Audience and Main Benefit

- **Students:** Quickly trim, resize, compress, and convert videos for assignments.
- **Content creators:** Prepare short clips and social-media video formats.
- **Everyday users:** Make basic video edits without learning complex editing software.

**Main benefit:** A single, simple website for commonly needed video tools. Files can stay on the user's device when processed entirely in the browser.

## 3. Objectives

1. Offer 15 useful video tools through a consistent, easy-to-use interface.
2. Process files on the client whenever practical.
3. Provide previews, clear progress indicators, and downloadable outputs.
4. Keep the code modular by sharing a common FFmpeg processing service.
5. Deploy a responsive static React application on Vercel.

## 4. Scope — 15 Tools

| # | Tool | Function | Suggested Implementation | Relative Effort |
|---|---|---|---|---|
| 1 | Video Trimmer | Keep a selected start/end interval | FFmpeg `-ss`, `-t` / `-to` | Low–Medium |
| 2 | Video Merger | Join two or more clips | FFmpeg concat; normalize incompatible inputs | Medium–High |
| 3 | Video Compressor | Reduce file size using quality/preset settings | Re-encode with FFmpeg | Medium |
| 4 | Video to MP3 | Extract sound from a video as MP3 | FFmpeg audio encoding | Low |
| 5 | Remove Audio | Save a muted video | FFmpeg `-an` | Low |
| 6 | Video to GIF | Convert a short clip into an animated GIF | FFmpeg palette generation/use | Medium |
| 7 | Video Resizer | Change output resolution | FFmpeg `scale` filter | Low–Medium |
| 8 | Video Cropper | Select and export a region of a video | FFmpeg `crop` filter | Medium |
| 9 | Video Rotator | Rotate videos by 90°, 180°, or 270° | FFmpeg transpose/rotation filters | Low |
| 10 | Video Flipper | Flip horizontally or vertically | FFmpeg `hflip` / `vflip` | Low |
| 11 | Video Speed Changer | Make a video faster or slower | FFmpeg `setpts` and `atempo` | Medium |
| 12 | Video Reverser | Reverse the order of frames (optional reverse audio) | FFmpeg `reverse` / `areverse` | High for long files |
| 13 | Video to Frames | Export still frames at chosen intervals | FFmpeg image sequence + ZIP in browser | Medium |
| 14 | Add Watermark | Overlay text or a logo | FFmpeg `overlay`; text needs font support or canvas-rendered overlay | Medium–High |
| 15 | Video Converter | Convert supported video files to another format | FFmpeg remux/re-encode | Medium |

**Important:** “Easy” refers to building a common UI and running reusable FFmpeg commands. Browser memory limits, codec support, and large input files can make individual tools significantly harder. The available output formats depend on the chosen FFmpeg.wasm build and its compiled codecs; do not promise every format until tested.

## 5. MVP Priorities

**Phase A — Core tools:** Remove Audio, Video Trimmer, Video Rotator, Video Flipper, Video Resizer, Video to MP3.

**Phase B — More processing:** Video Compressor, Video Cropper, Video Speed Changer, Video to GIF, Video Converter.

**Phase C — Advanced tools:** Video Merger, Video Reverser, Video to Frames, Add Watermark.

Implement one tool end-to-end first, including uploads, progress, errors, previews, and downloads. Reuse its processing workflow for the remaining tools.

## 6. Technology Stack

| Area | Technology |
|---|---|
| UI | React.js + Vite |
| Styling | Tailwind CSS |
| Navigation | React Router (optional but recommended) |
| Browser-side video processing | `@ffmpeg/ffmpeg`, `@ffmpeg/util` |
| Video preview | HTML5 `<video>` and object URLs |
| File input/output | File API, Blob, browser downloads |
| Multi-image export | ZIP library, such as `jszip` |
| Hosting | Vercel (static Vite build) |
| Backend / database | Not required for MVP |

### Initial Setup

```bash
npm create vite@latest vidkit -- --template react
cd vidkit
npm install
npm install @ffmpeg/ffmpeg @ffmpeg/util react-router-dom
# Configure Tailwind CSS using its current Vite integration instructions.
npm run dev
```

Check the installed FFmpeg.wasm documentation and version when implementing worker and core loading; do not assume a core file path or a CDN supports cross-origin isolation.

## 7. Main Pages and Routes

| Route | Purpose |
|---|---|
| `/` | Homepage with searchable tool cards and categories |
| `/tools` | Catalog containing all 15 video tools |
| `/tools/:slug` | Reusable tool page (title, file uploader, controls, preview, export) |
| `/about` | About VidKit and college project context |
| `/privacy` | Explain browser processing and data handling |
| `*` | Friendly not-found page |

Suggested categories: **Edit**, **Convert**, **Audio**, **Optimize**, **Utilities**.

## 8. User Workflow

1. User opens VidKit and chooses a tool.
2. User selects or drags a local video file onto the page.
3. Browser validates the file and shows details (name, size, duration, format when available).
4. User changes the tool's settings and previews the input.
5. User clicks **Process Video**.
6. App loads FFmpeg.wasm when needed, runs the tool operation, and displays progress.
7. User previews the output when supported and clicks **Download**.
8. App cleans up temporary FFmpeg virtual files and object URLs.

## 9. Architecture

```text
React UI (Home / Tool Catalog / Individual Tool Pages)
                     |
            Tool Configuration
                     |
         Shared Processing Service
                     |
    FFmpeg.wasm Worker + Virtual Filesystem
                     |
         Output Blob -> Download
```

### Shared Components

- `Navbar`, `Footer`, `ToolCard`, `ToolSearch`
- `FileUploader`, `VideoPreview`, `FileInfo`
- `ToolControls`, `ProcessButton`, `ProgressBar`
- `DownloadResult`, `ErrorMessage`

### Processing Responsibilities

- Lazy-load the FFmpeg core; avoid downloading it on the homepage.
- Keep processing off the main UI thread through the library's worker architecture.
- Validate settings before running the command.
- Handle one active job at a time for the MVP, or enforce a queue.
- Give clear error states for unsupported formats and out-of-memory failures.
- Remove intermediate files and release object URLs after processing.
- Use safe, unique virtual filenames for each job.
- Do not treat every FFmpeg command as stream-copy safe: operations like cropping, filtering, or changing speed generally need re-encoding.

## 10. Suggested Folder Structure

```text
vidkit/
├── public/
├── src/
│   ├── components/
│   │   ├── FileUploader.jsx
│   │   ├── VideoPreview.jsx
│   │   ├── ProgressBar.jsx
│   │   ├── ToolCard.jsx
│   │   └── DownloadResult.jsx
│   ├── data/
│   │   └── tools.js
│   ├── hooks/
│   │   └── useFFmpeg.js
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Tools.jsx
│   │   ├── ToolPage.jsx
│   │   ├── About.jsx
│   │   └── Privacy.jsx
│   ├── services/
│   │   ├── ffmpegClient.js
│   │   ├── videoOperations.js
│   │   └── fileValidation.js
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── vercel.json
├── package.json
└── README.md
```

## 11. Tool Configuration Approach

Use one metadata object per tool rather than hard-coding 15 completely separate layouts.

```js
export const tools = [
  {
    slug: 'remove-audio',
    name: 'Remove Audio',
    category: 'Audio',
    description: 'Export a copy of your video without sound.',
    acceptedTypes: ['video/*'],
  },
  // Add the remaining tools here.
];
```

The common `ToolPage` renders controls for the selected operation and calls the corresponding function in `videoOperations.js`. More complex tools, such as crop selection and watermark positioning, can use specialized controls.

## 12. Vercel Deployment

1. Push the Vite/React repository to GitHub.
2. Import the repository into Vercel.
3. Set build command to `npm run build` and output directory to `dist` (normally auto-detected).
4. Add an SPA fallback for client-side routes if required.
5. Configure and test FFmpeg worker loading and cross-origin isolation, especially for builds that require `SharedArrayBuffer`.
6. Verify uploads, processing, previews, and downloads on the deployed domain—not only on localhost.

Example `vercel.json` for SPA routing (adjust based on framework and deployed asset behavior):

```json
{
  "rewrites": [
    { "source": "/((?!assets/).*)", "destination": "/index.html" }
  ]
}
```

**FFmpeg.wasm caveat:** Depending on the selected core/build, threaded execution can require COOP/COEP response headers and suitable resource loading. Example headers to evaluate and test:

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Cross-Origin-Opener-Policy", "value": "same-origin" },
        { "key": "Cross-Origin-Embedder-Policy", "value": "require-corp" }
      ]
    }
  ]
}
```

**Do not paste these two JSON examples into the same `vercel.json` as separate objects.** Combine their `rewrites` and `headers` properties into one JSON object if both are needed. Isolation headers can affect third-party assets; test dependencies and prefer same-origin hosting for FFmpeg core/worker assets where feasible. A single-threaded compatible build may have different requirements.

## 13. Performance and Limitations

- Processing speed depends on the user's CPU, browser, device memory, and video duration.
- Initial FFmpeg.wasm loading can be substantial; use lazy loading and a visible loading state.
- Re-encoding long or high-resolution videos may be slow or crash on low-memory devices.
- Large files can exceed FFmpeg.wasm's practical memory or file-size limitations.
- Not all codecs and containers are supported by every distributed FFmpeg.wasm core.
- Video preview support depends on the browser codec, even if FFmpeg can process a file.
- Start with small test videos (e.g., short 720p or 1080p clips) and clearly state tested limits instead of promising unrestricted uploads.
- Avoid claiming uploaded files are automatically deleted from a server when the project does not upload files to a server at all. Be precise about any analytics or third-party services added later.

## 14. Quality, Privacy, and Accessibility

- Provide keyboard-accessible controls, visible focus states, and meaningful labels.
- Show progress status using accessible status text, not only animation.
- Validate file type, duration, and available settings; handle malformed files gracefully.
- Keep file processing local for the MVP and avoid uploading videos by default.
- Avoid persisting video contents in local storage.
- Never interpolate untrusted filenames into shell commands; pass explicit FFmpeg argument arrays.
- Provide understandable errors and retry options.

## 15. Development Milestones

| Milestone | Deliverable |
|---|---|
| 1. Project setup | React/Vite app, Tailwind theme, routing, homepage |
| 2. Shared workflow | Upload, preview, FFmpeg initialization, processing state, download |
| 3. Phase A tools | First six working tools |
| 4. Phase B tools | Five more tools with consistent settings and error handling |
| 5. Phase C tools | Final four tools with advanced controls |
| 6. Final QA & deployment | Responsive UI, test coverage, documentation, Vercel deployment |

## 16. Minimum Acceptance Criteria

- All 15 tools appear in the catalog with correct names and descriptions.
- Each completed tool accepts a valid sample video and returns the expected file.
- Tool input and output formats are documented and tested.
- Invalid inputs show friendly error messages rather than breaking the page.
- The application works at desktop and mobile screen widths (heavy processing may need desktop guidance).
- User can download processed output.
- Video files are not sent to the project server during normal tool processing.
- Routes work on the public Vercel deployment after a refresh.

## 17. Future Enhancements (Outside MVP)

- Batch processing and chained operations (e.g., trim → crop → compress).
- More output codecs and custom encoding settings.
- Subtitle generation and AI-assisted editing with optional backend processing.
- Cloud storage or user accounts (only if needed later).
- Processing presets for YouTube, Shorts, Reels, and presentations.

---

**Project Type:** College Web Development Project  
**Project Name:** VidKit  
**Frontend:** React.js + Vite + Tailwind CSS  
**Video Engine:** FFmpeg.wasm  
**Deployment:** Vercel  
**Backend / Database:** None required for initial release
