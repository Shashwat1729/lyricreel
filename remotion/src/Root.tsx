import React from 'react';
import { Composition } from 'remotion';
import { LyricVideo } from './compositions/LyricVideo';
import { LyricVideoProps } from './types';

const defaultProps: LyricVideoProps = {
  audioSrc: '',
  words: [
    { word: 'Hello', start: 0.5, end: 0.9 },
    { word: 'world', start: 1.0, end: 1.4 },
    { word: 'this', start: 1.6, end: 1.9 },
    { word: 'is', start: 2.0, end: 2.2 },
    { word: 'a', start: 2.3, end: 2.4 },
    { word: 'test', start: 2.5, end: 2.9 },
    { word: 'of', start: 3.1, end: 3.3 },
    { word: 'the', start: 3.4, end: 3.5 },
    { word: 'lyric', start: 3.6, end: 4.0 },
    { word: 'video', start: 4.1, end: 4.5 },
    { word: 'generator', start: 4.6, end: 5.2 },
  ],
  theme: 'neon',
  backgroundUrl: null,
  durationInSeconds: 10,
};

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="LyricVideo"
        component={LyricVideo}
        durationInFrames={300}
        fps={24}
        width={1080}
        height={1920}
        defaultProps={defaultProps}
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.ceil(props.durationInSeconds * 24),
        })}
      />
    </>
  );
};
