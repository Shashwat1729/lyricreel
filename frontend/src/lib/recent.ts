import type { ThemeName } from '@/types';

export interface RecentVideo {
  videoId: string;
  title: string;
  artist?: string;
  theme: ThemeName;
  createdAt: number;
}

const KEY = 'lyricreel:recent';
/** Rendered files are removed by the server after FILE_TTL_HOURS (24h by default). */
const MAX_AGE_MS = 24 * 3_600_000;

export function loadRecent(): RecentVideo[] {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]') as RecentVideo[];
    return Array.isArray(list) ? list.filter((v) => v && typeof v.videoId === 'string' && Date.now() - v.createdAt < MAX_AGE_MS) : [];
  } catch {
    return [];
  }
}

export function saveRecent(video: RecentVideo): RecentVideo[] {
  const list = [video, ...loadRecent().filter((v) => v.videoId !== video.videoId)].slice(0, 6);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* storage full or unavailable */ }
  return list;
}

export function timeAgo(ts: number): string {
  const mins = Math.floor((Date.now() - ts) / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} h ago`;
}
