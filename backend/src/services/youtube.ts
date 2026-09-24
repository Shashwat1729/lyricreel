import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { runProcess, tail } from '../lib/process';
import { HttpError } from '../lib/errors';
import { parseArtistAndTrack } from './lyrics';
import type { JobMetadata } from '../types';

const VIDEO_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const ALLOWED_HOSTS = new Set(['www.youtube.com', 'youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtu.be', 'www.youtu.be']);

export type AudioQuality = 'fast' | 'balanced' | 'best';

/** Extract the video id from any supported YouTube URL form; throws HttpError(400) otherwise. */
export function extractVideoId(input: unknown): string {
  if (typeof input !== 'string' || !input.trim()) throw new HttpError(400, 'A YouTube URL is required');
  const raw = input.trim();
  if (VIDEO_ID_RE.test(raw)) return raw;

  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new HttpError(400, 'That does not look like a URL');
  }
  if (!['http:', 'https:'].includes(url.protocol) || !ALLOWED_HOSTS.has(url.hostname.toLowerCase())) {
    throw new HttpError(400, 'Only youtube.com and youtu.be links are supported');
  }

  let id: string | null = null;
  if (url.hostname.toLowerCase().endsWith('youtu.be')) {
    id = url.pathname.split('/')[1] ?? null;
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v');
  } else {
    const m = url.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
    id = m ? m[1] : null;
  }
  if (!id || !VIDEO_ID_RE.test(id)) throw new HttpError(400, 'Could not find a video id in that YouTube link');
  return id;
}

export function canonicalUrl(videoId: string): string {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

interface YtInfo {
  title?: string;
  track?: string;
  artist?: string;
  creator?: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  thumbnail?: string;
  is_live?: boolean;
}

function toMetadata(info: YtInfo, videoId: string): JobMetadata {
  const title = info.title || 'Unknown';
  const guessed = parseArtistAndTrack(title, info.uploader || info.channel);
  const artist = (info.artist || info.creator || guessed.artist || '').split(',')[0].trim() || undefined;
  return {
    title,
    track: info.track || guessed.track,
    artist,
    duration: typeof info.duration === 'number' ? info.duration : undefined,
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
  };
}

function ytDlpError(stderr: string, fallback: string): Error {
  const text = stderr.toLowerCase();
  if (text.includes('private video')) return new Error('This video is private');
  if (text.includes('sign in to confirm your age')) return new Error('This video is age-restricted and cannot be downloaded');
  if (text.includes('video unavailable')) return new Error('This video is unavailable');
  if (text.includes('sign in to confirm')) return new Error('YouTube is asking for a sign-in (bot check). Try again later or upload the audio file instead');
  return new Error(`${fallback}: ${tail(stderr) || 'unknown error'}`);
}

export async function getVideoInfo(videoId: string): Promise<JobMetadata> {
  const result = await runProcess(
    config.ytDlpPath,
    ['--dump-json', '--skip-download', '--no-playlist', '--no-warnings', '--no-exec', canonicalUrl(videoId)],
    { timeoutMs: 60_000, maxOutput: 4 * 1024 * 1024 },
  ).catch((err) => {
    throw err?.notFound ? new Error('yt-dlp is not installed on the server (pip install yt-dlp)') : err;
  });
  if (result.code !== 0) throw ytDlpError(result.stderr, 'Could not read video info');

  let info: YtInfo;
  try {
    info = JSON.parse(result.stdout) as YtInfo;
  } catch {
    throw new Error('Could not read video info (unexpected yt-dlp output)');
  }
  if (info.is_live) throw new Error('Live streams are not supported');
  return toMetadata(info, videoId);
}

const QUALITY_ARGS: Record<AudioQuality, string> = { fast: '7', balanced: '4', best: '0' };

export async function downloadAudio(
  videoId: string,
  quality: AudioQuality,
  hooks: { onProgress?: (pct: number) => void; onSpawn?: (kill: () => void) => void } = {},
): Promise<{ filepath: string; metadata: JobMetadata }> {
  const metadata = await getVideoInfo(videoId);
  if (metadata.duration && metadata.duration > config.maxMediaSeconds) {
    throw new Error(`Video is too long (max ${Math.round(config.maxMediaSeconds / 60)} minutes)`);
  }

  const fileId = randomUUID();
  const outputTemplate = path.join(config.uploadDir, `${fileId}.%(ext)s`);
  const expected = path.join(config.uploadDir, `${fileId}.mp3`);

  const result = await runProcess(
    config.ytDlpPath,
    [
      '-f', 'bestaudio/best',
      '-x', '--audio-format', 'mp3', '--audio-quality', QUALITY_ARGS[quality],
      '--no-playlist', '--no-exec', '--no-warnings', '--newline',
      '--max-filesize', `${Math.round(config.maxUploadBytes / (1024 * 1024)) * 2}M`,
      ...(config.ffmpegPath !== 'ffmpeg' ? ['--ffmpeg-location', config.ffmpegPath] : []),
      '-o', outputTemplate,
      canonicalUrl(videoId),
    ],
    {
      timeoutMs: 10 * 60_000,
      onSpawn: hooks.onSpawn,
      onStdout: (chunk) => {
        const matches = [...chunk.matchAll(/\[download\]\s+(\d+(?:\.\d+)?)%/g)];
        const last = matches.at(-1);
        if (last) hooks.onProgress?.(Number(last[1]));
      },
    },
  );

  if (result.code !== 0) {
    for (const f of fs.readdirSync(config.uploadDir).filter((f) => f.startsWith(fileId))) {
      fs.rmSync(path.join(config.uploadDir, f), { force: true });
    }
    throw ytDlpError(result.stderr, 'Download failed');
  }

  if (fs.existsSync(expected)) return { filepath: expected, metadata };
  const produced = fs.readdirSync(config.uploadDir).find((f) => f.startsWith(fileId) && !f.endsWith('.part'));
  if (!produced) throw new Error('Download finished but no audio file was produced (is ffmpeg installed?)');
  return { filepath: path.join(config.uploadDir, produced), metadata };
}
