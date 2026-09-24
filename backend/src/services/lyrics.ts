import axios from 'axios';
import type { WordTimestamp } from '../types';
import { round } from '../lib/validation';

export interface SyncedLyricLine {
  time: number;
  text: string;
}

export interface LyricsSearchResult {
  syncedLyrics: SyncedLyricLine[] | null;
  plainLyrics: string | null;
  source: 'lrclib';
  title: string;
  artist: string;
  duration?: number;
}

interface LrclibRecord {
  trackName?: string;
  artistName?: string;
  duration?: number;
  instrumental?: boolean;
  plainLyrics?: string | null;
  syncedLyrics?: string | null;
}

const LRCLIB_URL = 'https://lrclib.net/api/search';
const USER_AGENT = 'LyricReel/1.0 (https://github.com/shashwat1729/lyricreel)';

/** Strip "(Official Video)", "[Lyrics]", "ft. X", "| Topic" and similar noise from a song title. */
export function cleanSongTitle(title: string): string {
  return title
    .replace(/\s*[([{【][^)\]}】]*[)\]}】]/g, ' ')
    .replace(/\s+(?:ft\.?|feat\.?|featuring)\s+.*$/i, '')
    .replace(/\s*[|/]\s*.*$/, '')
    .replace(/\b(?:official\s+(?:music\s+)?video|official\s+audio|lyric\s+video|lyrics?|audio|hd|4k)\b/gi, '')
    .replace(/["“”]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Split a video title like "Artist - Song (Official Video)" into its parts. */
export function parseArtistAndTrack(rawTitle: string, uploader?: string): { artist?: string; track: string } {
  const parts = rawTitle.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) {
    const artist = cleanSongTitle(parts[0]);
    const track = cleanSongTitle(parts.slice(1).join(' - '));
    if (artist && track) return { artist, track };
  }
  const cleanUploader = uploader?.replace(/\s*-\s*Topic$/i, '').replace(/VEVO$/i, '').trim();
  return { artist: cleanUploader || undefined, track: cleanSongTitle(rawTitle) || rawTitle.trim() };
}

async function lrclibSearch(params: Record<string, string>): Promise<LrclibRecord[]> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await axios.get<LrclibRecord[]>(LRCLIB_URL, {
        params,
        timeout: 15_000,
        headers: { 'User-Agent': USER_AGENT },
      });
      return Array.isArray(resp.data) ? resp.data : [];
    } catch (err) {
      const retryable = axios.isAxiosError(err) && (!err.response || err.response.status >= 500);
      if (attempt === 1 || !retryable) throw err;
    }
  }
  return [];
}

function pickBest(records: LrclibRecord[], duration?: number): LrclibRecord | null {
  const candidates = records.filter((r) => !r.instrumental && (r.syncedLyrics || r.plainLyrics));
  if (candidates.length === 0) return null;
  const score = (r: LrclibRecord) => {
    let s = r.syncedLyrics ? 0 : 1000;
    if (duration && r.duration) s += Math.abs(r.duration - duration);
    return s;
  };
  const sorted = [...candidates].sort((a, b) => score(a) - score(b));
  const best = sorted[0];
  // A synced result for a very different recording (e.g. an extended mix) would be badly out of sync
  if (duration && best.duration && best.syncedLyrics && Math.abs(best.duration - duration) > 15) {
    return { ...best, syncedLyrics: null };
  }
  return best;
}

/**
 * Search LRCLIB (free, no API key) for synced lyrics. Returns null when nothing usable is found;
 * throws LyricsServiceError when LRCLIB can't be reached.
 */
export async function searchSyncedLyrics(title: string, artist?: string, duration?: number): Promise<LyricsSearchResult | null> {
  const track = cleanSongTitle(title) || title.trim();
  if (!track && !artist) return null;

  try {
    let records: LrclibRecord[] = [];
    if (track) {
      const params: Record<string, string> = { track_name: track };
      if (artist) params.artist_name = artist;
      records = await lrclibSearch(params);
    }
    if (!records.some((r) => r.syncedLyrics)) {
      const q = [artist, track].filter(Boolean).join(' ');
      const more = await lrclibSearch({ q });
      records = [...records, ...more];
    }

    const best = pickBest(records, duration);
    if (!best) return null;

    const synced = best.syncedLyrics ? parseLRC(best.syncedLyrics) : null;
    return {
      syncedLyrics: synced && synced.length ? synced : null,
      plainLyrics: best.plainLyrics || null,
      source: 'lrclib',
      title: best.trackName || track,
      artist: best.artistName || artist || 'Unknown',
      duration: best.duration,
    };
  } catch (err) {
    console.warn(`[lyrics] LRCLIB search failed: ${err instanceof Error ? err.message : err}`);
    throw new LyricsServiceError();
  }
}

export class LyricsServiceError extends Error {
  constructor() {
    super('Could not reach the lyrics service (lrclib.net). Check the server\'s internet connection and try again.');
  }
}

/** Parse LRC text (supports multiple timestamps per line and strips enhanced <mm:ss.xx> word tags). */
export function parseLRC(lrc: string): SyncedLyricLine[] {
  const lines: SyncedLyricLine[] = [];
  const stampRe = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

  for (const raw of lrc.split(/\r?\n/)) {
    const stamps: number[] = [];
    let m: RegExpExecArray | null;
    let lastIndex = 0;
    stampRe.lastIndex = 0;
    while ((m = stampRe.exec(raw)) && m.index === lastIndex) {
      const frac = m[3] ? Number(m[3].padEnd(3, '0')) / 1000 : 0;
      stamps.push(Number(m[1]) * 60 + Number(m[2]) + frac);
      lastIndex = stampRe.lastIndex;
    }
    if (stamps.length === 0) continue;
    const text = raw.slice(lastIndex).replace(/<\d{1,3}:\d{1,2}(?:[.:]\d{1,3})?>/g, '').replace(/\s+/g, ' ').trim();
    if (!text) continue;
    for (const time of stamps) lines.push({ time, text });
  }

  return lines.sort((a, b) => a.time - b.time);
}

