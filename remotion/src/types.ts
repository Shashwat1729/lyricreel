export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export type ThemeName = 'neon' | 'anime' | 'sad' | 'synthwave' | 'minimalist' | 'cinematic';

export interface ThemeConfig {
  name: ThemeName;
  backgroundColor: string;
  backgroundGradient: string;
  textColor: string;
  accentColor: string;
  glowColor: string;
  dimmedColor: string;
  fontFamily: string;
  fontSize: number;
  particleColor: string;
}

export interface LyricVideoProps {
  audioSrc: string;
  words: WordTimestamp[];
  theme: ThemeName;
  backgroundUrl?: string | null;
  durationInSeconds: number;
}
