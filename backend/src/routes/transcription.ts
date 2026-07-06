import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { transcribeAudio } from '../services/transcription';
import { searchSyncedLyrics, syncedLinesToWordTimestamps, mergeTranscriptions } from '../services/lyrics';
import { createJob, updateJob, setJobComplete, setJobError, getJob } from '../services/jobManager';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');
const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const { fileId, filename, title, artist, duration } = req.body;

  if (!fileId && !filename) {
    return res.status(400).json({ error: 'fileId or filename required' });
  }

  // Sanitize filename to prevent path traversal
  let audioFile: string | null = null;
  if (filename) {
    const base = path.basename(filename);
    if (/^[a-zA-Z0-9_\-]+\.[a-zA-Z0-9]+$/.test(base)) audioFile = base;
  } else if (fileId) {
    const safeFid = String(fileId).replace(/[^a-f0-9-]/gi, '');
    try {
      audioFile = fs.readdirSync(UPLOAD_DIR).find(f => f.startsWith(safeFid)) || null;
    } catch { audioFile = null; }
  }

  if (!audioFile) {
    return res.status(404).json({ error: 'Audio file not found' });
  }

  const audioPath = path.join(UPLOAD_DIR, audioFile);
  if (!fs.existsSync(audioPath)) {
    return res.status(404).json({ error: 'Audio file not found on disk' });
  }

  try {
    const job = createJob();
    updateJob(job.id, { audioFile: audioPath, status: 'transcribing', progress: 5 });

    // Run transcription + lyrics search in parallel (catch unhandled rejections)
    (async () => {
      try {
        updateJob(job.id, { progress: 10 });

        // Search for existing synced lyrics (fast, free)
        const lyricsPromise = (title || artist)
          ? searchSyncedLyrics(title || '', artist, duration)
          : Promise.resolve(null);

        // Run WhisperX transcription (slower but precise timing)
        const whisperPromise = transcribeAudio(audioPath);

        const [lyricsResult, whisperResult] = await Promise.allSettled([lyricsPromise, whisperPromise]);

        const lyricsData = lyricsResult.status === 'fulfilled' ? lyricsResult.value : null;
        const whisperData = whisperResult.status === 'fulfilled' ? whisperResult.value : null;

        let finalWords: { word: string; start: number; end: number }[] = [];
        let source = 'none';

        if (whisperData?.word_segments?.length && lyricsData?.syncedLyrics?.length) {
          // Best case: merge both for accuracy (WhisperX timing + lyrics text)
          const lyricsWords = syncedLinesToWordTimestamps(lyricsData.syncedLyrics);
          finalWords = mergeTranscriptions(whisperData.word_segments, lyricsWords);
          source = 'whisperx+lyrics';
          console.log(`[transcription] Merged ${whisperData.word_segments.length} whisper words with ${lyricsWords.length} lyrics words`);
        } else if (whisperData?.word_segments?.length) {
          // WhisperX only
          finalWords = whisperData.word_segments;
          source = 'whisperx';
        } else if (lyricsData?.syncedLyrics?.length) {
          // Lyrics only (WhisperX failed/unavailable)
          finalWords = syncedLinesToWordTimestamps(lyricsData.syncedLyrics);
          source = 'lyrics';
          console.log(`[transcription] Using synced lyrics fallback (${finalWords.length} words)`);
        } else if (lyricsData?.plainLyrics) {
          // Plain lyrics without timestamps — can't use for video but report it
          source = 'plain-lyrics-only';
        }

        if (finalWords.length === 0) {
          setJobError(job.id, 'No transcription available. Ensure WhisperX is installed or provide song title/artist for lyrics lookup.');
          return;
        }

        updateJob(job.id, {
          transcript: { word_segments: finalWords, source, lyricsMetadata: lyricsData ? { title: lyricsData.title, artist: lyricsData.artist } : undefined },
          progress: 100,
          status: 'complete',
        });
      } catch (err: any) {
        setJobError(job.id, err.message || 'Transcription failed');
      }
    })().catch((unhandled) => {
      console.error(`[transcription] Unhandled error for job ${job.id}:`, unhandled);
      try { setJobError(job.id, 'Internal transcription error'); } catch {}
    });

    res.json({ jobId: job.id, status: 'transcribing' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Search lyrics without transcription (quick lookup)
router.post('/search-lyrics', async (req: Request, res: Response) => {
  const { title, artist, duration } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });

  try {
    const result = await searchSyncedLyrics(title, artist, duration);
    if (!result) return res.json({ found: false });

    const words = result.syncedLyrics ? syncedLinesToWordTimestamps(result.syncedLyrics) : [];
    res.json({
      found: true,
      hasSyncedLyrics: !!result.syncedLyrics,
      words,
      title: result.title,
      artist: result.artist,
      source: result.source,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get transcript job status
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
    transcript: job.transcript,
  });
});

export default router;
