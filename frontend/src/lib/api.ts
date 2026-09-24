import type { AudioQuality, Job, ThemeName, UploadResult, WordTimestamp, YouTubeInfo } from '@/types';

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001').replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, init);
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err;
    throw new ApiError(`Can't reach the LyricReel server at ${API_URL}. Is the backend running?`, 0);
  }
  const text = await res.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { /* not JSON */ }
  if (!res.ok) {
    const message = (body as { error?: string } | null)?.error || `Request failed (${res.status})`;
    throw new ApiError(message, res.status);
  }
  return body as T;
}

function postJson<T>(path: string, data: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
    signal,
  });
}

/** Upload with progress reporting (fetch has no upload progress, so this uses XHR). */
export function uploadSong(file: File, onProgress?: (pct: number) => void, signal?: AbortSignal): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const form = new FormData();
    form.append('audio', file);
    xhr.open('POST', `${API_URL}/upload-song`);
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      let body: { error?: string } & Partial<UploadResult> = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* ignore */ }
      if (xhr.status >= 200 && xhr.status < 300) resolve(body as UploadResult);
      else reject(new ApiError(body.error || `Upload failed (${xhr.status})`, xhr.status));
    };
    xhr.onerror = () => reject(new ApiError(`Can't reach the LyricReel server at ${API_URL}. Is the backend running?`, 0));
    xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'));
    signal?.addEventListener('abort', () => xhr.abort());
    xhr.send(form);
  });
}

export function getYouTubeInfo(url: string, signal?: AbortSignal) {
  return postJson<YouTubeInfo>('/youtube-download/info', { url }, signal);
}

export function startYouTubeDownload(url: string, quality: AudioQuality) {
  return postJson<{ jobId: string; videoId: string }>('/youtube-download', { url, quality });
}

export function startTranscription(filename: string, title?: string, artist?: string, duration?: number) {
  return postJson<{ jobId: string }>('/generate-transcript', { filename, title, artist, duration });
}

export interface RenderRequest {
  filename: string;
  words: WordTimestamp[];
  theme: ThemeName;
  title?: string;
  artist?: string;
  offset?: number;
  clipStart?: number;
  clipEnd?: number;
}

export function startRender(req: RenderRequest) {
  return postJson<{ jobId: string; duration: number }>('/generate-video/generate', req);
}

export function getJob(jobId: string, signal?: AbortSignal) {
  return request<Job>(`/jobs/${jobId}`, { signal });
}

export function cancelJob(jobId: string) {
  return request<{ cancelled: boolean }>(`/jobs/${jobId}`, { method: 'DELETE' }).catch(() => ({ cancelled: false }));
}

export function audioUrl(filename: string) {
  return `${API_URL}/uploads/${encodeURIComponent(filename)}`;
}

export function videoUrl(videoId: string) {
  return `${API_URL}/video/${videoId}`;
}

export function downloadUrl(videoId: string, name?: string) {
  const q = new URLSearchParams({ download: '1' });
  if (name) q.set('name', name);
  return `${API_URL}/video/${videoId}?${q}`;
}

const sleep = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
  });

/**
 * Poll a job until it finishes. Tolerates brief network blips; rejects with the job's error
 * message on failure and with an AbortError when `signal` is aborted.
 */
export async function waitForJob(jobId: string, onUpdate: (job: Job) => void, signal?: AbortSignal): Promise<Job> {
  let failures = 0;
  let delay = 700;
  for (;;) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const job = await getJob(jobId, signal);
      failures = 0;
      onUpdate(job);
      if (job.status === 'complete') return job;
      if (job.status === 'error') throw new ApiError(job.error || 'Something went wrong', 500);
      if (job.status === 'cancelled') throw new DOMException('Cancelled', 'AbortError');
    } catch (err) {
      if (err instanceof DOMException || (err as Error).name === 'AbortError') throw err;
      if (err instanceof ApiError && err.status !== 0) throw err;
      if (++failures >= 5) throw err;
    }
    await sleep(delay, signal);
    delay = Math.min(2000, delay + 150);
  }
}

export function isAbort(err: unknown): boolean {
  return (err as Error)?.name === 'AbortError';
}

export function errorText(err: unknown, fallback = 'Something went wrong'): string {
  return err instanceof Error && err.message ? err.message : fallback;
}
