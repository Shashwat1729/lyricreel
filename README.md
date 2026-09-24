# LyricReel

**Turn any song into a synced lyric video for YouTube Shorts, Instagram Reels and TikTok.**

Paste a YouTube link or upload an audio file. LyricReel finds the lyrics, times every word, lets you preview and fine-tune the result live, and renders a 1080×1920 MP4 with audio. Everything runs on your machine, with no paid APIs or API keys.

## Screenshots

| Landing | Theme Selection |
|:---:|:---:|
| ![Landing](docs/landing.png) | ![Themes](docs/themes.png) |

## Features

- **YouTube or upload**: youtube.com, youtu.be, Shorts and YouTube Music links, or MP3 / WAV / M4A / OGG / FLAC up to 50 MB.
- **Word-level sync**: synced lyrics from [LRCLIB](https://lrclib.net), aligned to [WhisperX](https://github.com/m-bain/whisperX) word timings when WhisperX is installed.
- **Live studio**: a 9:16 preview that matches the rendered video, click-to-seek lyrics, a timing-offset slider, and clip selection for Reels (90 s) and Shorts (3 min).
- **Six themes**: Neon, Anime, Sad, Synthwave, Minimal, Cinematic, with a karaoke-style word wipe.
- **Reliable rendering**: Remotion renders are queued, show real frame progress, and can be cancelled. Old files are cleaned up automatically.

## Quick start

Requirements: **Node.js 18.17+** and **ffmpeg**. Install **yt-dlp** for YouTube links (`pip install yt-dlp`). For better timing, and for songs LRCLIB doesn't know, install **WhisperX** (`pip install whisperx`), which is optional.

```bash
npm run setup     # installs all packages, creates .env and data folders, checks tools
npm run dev       # backend on :3001, frontend on :3000
```

Open http://localhost:3000.

The first render bundles the video template and may download Chrome Headless Shell (about 100 MB). Later renders start right away.

### Docker

```bash
docker compose up --build
```

To include WhisperX in the image (a large download), set `INSTALL_WHISPERX: "true"` in `docker-compose.yml`.

## Configuration

The backend reads `.env` at the repo root (see `.env.example` for every option). The most useful ones:

| Variable | Default | What |
|----------|---------|------|
| `PORT` | `3001` | Backend port |
| `CORS_ORIGINS` | `http://localhost:3000` | Frontend origins allowed to call the API |
| `FILE_TTL_HOURS` | `24` | How long uploads and rendered videos are kept |
| `WHISPERX_MODEL_SIZE` | `base` | tiny / base / small / medium / large |
| `WHISPERX_DEVICE` | `cpu` | `cpu` or `cuda` |
| `RENDER_MAX_CONCURRENT` | `1` | Renders that run at the same time; the rest are queued |
| `REMOTION_BROWSER_EXECUTABLE` | (none) | Use an existing Chrome instead of downloading one |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend URL used by the frontend (set in `frontend/.env.local`) |

Check `GET http://localhost:3001/health` to see which optional tools the backend detected.

## Project layout

```
backend/    Express API: uploads, YouTube download, lyrics + WhisperX, render queue
frontend/   Next.js app: landing page, studio, share page
remotion/   Remotion video template (1080×1920, 24 fps)
```

## Development

```bash
npm test            # backend unit tests
npm run typecheck   # all three packages
npm run dev:remotion   # open Remotion Studio to work on the video template
```

## Troubleshooting

- **"Can't reach the LyricReel server"**: the backend isn't running, or `NEXT_PUBLIC_API_URL` points somewhere else.
- **"yt-dlp is not installed"**: run `pip install yt-dlp`, or use the Upload tab.
- **"Couldn't find synced lyrics"**: check the title and artist spelling, or install WhisperX.
- **Lyrics slightly early or late**: use the Timing offset slider in the studio before rendering.
