'use client';

import { Check, Copy, Download, Loader2, Palette, Plus } from 'lucide-react';
import { downloadUrl, videoUrl } from '@/lib/api';

export function RenderingView({ progress, message, onCancel }: { progress: number; message?: string; onCancel: () => void }) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  return (
    <section className="flex flex-col justify-center gap-5" aria-live="polite">
      <span className="font-mono text-[13px] text-muted">Rendering</span>
      <h2 className="flex items-center gap-3 font-display text-[36px] font-extrabold leading-tight tracking-[-0.03em] sm:text-[44px]">
        <Loader2 className="h-8 w-8 shrink-0 animate-spin text-accent" aria-hidden />
        {message || 'Starting…'}
      </h2>
      <div className="flex flex-col gap-2.5">
        <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Render progress" className="h-2.5 overflow-hidden rounded-full bg-line">
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.max(2, pct)}%` }} />
        </div>
        <span className="font-mono text-[13px] text-muted">{pct}%</span>
      </div>
      <p className="max-w-[460px] leading-relaxed text-muted">You can leave this tab in the background. We&apos;ll play a chime when your video is ready.</p>
      <button type="button" onClick={onCancel} className="btn-ghost self-start">Cancel render</button>
    </section>
  );
}

interface DoneProps {
  videoId: string;
  title: string;
  subtitle: string;
  copied: boolean;
  onCopy: () => void;
  onRestyle: () => void;
  onNew: () => void;
}

export function DoneView({ videoId, title, subtitle, copied, onCopy, onRestyle, onNew }: DoneProps) {
  const fileName = title.replace(/[^\w\s-]/g, '').trim() || 'lyric-video';
  return (
    <section className="card flex flex-col items-center gap-7 p-5 sm:flex-row sm:items-center sm:justify-center sm:p-7">
      <video
        src={`${videoUrl(videoId)}#t=0.5`}
        controls
        playsInline
        preload="metadata"
        className="aspect-[9/16] w-full max-w-[300px] shrink-0 rounded-[22px] border border-line-strong bg-black"
      />
      <div className="flex w-full max-w-[280px] flex-col gap-3.5">
        <span className="flex items-center gap-2 font-semibold text-accent"><Check className="h-[18px] w-[18px]" strokeWidth={2.6} /> Ready</span>
        <h2 className="font-display text-[32px] font-extrabold leading-[1.05] tracking-tight">{title}</h2>
        <p className="text-sm text-muted">{subtitle}</p>
        <a href={downloadUrl(videoId, fileName)} className="btn-primary h-[52px]" download>
          <Download className="h-[18px] w-[18px]" /> Download MP4
        </a>
        <button type="button" onClick={onCopy} className="btn-ghost h-12">
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Link copied' : 'Copy share link'}
        </button>
        <button type="button" onClick={onRestyle} className="btn-ghost h-12">
          <Palette className="h-4 w-4" /> Try another theme
        </button>
        <button type="button" onClick={onNew} className="flex min-h-[44px] items-center justify-center gap-1.5 text-sm text-accent hover:text-accent-hover">
          <Plus className="h-4 w-4" /> Make a new video
        </button>
      </div>
    </section>
  );
}
