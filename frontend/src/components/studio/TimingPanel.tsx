'use client';

import { useEffect, useState, type RefObject } from 'react';
import { formatTime, parseTime } from '@/lib/lyrics';

interface Props {
  audioRef: RefObject<HTMLAudioElement>;
  offset: number;
  onOffset: (v: number) => void;
  duration: number;
  clip: { enabled: boolean; start: number; end: number };
  onClip: (c: { enabled: boolean; start: number; end: number }) => void;
}

function TimeField({ id, label, value, onCommit, onUseCurrent }: { id: string; label: string; value: number; onCommit: (v: number) => void; onUseCurrent: () => void }) {
  const [text, setText] = useState(formatTime(value));
  useEffect(() => setText(formatTime(value)), [value]);
  const commit = () => {
    const v = parseTime(text);
    if (v === null) setText(formatTime(value));
    else onCommit(v);
  };
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-semibold text-muted">{label}</label>
      <div className="flex gap-1.5">
        <input
          id={id}
          value={text}
          inputMode="decimal"
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }}
          className="field h-10 min-w-0 flex-1 px-3 font-mono text-sm"
        />
        <button type="button" onClick={onUseCurrent} className="h-10 shrink-0 rounded-lg border border-line-strong px-2.5 text-xs text-soft hover:bg-raised" title="Use the current playback position">
          Now
        </button>
      </div>
    </div>
  );
}

export function TimingPanel({ audioRef, offset, onOffset, duration, clip, onClip }: Props) {
  const current = () => audioRef.current?.currentTime ?? 0;
  const length = clip.end - clip.start;

  return (
    <div className="card flex flex-col gap-5 p-5">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <label htmlFor="offset" className="text-[15px] font-semibold">Timing offset</label>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[13px] text-accent">{offset > 0 ? '+' : ''}{offset.toFixed(2)} s</span>
            {offset !== 0 && (
              <button type="button" onClick={() => onOffset(0)} className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline">Reset</button>
            )}
          </div>
        </div>
        <input id="offset" type="range" min={-3} max={3} step={0.05} value={offset} onChange={(e) => onOffset(Number(e.target.value))} className="w-full" />
        <p className="text-[13px] leading-relaxed text-muted">Lyrics showing up early? Slide right. Late? Slide left. The preview updates live.</p>
      </div>

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <div className="flex items-center justify-between">
          <span className="text-[15px] font-semibold" id="clip-label">Length</span>
          <div className="flex rounded-lg border border-line-strong p-0.5 text-[13px]" role="radiogroup" aria-labelledby="clip-label">
            <button type="button" role="radio" aria-checked={!clip.enabled} onClick={() => onClip({ ...clip, enabled: false })} className={`rounded-md px-3 py-1.5 ${!clip.enabled ? 'bg-raised text-fg' : 'text-muted'}`}>Full song</button>
            <button
              type="button"
              role="radio"
              aria-checked={clip.enabled}
              onClick={() => onClip({ enabled: true, start: clip.start, end: clip.end > clip.start ? clip.end : Math.min(duration, clip.start + 60) })}
              className={`rounded-md px-3 py-1.5 ${clip.enabled ? 'bg-raised text-fg' : 'text-muted'}`}
            >
              Clip
            </button>
          </div>
        </div>
        {clip.enabled ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <TimeField id="clip-start" label="Start" value={clip.start} onCommit={(v) => onClip({ ...clip, start: Math.min(v, Math.max(0, clip.end - 1)) })} onUseCurrent={() => onClip({ ...clip, start: Math.min(current(), Math.max(0, clip.end - 1)) })} />
              <TimeField id="clip-end" label="End" value={clip.end} onCommit={(v) => onClip({ ...clip, end: Math.min(duration, Math.max(v, clip.start + 1)) })} onUseCurrent={() => onClip({ ...clip, end: Math.min(duration, Math.max(current(), clip.start + 1)) })} />
            </div>
            <p className={`text-[13px] ${length > 180 ? 'text-danger' : 'text-muted'}`}>
              {formatTime(length)} long{length > 180 ? ' · longer than a YouTube Short (3 min)' : length > 90 ? ' · fits Shorts, too long for most Reels (90 s)' : ' · fits Shorts, Reels and TikTok'}
            </p>
          </>
        ) : (
          <p className="text-[13px] text-muted">The whole song, {formatTime(duration)}. Pick a clip to keep it short for Reels (90 s) or Shorts (3 min).</p>
        )}
      </div>
    </div>
  );
}
