import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThemeConfig } from '../types';

interface Props {
  title?: string | null;
  artist?: string | null;
  theme: ThemeConfig;
}

/** Song title and artist near the top of the frame (inside the Shorts/Reels safe area). */
export const TitleCard: React.FC<Props> = ({ title, artist, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  if (!title && !artist) return null;
  const intro = interpolate(frame, [0, fps * 0.8], [0, 1], { extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 220, opacity: intro }}>
      {title ? (
        <div style={{ fontFamily: theme.fontFamily, fontWeight: 700, fontSize: 44, color: theme.textColor, textAlign: 'center', padding: '0 100px', lineHeight: 1.2 }}>
          {title}
        </div>
      ) : null}
      {artist ? (
        <div style={{ fontFamily: theme.fontFamily, fontSize: 32, color: theme.accentColor, marginTop: 12, letterSpacing: 2, textTransform: 'uppercase' }}>
          {artist}
        </div>
      ) : null}
    </AbsoluteFill>
  );
};
