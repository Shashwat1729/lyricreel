import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, Img } from 'remotion';
import { ThemeConfig } from '../types';
import { interpolate } from '../utils';

interface Props {
  theme: ThemeConfig;
  backgroundUrl?: string | null;
}

export const Background: React.FC<Props> = ({ theme, backgroundUrl }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Slow zoom for cinematic feel
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.05]);

  return (
    <AbsoluteFill>
      {backgroundUrl ? (
        <div style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
          <Img
            src={backgroundUrl}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: `scale(${scale})`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.6)',
            }}
          />
        </div>
      ) : (
        <div
          style={{
            width: '100%',
            height: '100%',
            background: theme.backgroundGradient,
            transform: `scale(${scale})`,
          }}
        />
      )}
    </AbsoluteFill>
  );
};
