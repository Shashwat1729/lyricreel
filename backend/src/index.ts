import { config } from './config';
import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import rateLimit from 'express-rate-limit';

import uploadRouter from './routes/upload';
import transcriptionRouter from './routes/transcription';
import videoRouter from './routes/video';
import youtubeRouter from './routes/youtube';
import { HttpError, errorMessage } from './lib/errors';
import { isUuid } from './lib/validation';
import { cancelAllJobs, cancelJob, getJob, isTerminal, serializeJob, startJobCleanup } from './services/jobManager';
import { isAvailable } from './services/ffmpeg';
import { isWhisperAvailable } from './services/transcription';
import { warmUpRenderer } from './services/videoRenderer';

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', 'loopback');

app.use(cors({
  origin: (origin, cb) => {
    // Allow same-origin / curl (no Origin) and configured frontends
    if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) cb(null, true);
    else cb(null, false);
  },
}));
app.use(express.json({ limit: '2mb' }));
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

const mutationLimiter = rateLimit({
  windowMs: 60_000,
  limit: 60,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  message: { error: 'Too many requests, please slow down' },
});
const renderLimiter = rateLimit({
  windowMs: 10 * 60_000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: (req) => req.method === 'GET',
  message: { error: 'Render limit reached. Please wait a few minutes before starting another render.' },
});

// Audio for the renderer and the in-browser preview. Only server-generated file names are served.
app.use('/uploads', (req, res, next) => {
  const name = path.basename(req.path);
  if (req.path !== `/${name}` || !/^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(name)) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
}, express.static(config.uploadDir, { dotfiles: 'deny', index: false, fallthrough: false, maxAge: '1h' }));

app.use('/upload-song', mutationLimiter, uploadRouter);
app.use('/generate-transcript', mutationLimiter, transcriptionRouter);
app.use('/generate-video', renderLimiter, videoRouter);
app.use('/youtube-download', mutationLimiter, youtubeRouter);

// Rendered videos. Streams inline (with range support); ?download=1 forces a download.
app.get('/video/:id', (req, res, next) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw new HttpError(400, 'Invalid video ID');
  const file = path.join(config.renderDir, `${id}.mp4`);
  if (!fs.existsSync(file)) throw new HttpError(404, 'Video not found. It may have expired.');
  if (req.query.download) {
    const name = typeof req.query.name === 'string' ? req.query.name.replace(/[^\w\s.-]/g, '').trim().slice(0, 80) : '';
    res.attachment(`${name || `lyricreel-${id.slice(0, 8)}`}.mp4`);
  }
  res.sendFile(file, { headers: { 'Cache-Control': 'private, max-age=3600' } }, (err) => { if (err && !res.headersSent) next(err); });
});

app.get('/jobs/:id', (req, res) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw new HttpError(400, 'Invalid job ID');
  const job = getJob(id);
  if (!job) throw new HttpError(404, 'Job not found');
  res.json(serializeJob(job));
});

app.delete('/jobs/:id', mutationLimiter, (req, res) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw new HttpError(400, 'Invalid job ID');
  const job = getJob(id);
  if (!job) throw new HttpError(404, 'Job not found');
  res.json({ cancelled: cancelJob(id) });
});

// Server-Sent Events stream of a job's progress
app.get('/events/:jobId', (req, res) => {
  const id = String(req.params.jobId);
  if (!isUuid(id)) throw new HttpError(400, 'Invalid job ID');

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  let last = '';
  const send = () => {
    const job = getJob(id);
    if (!job) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: 'Job not found' })}\n\n`);
      return stop();
    }
    const payload = JSON.stringify(serializeJob(job));
    if (payload !== last) {
      last = payload;
      res.write(`data: ${payload}\n\n`);
    }
    if (isTerminal(job)) stop();
  };
  const interval = setInterval(send, 500);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 15_000);
  function stop() {
    clearInterval(interval);
    clearInterval(heartbeat);
    res.end();
  }
  req.on('close', () => { clearInterval(interval); clearInterval(heartbeat); });
  send();
});

let capabilities: Promise<Record<string, boolean>> | null = null;
function detectCapabilities() {
  if (!capabilities) {
    capabilities = Promise.all([
      isAvailable(config.ffmpegPath),
      isAvailable(config.ffprobePath),
      isAvailable(config.ytDlpPath, ['--version']),
      isWhisperAvailable(),
      Promise.resolve(fs.existsSync(path.join(config.remotionDir, 'node_modules', '@remotion', 'renderer'))),
    ]).then(([ffmpeg, ffprobe, ytDlp, whisperx, remotion]) => ({ ffmpeg, ffprobe, ytDlp, whisperx, remotion }));
  }
  return capabilities;
}

app.get('/health', async (_req, res) => {
  res.json({ status: 'ok', uptime: Math.round(process.uptime()), capabilities: await detectCapabilities() });
});

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Central error handler: always JSON, never leaks stack traces
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const parseFailed = (err as { type?: string }).type === 'entity.parse.failed';
  const status = err instanceof HttpError ? err.status : parseFailed ? 400 : (err as { status?: number }).status ?? 500;
  const message = parseFailed ? 'Invalid JSON body' : status >= 500 ? 'Internal server error' : errorMessage(err);
  if (status >= 500) console.error('[server]', err);
  if (res.headersSent) return;
  res.status(status).json({ error: message });
});

async function start() {
  for (const dir of [config.uploadDir, config.renderDir, config.tempDir]) {
    fs.mkdirSync(dir, { recursive: true });
  }
  startJobCleanup();

  const server = app.listen(config.port, () => {
    console.log(`LyricReel API listening on http://localhost:${config.port}`);
    detectCapabilities().then((caps) => {
      const missing = Object.entries(caps).filter(([, ok]) => !ok).map(([name]) => name);
      if (missing.length) console.warn(`[startup] Missing optional tools: ${missing.join(', ')} (see README)`);
    });
    if (process.env.REMOTION_WARMUP !== 'false') warmUpRenderer();
  });

  const shutdown = (signal: string) => {
    console.log(`${signal} received, shutting down`);
    cancelAllJobs();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

process.on('unhandledRejection', (reason) => {
  console.error('[server] Unhandled rejection:', errorMessage(reason));
});

start().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
