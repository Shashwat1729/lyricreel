'use client';

import { Pause, Play } from 'lucide-react';
import { useEffect, useState, type RefObject } from 'react';
import { usePlaybackTime } from '@/hooks/usePlaybackTime';
import { formatTime } from '@/lib/lyrics';

interface Props {
  audioRef: RefObject<HTMLAudioElement>;
  title: string;
  artist?: string;
  duration: number;
  clipStart: number;
  clipEnd: number;
}

export function PlayerBar({ audioRef, title, artist, duration, clipStart, clipEnd }: Props) {
  const time = usePlaybackTime(audioRef);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const on = () => setPlaying(true);
    const off = () => setPlaying(false);
    el.addEventListener('play', on);
    el.addEventListener('pause', off);
    el.addEventListener('ended', off);
    setPlaying(!el.paused);
    return () => {
      el.removeEventListener('play', on);
      el.removeEventListener('pause', off);
      el.removeEventListener('ended', off);
    };
  }, [audioRef]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => undefined);
    else el.pause();
  };

  const total = duration || 0;
  const pct = (v: number) => (total ? (v / total) * 100 : 0);

  return (
    <div className="card flex items-center gap-4 p-4">
      <button type="button" onClick={toggle} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-fg text-ink transition-transform hover:scale-105" aria-label={playing ? 'Pause' : 'Play'}>
        {playing ? <Pause className="h-5 w-5" fill="currentColor" /> : <Play className="ml-0.5 h-5 w-5" fill="currentColor" />}
      </button>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate font-semibold">{title}</span>
          {artist && <span className="shrink-0 truncate text-sm text-muted">{artist}</span>}
        </div>
        <div className="relative h-1.5">
          <div className="absolute inset-0 rounded-full bg-line-strong" />
          {(clipStart > 0 || clipEnd < total) && (
            <div className="absolute inset-y-0 rounded-full bg-accent/25" style={{ left: `${pct(clipStart)}%`, width: `${pct(clipEnd - clipStart)}%` }} />
          )}
          <div className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${pct(time)}%` }} />
          <input
            type="range"
            min={0}
            max={total || 1}
            step={0.1}
            value={Math.min(time, total || 1)}
            onChange={(e) => { if (audioRef.current) audioRef.current.currentTime = Number(e.target.value); }}
            className="absolute -inset-y-2 inset-x-0 h-[calc(100%+16px)] w-full cursor-pointer opacity-0"
            aria-label="Seek"
            aria-valuetext={formatTime(time)}
          />
        </div>
        <div className="flex justify-between font-mono text-xs text-muted">
          <span>{formatTime(time)}</span>
          <span>{formatTime(total)}</span>
        </div>
      </div>
    </div>
  );
}
