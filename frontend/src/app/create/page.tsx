'use client';

import { AlertCircle, Play, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Logo } from '@/components/Logo';
import { Toast } from '@/components/Toast';
import { LyricPreview } from '@/components/studio/LyricPreview';
import { LyricsList } from '@/components/studio/LyricsList';
import { PlayerBar } from '@/components/studio/PlayerBar';
import { DoneView, RenderingView } from '@/components/studio/RenderStep';
import { SourceStep, type SourceInput } from '@/components/studio/SourceStep';
import { Stepper } from '@/components/studio/Stepper';
import { ThemePicker } from '@/components/studio/ThemePicker';
import { TimingPanel } from '@/components/studio/TimingPanel';
import { WorkingStep, type WorkItem } from '@/components/studio/WorkingStep';
import {
  audioUrl, cancelJob, errorText, isAbort, startRender, startTranscription,
  startYouTubeDownload, uploadSong, waitForJob,
} from '@/lib/api';
import { playChime } from '@/lib/chime';
import { formatTime, shiftWords } from '@/lib/lyrics';
import { loadRecent, saveRecent, timeAgo, type RecentVideo } from '@/lib/recent';
import { getTheme } from '@/lib/themes';
import type { ThemeName, WordTimestamp } from '@/types';

type Phase = 'source' | 'working' | 'studio' | 'rendering' | 'done';

interface Song {
  filename: string;
  title: string;
  artist: string;
  thumbnail?: string;
  duration: number;
}

const STEP_INDEX: Record<Phase, number> = { source: 0, working: 1, studio: 2, rendering: 3, done: 4 };

