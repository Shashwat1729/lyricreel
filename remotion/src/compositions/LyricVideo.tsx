import React from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { LyricVideoProps } from '../types';
import { getTheme } from '../themes';
import { Background } from '../components/Background';
import { Particles } from '../components/Particles';
import { LyricDisplay } from '../components/LyricDisplay';
import { ProgressBar } from '../components/ProgressBar';
import { TitleCard } from '../components/TitleCard';
import { Vignette } from '../components/Vignette';

export const LyricVideo: React.FC<LyricVideoProps> = ({
  audioSrc,
  words,
  theme: themeName,
  title,
  artist,
  clipStart = 0,
  durationInSeconds,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const elapsed = frame / fps;
  const currentTime = clipStart + elapsed;
  const theme = getTheme(themeName);

  return (
    <AbsoluteFill style={{ backgroundColor: theme.backgroundColor }}>
      <Background theme={theme} />
      <Particles theme={theme} />
      <TitleCard title={title} artist={artist} theme={theme} />
      <LyricDisplay words={words} currentTime={currentTime} clipStart={clipStart} theme={theme} />
      <ProgressBar progress={elapsed / Math.max(0.001, durationInSeconds)} theme={theme} />
      <Vignette />
      {audioSrc ? <Audio src={audioSrc} trimBefore={Math.round(clipStart * fps)} /> : null}
    </AbsoluteFill>
  );
};
