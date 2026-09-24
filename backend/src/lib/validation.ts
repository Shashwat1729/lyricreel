import fs from 'fs';
import path from 'path';
import { config, THEMES } from '../config';
import type { ThemeName, WordTimestamp } from '../types';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const STORED_AUDIO_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(mp3|wav|m4a|ogg|flac|opus|webm|aac)$/i;

export const MAX_WORDS = 5000;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

export function isTheme(value: unknown): value is ThemeName {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value);
}

/** Resolve a stored upload by its server-generated filename. Returns null if invalid or missing. */
export function resolveUpload(filename: unknown): string | null {
  if (typeof filename !== 'string') return null;
  const base = path.basename(filename);
  if (base !== filename || !STORED_AUDIO_RE.test(base)) return null;
  const full = path.join(config.uploadDir, base);
  return fs.existsSync(full) ? full : null;
}

export function optionalString(value: unknown, maxLength = 200): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim().slice(0, maxLength);
  return trimmed || undefined;
}

export function optionalNumber(value: unknown, min: number, max: number): number | undefined {
  const n = typeof value === 'string' ? Number(value) : value;
  if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
  return Math.min(max, Math.max(min, n));
}

/**
 * Validate and normalise a words array coming from a client.
 * Returns an error message string when the input is unusable.
 */
export function sanitizeWords(input: unknown): WordTimestamp[] | string {
  if (!Array.isArray(input) || input.length === 0) return 'words must be a non-empty array';
  if (input.length > MAX_WORDS) return `Too many words (max ${MAX_WORDS})`;

  const words: WordTimestamp[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') return 'Invalid word entry';
    const { word, start, end } = raw as Record<string, unknown>;
    if (typeof word !== 'string' || typeof start !== 'number' || typeof end !== 'number') {
      return 'Each word needs word (string), start (number) and end (number)';
    }
    if (!Number.isFinite(start) || !Number.isFinite(end)) return 'Word timestamps must be finite numbers';
    const text = word.replace(/\s+/g, ' ').trim().slice(0, 100);
    if (!text) continue;
    const s = Math.max(0, start);
    const e = Math.max(s, end);
    words.push({ word: text, start: round(s), end: round(e) });
  }
  if (words.length === 0) return 'words must contain at least one non-empty word';
  words.sort((a, b) => a.start - b.start);
  return words;
}

export function round(n: number, digits = 3): number {
  const f = 10 ** digits;
  return Math.round(n * f) / f;
}
