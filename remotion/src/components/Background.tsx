import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThemeConfig } from '../types';

interface Props {
  theme: ThemeConfig;
}

export const Background: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Slow drift keeps static backgrounds from looking frozen
  const scale = interpolate(frame, [0, Math.max(1, durationInFrames)], [1, 1.08]);
  const drift = Math.sin(frame / 90) * 20;

  return (
    <AbsoluteFill style={{ overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: -40, background: theme.backgroundGradient, transform: `scale(${scale}) translateY(${drift}px)` }} />
    </AbsoluteFill>
  );
};
