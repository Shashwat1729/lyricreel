import axios from 'axios';

export interface SyncedLyricLine {
  time: number; // seconds
  text: string;
}

export interface LyricsSearchResult {
  syncedLyrics: SyncedLyricLine[] | null;
  plainLyrics: string | null;
  source: string;
  title: string;
  artist: string;
}

/**
 * Search LRCLIB (free, no API key) for synced lyrics
 * Returns timestamped lines if available
 */
export async function searchSyncedLyrics(title: string, artist?: string, duration?: number): Promise<LyricsSearchResult | null> {
  try {
    const params: Record<string, string> = { track_name: title };
    if (artist) params.artist_name = artist;
    if (duration) params.duration = String(Math.round(duration));

    // Retry once on timeout (WSL DNS can be slow on first resolve)
    let data: any;
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const resp = await axios.get('https://lrclib.net/api/search', {
          params,
          timeout: 20000,
          headers: { 'User-Agent': 'LyricVideoGenerator/1.0' },
        });
        data = resp.data;
        break;
      } catch (retryErr: any) {
        if (attempt === 1 || !retryErr.message?.includes('timeout')) throw retryErr;
        console.log('[lyrics] LRCLIB first attempt timed out, retrying...');
      }
    }

    if (!data || data.length === 0) return null;

    // Pick best match (first result with synced lyrics)
    const withSynced = data.find((r: any) => r.syncedLyrics);
    const best = withSynced || data[0];

    const syncedLyrics = best.syncedLyrics ? parseLRC(best.syncedLyrics) : null;

    return {
      syncedLyrics,
      plainLyrics: best.plainLyrics || null,
      source: 'lrclib',
      title: best.trackName || title,
      artist: best.artistName || artist || 'Unknown',
    };
  } catch (err: any) {
    console.log(`[lyrics] LRCLIB search failed: ${err.message}`);
    return null;
  }
}

/**
 * Parse LRC format into timestamped lines
 * Format: [mm:ss.xx] lyrics text
 */
function parseLRC(lrc: string): SyncedLyricLine[] {
  const lines: SyncedLyricLine[] = [];
  const regex = /\[(\d{2}):(\d{2})\.(\d{2,3})\]\s*(.*)/;

  for (const line of lrc.split('\n')) {
    const match = line.match(regex);
    if (match) {
      const minutes = parseInt(match[1], 10);
      const seconds = parseInt(match[2], 10);
      const ms = parseInt(match[3].padEnd(3, '0'), 10);
      const time = minutes * 60 + seconds + ms / 1000;
      const text = match[4].trim();
      if (text) {
        lines.push({ time, text });
      }
    }
  }

  return lines;
}

/**
 * Convert synced lyric lines to word-level timestamps
 * Distributes words evenly across the line duration
 */
export function syncedLinesToWordTimestamps(lines: SyncedLyricLine[]): { word: string; start: number; end: number }[] {
  const words: { word: string; start: number; end: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const nextLineTime = i < lines.length - 1 ? lines[i + 1].time : line.time + 3;
    const lineDuration = Math.min(nextLineTime - line.time, 5); // cap at 5s per line

    const lineWords = line.text.split(/\s+/).filter(Boolean);
    if (lineWords.length === 0) continue;

    const wordDuration = lineDuration / lineWords.length;

    for (let j = 0; j < lineWords.length; j++) {
      const start = line.time + j * wordDuration;
      const end = start + wordDuration * 0.85; // small gap between words
      words.push({ word: lineWords[j], start: Math.round(start * 100) / 100, end: Math.round(end * 100) / 100 });
    }
  }

  return words;
}

/**
 * Merge WhisperX word timestamps with synced lyrics for better accuracy.
 * WhisperX provides precise timing, synced lyrics provide correct text.
 * Uses WhisperX timestamps but corrects misheard words from lyrics.
 */
export function mergeTranscriptions(
  whisperWords: { word: string; start: number; end: number }[],
  lyricsWords: { word: string; start: number; end: number }[]
): { word: string; start: number; end: number }[] {
  if (!whisperWords.length) return lyricsWords;
  if (!lyricsWords.length) return whisperWords;

  // Sort lyrics words by start time for binary search
  const sortedLyrics = [...lyricsWords].sort((a, b) => a.start - b.start);
  const used = new Set<number>(); // Track used lyrics indices to prevent duplicates

  const merged = whisperWords.map((wWord) => {
    // Binary search for closest lyrics word by timestamp
    const idx = binarySearchClosest(sortedLyrics, wWord.start);
    if (idx === -1) return wWord;

    // Check nearby candidates (idx-1, idx, idx+1) for closest match
    let bestIdx = idx;
    let bestDist = Math.abs(sortedLyrics[idx].start - wWord.start);

    for (const offset of [-1, 1]) {
      const checkIdx = idx + offset;
      if (checkIdx >= 0 && checkIdx < sortedLyrics.length) {
        const dist = Math.abs(sortedLyrics[checkIdx].start - wWord.start);
        if (dist < bestDist && !used.has(checkIdx)) {
          bestDist = dist;
          bestIdx = checkIdx;
        }
      }
    }

    // If within 0.5s and not already used, substitute lyrics text
    if (bestDist < 0.5 && !used.has(bestIdx)) {
      used.add(bestIdx);
      return { word: sortedLyrics[bestIdx].word, start: wWord.start, end: wWord.end };
    }

    return wWord;
  });

  return merged;
}

/** Binary search for the closest start time in a sorted array */
function binarySearchClosest(arr: { start: number }[], target: number): number {
  if (arr.length === 0) return -1;
  let lo = 0, hi = arr.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (arr[mid].start < target) lo = mid + 1;
    else hi = mid;
  }
  // lo is the first element >= target; check lo-1 as well
  if (lo > 0 && Math.abs(arr[lo - 1].start - target) < Math.abs(arr[lo].start - target)) {
    return lo - 1;
  }
  return lo;
}
