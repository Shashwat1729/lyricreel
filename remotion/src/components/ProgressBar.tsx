import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ThemeConfig } from '../types';

interface Props {
  progress: number;
  theme: ThemeConfig;
}

export const ProgressBar: React.FC<Props> = ({ progress, theme }) => {
  const pct = Math.min(1, Math.max(0, progress)) * 100;
  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', bottom: 160, left: 100, right: 100, height: 6, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', backgroundColor: theme.accentColor, borderRadius: 3, boxShadow: `0 0 12px ${theme.glowColor}` }} />
      </div>
    </AbsoluteFill>
  );
};
