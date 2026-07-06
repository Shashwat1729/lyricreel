export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface UploadResult {
  fileId: string;
  filename: string;
  originalName: string;
  size: number;
}

export interface JobStatus {
  id: string;
  status: 'pending' | 'transcribing' | 'rendering' | 'complete' | 'error';
  progress: number;
  error?: string;
  outputFile?: string;
  transcript?: {
    segments: any[];
    word_segments: WordTimestamp[];
    language: string;
  };
}

export type ThemeName = 'neon' | 'anime' | 'sad' | 'synthwave' | 'minimalist' | 'cinematic';
