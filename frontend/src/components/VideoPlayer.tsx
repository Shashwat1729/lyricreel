'use client';

import { Download, RotateCcw } from 'lucide-react';
import Link from 'next/link';

interface Props {
  url: string;
}

export function VideoPlayer({ url }: Props) {
  return (
    <div className="mt-8 flex flex-col items-center gap-6">
      <h2 className="text-2xl font-bold text-accent">Your Video is Ready! 🎉</h2>
      <div className="glass p-4 rounded-2xl overflow-hidden max-w-sm">
        <video
          src={url}
          controls
          className="w-full rounded-xl"
          style={{ aspectRatio: '9/16' }}
        />
      </div>
      <div className="flex gap-4">
        <a
          href={url}
          download
          className="flex items-center gap-2 px-6 py-3 bg-accent text-black font-bold rounded-xl hover:scale-105 transition-transform"
        >
          <Download className="w-5 h-5" />
          Download MP4
        </a>
        <Link
          href="/create"
          className="flex items-center gap-2 px-6 py-3 border border-white/20 rounded-xl hover:bg-white/5 transition-colors"
        >
          <RotateCcw className="w-5 h-5" />
          Create Another
        </Link>
      </div>
    </div>
  );
}
