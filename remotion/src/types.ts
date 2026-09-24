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
  fontWeight: number;
  uppercase?: boolean;
  particleColor: string;
}

// `type` (not interface) so it satisfies Remotion's Record<string, unknown> props constraint
export type LyricVideoProps = {
  audioSrc: string;
  words: WordTimestamp[];
  theme: ThemeName;
  title?: string | null;
  artist?: string | null;
  /** Seconds into the song where the video starts */
  clipStart?: number;
  durationInSeconds: number;
};
