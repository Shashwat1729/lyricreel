import path from 'path';
import dotenv from 'dotenv';

// Repo root (works from both src/ and dist/)
export const ROOT_DIR = path.resolve(__dirname, '../..');

dotenv.config({ path: path.join(ROOT_DIR, '.env'), quiet: true });

function dirFromEnv(value: string | undefined, fallback: string): string {
  const raw = value && value.trim() ? value.trim() : fallback;
  return path.isAbsolute(raw) ? raw : path.resolve(ROOT_DIR, raw);
}

function intFromEnv(value: string | undefined, fallback: number, min = 0): number {
  const n = Number.parseInt(value ?? '', 10);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

const isWindows = process.platform === 'win32';

export const config = {
  port: intFromEnv(process.env.PORT, 3001, 1),
  isProduction: process.env.NODE_ENV === 'production',
  corsOrigins: (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:3000,http://127.0.0.1:3000')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  uploadDir: dirFromEnv(process.env.UPLOAD_DIR, 'uploads'),
  renderDir: dirFromEnv(process.env.RENDER_DIR, 'renders'),
  tempDir: dirFromEnv(process.env.TEMP_DIR, 'temp'),
  remotionDir: dirFromEnv(process.env.REMOTION_DIR, 'remotion'),
  scriptsDir: path.resolve(__dirname, '../scripts'),

  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
  ytDlpPath: process.env.YTDLP_PATH || 'yt-dlp',
  pythonPath: process.env.PYTHON_PATH || (isWindows ? 'python' : 'python3'),

  whisper: {
    enabled: process.env.WHISPERX_ENABLED !== 'false',
    modelSize: process.env.WHISPERX_MODEL_SIZE || 'base',
    device: process.env.WHISPERX_DEVICE || 'cpu',
    computeType: process.env.WHISPERX_COMPUTE_TYPE || 'int8',
    timeoutMs: intFromEnv(process.env.WHISPERX_TIMEOUT_MINUTES, 20, 1) * 60_000,
  },

  render: {
    maxConcurrent: intFromEnv(process.env.RENDER_MAX_CONCURRENT, 1, 1),
    timeoutMs: intFromEnv(process.env.RENDER_TIMEOUT_MINUTES, 30, 1) * 60_000,
    concurrency: process.env.REMOTION_CONCURRENCY ? intFromEnv(process.env.REMOTION_CONCURRENCY, 0, 1) : 0,
    browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE || '',
    gl: process.env.REMOTION_GL || '',
  },

  maxUploadBytes: intFromEnv(process.env.MAX_UPLOAD_MB, 50, 1) * 1024 * 1024,
  maxMediaSeconds: intFromEnv(process.env.MAX_MEDIA_MINUTES, 15, 1) * 60,
  jobTtlMs: intFromEnv(process.env.JOB_TTL_MINUTES, 120, 1) * 60_000,
  fileTtlMs: intFromEnv(process.env.FILE_TTL_HOURS, 24, 1) * 3_600_000,
} as const;

export const THEMES = ['neon', 'anime', 'sad', 'synthwave', 'minimalist', 'cinematic'] as const;
