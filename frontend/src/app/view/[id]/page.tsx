'use client';

import { AlertCircle, Check, Copy, Download, Plus } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/Logo';
import { downloadUrl, videoUrl } from '@/lib/api';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function ViewPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params?.id === 'string' ? params.id : '';
  const valid = UUID_RE.test(id);
  const [failed, setFailed] = useState(!valid);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this link', window.location.href);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-[68px] items-center justify-between border-b border-line px-4 sm:px-10">
        <Logo />
        <Link href="/create" className="btn-ghost h-10 min-h-0 text-sm"><Plus className="h-4 w-4" /> New video</Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-10">
        {failed ? (
          <div className="card flex max-w-md flex-col items-center gap-4 p-10 text-center">
            <AlertCircle className="h-8 w-8 text-danger" />
            <h1 className="font-display text-2xl font-extrabold">Video not found</h1>
            <p className="text-muted">It may have expired (videos are kept for 24 hours) or the link is incomplete.</p>
            <Link href="/create" className="btn-primary mt-2">Make a new video</Link>
          </div>
        ) : (
          <div className="flex w-full max-w-[360px] flex-col gap-4">
            <h1 className="sr-only">Lyric video</h1>
            <video
              src={`${videoUrl(id)}#t=0.5`}
              controls
              playsInline
              preload="metadata"
              onError={() => setFailed(true)}
              className="aspect-[9/16] w-full rounded-[22px] border border-line-strong bg-black"
            />
            <div className="flex gap-2.5">
              <a href={downloadUrl(id)} download className="btn-primary h-12 flex-1"><Download className="h-4 w-4" /> Download MP4</a>
              <button type="button" onClick={copy} className="btn-ghost h-12">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copied' : 'Copy link'}
              </button>
            </div>
            <p className="text-center font-mono text-xs text-muted">1080×1920 · H.264 · AAC</p>
          </div>
        )}
      </main>
    </div>
  );
}
