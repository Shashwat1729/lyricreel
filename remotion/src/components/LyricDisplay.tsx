import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate as remotionInterpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThemeConfig, WordTimestamp } from '../types';
import { groupWordsIntoLines, getActiveLineIndex, LyricLine } from '../utils';

interface Props {
  words: WordTimestamp[];
  currentTime: number;
  theme: ThemeConfig;
}

export const LyricDisplay: React.FC<Props> = ({ words, currentTime, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = useMemo(() => groupWordsIntoLines(words), [words]);
  const activeLineIdx = getActiveLineIndex(lines, currentTime);

  // Show current line and surrounding
  const visibleLines = lines.slice(
    Math.max(0, activeLineIdx - 1),
    activeLineIdx + 2
  );

  return (
    <AbsoluteFill
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 60px',
      }}
    >
      {visibleLines.map((line, lineIdx) => {
        const globalIdx = Math.max(0, activeLineIdx - 1) + lineIdx;
        const isActiveLine = globalIdx === activeLineIdx;
        const isPastLine = globalIdx < activeLineIdx;

        // Animate line entrance using spring
        const lineEntryFrame = Math.round(line.start * fps);
        const lineProgress = spring({
          frame: frame - lineEntryFrame,
          fps,
          config: { damping: 20, stiffness: 100, mass: 0.5 },
        });

        const lineOpacity = isActiveLine ? 1 : isPastLine ? 0.3 : 0.5 * lineProgress;
        const lineTranslateY = isActiveLine ? 0 : isPastLine ? -10 : remotionInterpolate(lineProgress, [0, 1], [20, 0]);

        return (
          <div
            key={globalIdx}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: '12px',
              marginBottom: '40px',
              opacity: lineOpacity,
              transform: `translateY(${lineTranslateY}px)`,
            }}
          >
            {line.words.map((word, wordIdx) => {
              const wordStartFrame = Math.round(word.start * fps);
              const wordEndFrame = Math.round(word.end * fps);

              // Is word currently being spoken?
              const active = frame >= wordStartFrame && frame <= wordEndFrame;
              // Has word been spoken?
              const past = frame > wordEndFrame;
              const future = !active && !past;

              // Smooth scale animation using spring when word becomes active
              const scaleSpring = active
                ? spring({
                    frame: frame - wordStartFrame,
                    fps,
                    config: { damping: 12, stiffness: 200, mass: 0.3 },
                  })
                : past
                ? 1
                : 0;

              const scale = remotionInterpolate(
                active ? scaleSpring : 1,
                [0, 1],
                [1.0, 1.15]
              );

              // Glow intensity animation
              const glowIntensity = active
                ? remotionInterpolate(
                    Math.sin((frame - wordStartFrame) * 0.3),
                    [-1, 1],
                    [0.6, 1.0]
                  )
                : 0;

              const color = active
                ? theme.accentColor
                : past
                ? theme.dimmedColor
                : theme.textColor;

              const textShadow = active
                ? `0 0 ${20 * glowIntensity}px ${theme.glowColor}, 0 0 ${40 * glowIntensity}px ${theme.glowColor}80`
                : 'none';

              // Word entrance opacity (fade in when line appears)
              const entranceProgress = spring({
                frame: frame - wordStartFrame + fps * 0.5, // appear slightly before being spoken
                fps,
                config: { damping: 20, stiffness: 80 },
              });

              const opacity = active
                ? 1
                : past
                ? 0.7
                : future && isActiveLine
                ? remotionInterpolate(entranceProgress, [0, 1], [0.3, 0.6])
                : 0.2;

              return (
                <span
                  key={wordIdx}
                  style={{
                    fontFamily: theme.fontFamily,
                    fontSize: theme.fontSize,
                    fontWeight: active ? 800 : 600,
                    color,
                    textShadow,
                    transform: `scale(${active ? scale : 1})`,
                    opacity,
                    display: 'inline-block',
                  }}
                >
                  {word.word}
                </span>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
