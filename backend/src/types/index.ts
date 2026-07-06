export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  words: WordTimestamp[];
}

export interface TranscriptResult {
  segments?: TranscriptSegment[];
  word_segments: WordTimestamp[];
  language?: string;
  source?: string;
  lyricsMetadata?: { title: string; artist: string };
}

export type ThemeName = 'neon' | 'anime' | 'sad' | 'synthwave' | 'minimalist' | 'cinematic';

export type JobStatus = 'pending' | 'transcribing' | 'rendering' | 'complete' | 'error';

export interface Job {
  id: string;
  status: JobStatus;
  progress: number;
  audioFile: string;
  theme: ThemeName;
  transcript?: TranscriptResult;
  metadata?: { title?: string; artist?: string; duration?: number };
  outputFile?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface VideoConfig {
  audioUrl: string;
  words: WordTimestamp[];
  theme: ThemeName;
  backgroundUrl?: string;
  durationInSeconds: number;
}
