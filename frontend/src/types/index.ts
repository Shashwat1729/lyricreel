export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export type ThemeName = 'neon' | 'anime' | 'sad' | 'synthwave' | 'minimalist' | 'cinematic';

export type JobStatus = 'pending' | 'queued' | 'downloading' | 'transcribing' | 'rendering' | 'complete' | 'error' | 'cancelled';

export interface SongMetadata {
  title?: string;
  track?: string;
  artist?: string;
  duration?: number;
  thumbnail?: string;
}

export interface Job {
  id: string;
  kind: 'youtube' | 'transcribe' | 'render';
  status: JobStatus;
  progress: number;
  message?: string;
  error?: string;
  filename?: string;
  outputFile?: string;
  videoId?: string;
  position?: number;
  metadata?: SongMetadata;
  transcript?: {
    word_segments: WordTimestamp[];
    source?: string;
    language?: string;
    lyricsMetadata?: { title: string; artist: string };
  };
}

export interface UploadResult {
  fileId: string;
  filename: string;
  originalName: string;
  size: number;
  duration?: number;
}

export interface YouTubeInfo extends SongMetadata {
  videoId: string;
}

export type AudioQuality = 'fast' | 'balanced' | 'best';
