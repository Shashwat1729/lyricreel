import type { ThemeName } from '@/types';

export interface VideoTheme {
  id: ThemeName;
  label: string;
  mood: string;
  accent: string;
  text: string;
  dimmed: string;
  background: string;
  fontFamily: string;
  fontWeight: number;
  uppercase?: boolean;
}

/** Mirrors remotion/src/themes.ts so the preview matches the rendered video. */
export const THEMES: VideoTheme[] = [
  { id: 'neon', label: 'Neon', mood: 'Club, pop, EDM', accent: '#00FFAA', text: '#FFFFFF', dimmed: 'rgba(255,255,255,0.3)', background: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0f 70%)', fontFamily: "Arial, 'Helvetica Neue', sans-serif", fontWeight: 800 },
  { id: 'anime', label: 'Anime', mood: 'J-pop, upbeat', accent: '#FF6B9D', text: '#FFFFFF', dimmed: 'rgba(255,255,255,0.3)', background: 'radial-gradient(ellipse at center, #2d0a4e 0%, #1a0525 70%)', fontFamily: 'Georgia, serif', fontWeight: 700 },
  { id: 'sad', label: 'Sad', mood: 'Ballads, lo-fi', accent: '#74B9FF', text: '#C8D6E5', dimmed: 'rgba(200,214,229,0.3)', background: 'radial-gradient(ellipse at center, #152238 0%, #0a1628 70%)', fontFamily: "'Times New Roman', serif", fontWeight: 600 },
  { id: 'synthwave', label: 'Synthwave', mood: 'Retro, 80s', accent: '#FF6EC7', text: '#FFFFFF', dimmed: 'rgba(255,255,255,0.3)', background: 'linear-gradient(180deg, #2d1b69 0%, #0f0728 50%, #1a0a3e 100%)', fontFamily: "'Arial Black', Arial, sans-serif", fontWeight: 900, uppercase: true },
  { id: 'minimalist', label: 'Minimal', mood: 'Acoustic, indie', accent: '#FFFFFF', text: '#FFFFFF', dimmed: 'rgba(255,255,255,0.25)', background: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", fontWeight: 500 },
  { id: 'cinematic', label: 'Cinematic', mood: 'Film, orchestral', accent: '#FFD700', text: '#F5F5DC', dimmed: 'rgba(245,245,220,0.3)', background: 'radial-gradient(ellipse at center, #1a1a1a 0%, #0d0d0d 70%)', fontFamily: 'Georgia, serif', fontWeight: 600 },
];

export function getTheme(id: string): VideoTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
