'use client';

import Link from 'next/link';
import { motion, useScroll, useTransform } from 'framer-motion';
import {
  Music,
  Sparkles,
  Video,
  Zap,
  Youtube,
  Download,
  Wand2,
  Clock,
  Palette,
  Play,
  ArrowRight,
  Check,
  Star,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

const HERO_WORDS = [
  { word: 'Every', start: 0.5, end: 0.9 },
  { word: 'song', start: 1.0, end: 1.5 },
  { word: 'tells', start: 1.6, end: 2.0 },
  { word: 'a', start: 2.1, end: 2.3 },
  { word: 'story', start: 2.4, end: 3.0 },
];

const SECOND_LINE = [
  { word: 'Let', start: 3.2, end: 3.5 },
  { word: 'yours', start: 3.6, end: 4.0 },
  { word: 'shine', start: 4.1, end: 4.8 },
];

function HeroLyricDemo() {
  const [time, setTime] = useState(0);
  const particles = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        id: i,
        x1: Math.random() * 260 + 10,
        x2: Math.random() * 260 + 10,
        y1: Math.random() * 500 + 30,
        y2: Math.random() * 500 + 30,
      })),
    []
  );

  useEffect(() => {
    let raf: number;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      setTime((current) => (current >= 5.5 ? 0 : current + dt));
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const renderWords = (words: typeof HERO_WORDS) => (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
      {words.map((word) => {
        const active = time >= word.start && time <= word.end;
        const past = time > word.end;

        return (
          <motion.span
            key={word.word}
            className="text-2xl font-bold tracking-tight md:text-[1.7rem]"
            animate={{
              color: active ? '#00ffaa' : past ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.24)',
              scale: active ? 1.15 : 1,
              textShadow: active
                ? '0 0 30px rgba(0,255,170,0.8), 0 0 60px rgba(0,255,170,0.4)'
                : '0 0 0 transparent',
            }}
            transition={{ duration: 0.12, ease: 'easeOut' }}
          >
            {word.word}
          </motion.span>
        );
      })}
    </div>
  );

  return (
    <div className="relative">
      <div className="absolute inset-0 -z-10 scale-150 bg-gradient-to-b from-neon-purple/30 via-accent/20 to-transparent blur-3xl" />

      <div className="phone-mockup relative mx-auto h-[560px] w-[280px] overflow-hidden">
        <div className="phone-notch" />

        {particles.map((particle) => (
          <motion.div
            key={particle.id}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{
              background: particle.id % 2 === 0 ? 'rgba(0, 255, 170, 0.6)' : 'rgba(124, 58, 237, 0.65)',
            }}
            animate={{
              x: [particle.x1, particle.x2],
              y: [particle.y1, particle.y2],
              opacity: [0, 0.8, 0],
              scale: [0, 1, 0],
            }}
            transition={{
              duration: 3 + particle.id * 0.15,
              repeat: Infinity,
              delay: particle.id * 0.22,
              ease: 'easeInOut',
            }}
          />
        ))}

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
          {renderWords(HERO_WORDS)}
          {renderWords(SECOND_LINE)}
        </div>

        <div className="absolute bottom-20 left-6 right-6 flex h-12 items-end justify-center gap-1">
          {Array.from({ length: 20 }).map((_, i) => (
            <motion.div
              key={i}
              className="w-1 rounded-full bg-gradient-to-t from-accent/50 to-accent"
              animate={{ height: [8, 22 + ((i * 7) % 23), 8] }}
              transition={{
                duration: 0.55 + (i % 4) * 0.08,
                repeat: Infinity,
                delay: i * 0.05,
                ease: 'easeInOut',
              }}
            />
          ))}
        </div>

        <div className="absolute bottom-8 left-6 right-6 h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent to-neon-cyan"
            animate={{ width: (time / 5.5) * 100 + '%' }}
            transition={{ duration: 0.05 }}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-50px' }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="glass-card group p-8"
    >
      <div className="feature-icon mb-5">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="mb-3 text-xl font-semibold text-white transition-colors group-hover:text-accent">
        {title}
      </h3>
      <p className="text-text-muted leading-relaxed">{description}</p>
    </motion.div>
  );
}

