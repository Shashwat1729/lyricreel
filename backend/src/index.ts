import express from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import uploadRouter from './routes/upload';
import transcriptionRouter from './routes/transcription';
import videoRouter from './routes/video';
import youtubeRouter from './routes/youtube';
import { ensureDir } from './utils/fileUtils';
import { startJobCleanup, getJob } from './services/jobManager';

const app = express();

const PORT = process.env.PORT || 5001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5000';

// Middleware
app.use(cors({ origin: [FRONTEND_URL, 'http://127.0.0.1:5000', 'http://localhost:3000'], credentials: true }));
app.use(express.json({ limit: '10mb' }));
// Videos served via /video/:id endpoint with UUID validation — no static directory
// Uploads not served statically — use /video/:id endpoint for authorized access

// Rate limiting (POST/mutation only — GET status polls are unrestricted)
import rateLimit from 'express-rate-limit';
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Too many requests, please try again later' },
  skip: (req) => req.method === 'GET',
});
const renderLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Render limit reached. Please wait before generating another video.' },
  skip: (req) => req.method === 'GET',
});

// Static file serving for Remotion audio access (internal only, validated UUIDs)
app.use('/uploads', (req, res, next) => {
  const filename = path.basename(req.path);
  if (!/^[a-f0-9-]+\.\w{2,5}$/.test(filename)) return res.status(403).json({ error: 'Forbidden' });
  next();
}, express.static(path.resolve(__dirname, '../uploads')));

// Routes with rate limiters applied correctly
app.use('/upload-song', apiLimiter, uploadRouter);
app.use('/generate-transcript', apiLimiter, transcriptionRouter);
app.use('/generate-video', renderLimiter, videoRouter);
app.use('/youtube-download', apiLimiter, youtubeRouter);

// Video serving endpoint (separate from generate-video router)
import fs from 'fs';
app.get('/video/:id', (req, res) => {
  const id = req.params.id;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid video ID' });
  }
  const videoPath = path.resolve(__dirname, '../renders', `${id}.mp4`);
  if (!fs.existsSync(videoPath)) return res.status(404).json({ error: 'Video not found' });
  res.setHeader('Content-Disposition', `attachment; filename="${id}.mp4"`);
  res.sendFile(videoPath);
});

// SSE endpoint for real-time job progress
app.get('/events/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(jobId)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  const interval = setInterval(() => {
    const job = getJob(jobId);
    if (!job) {
      res.write(`data: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
      clearInterval(interval);
      res.end();
      return;
    }
    res.write(`data: ${JSON.stringify({ status: job.status, progress: job.progress, error: job.error })}\n\n`);
    if (job.status === 'complete' || job.status === 'error') {
      clearInterval(interval);
      res.end();
    }
  }, 500);

  req.on('close', () => clearInterval(interval));
});

// Health check
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Ensure directories exist before starting
async function start() {
  try {
    await Promise.all([
      ensureDir('./uploads'),
      ensureDir('./renders'),
      ensureDir('./temp'),
    ]);
  } catch (err) {
    console.error('Failed to create required directories:', err);
    process.exit(1);
  }

  startJobCleanup();

  app.listen(PORT, () => {
    console.log(`🎵 Lyric Video API running on http://localhost:${PORT}`);
  });
}

start();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  process.exit(0);
});
process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down...');
  process.exit(0);
});
