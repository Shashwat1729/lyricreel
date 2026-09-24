import { ArrowRight, AudioLines, Clapperboard, Link2 } from 'lucide-react';
import Link from 'next/link';
import { Logo } from '@/components/Logo';
import { HeroDemo } from '@/components/HeroDemo';
import { THEMES } from '@/lib/themes';

const STEPS = [
  { n: '01 · Source', title: 'Link or file', body: 'YouTube audio is pulled with yt-dlp. Uploaded files stay on your own disk.', Icon: Link2 },
  { n: '02 · Sync', title: 'Word-level timing', body: 'Synced lyrics from LRCLIB, tightened with WhisperX when it’s installed.', Icon: AudioLines },
  { n: '03 · Render', title: 'Six looks, one click', body: 'Preview live, nudge the timing, pick a clip, then export an H.264 MP4 with audio.', Icon: Clapperboard },
];

export default function Home() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-[76px] items-center justify-between border-b border-line px-4 sm:px-16">
        <Logo />
        <nav className="flex items-center gap-2 text-[15px] sm:gap-7" aria-label="Main">
          <a href="#how" className="hidden text-muted hover:text-fg sm:inline">How it works</a>
          <a href="#themes" className="hidden text-muted hover:text-fg sm:inline">Themes</a>
          <Link href="/create" className="btn-light h-11 min-h-0">Open studio</Link>
        </nav>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid max-w-[1440px] grid-cols-1 items-center gap-12 px-4 pb-14 pt-12 sm:px-16 sm:pt-[72px] lg:grid-cols-2">
          <div className="flex animate-fade-up flex-col gap-7">
            <span className="self-start rounded-full border border-line-strong px-3 py-1.5 font-mono text-[13px] text-accent">Runs on your machine · no API keys</span>
            <h1 className="font-display text-[48px] font-extrabold leading-[0.95] tracking-[-0.045em] sm:text-[68px] xl:text-[84px]">
              Turn any song into a synced lyric reel.
            </h1>
            <p className="max-w-[540px] text-lg leading-relaxed text-muted sm:text-xl">
              Paste a YouTube link or drop an audio file. LyricReel finds the lyrics, times every word, and renders a 1080×1920 video for Shorts, Reels and TikTok.
            </p>
            <form action="/create" method="get" className="flex max-w-[580px] flex-col gap-2.5 sm:flex-row">
              <label htmlFor="hero-url" className="sr-only">YouTube link</label>
              <input id="hero-url" name="url" type="url" required placeholder="Paste a YouTube link…" className="field h-14 flex-1 text-base" />
              <button type="submit" className="btn-primary h-14 px-6 text-base">
                Make video <ArrowRight className="h-[18px] w-[18px]" />
              </button>
            </form>
            <p className="text-sm text-muted">
              Or <Link href="/create" className="text-accent hover:text-accent-hover">upload an MP3, WAV, M4A, OGG or FLAC</Link> up to 50 MB.
            </p>
          </div>
          <div className="flex justify-center">
            <HeroDemo />
          </div>
        </section>

        <section id="how" className="mx-auto grid max-w-[1440px] scroll-mt-6 grid-cols-1 gap-5 px-4 pb-16 sm:px-16 md:grid-cols-3" aria-label="How it works">
          {STEPS.map(({ n, title, body, Icon }) => (
            <div key={n} className="card flex flex-col gap-3 p-7">
              <div className="flex items-center justify-between">
                <span className="eyebrow">{n}</span>
                <Icon className="h-5 w-5 text-muted" aria-hidden />
              </div>
              <h2 className="font-display text-2xl font-bold">{title}</h2>
              <p className="leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </section>

        <section id="themes" className="mx-auto max-w-[1440px] scroll-mt-6 px-4 pb-24 sm:px-16" aria-labelledby="themes-heading">
          <h2 id="themes-heading" className="mb-6 font-display text-3xl font-extrabold tracking-tight">Six themes</h2>
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {THEMES.map((t) => (
              <li key={t.id} className="flex flex-col gap-2.5">
                <div className="flex aspect-[3/4] items-center justify-center rounded-2xl border border-line" style={{ background: t.background }}>
                  <span style={{ fontFamily: t.fontFamily, fontWeight: t.fontWeight, color: t.accent }} className="text-2xl">
                    {t.uppercase ? 'LYRICS' : 'lyrics'}
                  </span>
                </div>
                <span className="text-sm"><span className="text-fg">{t.label}</span> <span className="text-muted">· {t.mood}</span></span>
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="border-t border-line px-4 py-8 text-sm text-muted sm:px-16">
        <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-3 sm:flex-row">
          <span>LyricReel: open source, local-first lyric videos.</span>
          <a href="https://github.com/shashwat1729/lyricreel" className="hover:text-fg">GitHub</a>
        </div>
      </footer>
    </div>
  );
}
