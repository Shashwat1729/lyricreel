import type { THEMES } from '../config';

export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptResult {
  word_segments: WordTimestamp[];
  language?: string;
  source?: string;
  lyricsMetadata?: { title: string; artist: string };
}

export type ThemeName = (typeof THEMES)[number];

export type JobKind = 'youtube' | 'transcribe' | 'render';

export type JobStatus = 'pending' | 'queued' | 'downloading' | 'transcribing' | 'rendering' | 'complete' | 'error' | 'cancelled';

export interface JobMetadata {
  title?: string;
  track?: string;
  artist?: string;
  duration?: number;
  thumbnail?: string;
}

export interface Job {
  id: string;
  kind: JobKind;
  status: JobStatus;
  progress: number;
  /** Human readable description of the current step */
  message?: string;
  audioFile?: string;
  theme?: ThemeName;
  transcript?: TranscriptResult;
  metadata?: JobMetadata;
  outputFile?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

export interface VideoConfig {
  audioFile: string;
  words: WordTimestamp[];
  theme: ThemeName;
  title?: string;
  artist?: string;
  clipStart: number;
  durationInSeconds: number;
}
