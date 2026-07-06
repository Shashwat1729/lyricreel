import React from 'react';
import { AbsoluteFill } from 'remotion';
import { ThemeConfig } from '../types';

interface Props {
  currentTime: number;
  duration: number;
  theme: ThemeConfig;
}

export const ProgressBar: React.FC<Props> = ({ currentTime, duration, theme }) => {
  const progress = Math.min(currentTime / duration, 1);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: 60,
          right: 60,
          height: 4,
          backgroundColor: 'rgba(255,255,255,0.15)',
          borderRadius: 2,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: '100%',
            backgroundColor: theme.accentColor,
            borderRadius: 2,
            boxShadow: `0 0 10px ${theme.glowColor}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};
