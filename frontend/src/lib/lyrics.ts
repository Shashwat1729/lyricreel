import type { WordTimestamp } from '@/types';

export interface LyricLine {
  words: WordTimestamp[];
  start: number;
  end: number;
}

const PHRASE_END = /[.!?,;:]["')\]]?$/;

/** Same grouping rules as the video renderer (remotion/src/utils.ts). */
export function groupWordsIntoLines(words: WordTimestamp[], maxWordsPerLine = 6, maxChars = 28): LyricLine[] {
  const lines: LyricLine[] = [];
  let current: WordTimestamp[] = [];
  let chars = 0;
  const flush = () => {
    if (!current.length) return;
    lines.push({ words: current, start: current[0].start, end: current[current.length - 1].end });
    current = [];
    chars = 0;
  };
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (current.length && chars + w.word.length + 1 > maxChars) flush();
    current.push(w);
    chars += w.word.length + 1;
    const next = words[i + 1];
    const gap = next ? next.start - w.end : 0;
    if (!next || current.length >= maxWordsPerLine || gap > 0.6 || (PHRASE_END.test(w.word) && current.length >= 3)) flush();
  }
  flush();
  return lines;
}

export function activeLineIndex(lines: LyricLine[], time: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].start - 0.15 <= time) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return found;
}

export function shiftWords(words: WordTimestamp[], offset: number): WordTimestamp[] {
  if (!offset) return words;
  return words.map((w) => ({ word: w.word, start: Math.max(0, w.start + offset), end: Math.max(0, w.end + offset) }));
}

export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Parse "m:ss", "m:ss.s" or plain seconds. Returns null if invalid. */
export function parseTime(input: string): number | null {
  const v = input.trim();
  if (!v) return null;
  const m = v.match(/^(\d+):([0-5]?\d(?:\.\d+)?)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Split a YouTube-style title like "Artist - Song (Official Video)". */
export function guessArtistAndTrack(raw: string): { artist: string; track: string } {
  const clean = (s: string) => s.replace(/\s*[([{][^)\]}]*[)\]}]/g, '').replace(/\s+(ft\.?|feat\.?)\s.*$/i, '').trim();
  const parts = raw.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) return { artist: clean(parts[0]), track: clean(parts.slice(1).join(' - ')) };
  return { artist: '', track: clean(raw) };
}

export function extractYouTubeId(input: string): string | null {
  const v = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
  const m = v.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}
