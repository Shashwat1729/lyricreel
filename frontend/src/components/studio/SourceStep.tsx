'use client';

import { AlertCircle, FileAudio, Link2, Loader2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { errorText, getYouTubeInfo, isAbort } from '@/lib/api';
import { extractYouTubeId, formatTime, guessArtistAndTrack } from '@/lib/lyrics';
import type { AudioQuality, YouTubeInfo } from '@/types';

export type SourceInput =
  | { kind: 'youtube'; url: string; videoId: string; quality: AudioQuality; title: string; artist: string; info: YouTubeInfo | null }
  | { kind: 'upload'; file: File; title: string; artist: string };

interface Props {
  error?: string | null;
  onSubmit: (input: SourceInput) => void;
}

const ACCEPT = '.mp3,.wav,.m4a,.ogg,.flac,.aac,.opus,audio/*';
const MAX_MB = 50;

const QUALITIES: { id: AudioQuality; label: string; hint: string }[] = [
  { id: 'fast', label: 'Fast', hint: 'Smallest download' },
  { id: 'balanced', label: 'Balanced', hint: 'Good quality, quick' },
  { id: 'best', label: 'Best', hint: 'Highest bitrate' },
];

function loadQuality(): AudioQuality {
  try {
    const v = localStorage.getItem('lyricreel:quality');
    if (v === 'fast' || v === 'balanced' || v === 'best') return v;
  } catch { /* storage unavailable */ }
  return 'balanced';
}

export function SourceStep({ error, onSubmit }: Props) {
  const [tab, setTab] = useState<'youtube' | 'upload'>('youtube');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [touched, setTouched] = useState(false);
  const [quality, setQuality] = useState<AudioQuality>('balanced');
  const [info, setInfo] = useState<YouTubeInfo | null>(null);
  const [infoState, setInfoState] = useState<'idle' | 'loading' | 'error'>('idle');
  const [infoError, setInfoError] = useState('');
  const [fileError, setFileError] = useState('');
  const [dragging, setDragging] = useState(false);
  const urlRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const videoId = extractYouTubeId(url);

  useEffect(() => {
    setQuality(loadQuality());
    // Links from the landing page arrive as /create?url=…
    const fromQuery = new URLSearchParams(window.location.search).get('url');
    if (fromQuery) setUrl(fromQuery);
  }, []);
  useEffect(() => { try { localStorage.setItem('lyricreel:quality', quality); } catch { /* ignore */ } }, [quality]);

  // Look up title/artist as soon as a valid link is pasted
  useEffect(() => {
    setInfo(null);
    setInfoError('');
    if (!videoId) { setInfoState('idle'); return; }
    setInfoState('loading');
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      getYouTubeInfo(url, ctrl.signal)
        .then((data) => {
          setInfo(data);
          setInfoState('idle');
          if (!touched) {
            setTitle(data.track || data.title || '');
            setArtist(data.artist || '');
          }
        })
        .catch((err) => {
          if (isAbort(err)) return;
          setInfoState('error');
          setInfoError(errorText(err));
        });
    }, 350);
    return () => { clearTimeout(t); ctrl.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  // Paste a YouTube link anywhere on the page
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const text = e.clipboardData?.getData('text') ?? '';
      if (extractYouTubeId(text)) {
        setTab('youtube');
        setUrl(text.trim());
        urlRef.current?.focus();
      }
    };
    document.addEventListener('paste', onPaste);
    return () => document.removeEventListener('paste', onPaste);
  }, []);

  const pickFile = (f: File | undefined | null) => {
    setFileError('');
    if (!f) return;
    const ext = f.name.split('.').pop()?.toLowerCase() ?? '';
    if (!['mp3', 'wav', 'm4a', 'ogg', 'flac', 'aac', 'opus'].includes(ext) && !f.type.startsWith('audio/')) {
      setFileError('That file type is not supported. Use MP3, WAV, M4A, OGG or FLAC.');
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setFileError(`That file is ${(f.size / 1048576).toFixed(0)} MB; the limit is ${MAX_MB} MB.`);
      return;
    }
    setFile(f);
    if (!touched) {
      const guess = guessArtistAndTrack(f.name.replace(/\.[^.]+$/, '').replace(/_/g, ' '));
      setTitle(guess.track);
      setArtist(guess.artist);
    }
  };

  const canSubmit = tab === 'youtube' ? !!videoId : !!file && !!title.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    if (tab === 'youtube' && videoId) {
      onSubmit({ kind: 'youtube', url, videoId, quality, title: title.trim(), artist: artist.trim(), info });
    } else if (file) {
      onSubmit({ kind: 'upload', file, title: title.trim(), artist: artist.trim() });
    }
  };

  const tabBtn = (id: 'youtube' | 'upload', label: string, Icon: typeof Link2) => (
    <button
      type="button"
      role="tab"
      id={`tab-${id}`}
      aria-selected={tab === id}
      aria-controls={`panel-${id}`}
      onClick={() => setTab(id)}
      className={`flex h-11 items-center gap-2 rounded-[10px] px-4 text-[15px] font-semibold transition-colors ${tab === id ? 'bg-line-strong text-fg' : 'text-muted hover:text-fg'}`}
    >
      <Icon className="h-4 w-4" /> {label}
    </button>
  );

  return (
    <form onSubmit={submit} className="mx-auto flex w-full max-w-[640px] animate-fade-up flex-col gap-6 px-4 py-10 sm:py-16">
      <div className="flex flex-col gap-2.5">
        <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] sm:text-[52px]">Pick a song</h1>
        <p className="text-[17px] text-muted">We&apos;ll fetch the audio, find synced lyrics and open the studio.</p>
      </div>

      {error && (
        <div role="alert" className="flex items-start gap-3 rounded-xl border border-danger/40 bg-danger-soft px-4 py-3 text-sm text-fg">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
          <span>{error}</span>
        </div>
      )}

      <div role="tablist" aria-label="Audio source" className="flex gap-1 self-start rounded-[14px] border border-line bg-panel p-1">
        {tabBtn('youtube', 'YouTube link', Link2)}
        {tabBtn('upload', 'Upload file', Upload)}
      </div>

      {tab === 'youtube' ? (
        <div id="panel-youtube" role="tabpanel" aria-labelledby="tab-youtube" className="flex flex-col gap-4">
          <label htmlFor="yt-url" className="label">YouTube URL</label>
          <input
            id="yt-url"
            ref={urlRef}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            className="field h-[60px] text-[17px]"
            aria-invalid={url.trim() !== '' && !videoId}
            aria-describedby="yt-help"
          />
          <p id="yt-help" className={`-mt-2 text-[13px] ${url.trim() && !videoId ? 'text-danger' : 'text-muted'}`}>
            {url.trim() && !videoId ? 'That isn’t a YouTube video link. Try youtube.com/watch?v=…, youtu.be/… or a Shorts link.' : 'Tip: paste anywhere on this page and we’ll pick up the link.'}
          </p>

          {videoId && (
            <div className="flex items-center gap-3.5 rounded-[14px] border border-line bg-panel p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`} alt="" className="h-[63px] w-28 shrink-0 rounded-lg bg-raised object-cover" />
              <div className="flex min-w-0 flex-col gap-1">
                {infoState === 'loading' ? (
                  <span className="flex items-center gap-2 text-sm text-muted"><Loader2 className="h-4 w-4 animate-spin" /> Reading video info…</span>
                ) : info ? (
                  <>
                    <span className="truncate font-semibold">{info.title}</span>
                    <span className="text-sm text-muted">{[info.duration ? formatTime(info.duration) : null, info.artist].filter(Boolean).join(' · ')}</span>
                  </>
                ) : infoState === 'error' ? (
                  <span className="text-sm text-muted">Couldn&apos;t read video info: {infoError} Fill in the title and artist below.</span>
                ) : null}
              </div>
            </div>
          )}

          <fieldset className="flex flex-wrap items-center gap-2">
            <legend className="mb-2 w-full text-sm text-muted">Audio quality</legend>
            {QUALITIES.map((q) => (
              <button
                key={q.id}
                type="button"
                title={q.hint}
                aria-pressed={quality === q.id}
                onClick={() => setQuality(q.id)}
                className={`h-9 rounded-[9px] border px-3 text-[13px] transition-colors ${quality === q.id ? 'border-accent bg-accent-soft text-fg' : 'border-line-strong text-soft hover:border-line-bright'}`}
              >
                {q.label}
              </button>
            ))}
          </fieldset>
        </div>
      ) : (
        <div id="panel-upload" role="tabpanel" aria-labelledby="tab-upload" className="flex flex-col gap-3">
          {file ? (
            <div className="flex items-center gap-3 rounded-[14px] border border-line bg-panel p-4">
              <FileAudio className="h-6 w-6 shrink-0 text-accent" />
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-semibold">{file.name}</span>
                <span className="text-sm text-muted">{(file.size / 1048576).toFixed(1)} MB</span>
              </div>
              <button type="button" onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }} className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-fg" aria-label="Remove file">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <label
              htmlFor="audio-file"
              onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); pickFile(e.dataTransfer.files?.[0]); }}
              className={`flex h-[190px] cursor-pointer flex-col items-center justify-center gap-2.5 rounded-[18px] border-2 border-dashed bg-panel px-4 text-center transition-colors ${dragging ? 'border-accent bg-accent-soft/40' : 'border-line-bright hover:border-muted'}`}
            >
              <Upload className="h-7 w-7 text-accent" />
              <span className="text-[17px] font-semibold">Drop an audio file or click to browse</span>
              <span className="text-sm text-muted">MP3 · WAV · M4A · OGG · FLAC, up to {MAX_MB} MB</span>
            </label>
          )}
          <input id="audio-file" ref={fileRef} type="file" accept={ACCEPT} className="sr-only" onChange={(e) => pickFile(e.target.files?.[0])} />
          {fileError && <p role="alert" className="text-sm text-danger">{fileError}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <label htmlFor="song-title" className="label">Song title{tab === 'upload' && <span className="text-danger"> *</span>}</label>
          <input id="song-title" value={title} onChange={(e) => { setTitle(e.target.value); setTouched(true); }} placeholder="e.g. Firework" className="field h-12" />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="song-artist" className="label">Artist</label>
          <input id="song-artist" value={artist} onChange={(e) => { setArtist(e.target.value); setTouched(true); }} placeholder="e.g. Katy Perry" className="field h-12" />
        </div>
      </div>
      <p className="-mt-3 text-[13px] text-muted">Used to look up the lyrics. Correct spelling gives the best match.</p>

      <button type="submit" disabled={!canSubmit} className="btn-primary h-[58px] text-[17px]">
        Find lyrics
      </button>
    </form>
  );
}