function ThemeCard({
  name,
  gradient,
  index,
}: {
  name: string;
  gradient: string;
  index: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="theme-card group cursor-pointer"
    >
      <div className={'absolute inset-0 bg-gradient-to-br ' + gradient} />
      <div className="absolute inset-0 bg-black/45 transition-colors group-hover:bg-black/20" />
      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
          <Play className="ml-0.5 h-5 w-5 fill-white text-white" />
        </div>
      </div>
      <span className="absolute bottom-3 left-3 text-sm font-medium text-white/90 transition-colors group-hover:text-white">
        {name}
      </span>
    </motion.div>
  );
}

function StatItem({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center">
      <div className="gradient-text-static mb-2 text-4xl font-bold md:text-5xl">{value}</div>
      <div className="text-sm text-text-muted">{label}</div>
    </div>
  );
}

export default function Home() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -50]);

  return (
    <>
      <main ref={containerRef} className="relative overflow-hidden bg-[#050508] text-white">
        <section className="relative flex min-h-screen items-center justify-center px-6 pt-20 pb-32">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute left-10 top-20 h-72 w-72 rounded-full bg-neon-purple/20 blur-[100px] animate-pulse-slow" />
          <div
            className="absolute right-10 bottom-20 h-96 w-96 rounded-full bg-accent/10 blur-[120px] animate-pulse-slow"
            style={{ animationDelay: '1s' }}
          />

          <motion.div style={{ opacity: heroOpacity, y: heroY }} className="relative z-10 w-full max-w-7xl">
            <div className="grid grid-cols-1 items-center gap-16 lg:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mb-8 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-sm font-medium text-accent backdrop-blur-sm"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>100% Local & Free — No API Keys Needed</span>
                </motion.div>

                <h1 className="text-display mb-6">
                  <span className="gradient-text">Lyric Videos</span>
                  <br />
                  <span className="text-white">in Seconds</span>
                </h1>

                <p className="text-body-large mb-10 max-w-xl text-text-secondary">
                  Paste a YouTube link or upload any song. Get word-level synced lyrics and stunning karaoke
                  videos ready for <span className="font-medium text-white">Shorts</span>,{' '}
                  <span className="font-medium text-white">Reels</span> &{' '}
                  <span className="font-medium text-white">TikTok</span>.
                </p>

                <div className="mb-10 flex flex-wrap gap-4">
                  <Link href="/create" className="btn-primary text-lg">
                    <Zap className="h-5 w-5" />
                    Start Creating
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Link>
                  <Link href="/create" className="btn-secondary text-lg">
                    <Youtube className="h-5 w-5 text-red-500" />
                    Paste YouTube URL
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-4 text-sm text-text-muted">
                  <span className="pill-chip">
                    <Music className="h-4 w-4 text-accent" /> MP3 / WAV / YouTube
                  </span>
                  <span className="pill-chip">
                    <Video className="h-4 w-4 text-accent" /> 1080×1920 Vertical
                  </span>
                  <span className="pill-chip">
                    <Download className="h-4 w-4 text-accent" /> H.264 MP4
                  </span>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
                className="flex justify-center lg:justify-end"
              >
                <HeroLyricDemo />
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2 text-text-muted"
          >
            <span className="text-xs uppercase tracking-[0.25em]">Scroll to explore</span>
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="flex h-8 w-5 justify-center rounded-full border-2 border-white/20 pt-1.5"
            >
              <div className="h-2 w-1 rounded-full bg-accent" />
            </motion.div>
          </motion.div>
        </section>

        <section className="section-padding relative px-6">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16 text-center"
            >
              <h2 className="text-headline mb-4">
                Three Steps to <span className="gradient-text-static">Magic</span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-text-secondary">
                From audio to stunning video in under a minute. No editing skills required.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  icon: Music,
                  title: 'Upload or Paste URL',
                  description: 'Drop an MP3/WAV file or paste a YouTube link. We extract the audio automatically.',
                  step: '01',
                },
                {
                  icon: Wand2,
                  title: 'Smart Transcription',
                  description: 'WhisperX generates word-level timestamps with millisecond accuracy. Pure magic.',
                  step: '02',
                },
                {
                  icon: Video,
                  title: 'Download Your Video',
                  description: 'Choose a theme, customize colors, render in 1080×1920, and download your MP4.',
                  step: '03',
                },
              ].map((step, i) => (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="glass-card group relative overflow-hidden p-8"
                >
                  <span className="absolute top-6 right-6 text-6xl font-black text-white/[0.03] transition-colors duration-500 group-hover:text-accent/10">
                    {step.step}
                  </span>
                  <div className="feature-icon mb-6">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-3 text-xl font-semibold text-white">{step.title}</h3>
                  <p className="leading-relaxed text-text-muted">{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-padding relative px-6">
          <div className="mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16 text-center"
            >
              <h2 className="text-headline mb-4">
                Built for <span className="gradient-text-static">Creators</span>
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-text-secondary">
                Everything you need to create professional lyric videos without the complexity.
              </p>
            </motion.div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              <FeatureCard
                icon={Clock}
                title="Lightning Fast"
                description="Generate videos in under 60 seconds. No waiting, no queues, no cloud processing delays."
                index={0}
              />
              <FeatureCard
                icon={Sparkles}
                title="Word-Level Sync"
                description="Every word highlights at exactly the right moment. Millisecond-accurate timing powered by WhisperX."
                index={1}
              />
              <FeatureCard
                icon={Palette}
                title="6 Stunning Themes"
                description="From neon cyberpunk to minimal elegance. Each theme is crafted for maximum visual impact."
                index={2}
              />
              <FeatureCard
                icon={Video}
                title="Shorts-Ready Format"
                description="1080×1920 vertical video optimized for YouTube Shorts, Instagram Reels, and TikTok."
                index={3}
              />
              <FeatureCard
                icon={Download}
                title="No Watermarks"
                description="Download clean, professional videos. Your content, your brand, no strings attached."
                index={4}
              />
              <FeatureCard
                icon={Zap}
                title="100% Local"
                description="Runs entirely on your machine. No API keys, no subscriptions, no data leaving your computer."
                index={5}
              />
            </div>
          </div>
        </section>

        <section className="section-padding relative overflow-hidden px-6">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-purple/5 to-transparent" />

          <div className="relative mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-16 text-center"
            >
              <h2 className="text-headline mb-4">
                <span className="gradient-text-static">6 Stunning</span> Themes
              </h2>
              <p className="mx-auto max-w-2xl text-lg text-text-secondary">
                Each theme is carefully designed to match different moods and genres.
              </p>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
              {[
                { name: 'Neon', gradient: 'from-green-400 via-cyan-400 to-blue-500' },
                { name: 'Anime', gradient: 'from-pink-400 via-purple-400 to-indigo-500' },
                { name: 'Sad', gradient: 'from-blue-400 via-indigo-500 to-purple-600' },
                { name: 'Synthwave', gradient: 'from-purple-500 via-pink-500 to-orange-400' },
                { name: 'Minimal', gradient: 'from-gray-300 via-gray-400 to-gray-500' },
                { name: 'Cinema', gradient: 'from-amber-400 via-orange-500 to-red-500' },
              ].map((theme, i) => (
                <ThemeCard key={theme.name} name={theme.name} gradient={theme.gradient} index={i} />
              ))}
            </div>
          </div>
        </section>

        <section className="section-padding px-6">
          <div className="mx-auto max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="glass-card p-8 md:p-12"
            >
              <div className="mb-10 flex flex-wrap items-center justify-between gap-6 border-b border-white/8 pb-8">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
                    <Star className="h-4 w-4 text-accent" />
                    Creator-loved workflow
                  </div>
                  <h3 className="text-2xl font-semibold text-white md:text-3xl">Fast enough for drafts. Polished enough to publish.</h3>
                </div>
                <div className="space-y-3 text-sm text-text-secondary">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" /> Word-level synced highlights
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" /> Vertical video export for every platform
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-accent" /> Local-first generation with zero watermarks
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <StatItem value="<60s" label="Generation Time" />
                <StatItem value="6" label="Unique Themes" />
                <StatItem value="∞" label="Videos Free" />
              </div>
            </motion.div>
          </div>
        </section>

        <section className="section-padding px-6 pb-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-4xl text-center"
          >
            <h2 className="text-headline mb-6">
              Ready to Create Your First <span className="gradient-text-static">Lyric Video</span>?
            </h2>
            <p className="mx-auto mb-10 max-w-2xl text-lg text-text-secondary">
              No sign-up required. No credit card. Just paste a link, pick a mood, and watch the magic happen.
            </p>
            <Link href="/create" className="btn-primary text-xl px-10 py-5">
              <Zap className="h-6 w-6" />
              Start Creating Now
              <ArrowRight className="ml-1 h-5 w-5" />
            </Link>
          </motion.div>
        </section>

        <footer className="border-t border-border px-6 py-8">
          <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-text-muted md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-accent text-black">
                <Music className="h-4 w-4" />
              </div>
              <span className="font-semibold text-white">LyricFlow</span>
            </div>
            <p>Built with ❤️ for creators everywhere</p>
            <div className="flex items-center gap-4">
              <a href="#" className="transition-colors hover:text-white">
                GitHub
              </a>
              <a href="#" className="transition-colors hover:text-white">
                Twitter
              </a>
            </div>
          </div>
        </footer>
      </main>

      <style jsx global>{`
        .section-padding {
          padding-top: 7rem;
          padding-bottom: 7rem;
        }

        .text-display {
          font-size: clamp(3.5rem, 8vw, 6.6rem);
          line-height: 0.94;
          letter-spacing: -0.05em;
          font-weight: 700;
        }

        .text-headline {
          font-size: clamp(2.2rem, 4.5vw, 3.8rem);
          line-height: 1;
          letter-spacing: -0.04em;
          font-weight: 650;
        }

        .text-body-large {
          font-size: clamp(1.05rem, 1.8vw, 1.25rem);
          line-height: 1.75;
        }

        .gradient-text-static {
          background: linear-gradient(135deg, #ffffff 0%, #7c3aed 42%, #00ffaa 100%);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .glass-card {
          position: relative;
          overflow: hidden;
          border-radius: 1.75rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03)),
            rgba(10, 10, 15, 0.7);
          box-shadow:
            0 30px 80px rgba(0, 0, 0, 0.35),
            inset 0 1px 0 rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(24px);
        }

        .glass-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), transparent 45%, rgba(0, 255, 170, 0.07));
          pointer-events: none;
        }

        .feature-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 1rem;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: linear-gradient(135deg, rgba(124, 58, 237, 0.2), rgba(0, 255, 170, 0.12));
          color: #00ffaa;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05), 0 10px 30px rgba(0, 0, 0, 0.25);
        }

        .theme-card {
          position: relative;
          aspect-ratio: 9 / 16;
          overflow: hidden;
          border-radius: 1.5rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.28);
        }

        .phone-mockup {
          border-radius: 2.5rem;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background:
            radial-gradient(circle at top, rgba(124, 58, 237, 0.24), transparent 38%),
            linear-gradient(180deg, rgba(13, 13, 20, 0.96), rgba(4, 4, 7, 0.98));
          box-shadow:
            0 40px 100px rgba(0, 0, 0, 0.45),
            0 0 0 1px rgba(255, 255, 255, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
        }

        .phone-notch {
          position: absolute;
          top: 12px;
          left: 50%;
          width: 112px;
          height: 24px;
          transform: translateX(-50%);
          border-radius: 999px;
          background: rgba(0, 0, 0, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.05);
          z-index: 2;
        }

        .btn-primary,
        .btn-secondary,
        .pill-chip {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.65rem;
        }

        .btn-primary {
          border-radius: 999px;
          padding: 0.95rem 1.5rem;
          font-weight: 600;
          color: #03110c;
          background: linear-gradient(135deg, #00ffaa 0%, #7cf7d0 100%);
          box-shadow: 0 20px 40px rgba(0, 255, 170, 0.22);
          transition: transform 200ms ease, box-shadow 200ms ease, filter 200ms ease;
        }

        .btn-primary:hover {
          transform: translateY(-2px);
          filter: brightness(1.02);
          box-shadow: 0 24px 60px rgba(0, 255, 170, 0.28);
        }

        .btn-secondary {
          border-radius: 999px;
          padding: 0.95rem 1.5rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.92);
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(12px);
          transition: transform 200ms ease, border-color 200ms ease, background 200ms ease;
        }

        .btn-secondary:hover {
          transform: translateY(-2px);
          background: rgba(255, 255, 255, 0.07);
          border-color: rgba(255, 255, 255, 0.2);
        }

        .pill-chip {
          border-radius: 999px;
          padding: 0.5rem 0.9rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(10px);
        }
      `}</style>
    </>
  );
}
