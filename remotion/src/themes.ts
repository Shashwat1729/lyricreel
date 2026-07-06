import { ThemeConfig, ThemeName } from './types';

const themes: Record<ThemeName, ThemeConfig> = {
  neon: {
    name: 'neon',
    backgroundColor: '#0a0a0f',
    backgroundGradient: 'radial-gradient(ellipse at center, #1a0a2e 0%, #0a0a0f 70%)',
    textColor: '#ffffff',
    accentColor: '#00ffaa',
    glowColor: '#00ffaa',
    dimmedColor: 'rgba(255,255,255,0.3)',
    fontFamily: "'Arial', sans-serif",
    fontSize: 64,
    particleColor: '#00ffaa',
  },
  anime: {
    name: 'anime',
    backgroundColor: '#1a0525',
    backgroundGradient: 'radial-gradient(ellipse at center, #2d0a4e 0%, #1a0525 70%)',
    textColor: '#ffffff',
    accentColor: '#ff6b9d',
    glowColor: '#ff6b9d',
    dimmedColor: 'rgba(255,255,255,0.3)',
    fontFamily: "'Georgia', serif",
    fontSize: 60,
    particleColor: '#ff6b9d',
  },
  sad: {
    name: 'sad',
    backgroundColor: '#0a1628',
    backgroundGradient: 'radial-gradient(ellipse at center, #152238 0%, #0a1628 70%)',
    textColor: '#c8d6e5',
    accentColor: '#74b9ff',
    glowColor: '#74b9ff',
    dimmedColor: 'rgba(200,214,229,0.3)',
    fontFamily: "'Times New Roman', serif",
    fontSize: 58,
    particleColor: '#74b9ff',
  },
  synthwave: {
    name: 'synthwave',
    backgroundColor: '#0f0728',
    backgroundGradient: 'linear-gradient(180deg, #2d1b69 0%, #0f0728 50%, #1a0a3e 100%)',
    textColor: '#ffffff',
    accentColor: '#ff6ec7',
    glowColor: '#ff6ec7',
    dimmedColor: 'rgba(255,255,255,0.3)',
    fontFamily: "'Arial Black', sans-serif",
    fontSize: 62,
    particleColor: '#f39c12',
  },
  minimalist: {
    name: 'minimalist',
    backgroundColor: '#000000',
    backgroundGradient: 'linear-gradient(180deg, #0a0a0a 0%, #000000 100%)',
    textColor: '#ffffff',
    accentColor: '#ffffff',
    glowColor: '#ffffff',
    dimmedColor: 'rgba(255,255,255,0.25)',
    fontFamily: "'Helvetica Neue', sans-serif",
    fontSize: 56,
    particleColor: 'rgba(255,255,255,0.5)',
  },
  cinematic: {
    name: 'cinematic',
    backgroundColor: '#0d0d0d',
    backgroundGradient: 'radial-gradient(ellipse at center, #1a1a1a 0%, #0d0d0d 70%)',
    textColor: '#f5f5dc',
    accentColor: '#ffd700',
    glowColor: '#ffd700',
    dimmedColor: 'rgba(245,245,220,0.3)',
    fontFamily: "'Georgia', serif",
    fontSize: 58,
    particleColor: '#ffd700',
  },
};

export function getTheme(name: ThemeName): ThemeConfig {
  return themes[name] || themes.neon;
}

export default themes;
