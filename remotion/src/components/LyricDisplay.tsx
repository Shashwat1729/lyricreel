import React, { useMemo } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThemeConfig, WordTimestamp } from '../types';
import { clamp, getActiveLineIndex, groupWordsIntoLines } from '../utils';

interface Props {
  words: WordTimestamp[];
  currentTime: number;
  clipStart: number;
  theme: ThemeConfig;
}

/** How long a line lingers after it ends before fading out during an instrumental gap */
const LINGER = 2.5;

export const LyricDisplay: React.FC<Props> = ({ words, currentTime, clipStart, theme }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const lines = useMemo(() => groupWordsIntoLines(words), [words]);

  let activeIdx = getActiveLineIndex(lines, currentTime);
  const next = lines[activeIdx + 1];

  // Before the first line: preview it shortly before it starts
  if (activeIdx === -1) {
    if (!lines.length || lines[0].start - currentTime > 1.5) return null;
    activeIdx = 0;
  }

  const active = lines[activeIdx];
  // During long gaps, fade the finished line out and fade the next one in
  const sinceEnd = currentTime - active.end;
  const untilNext = next ? next.start - currentTime : Infinity;
  const gapFade = sinceEnd > LINGER && untilNext > 1 ? clamp(1 - (sinceEnd - LINGER) / 0.6, 0, 1) : 1;
  if (gapFade === 0) return null;

  const lineIntro = spring({
    frame: frame - Math.round((active.start - clipStart) * fps),
    fps,
    config: { damping: 18, stiffness: 120, mass: 0.6 },
  });

  const visible = [activeIdx - 1, activeIdx, activeIdx + 1].filter((i) => i >= 0 && i < lines.length);

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        padding: '0 80px',
        gap: 36,
        opacity: gapFade,
        transform: `translateY(${interpolate(lineIntro, [0, 1], [40, 0])}px)`,
      }}
    >
      {visible.map((lineIdx) => {
        const line = lines[lineIdx];
        const role = lineIdx === activeIdx ? 'active' : lineIdx < activeIdx ? 'past' : 'next';
        const size = role === 'active' ? theme.fontSize : Math.round(theme.fontSize * 0.72);

        return (
          <div
            key={lineIdx}
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              columnGap: size * 0.34,
              rowGap: 4,
              maxWidth: '100%',
              opacity: role === 'active' ? 1 : role === 'past' ? 0.28 : 0.45 * lineIntro,
              textAlign: 'center',
            }}
          >
            {line.words.map((word, wordIdx) => {
              const text = theme.uppercase ? word.word.toUpperCase() : word.word;
              const base: React.CSSProperties = {
                fontFamily: theme.fontFamily,
                fontSize: size,
                fontWeight: theme.fontWeight,
                lineHeight: 1.2,
                display: 'inline-block',
                whiteSpace: 'nowrap',
              };

              if (role !== 'active') {
                return <span key={wordIdx} style={{ ...base, color: theme.textColor }}>{text}</span>;
              }

              const duration = Math.max(0.05, word.end - word.start);
              const fill = clamp((currentTime - word.start) / duration, 0, 1);
              const singing = currentTime >= word.start && currentTime <= word.end + 0.08;
              const pop = singing
                ? spring({ frame: frame - Math.round((word.start - clipStart) * fps), fps, config: { damping: 12, stiffness: 220, mass: 0.35 } })
                : 0;
              const scale = singing ? interpolate(pop, [0, 1], [1, 1.08]) : 1;

              if (fill <= 0) {
                return <span key={wordIdx} style={{ ...base, color: theme.dimmedColor }}>{text}</span>;
              }

              // Karaoke wipe: accent colour sweeps across the word while it is sung
              return (
                <span
                  key={wordIdx}
                  style={{
                    ...base,
                    color: 'transparent',
                    backgroundImage: `linear-gradient(90deg, ${theme.accentColor} ${fill * 100}%, ${theme.dimmedColor} ${fill * 100}%)`,
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    transform: `scale(${scale})`,
                    filter: singing ? `drop-shadow(0 0 ${18 * pop}px ${theme.glowColor}aa)` : 'none',
                  }}
                >
                  {text}
                </span>
              );
            })}
          </div>
        );
      })}
    </AbsoluteFill>
  );
};