/**
 * Spread each synced line's words across the time until the next line.
 * Longer words get proportionally more time.
 */
export function syncedLinesToWordTimestamps(lines: SyncedLyricLine[]): WordTimestamp[] {
  const words: WordTimestamp[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineWords = line.text.split(/\s+/).filter(Boolean);
    if (lineWords.length === 0) continue;

    const next = lines[i + 1]?.time ?? line.time + 4;
    // Sung lines rarely last more than ~0.7s per word; don't stretch across instrumental gaps
    const maxDuration = Math.max(1.5, lineWords.length * 0.7);
    const lineDuration = Math.max(0.3, Math.min(next - line.time, maxDuration, 8));

    const weights = lineWords.map((w) => Math.max(2, w.replace(/[^\p{L}\p{N}]/gu, '').length) + 1);
    const total = weights.reduce((a, b) => a + b, 0);

    let cursor = line.time;
    lineWords.forEach((word, j) => {
      const slot = (lineDuration * weights[j]) / total;
      words.push({ word, start: round(cursor, 2), end: round(cursor + slot * 0.9, 2) });
      cursor += slot;
    });
  }

  return words;
}

function normalizeToken(word: string): string {
  return word.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]/gu, '');
}

function similar(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1 || Math.min(a.length, b.length) < 4) return false;
  // Edit distance <= 1
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/**
 * Combine lyrics text (correct words) with WhisperX timing (precise).
 * Words are aligned in order with a time-banded LCS; lyric words WhisperX didn't hear
 * are interpolated between their aligned neighbours. Falls back to the lyrics timing
 * when too few words line up (WhisperX often struggles with sung vocals).
 */
export function mergeTranscriptions(whisperWords: WordTimestamp[], lyricsWords: WordTimestamp[]): { words: WordTimestamp[]; matchRatio: number } {
  if (!whisperWords.length) return { words: lyricsWords, matchRatio: 0 };
  if (!lyricsWords.length) return { words: whisperWords, matchRatio: 1 };

  const n = lyricsWords.length;
  const m = whisperWords.length;
  if (n * m > 6_000_000) return { words: lyricsWords, matchRatio: 0 };

  const lt = lyricsWords.map((w) => normalizeToken(w.word));
  const wt = whisperWords.map((w) => normalizeToken(w.word));
  const WINDOW = 5; // seconds a whisper word may drift from the lyric line timing

  // LCS table (n+1) x (m+1)
  const width = m + 1;
  const dp = new Uint16Array((n + 1) * width);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      const canMatch = Math.abs(lyricsWords[i].start - whisperWords[j].start) <= WINDOW && similar(lt[i], wt[j]);
      dp[i * width + j] = canMatch
        ? dp[(i + 1) * width + j + 1] + 1
        : Math.max(dp[(i + 1) * width + j], dp[i * width + j + 1]);
    }
  }

  const matchedTo: (number | null)[] = new Array(n).fill(null);
  let i = 0, j = 0, matches = 0;
  while (i < n && j < m) {
    const canMatch = Math.abs(lyricsWords[i].start - whisperWords[j].start) <= WINDOW && similar(lt[i], wt[j]);
    if (canMatch && dp[i * width + j] === dp[(i + 1) * width + j + 1] + 1) {
      matchedTo[i] = j; matches++; i++; j++;
    } else if (dp[(i + 1) * width + j] >= dp[i * width + j + 1]) {
      i++;
    } else {
      j++;
    }
  }

  const matchRatio = matches / n;
  if (matchRatio < 0.35) return { words: lyricsWords, matchRatio };

  const result: WordTimestamp[] = lyricsWords.map((w, idx) => {
    const k = matchedTo[idx];
    return k === null ? { ...w } : { word: w.word, start: whisperWords[k].start, end: whisperWords[k].end };
  });

  // Interpolate unmatched runs between anchors
  let idx = 0;
  while (idx < n) {
    if (matchedTo[idx] !== null) { idx++; continue; }
    const runStart = idx;
    while (idx < n && matchedTo[idx] === null) idx++;
    const runEnd = idx; // exclusive
    const prev = runStart > 0 ? result[runStart - 1] : null;
    const next = runEnd < n ? result[runEnd] : null;
    const from = prev ? prev.end : Math.min(lyricsWords[runStart].start, next ? next.start : Infinity);
    const to = next ? next.start : Math.max(lyricsWords[runEnd - 1].end, from + 0.4 * (runEnd - runStart));
    const count = runEnd - runStart;
    // If the gap is unreasonable (e.g. a long instrumental), keep the lyrics timing for the run
    const gap = to - from;
    if (gap <= 0.05 * count || gap > count * 2.5) {
      continue;
    }
    const step = gap / count;
    for (let r = 0; r < count; r++) {
      const s = from + r * step;
      result[runStart + r] = { word: lyricsWords[runStart + r].word, start: round(s), end: round(s + step * 0.9) };
    }
  }

  // Enforce monotonic, non-overlapping timings
  for (let k = 1; k < result.length; k++) {
    if (result[k].start < result[k - 1].start) result[k].start = result[k - 1].start;
    if (result[k].end < result[k].start) result[k].end = result[k].start;
  }

  return { words: result, matchRatio };
}
