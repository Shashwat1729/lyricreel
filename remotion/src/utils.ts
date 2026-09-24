import { WordTimestamp } from './types';

export interface LyricLine {
  words: WordTimestamp[];
  start: number;
  end: number;
}

const PHRASE_END = /[.!?,;:]["')\]]?$/;

/**
 * Group words into display lines: break on pauses, punctuation, or when a line gets long.
 */
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

/** Index of the line being sung (or most recently sung) at `time`; -1 before the first line. */
export function getActiveLineIndex(lines: LyricLine[], time: number): number {
  let lo = 0;
  let hi = lines.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (lines[mid].start - 0.15 <= time) { found = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return found;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
