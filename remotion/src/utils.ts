import { WordTimestamp } from './types';

export interface LyricLine {
  words: WordTimestamp[];
  start: number;
  end: number;
}

/**
 * Group words into display lines (~5-7 words, or break at pauses > 0.5s)
 */
export function groupWordsIntoLines(words: WordTimestamp[], maxWordsPerLine = 6): LyricLine[] {
  if (words.length === 0) return [];

  const lines: LyricLine[] = [];
  let currentLine: WordTimestamp[] = [];

  for (let i = 0; i < words.length; i++) {
    currentLine.push(words[i]);

    const isLastWord = i === words.length - 1;
    const nextWord = words[i + 1];
    const gap = nextWord ? nextWord.start - words[i].end : 0;
    const lineFull = currentLine.length >= maxWordsPerLine;
    const naturalBreak = gap > 0.5;

    if (isLastWord || lineFull || naturalBreak) {
      lines.push({
        words: [...currentLine],
        start: currentLine[0].start,
        end: currentLine[currentLine.length - 1].end,
      });
      currentLine = [];
    }
  }

  return lines;
}

/**
 * Get the active line index at a given time
 */
export function getActiveLineIndex(lines: LyricLine[], timeInSeconds: number): number {
  for (let i = lines.length - 1; i >= 0; i--) {
    if (timeInSeconds >= lines[i].start - 0.1) return i;
  }
  return 0;
}

/**
 * Check if a word is currently active
 */
export function isWordActive(word: WordTimestamp, timeInSeconds: number): boolean {
  return timeInSeconds >= word.start && timeInSeconds <= word.end;
}

/**
 * Check if word has been spoken (past)
 */
export function isWordPast(word: WordTimestamp, timeInSeconds: number): boolean {
  return timeInSeconds > word.end;
}

/**
 * Interpolate value for smooth animations
 */
export function interpolate(
  value: number,
  inputRange: [number, number],
  outputRange: [number, number]
): number {
  const [inMin, inMax] = inputRange;
  const [outMin, outMax] = outputRange;
  const clamped = Math.min(Math.max(value, inMin), inMax);
  const progress = (clamped - inMin) / (inMax - inMin);
  return outMin + progress * (outMax - outMin);
}
