import React, { useMemo } from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import { ThemeConfig } from '../types';

interface Props {
  theme: ThemeConfig;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  speed: number;
  opacity: number;
  delay: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export const Particles: React.FC<Props> = ({ theme }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, height } = useVideoConfig();

  const particles = useMemo<Particle[]>(() => {
    const rand = seededRandom(42);
    return Array.from({ length: 30 }, () => ({
      x: rand() * 100,
      y: rand() * 100,
      size: rand() * 4 + 2,
      speed: rand() * 0.3 + 0.1,
      opacity: rand() * 0.5 + 0.2,
      delay: rand() * 200,
    }));
  }, []);

  return (
    <AbsoluteFill style={{ pointerEvents: 'none' }}>
      {particles.map((p, i) => {
        const adjustedFrame = frame + p.delay;
        const yOffset = (adjustedFrame * p.speed) % 110;
        const currentY = 110 - yOffset; // Float upward

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${p.x}%`,
              top: `${currentY}%`,
              width: p.size,
              height: p.size,
              borderRadius: '50%',
              backgroundColor: theme.particleColor,
              opacity: p.opacity,
              filter: `blur(${p.size > 4 ? 1 : 0}px)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
