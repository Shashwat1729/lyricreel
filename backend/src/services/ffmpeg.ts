import fs from 'fs';
import path from 'path';
import { config } from '../config';
import { runProcess } from '../lib/process';

/** Remotion ships ffprobe with its compositor; use it when the system has none. */
function bundledFfprobe(): { command: string; env: NodeJS.ProcessEnv } | null {
  const base = path.join(config.remotionDir, 'node_modules', '@remotion');
  let dirs: string[];
  try { dirs = fs.readdirSync(base).filter((d) => d.startsWith(`compositor-${process.platform}-${process.arch}`)); } catch { return null; }
  for (const dir of dirs) {
    const bin = path.join(base, dir, process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe');
    if (fs.existsSync(bin)) {
      const libDir = path.dirname(bin);
      return { command: bin, env: { ...process.env, LD_LIBRARY_PATH: [libDir, process.env.LD_LIBRARY_PATH].filter(Boolean).join(path.delimiter), DYLD_LIBRARY_PATH: libDir } };
    }
  }
  return null;
}

function parseDurationLine(text: string): number | null {
  const m = text.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/);
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/**
 * Audio duration in seconds. Tries ffprobe (system, then Remotion's bundled copy), then `ffmpeg -i`.
 * Resolves null when neither tool is available or the duration can't be read.
 */
export async function getAudioDuration(audioPath: string): Promise<number | null> {
  const probeArgs = ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', audioPath];
  const bundled = bundledFfprobe();
  const probes = [{ command: config.ffprobePath, env: process.env }, ...(bundled ? [bundled] : [])];
  for (const probe of probes) {
    try {
      const { code, stdout } = await runProcess(probe.command, probeArgs, { timeoutMs: 20_000, env: probe.env });
      const n = Number.parseFloat(stdout.trim());
      if (code === 0 && Number.isFinite(n) && n > 0) return n;
    } catch { /* try the next one */ }
  }

  try {
    // `ffmpeg -i file` with no output exits non-zero but prints the duration header
    const { stderr } = await runProcess(config.ffmpegPath, ['-hide_banner', '-i', audioPath], { timeoutMs: 20_000 });
    const d = parseDurationLine(stderr);
    if (d && d > 0) return d;
  } catch { /* not installed */ }

  return null;
}

export async function isAvailable(command: string, args = ['-version']): Promise<boolean> {
  try {
    const { code } = await runProcess(command, args, { timeoutMs: 10_000 });
    return code === 0;
  } catch {
    return false;
  }
}
