'use client';

import { useMemo, type RefObject } from 'react';
import { usePlaybackTime } from '@/hooks/usePlaybackTime';
import { activeLineIndex, groupWordsIntoLines } from '@/lib/lyrics';
import type { VideoTheme } from '@/lib/themes';
import type { WordTimestamp } from '@/types';

interface Props {
  audioRef: RefObject<HTMLAudioElement>;
  words: WordTimestamp[];
  theme: VideoTheme;
  title?: string;
  artist?: string;
  clipStart: number;
  clipEnd: number;
}

/** A scaled-down, live version of the rendered 9:16 frame. */
export function LyricPreview({ audioRef, words, theme, title, artist, clipStart, clipEnd }: Props) {
  const time = usePlaybackTime(audioRef);
  const lines = useMemo(() => groupWordsIntoLines(words), [words]);

  let idx = activeLineIndex(lines, time);
  if (idx === -1 && lines.length && lines[0].start - time <= 1.5) idx = 0;
  const active = idx >= 0 ? lines[idx] : null;
  const next = lines[idx + 1];
  const inGap = active && time - active.end > 2.5 && (!next || next.start - time > 1);
  const show = active && !inGap;
  const progress = clipEnd > clipStart ? Math.min(1, Math.max(0, (time - clipStart) / (clipEnd - clipStart))) : 0;
  const outsideClip = time < clipStart - 0.05 || time > clipEnd + 0.05;
  const t = (s: string) => (theme.uppercase ? s.toUpperCase() : s);

  return (
    <div
      className="relative aspect-[9/16] w-full overflow-hidden rounded-[26px] border border-line-strong [container-type:inline-size]"
      style={{ background: theme.background, fontFamily: theme.fontFamily }}
      role="img"
      aria-label={`Video preview in the ${theme.label} theme${active ? `: ${active.words.map((w) => w.word).join(' ')}` : ''}`}
    >
      <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)' }} />

      {(title || artist) && (
        <div className="absolute inset-x-0 top-[11%] px-[9%] text-center">
          {title && <div className="truncate text-[clamp(11px,3.6cqw,18px)] font-bold" style={{ color: theme.text }}>{title}</div>}
          {artist && <div className="mt-1 truncate text-[clamp(9px,2.6cqw,13px)] uppercase tracking-[0.12em]" style={{ color: theme.accent }}>{artist}</div>}
        </div>
      )}

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-[5%] px-[7%] text-center">
        {show &&
          [idx - 1, idx, idx + 1]
            .filter((i) => i >= 0 && i < lines.length)
            .map((i) => {
              const line = lines[i];
              const role = i === idx ? 'active' : i < idx ? 'past' : 'next';
              return (
                <p
                  key={`${i}-${line.start}`}
                  className="m-0 flex flex-wrap justify-center gap-x-[0.34em] leading-[1.2] transition-opacity duration-200"
                  style={{
                    fontWeight: theme.fontWeight,
                    fontSize: role === 'active' ? 'clamp(15px, 6.6cqw, 34px)' : 'clamp(11px, 4.8cqw, 24px)',
                    opacity: role === 'active' ? 1 : role === 'past' ? 0.28 : 0.45,
                    color: theme.text,
                  }}
                >
                  {line.words.map((w, j) => {
                    if (role !== 'active') return <span key={j}>{t(w.word)}</span>;
                    const fill = Math.min(1, Math.max(0, (time - w.start) / Math.max(0.05, w.end - w.start)));
                    if (fill <= 0) return <span key={j} style={{ color: theme.dimmed }}>{t(w.word)}</span>;
                    const singing = time <= w.end + 0.08;
                    return (
                      <span
                        key={j}
                        style={{
                          color: 'transparent',
                          backgroundImage: `linear-gradient(90deg, ${theme.accent} ${fill * 100}%, ${theme.dimmed} ${fill * 100}%)`,
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                          display: 'inline-block',
                          transform: singing ? 'scale(1.06)' : undefined,
                          filter: singing ? `drop-shadow(0 0 10px ${theme.accent}99)` : undefined,
                        }}
                      >
                        {t(w.word)}
                      </span>
                    );
                  })}
                </p>
              );
            })}
      </div>

      <div className="absolute bottom-[8.3%] left-[9%] right-[9%] h-[3px] overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: theme.accent }} />
      </div>

      <span className="absolute left-3 top-3 rounded-lg bg-black/50 px-2 py-1 font-mono text-[11px] text-white/80">
        {outsideClip ? 'Outside clip' : 'Preview · 9:16'}
      </span>
    </div>
  );
}
