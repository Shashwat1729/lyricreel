'use client';

import { useEffect, useState, type RefObject } from 'react';

/**
 * Current time of an <audio>/<video> element, updated every animation frame while playing
 * and on seek/pause otherwise. Components using it re-render on their own.
 */
export function usePlaybackTime(ref: RefObject<HTMLMediaElement>): number {
  const [time, setTime] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const tick = () => {
      setTime(el.currentTime);
      if (!el.paused && !el.ended) raf = requestAnimationFrame(tick);
    };
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(tick); };
    const sync = () => setTime(el.currentTime);
    el.addEventListener('play', start);
    el.addEventListener('seeked', sync);
    el.addEventListener('timeupdate', sync);
    el.addEventListener('loadedmetadata', sync);
    sync();
    if (!el.paused) start();
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('play', start);
      el.removeEventListener('seeked', sync);
      el.removeEventListener('timeupdate', sync);
      el.removeEventListener('loadedmetadata', sync);
    };
  }, [ref]);

  return time;
}
