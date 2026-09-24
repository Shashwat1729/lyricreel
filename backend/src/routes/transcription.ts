import { Router, type Request, type Response } from 'express';
import { createJob, completeJob, failJob, getJob, isTerminal, serializeJob, setCancelHandler, updateJob } from '../services/jobManager';
import { isWhisperAvailable, transcribeAudio } from '../services/transcription';
import { mergeTranscriptions, searchSyncedLyrics, syncedLinesToWordTimestamps } from '../services/lyrics';
import { getAudioDuration } from '../services/ffmpeg';
import { errorMessage, HttpError } from '../lib/errors';
import { isUuid, optionalNumber, optionalString, resolveUpload } from '../lib/validation';
import type { WordTimestamp } from '../types';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  const audioPath = resolveUpload(req.body?.filename);
  if (!audioPath) throw new HttpError(404, 'Audio file not found. Upload or download the song again.');

  const title = optionalString(req.body?.title);
  const artist = optionalString(req.body?.artist);
  const useWhisper = req.body?.useWhisper !== false;

  const job = createJob('transcribe', { status: 'transcribing', progress: 5, message: 'Looking up lyrics', audioFile: audioPath });
  res.status(202).json({ jobId: job.id, status: job.status });

  let cancelled = false;
  let killWhisper: (() => void) | null = null;
  setCancelHandler(job.id, () => { cancelled = true; killWhisper?.(); });

  try {
    const duration = optionalNumber(req.body?.duration, 1, 24 * 3600) ?? (await getAudioDuration(audioPath)) ?? undefined;

    const lyricsPromise = title || artist ? searchSyncedLyrics(title ?? '', artist, duration) : Promise.resolve(null);
    const whisperPromise = (async () => {
      if (!useWhisper || !(await isWhisperAvailable())) return null;
      updateJob(job.id, { message: 'Transcribing vocals with WhisperX (this can take a few minutes)' });
      return transcribeAudio(audioPath, { onSpawn: (kill) => { killWhisper = kill; } });
    })();

    // Lyrics usually arrive first; report it while WhisperX keeps running
    lyricsPromise.then((l) => {
      if (l?.syncedLyrics?.length) updateJob(job.id, { progress: 40, message: 'Found synced lyrics, refining timing' });
    }).catch(() => undefined);

    const [lyricsResult, whisperResult] = await Promise.allSettled([lyricsPromise, whisperPromise]);
    if (cancelled || isTerminal(getJob(job.id)!)) return;

    const lyrics = lyricsResult.status === 'fulfilled' ? lyricsResult.value : null;
    const whisper = whisperResult.status === 'fulfilled' ? whisperResult.value : null;
    if (whisperResult.status === 'rejected') console.warn(`[transcription] WhisperX failed: ${errorMessage(whisperResult.reason)}`);

    let words: WordTimestamp[] = [];
    let source = 'none';
    const lyricWords = lyrics?.syncedLyrics?.length ? syncedLinesToWordTimestamps(lyrics.syncedLyrics) : [];

    if (whisper?.word_segments.length && lyricWords.length) {
      const merged = mergeTranscriptions(whisper.word_segments, lyricWords);
      words = merged.words;
      source = merged.matchRatio >= 0.35 ? 'lrclib+whisperx' : 'lrclib';
      console.log(`[transcription] Aligned ${Math.round(merged.matchRatio * 100)}% of lyric words to WhisperX timing`);
    } else if (lyricWords.length) {
      words = lyricWords;
      source = 'lrclib';
    } else if (whisper?.word_segments.length) {
      words = whisper.word_segments;
      source = 'whisperx';
    }

    if (words.length === 0) {
      if (lyricsResult.status === 'rejected' && !whisper) {
        failJob(job.id, errorMessage(lyricsResult.reason, 'Lyrics lookup failed'));
        return;
      }
      const hint = lyrics?.plainLyrics
        ? 'Lyrics were found but they have no timing information.'
        : !title && !artist
          ? 'Add the song title and artist so we can look up the lyrics.'
          : "Couldn't find synced lyrics for this song. Check the title and artist spelling.";
      const whisperHint = (await isWhisperAvailable()) ? '' : ' Installing WhisperX enables transcription of any song.';
      failJob(job.id, hint + whisperHint);
      return;
    }

    completeJob(job.id, {
      transcript: {
        word_segments: words,
        source,
        language: whisper?.language,
        lyricsMetadata: lyrics ? { title: lyrics.title, artist: lyrics.artist } : undefined,
      },
      metadata: { title: lyrics?.title ?? title, artist: lyrics?.artist ?? artist, duration },
    });
  } catch (err) {
    console.error(`[transcription] Job ${job.id} failed: ${errorMessage(err)}`);
    failJob(job.id, errorMessage(err, 'Transcription failed'));
  }
});

/** Look up lyrics without an audio file */
router.post('/search-lyrics', async (req: Request, res: Response) => {
  const title = optionalString(req.body?.title);
  const artist = optionalString(req.body?.artist);
  if (!title) throw new HttpError(400, 'title is required');
  const duration = optionalNumber(req.body?.duration, 1, 24 * 3600);

  let result;
  try {
    result = await searchSyncedLyrics(title, artist, duration);
  } catch (err) {
    throw new HttpError(502, errorMessage(err));
  }
  if (!result) return res.json({ found: false });
  res.json({
    found: true,
    hasSyncedLyrics: !!result.syncedLyrics,
    words: result.syncedLyrics ? syncedLinesToWordTimestamps(result.syncedLyrics) : [],
    plainLyrics: result.plainLyrics,
    title: result.title,
    artist: result.artist,
    source: result.source,
  });
});

router.get('/status/:id', (req: Request, res: Response) => {
  const id = String(req.params.id);
  if (!isUuid(id)) throw new HttpError(400, 'Invalid job ID');
  const job = getJob(id);
  if (!job) throw new HttpError(404, 'Job not found');
  res.json(serializeJob(job));
});

export default router;
