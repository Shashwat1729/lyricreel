# 🎬 LyricReel

**Generate stunning lyric videos for YouTube Shorts, Instagram Reels, and TikTok — powered by AI.**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## What is this?

Upload a song → AI transcribes lyrics with word-level timestamps → Remotion renders a cinematic vertical video with synced karaoke-style animation.

**Ready for Shorts, Reels, TikTok.** No paid APIs required.

## ✨ Features

🎤 **Automatic Transcription** — WhisperX generates word-level timestamps locally  
🎨 **6 Visual Themes** — Neon, Anime, Sad, Synthwave, Minimalist, Cinematic  
📱 **Vertical Video** — 1080×1920, optimized for Shorts/Reels/TikTok  
🔊 **Preview Player** — See lyrics synced to audio before rendering  
🎵 **Multiple Formats** — MP3/WAV input, MP4 H.264 output  
💸 **No Paid APIs** — Everything runs locally with open-source tools

## 🚀 Quick Start

### Prerequisites
- Node.js 18+, Python 3.9+, FFmpeg, WhisperX (`pip install whisperx`)

### Setup

```bash
# Install everything
npm run install:all

# Run setup (checks prerequisites, creates .env)
npm run setup

# Start development
npm run dev
```

Frontend: **http://localhost:3000**  
Backend: **http://localhost:3001**

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Backend port |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Frontend API URL |
| `WHISPERX_MODEL_SIZE` | `base` | Model size: `tiny`, `base`, `small`, `medium`, `large` |
| `WHISPERX_DEVICE` | `cpu` | `cpu` or `cuda` |
| `UPLOAD_DIR` | `./uploads` | Upload directory |
| `RENDER_DIR` | `./renders` | Output directory |

## 🎨 Themes

| Theme | Vibe |
|-------|------|
| **Neon** | Cyberpunk glow, pink/blue gradients |
| **Anime** | Soft pastels, floaty vibes |
| **Sad** | Muted tones, melancholy |
| **Synthwave** | Retro 80s, purple/orange sunsets |
| **Minimalist** | Clean typography, monochrome |
| **Cinematic** | Letterbox bars, dramatic serif fonts |

## 📁 Project Structure

```
├── frontend/       # Next.js app (upload + preview)
├── backend/        # Express API (transcription + rendering)
├── remotion/       # Remotion video composition templates
├── scripts/        # Setup and utility scripts
└── docker-compose.yml
```
