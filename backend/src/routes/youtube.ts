import { Router, Request, Response } from 'express';
import path from 'path';
import { downloadFromYouTube } from '../services/youtube';
import { createJob, updateJob, getJob, setJobError } from '../services/jobManager';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { url, quality } = req.body;

  const YOUTUBE_REGEX = /^https?:\/\/(www\.)?(youtube\.com|youtu\.be|m\.youtube\.com)\//;
  if (!url || typeof url !== 'string' || !YOUTUBE_REGEX.test(url)) {
    return res.status(400).json({ error: 'Invalid YouTube URL' });
  }

  const audioQuality = ['64', '128', '192', '320'].includes(quality) ? quality : '192';
  const job = createJob();
  updateJob(job.id, { status: 'transcribing', progress: 5 });

  res.json({ jobId: job.id, status: 'downloading' });

  // Download async
  try {
    console.log(`[youtube] Starting download for job ${job.id}: ${url} (quality: ${audioQuality}K)`);
    updateJob(job.id, { progress: 10 });

    const result = await downloadFromYouTube(url, audioQuality);

    updateJob(job.id, {
      audioFile: result.filepath,
      progress: 100,
      status: 'complete',
      metadata: { title: result.title, duration: result.duration },
    });

    console.log(`[youtube] Download complete for job ${job.id}: ${result.filename}`);
  } catch (err: any) {
    console.error(`[youtube] Download failed for job ${job.id}:`, err.message);
    setJobError(job.id, err.message);
  }
});

router.get('/status/:id', (req: Request, res: Response) => {
  const id = req.params.id as string;
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) {
    return res.status(400).json({ error: 'Invalid job ID' });
  }
  const job = getJob(id);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.json({
    id: job.id,
    status: job.status,
    progress: job.progress,
    error: job.error,
    filename: job.audioFile ? path.basename(job.audioFile) : undefined,
    title: job.metadata?.title,
    artist: job.metadata?.artist,
    duration: job.metadata?.duration,
  });
});

export default router;
