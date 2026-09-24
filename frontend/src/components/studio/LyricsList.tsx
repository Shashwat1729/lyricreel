'use client';

import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { usePlaybackTime } from '@/hooks/usePlaybackTime';
import { activeLineIndex, formatTime, groupWordsIntoLines } from '@/lib/lyrics';
import type { WordTimestamp } from '@/types';

interface Props {
  audioRef: RefObject<HTMLAudioElement>;
  words: WordTimestamp[];
  source?: string;
}

const SOURCE_LABEL: Record<string, string> = {
  lrclib: 'synced by LRCLIB',
  'lrclib+whisperx': 'LRCLIB + WhisperX timing',
  whisperx: 'transcribed by WhisperX',
};

export function LyricsList({ audioRef, words, source }: Props) {
  const time = usePlaybackTime(audioRef);
  const lines = useMemo(() => groupWordsIntoLines(words), [words]);
  const idx = activeLineIndex(lines, time);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-line="${idx}"]`);
    if (!list || !el) return;
    const top = el.offsetTop - list.clientHeight / 2 + el.clientHeight / 2;
    list.scrollTo({ top, behavior: 'smooth' });
  }, [idx]);

  const seek = (t: number) => {
    const el = audioRef.current;
    if (!el) return;
    el.currentTime = Math.max(0, t - 0.2);
    el.play().catch(() => undefined);
  };

  return (
    <div className="card flex min-h-0 flex-1 flex-col p-2">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5">
        <h2 className="text-[15px] font-semibold">Lyrics</h2>
        <span className="truncate font-mono text-xs text-muted">
          {words.length} words{source && SOURCE_LABEL[source] ? ` · ${SOURCE_LABEL[source]}` : ''}
        </span>
      </div>
      <div ref={listRef} className="relative min-h-[240px] flex-1 overflow-y-auto overscroll-contain pb-2 lg:min-h-0">
        {lines.map((line, i) => (
          <button
            key={`${i}-${line.start}`}
            data-line={i}
            type="button"
            onClick={() => seek(line.start)}
            className={`flex w-full items-baseline gap-4 rounded-[10px] px-3 py-2.5 text-left text-[15px] transition-colors ${
              i === idx ? 'bg-accent-soft text-fg' : i < idx ? 'text-muted hover:bg-raised' : 'text-soft hover:bg-raised'
            }`}
          >
            <span className="w-11 shrink-0 font-mono text-xs text-muted">{formatTime(line.start)}</span>
            <span>{line.words.map((w) => w.word).join(' ')}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
