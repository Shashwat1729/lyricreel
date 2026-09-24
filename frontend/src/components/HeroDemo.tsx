'use client';

import { useEffect, useState } from 'react';

const LINES = [
  { text: 'and I will always', start: 0 },
  { text: 'find my way back home', start: 2.2 },
  { text: 'to you', start: 4.6 },
];
const LOOP = 6.4;

/** Small self-running karaoke demo for the landing page. */
export function HeroDemo() {
  const [t, setT] = useState(2.9);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setT((v) => (v + (now - last) / 1000) % LOOP);
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const idx = LINES.reduce((acc, l, i) => (t >= l.start ? i : acc), 0);
  const line = LINES[idx];
  const lineEnd = LINES[idx + 1]?.start ?? LOOP;
  const words = line.text.split(' ');
  const per = (lineEnd - line.start - 0.3) / words.length;

  return (
    <div
      className="relative flex aspect-[9/16] w-[300px] flex-col items-center justify-center gap-6 overflow-hidden rounded-[36px] border border-line-strong px-7 sm:w-[330px]"
      style={{ background: 'radial-gradient(120% 70% at 50% 0%, #1E1433 0%, #0C0C11 70%)' }}
      aria-hidden
    >
      <p className="text-center font-display text-2xl font-bold text-fg/30">{LINES[idx - 1]?.text ?? ' '}</p>
      <p className="flex flex-wrap justify-center gap-x-[0.3em] text-center font-display text-[32px] font-extrabold leading-tight">
        {words.map((w, i) => {
          const s = line.start + i * per;
          const fill = Math.min(1, Math.max(0, (t - s) / per));
          return (
            <span
              key={`${idx}-${i}`}
              style={{
                color: 'transparent',
                backgroundImage: `linear-gradient(90deg, #3DF2B0 ${fill * 100}%, rgba(242,241,236,0.4) ${fill * 100}%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
              }}
            >
              {w}
            </span>
          );
        })}
      </p>
      <p className="text-center font-display text-2xl font-bold text-fg/25">{LINES[idx + 1]?.text ?? ' '}</p>
      <div className="absolute inset-x-7 bottom-10 h-1 rounded-full bg-fg/15">
        <div className="h-1 rounded-full bg-accent" style={{ width: `${(t / LOOP) * 100}%` }} />
      </div>
    </div>
  );
}
