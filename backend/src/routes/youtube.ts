import { Router, type Request, type Response } from 'express';
import { createJob, completeJob, failJob, getJob, serializeJob, setCancelHandler, updateJob } from '../services/jobManager';
import { downloadAudio, extractVideoId, getVideoInfo, type AudioQuality } from '../services/youtube';
import { errorMessage, HttpError } from '../lib/errors';
import { isUuid } from '../lib/validation';

const router = Router();

const LEGACY_QUALITY: Record<string, AudioQuality> = { '64': 'fast', '128': 'fast', '192': 'balanced', '320': 'best' };

function parseQuality(value: unknown): AudioQuality {
  if (value === 'fast' || value === 'balanced' || value === 'best') return value;
  if (typeof value === 'string' && LEGACY_QUALITY[value]) return LEGACY_QUALITY[value];
  return 'balanced';
}

/** Quick metadata lookup (title / artist / duration) without downloading */
router.post('/info', async (req: Request, res: Response) => {
  const videoId = extractVideoId(req.body?.url);
  try {
    const info = await getVideoInfo(videoId);
    res.json({ videoId, ...info });
  } catch (err) {
    throw new HttpError(502, errorMessage(err, 'Could not read video info'));
  }
});

router.post('/', (req: Request, res: Response) => {
  const videoId = extractVideoId(req.body?.url);
  const quality = parseQuality(req.body?.quality);

  const job = createJob('youtube', { status: 'downloading', progress: 2, message: 'Reading video info' });
  res.status(202).json({ jobId: job.id, videoId, status: job.status });

  downloadAudio(videoId, quality, {
    onSpawn: (kill) => setCancelHandler(job.id, kill),
    onProgress: (pct) => updateJob(job.id, { progress: 5 + pct * 0.9, message: 'Downloading audio' }),
  })
    .then(({ filepath, metadata }) => {
      completeJob(job.id, { audioFile: filepath, metadata });
      console.log(`[youtube] ${videoId} downloaded for job ${job.id}`);
    })
    .catch((err) => {
      console.error(`[youtube] Job ${job.id} failed: ${errorMessage(err)}`);
      failJob(job.id, errorMessage(err, 'Download failed'));
    });
});

router.get('/status/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw new HttpError(400, 'Invalid job ID');
  const job = getJob(id);
  if (!job) throw new HttpError(404, 'Job not found');
  const out = serializeJob(job);
  // Flattened fields kept for older clients
  res.json({ ...out, title: job.metadata?.title, artist: job.metadata?.artist, duration: job.metadata?.duration });
});

export default router;
