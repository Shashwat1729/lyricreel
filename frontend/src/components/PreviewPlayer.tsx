'use client';

import { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

interface Props {
  words: WordTimestamp[];
  theme: string;
  autoPlay?: boolean;
}

const themeColors: Record<string, { accent: string; glow: string; bg: string }> = {
  neon: { accent: '#00ffaa', glow: '#00ffaa', bg: '#0a0a0f' },
  anime: { accent: '#ff6b9d', glow: '#ff6b9d', bg: '#1a0525' },
  sad: { accent: '#74b9ff', glow: '#74b9ff', bg: '#0a1628' },
  synthwave: { accent: '#ff6ec7', glow: '#ff6ec7', bg: '#0f0728' },
  minimalist: { accent: '#ffffff', glow: '#ffffff', bg: '#000000' },
  cinematic: { accent: '#ffd700', glow: '#ffd700', bg: '#0d0d0d' },
};

export function PreviewPlayer({ words, theme, autoPlay = false }: Props) {
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [currentTime, setCurrentTime] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const colors = themeColors[theme] || themeColors.neon;
  const duration = words.length > 0 ? words[words.length - 1].end + 1 : 10;

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((t) => {
          if (t >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return t + 0.05;
        });
      }, 50);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, duration]);

  // Group words into lines
  const lines: WordTimestamp[][] = [];
  let currentLine: WordTimestamp[] = [];
  for (let i = 0; i < words.length; i++) {
    currentLine.push(words[i]);
    const next = words[i + 1];
    if (!next || currentLine.length >= 6 || (next && next.start - words[i].end > 0.5)) {
      lines.push([...currentLine]);
      currentLine = [];
    }
  }

  const activeLineIdx = lines.findIndex(
    (line) => currentTime >= line[0].start - 0.1 && currentTime <= line[line.length - 1].end + 0.3
  );

  return (
    <div className="glass p-6 rounded-2xl overflow-hidden" style={{ background: colors.bg }}>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-white/40 uppercase tracking-wider">Live Preview</span>
        <button
          onClick={() => { setIsPlaying(!isPlaying); if (!isPlaying && currentTime >= duration) setCurrentTime(0); }}
          className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
        </button>
      </div>

      {/* Lyrics display */}
      <div className="min-h-[120px] flex flex-col items-center justify-center gap-3">
        {lines.slice(Math.max(0, activeLineIdx - 1), activeLineIdx + 2).map((line, li) => {
          const globalIdx = Math.max(0, activeLineIdx - 1) + li;
          const isActive = globalIdx === activeLineIdx;

          return (
            <div key={globalIdx} className="flex flex-wrap justify-center gap-2" style={{ opacity: isActive ? 1 : 0.3 }}>
              {line.map((word, wi) => {
                const active = currentTime >= word.start && currentTime <= word.end;
                const past = currentTime > word.end;

                return (
                  <span
                    key={wi}
                    className="transition-all duration-150"
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: active ? 800 : 500,
                      color: active ? colors.accent : past ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)',
                      textShadow: active ? `0 0 12px ${colors.glow}, 0 0 24px ${colors.glow}80` : 'none',
                      transform: active ? 'scale(1.1)' : 'scale(1)',
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
      </div>

      {/* Timeline */}
      <div className="mt-4 w-full bg-white/10 rounded-full h-1.5 overflow-hidden cursor-pointer"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const pct = (e.clientX - rect.left) / rect.width;
          setCurrentTime(pct * duration);
        }}
      >
        <div
          className="h-full rounded-full transition-all duration-100"
          style={{ width: `${(currentTime / duration) * 100}%`, backgroundColor: colors.accent }}
        />
      </div>
      <div className="flex justify-between mt-1 text-xs text-white/30">
        <span>{currentTime.toFixed(1)}s</span>
        <span>{duration.toFixed(1)}s</span>
      </div>
    </div>
  );
}
