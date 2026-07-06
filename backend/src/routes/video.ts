import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { createJob, getJob, updateJob, setJobError } from '../services/jobManager';
import { renderVideo } from '../services/videoRenderer';
import { getAudioDuration } from '../services/ffmpeg';
import { VideoConfig } from '../types';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
const RENDER_DIR = path.resolve(process.env.RENDER_DIR || './renders');
const router = Router();

// Validate filename - only allow safe characters (alphanumeric, dash, dot, underscore)
function sanitizeFilename(name: string): string | null {
  const base = path.basename(name);
  if (/^[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+$/.test(base)) return base;
  return null;
}

// Validate job/video ID format (UUID v4)
function isValidId(id: string): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id);
}

router.post('/generate', async (req: Request, res: Response) => {
  const { fileId, filename, words, theme = 'neon', backgroundUrl } = req.body;

  if (!words || !Array.isArray(words) || words.length === 0) {
    return res.status(400).json({ error: 'words array required' });
  }

  if (words.length > 5000) {
    return res.status(400).json({ error: 'Too many words (max 5000)' });
  }

  // Validate individual word entries
  const valid = words.every((w: any) =>
    typeof w.word === 'string' && w.word.length <= 200 &&
    typeof w.start === 'number' && typeof w.end === 'number' &&
    w.start >= 0 && w.end >= w.start
  );
  if (!valid) {
    return res.status(400).json({ error: 'Invalid word entry format' });
  }

  // Validate words structure
  const validWords = words.every((w: any) => typeof w.word === 'string' && typeof w.start === 'number' && typeof w.end === 'number');
  if (!validWords) {
    return res.status(400).json({ error: 'Invalid words format. Each word needs: word (string), start (number), end (number)' });
  }

  const validThemes = ['neon', 'anime', 'sad', 'synthwave', 'minimalist', 'cinematic'];
  if (!validThemes.includes(theme)) {
    return res.status(400).json({ error: `Invalid theme. Must be one of: ${validThemes.join(', ')}` });
  }

  let audioFile: string | null = null;
  // Validate backgroundUrl to prevent SSRF (only allow safe relative paths or data URIs)
  let safeBackgroundUrl = backgroundUrl;
  if (backgroundUrl) {
    if (backgroundUrl.startsWith('data:image/')) {
      // Data URIs are safe
    } else if (backgroundUrl.startsWith('/uploads/')) {
      // Validate no path traversal
      const normalized = path.normalize(backgroundUrl);
      if (!normalized.startsWith('/uploads/') || normalized.includes('..')) {
        safeBackgroundUrl = undefined;
      }
    } else {
      safeBackgroundUrl = undefined;
    }
  }

  if (filename) {
    audioFile = sanitizeFilename(filename);
  } else if (fileId) {
    // Fallback: find file by prefix (only used if filename not provided)
    const safeFid = String(fileId).replace(/[^a-f0-9-]/gi, '');
    try {
      audioFile = fs.readdirSync(UPLOAD_DIR).find(f => f.startsWith(safeFid)) || null;
    } catch { audioFile = null; }
  }

  if (!audioFile) return res.status(404).json({ error: 'Audio file not found' });

  const audioPath = path.join(UPLOAD_DIR, audioFile);
  if (!fs.existsSync(audioPath)) {
    return res.status(404).json({ error: 'Audio file not found on disk' });
  }

  try {
    const duration = await getAudioDuration(audioPath);
    const job = createJob();
    updateJob(job.id, { audioFile: audioPath, theme, status: 'rendering', progress: 5 });

    const outputPath = path.join(RENDER_DIR, `${job.id}.mp4`);

    const config: VideoConfig = {
      audioUrl: audioPath,
      words,
      theme,
      backgroundUrl: safeBackgroundUrl,
      durationInSeconds: duration,
    };

    renderVideo(job.id, config, outputPath).catch((err) => {
      console.error(`[video] Render failed for job ${job.id}:`, err.message);
      try { setJobError(job.id, err.message || 'Render failed'); } catch {}
    });

    res.json({ jobId: job.id, status: 'rendering' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/status/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid job ID format' });

  const job = getJob(id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    outputFile: job.outputFile ? path.basename(job.outputFile) : undefined,
    transcript: job.transcript,
  });
});

router.get('/video/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!isValidId(id)) return res.status(400).json({ error: 'Invalid video ID format' });

  const videoPath = path.join(RENDER_DIR, `${id}.mp4`);
  if (!fs.existsSync(videoPath)) {
    return res.status(404).json({ error: 'Video not found' });
  }
  res.sendFile(videoPath);
});

export default router;
