import { Router, type Request, type Response } from 'express';
import path from 'path';
import { config } from '../config';
import { createJob, getJob, serializeJob } from '../services/jobManager';
import { enqueueRender, queuePosition } from '../services/videoRenderer';
import { getAudioDuration } from '../services/ffmpeg';
import { HttpError } from '../lib/errors';
import { isTheme, isUuid, optionalNumber, optionalString, resolveUpload, round, sanitizeWords } from '../lib/validation';

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const audioPath = resolveUpload(body.filename);
  if (!audioPath) throw new HttpError(404, 'Audio file not found. It may have expired; load the song again.');

  const theme = body.theme ?? 'neon';
  if (!isTheme(theme)) throw new HttpError(400, 'Invalid theme');

  const words = sanitizeWords(body.words);
  if (typeof words === 'string') throw new HttpError(400, words);

  // Optional global timing offset (seconds) applied to every word
  const offset = optionalNumber(body.offset, -10, 10) ?? 0;
  const shifted = offset
    ? words.map((w) => ({ ...w, start: round(Math.max(0, w.start + offset)), end: round(Math.max(0, w.end + offset)) }))
    : words;

  const lastWordEnd = shifted[shifted.length - 1].end;
  const audioDuration = (await getAudioDuration(audioPath)) ?? lastWordEnd + 3;

  const clipStart = optionalNumber(body.clipStart, 0, audioDuration) ?? 0;
  const requestedEnd = optionalNumber(body.clipEnd, 0, audioDuration);
  const clipEnd = requestedEnd && requestedEnd > clipStart ? requestedEnd : audioDuration;
  const duration = Math.min(clipEnd - clipStart, config.maxMediaSeconds);
  if (duration < 1) throw new HttpError(400, 'The selected clip must be at least 1 second long');

  const inClip = shifted.filter((w) => w.end > clipStart && w.start < clipStart + duration);
  if (inClip.length === 0) throw new HttpError(400, 'No lyrics fall inside the selected clip');

  const job = createJob('render', { status: 'queued', progress: 0, theme, audioFile: audioPath });
  const outputPath = path.join(config.renderDir, `${job.id}.mp4`);

  enqueueRender(job.id, {
    audioFile: audioPath,
    words: inClip,
    theme,
    title: optionalString(body.title, 120),
    artist: optionalString(body.artist, 120),
    clipStart: round(clipStart),
    durationInSeconds: round(duration),
  }, outputPath);

  res.status(202).json({ jobId: job.id, status: 'queued', position: queuePosition(job.id), duration: round(duration) });
});

router.get('/status/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw new HttpError(400, 'Invalid job ID');
  const job = getJob(id);
  if (!job) throw new HttpError(404, 'Job not found');
  res.json({ ...serializeJob(job), position: job.status === 'queued' ? queuePosition(id) : 0 });
});

export default router;
