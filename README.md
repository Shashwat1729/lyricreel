# ðŸŽµ LyricReel

Generate stunning lyric videos for YouTube Shorts, Instagram Reels, and TikTok â€” powered by AI.

Upload a song â†’ AI transcribes lyrics with word-level timestamps â†’ Remotion renders a cinematic vertical video with synced karaoke-style animation.

## âœ¨ Features

- **Automatic Transcription** â€” WhisperX generates word-level timestamps locally
- **Karaoke-style Animation** â€” Words highlight exactly when sung
- **6 Visual Themes** â€” Neon, Anime, Sad, Synthwave, Minimalist, Cinematic
- **Vertical Video** â€” 1080Ã—1920, optimized for Shorts/Reels/TikTok
- **No Paid APIs** â€” Everything runs locally with open-source tools
- **Preview Player** â€” See lyrics synced to audio before rendering
- **Multiple Formats** â€” MP3, WAV input; MP4 H.264 output

## ðŸš€ Quick Start

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

## ðŸ“¦ Installation Details

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

## ðŸ—ï¸ Architecture

```
â”œâ”€â”€ frontend/          # Next.js 14 + TailwindCSS
â”œâ”€â”€ backend/           # Express.js API + WhisperX integration
â”œâ”€â”€ remotion/          # Remotion video compositions
â”œâ”€â”€ uploads/           # Uploaded audio files
â”œâ”€â”€ renders/           # Generated MP4 videos
â”œâ”€â”€ temp/              # Temporary processing files
â”œâ”€â”€ scripts/           # Setup and utility scripts
â””â”€â”€ docker-compose.yml # Docker deployment
```

## ðŸŽ¨ Themes

| Theme | Style |
|-------|-------|
| ðŸŸ¢ Neon | Dark background, cyan/magenta glow |
| ðŸŒ¸ Anime | Deep purple, pink accents |
| ðŸŒ§ï¸ Sad | Dark blue/grey, muted tones |
| ðŸŒ† Synthwave | Purple/orange gradient, retro grid |
| â¬œ Minimalist | Pure black, white text |
| ðŸŽ¬ Cinematic | Letterbox bars, golden highlights |

## ðŸ“¡ API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/upload-song` | Upload MP3/WAV file |
| POST | `/generate-transcript` | Transcribe with word timestamps |
| POST | `/generate-video` | Render lyric video |
| GET | `/status/:id` | Check job status |
| GET | `/video/:id` | Download rendered video |

## ðŸ› ï¸ Development

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

## ðŸ“„ Environment Variables

Copy `.env.example` to `.env` and configure:

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Backend port |
| WHISPERX_MODEL_SIZE | base | Model: tiny, base, small, medium, large |
| WHISPERX_DEVICE | cpu | cpu or cuda |
| FFMPEG_PATH | ffmpeg | Path to FFmpeg binary |

## ðŸ“ License

MIT

