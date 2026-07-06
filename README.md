# 🎵 AI Lyric Video Generator

Generate stunning lyric videos for YouTube Shorts, Instagram Reels, and TikTok — powered by AI.

Upload a song → AI transcribes lyrics with word-level timestamps → Remotion renders a cinematic vertical video with synced karaoke-style animation.

## ✨ Features

- **Automatic Transcription** — WhisperX generates word-level timestamps locally
- **Karaoke-style Animation** — Words highlight exactly when sung
- **6 Visual Themes** — Neon, Anime, Sad, Synthwave, Minimalist, Cinematic
- **Vertical Video** — 1080×1920, optimized for Shorts/Reels/TikTok
- **No Paid APIs** — Everything runs locally with open-source tools
- **Preview Player** — See lyrics synced to audio before rendering
- **Multiple Formats** — MP3, WAV input; MP4 H.264 output

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18+
- **Python** 3.9+
- **FFmpeg** installed and on PATH
- **WhisperX** (`pip install whisperx`)

### Install

```bash
# Clone and install all dependencies
npm run install:all

# Run setup (checks prerequisites, creates .env)
npm run setup

# Start development
npm run dev
```

Frontend runs on `http://localhost:3000`, backend on `http://localhost:3001`.

### Docker (Alternative)

```bash
docker-compose up
```

## 📦 Installation Details

### FFmpeg

```bash
# Ubuntu/Debian
sudo apt install ffmpeg

# macOS
brew install ffmpeg

# Windows (WSL)
sudo apt install ffmpeg

# Windows (native) - download from https://ffmpeg.org/download.html
```

### WhisperX

```bash
# CPU-only (recommended for most setups)
pip install whisperx torch torchaudio --index-url https://download.pytorch.org/whl/cpu

# With CUDA (NVIDIA GPU)
pip install whisperx torch torchaudio --index-url https://download.pytorch.org/whl/cu118
```

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| RAM | 4 GB | 8 GB |
| CPU | 4 cores | 8 cores |
| GPU | None (CPU fallback) | NVIDIA with CUDA |
| Disk | 2 GB free | 5 GB free |

## 🏗️ Architecture

```
├── frontend/          # Next.js 14 + TailwindCSS
├── backend/           # Express.js API + WhisperX integration
├── remotion/          # Remotion video compositions
├── uploads/           # Uploaded audio files
├── renders/           # Generated MP4 videos
├── temp/              # Temporary processing files
├── scripts/           # Setup and utility scripts
└── docker-compose.yml # Docker deployment
```

## 🎨 Themes

| Theme | Style |
|-------|-------|
| 🟢 Neon | Dark background, cyan/magenta glow |
| 🌸 Anime | Deep purple, pink accents |
| 🌧️ Sad | Dark blue/grey, muted tones |
| 🌆 Synthwave | Purple/orange gradient, retro grid |
| ⬜ Minimalist | Pure black, white text |
| 🎬 Cinematic | Letterbox bars, golden highlights |

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload-song` | Upload MP3/WAV file |
| POST | `/generate-transcript` | Transcribe with word timestamps |
| POST | `/generate-video` | Render lyric video |
| GET | `/status/:id` | Check job status |
| GET | `/video/:id` | Download rendered video |

## 🛠️ Development

```bash
# Frontend only
npm run dev:frontend

# Backend only
npm run dev:backend

# Remotion preview
npm run dev:remotion

# Full stack
npm run dev
```

## 📄 Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Backend port |
| WHISPERX_MODEL_SIZE | base | Model: tiny, base, small, medium, large |
| WHISPERX_DEVICE | cpu | cpu or cuda |
| FFMPEG_PATH | ffmpeg | Path to FFmpeg binary |

## 📝 License

MIT