export default function CreatePage() {
  const [phase, setPhase] = useState<Phase>('source');
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [recent, setRecent] = useState<RecentVideo[]>([]);

  // Pipeline
  const [workTitle, setWorkTitle] = useState('');
  const [workThumb, setWorkThumb] = useState<string | undefined>();
  const [items, setItems] = useState<WorkItem[]>([]);
  const ctrlRef = useRef<AbortController | null>(null);
  const jobRef = useRef<string | null>(null);

  // Studio
  const [song, setSong] = useState<Song | null>(null);
  const [words, setWords] = useState<WordTimestamp[]>([]);
  const [lyricSource, setLyricSource] = useState<string | undefined>();
  const [theme, setTheme] = useState<ThemeName>('neon');
  const [offset, setOffset] = useState(0);
  const [clip, setClip] = useState({ enabled: false, start: 0, end: 0 });
  const [audioError, setAudioError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Render
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderMessage, setRenderMessage] = useState<string | undefined>();
  const [videoId, setVideoId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => setRecent(loadRecent()), []);
  useEffect(() => () => ctrlRef.current?.abort(), []);

  const shifted = useMemo(() => shiftWords(words, offset), [words, offset]);
  const duration = song?.duration || 0;
  const clipStart = clip.enabled ? clip.start : 0;
  const clipEnd = clip.enabled ? clip.end : duration;
  const themeConfig = getTheme(theme);

  // Page title shows render progress when the tab is in the background
  useEffect(() => {
    document.title = phase === 'rendering' ? `${renderProgress}% · Rendering · LyricReel` : phase === 'done' ? 'Video ready · LyricReel' : 'Studio · LyricReel';
  }, [phase, renderProgress]);

  // Space toggles playback in the studio
  useEffect(() => {
    if (phase !== 'studio') return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, select, button, a, [contenteditable="true"]')) return;
      e.preventDefault();
      const el = audioRef.current;
      if (el) { if (el.paused) el.play().catch(() => undefined); else el.pause(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase]);

  const updateItem = (index: number, patch: Partial<WorkItem>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const runPipeline = useCallback(async (input: SourceInput) => {
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    const { signal } = ctrl;

    setError(null);
    setWorkTitle(input.title || (input.kind === 'youtube' ? input.info?.title ?? '' : input.file.name));
    setWorkThumb(input.kind === 'youtube' ? `https://i.ytimg.com/vi/${input.videoId}/mqdefault.jpg` : undefined);
    setItems([
      { label: input.kind === 'youtube' ? 'Download audio' : 'Upload audio', state: 'active', progress: 0 },
      { label: 'Find and sync lyrics', state: 'waiting' },
    ]);
    setPhase('working');

    try {
      let filename: string;
      let dur: number | undefined;
      let title = input.title;
      let artist = input.artist;

      if (input.kind === 'youtube') {
        const { jobId } = await startYouTubeDownload(input.url, input.quality);
        jobRef.current = jobId;
        const job = await waitForJob(jobId, (j) => updateItem(0, { progress: j.progress, detail: j.message }), signal);
        if (!job.filename) throw new Error('The download finished without an audio file');
        filename = job.filename;
        dur = job.metadata?.duration;
        title ||= job.metadata?.track || job.metadata?.title || '';
        artist ||= job.metadata?.artist || '';
      } else {
        const res = await uploadSong(input.file, (pct) => updateItem(0, { progress: pct }), signal);
        filename = res.filename;
        dur = res.duration;
      }
      updateItem(0, { state: 'done' });
      updateItem(1, { state: 'active', detail: 'Looking up lyrics' });

      const { jobId } = await startTranscription(filename, title, artist, dur);
      jobRef.current = jobId;
      const job = await waitForJob(jobId, (j) => updateItem(1, { progress: j.progress > 5 ? j.progress : undefined, detail: j.message }), signal);
      const found = job.transcript?.word_segments ?? [];
      if (!found.length) throw new Error('No lyrics were found for this song');
      jobRef.current = null;

      const lastWord = found[found.length - 1].end;
      const songDuration = dur && dur > 0 ? dur : lastWord + 3;
      setSong({
        filename,
        title: job.metadata?.title || title || 'Untitled',
        artist: job.metadata?.artist || artist,
        thumbnail: input.kind === 'youtube' ? `https://i.ytimg.com/vi/${input.videoId}/hqdefault.jpg` : undefined,
        duration: songDuration,
      });
      setWords(found);
      setLyricSource(job.transcript?.source);
      setOffset(0);
      setClip({ enabled: false, start: 0, end: songDuration });
      setAudioError(false);
      setPhase('studio');
      setToast(`Synced ${found.length} words`);
    } catch (err) {
      jobRef.current = null;
      if (signal.aborted || isAbort(err)) return;
      setError(errorText(err));
      setPhase('source');
    }
  }, []);

  const cancelPipeline = () => {
    ctrlRef.current?.abort();
    if (jobRef.current) cancelJob(jobRef.current);
    jobRef.current = null;
    setPhase('source');
  };

  const render = async () => {
    if (!song) return;
    audioRef.current?.pause();
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setError(null);
    setRenderProgress(0);
    setRenderMessage('Sending to the renderer');
    setPhase('rendering');

    try {
      const { jobId } = await startRender({
        filename: song.filename,
        words,
        theme,
        offset,
        title: song.title,
        artist: song.artist || undefined,
        ...(clip.enabled ? { clipStart: clip.start, clipEnd: clip.end } : {}),
      });
      jobRef.current = jobId;
      await waitForJob(jobId, (j) => { setRenderProgress(j.progress); setRenderMessage(j.message); }, ctrl.signal);
      jobRef.current = null;
      setVideoId(jobId);
      setRecent(saveRecent({ videoId: jobId, title: song.title, artist: song.artist, theme, createdAt: Date.now() }));
      setCopied(false);
      setPhase('done');
      playChime();
    } catch (err) {
      jobRef.current = null;
      if (ctrl.signal.aborted || isAbort(err)) return;
      setError(errorText(err, 'Render failed'));
      setPhase('studio');
    }
  };

  const cancelRender = () => {
    ctrlRef.current?.abort();
    if (jobRef.current) cancelJob(jobRef.current);
    jobRef.current = null;
    setPhase('studio');
  };

  const startOver = () => {
    ctrlRef.current?.abort();
    if (jobRef.current) cancelJob(jobRef.current);
    jobRef.current = null;
    audioRef.current?.pause();
    setSong(null);
    setWords([]);
    setVideoId(null);
    setError(null);
    setPhase('source');
  };

  const copyLink = async () => {
    if (!videoId) return;
    const link = `${window.location.origin}/view/${videoId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setToast('Share link copied');
    } catch {
      window.prompt('Copy this link', link);
    }
  };

  const onLoadedMetadata = () => {
    const d = audioRef.current?.duration;
    if (song && d && Number.isFinite(d) && Math.abs(d - song.duration) > 0.5) {
      setSong({ ...song, duration: d });
      setClip((c) => (c.enabled ? { ...c, end: Math.min(c.end, d) } : { ...c, end: d }));
    }
  };

  const showStudio = song && (phase === 'studio' || phase === 'rendering' || phase === 'done');

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 flex h-[68px] shrink-0 items-center justify-between gap-4 border-b border-line bg-ink/90 px-4 backdrop-blur sm:px-10">
        <Logo />
        <Stepper current={STEP_INDEX[phase]} />
        {phase === 'source' ? (
          <span className="hidden w-[108px] sm:block" />
        ) : (
          <button type="button" onClick={startOver} className="btn-ghost h-10 min-h-0 px-3.5 text-sm">
            <RotateCcw className="h-4 w-4" /> <span className="hidden sm:inline">Start over</span>
          </button>
        )}
      </header>

      <main className="flex flex-1 flex-col">
        {phase === 'source' && (
          <>
            <SourceStep error={error} onSubmit={runPipeline} />
            {recent.length > 0 && (
              <section className="mx-auto w-full max-w-[640px] px-4 pb-16" aria-labelledby="recent-heading">
                <h2 id="recent-heading" className="mb-3 text-sm font-semibold text-muted">Recent videos (kept for 24 hours)</h2>
                <ul className="grid gap-2 sm:grid-cols-2">
                  {recent.map((v) => (
                    <li key={v.videoId}>
                      <Link href={`/view/${v.videoId}`} className="card flex items-center gap-3 px-4 py-3 transition-colors hover:border-line-bright">
                        <span className="h-9 w-9 shrink-0 rounded-lg" style={{ background: getTheme(v.theme).background, boxShadow: `inset 0 0 0 2px ${getTheme(v.theme).accent}55` }} aria-hidden />
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-[15px] font-semibold">{v.title}</span>
                          <span className="text-xs text-muted">{getTheme(v.theme).label} · {timeAgo(v.createdAt)}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}

        {phase === 'working' && <WorkingStep title={workTitle} thumbnail={workThumb} items={items} onCancel={cancelPipeline} />}

        {showStudio && song && (
          <>
            <audio
              ref={audioRef}
              src={audioUrl(song.filename)}
              preload="auto"
              onLoadedMetadata={onLoadedMetadata}
              onError={() => setAudioError(true)}
              onTimeUpdate={(e) => {
                // Loop inside the selected clip while previewing
                const el = e.currentTarget;
                if (clip.enabled && !el.paused && el.currentTime > clip.end) el.currentTime = clip.start;
              }}
              className="hidden"
            />

            {phase === 'studio' && (
              <div className="flex flex-1 flex-col gap-6 px-4 py-6 sm:px-10 sm:py-8 lg:flex-row lg:gap-8">
                <section className="flex min-w-0 flex-1 flex-col gap-6 md:flex-row md:gap-7" aria-label="Preview">
                  <div className="mx-auto w-full max-w-[260px] shrink-0 sm:max-w-[340px] md:mx-0 md:w-[300px] xl:w-[360px]">
                    <LyricPreview audioRef={audioRef} words={shifted} theme={themeConfig} title={song.title} artist={song.artist} clipStart={clipStart} clipEnd={clipEnd} />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col gap-4 lg:max-h-[calc(100dvh-68px-64px)]">
                    {error && (
                      <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm">
                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" /> <span>{error}</span>
                      </div>
                    )}
                    {audioError && (
                      <p role="alert" className="rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm">
                        Couldn&apos;t load the audio preview. The file may have expired on the server; start over to load the song again.
                      </p>
                    )}
                    <PlayerBar audioRef={audioRef} title={song.title} artist={song.artist} duration={duration} clipStart={clipStart} clipEnd={clipEnd} />
                    <LyricsList audioRef={audioRef} words={shifted} source={lyricSource} />
                  </div>
                </section>

                <aside className="flex w-full shrink-0 flex-col gap-4 lg:w-[360px]" aria-label="Video settings">
                  <ThemePicker value={theme} onChange={setTheme} />
                  <TimingPanel audioRef={audioRef} offset={offset} onOffset={setOffset} duration={duration} clip={clip} onClip={setClip} />
                  <div className="card mt-auto flex flex-col gap-3 p-5">
                    <div className="flex justify-between text-sm text-muted">
                      <span>Output</span>
                      <span className="font-mono">1080×1920 · MP4 · {formatTime(clipEnd - clipStart)}</span>
                    </div>
                    <button type="button" onClick={render} className="btn-primary h-14 text-[17px]">
                      <Play className="h-[18px] w-[18px]" fill="currentColor" /> Render video
                    </button>
                    <p className="text-center text-xs text-muted">Space plays and pauses · click a lyric line to jump to it</p>
                  </div>
                </aside>
              </div>
            )}

            {phase === 'rendering' && (
              <div className="grid flex-1 grid-cols-1 items-center gap-10 px-4 py-10 sm:px-10 lg:grid-cols-2 lg:px-20">
                <RenderingView progress={renderProgress} message={renderMessage} onCancel={cancelRender} />
                <div className="card mx-auto flex w-full max-w-[420px] justify-center p-6">
                  <div className="w-full max-w-[300px]">
                    <LyricPreview audioRef={audioRef} words={shifted} theme={themeConfig} title={song.title} artist={song.artist} clipStart={clipStart} clipEnd={clipEnd} />
                  </div>
                </div>
              </div>
            )}

            {phase === 'done' && videoId && (
              <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-10">
                <DoneView
                  videoId={videoId}
                  title={song.title}
                  subtitle={[song.artist, themeConfig.label, formatTime(clipEnd - clipStart)].filter(Boolean).join(' · ')}
                  copied={copied}
                  onCopy={copyLink}
                  onRestyle={() => setPhase('studio')}
                  onNew={startOver}
                />
              </div>
            )}
          </>
        )}
      </main>

      <Toast message={toast} onDone={() => setToast(null)} />
    </div>
  );
}
