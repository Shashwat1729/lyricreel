import React from 'react';
import { AbsoluteFill, Audio, useCurrentFrame, useVideoConfig } from 'remotion';
import { LyricVideoProps } from '../types';
import { getTheme } from '../themes';
import { Background } from '../components/Background';
import { Particles } from '../components/Particles';
import { LyricDisplay } from '../components/LyricDisplay';
import { ProgressBar } from '../components/ProgressBar';
import { Vignette } from '../components/Vignette';

export const LyricVideo: React.FC<LyricVideoProps> = ({
  audioSrc,
  words,
  theme: themeName,
  backgroundUrl,
  durationInSeconds,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTime = frame / fps;
  const themeConfig = getTheme(themeName);

  return (
    <AbsoluteFill>
      <Background theme={themeConfig} backgroundUrl={backgroundUrl} />
      <Particles theme={themeConfig} />
      <LyricDisplay words={words} currentTime={currentTime} theme={themeConfig} />
      <ProgressBar currentTime={currentTime} duration={durationInSeconds} theme={themeConfig} />
      <Vignette />
      {audioSrc && <Audio src={audioSrc} />}
    </AbsoluteFill>
  );
};
