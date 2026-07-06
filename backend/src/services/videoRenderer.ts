import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { VideoConfig } from '../types';
import { setJobComplete, setJobError, setJobProcessing, updateJob } from './jobManager';

const FRAME_PROGRESS_REGEX = /Rendered\s+(\d+)\s+of\s+(\d+)\s+frames/i;
const STDOUT_LINE_SPLIT_REGEX = /\r?\n/;

function getBackendPath(): string {
  return path.resolve(__dirname, '../..');
}

export function getRemotionProjectPath(): string {
  return path.resolve(getBackendPath(), '../remotion');
}

/**
 * Determine optimal concurrency based on available CPU cores and current load.
 * Uses 50-75% of available cores, minimum 2 (unless single-core).
 */
function getOptimalConcurrency(): number {
  const totalCores = os.cpus().length;
  const loadAvg1m = os.loadavg()[0]; // 1-minute load average
  const availableCores = Math.max(1, totalCores - Math.ceil(loadAvg1m));
  
  // Use 75% of available cores, min 3, max 12
  const concurrency = Math.min(12, Math.max(3, Math.floor(availableCores * 0.75)));
  
  console.log(`[videoRenderer] CPU: ${totalCores} cores, load: ${loadAvg1m.toFixed(1)}, using concurrency: ${concurrency}`);
  return concurrency;
}

export async function renderVideo(jobId: string, config: VideoConfig, outputPath: string): Promise<string> {
  const props = JSON.stringify({
    audioSrc: `http://localhost:${process.env.PORT || 5001}/uploads/${path.basename(config.audioUrl)}`,
    words: config.words,
    theme: config.theme,
    backgroundUrl: config.backgroundUrl ?? null,
    durationInSeconds: config.durationInSeconds,
  });

  // Write props to temp file to avoid shell injection via --props arg
  const propsFile = path.resolve(getBackendPath(), `../temp/props-${jobId}.json`);
  try {
    fs.mkdirSync(path.dirname(propsFile), { recursive: true });
    fs.writeFileSync(propsFile, props, 'utf-8');
  } catch (err: any) {
    setJobError(jobId, `Failed to write render props: ${err.message}`);
    throw err;
  }

  const remotionBin = path.resolve(getRemotionProjectPath(), 'node_modules/.bin/remotion');
  const command = fs.existsSync(remotionBin) ? remotionBin : (process.platform === 'win32' ? 'npx.cmd' : 'npx');

  console.log(`[videoRenderer] Starting render for job ${jobId}`);
  setJobProcessing(jobId);
  updateJob(jobId, { progress: 0 });

  return new Promise((resolve, reject) => {
    let stderr = '';
    let settled = false;
    let lastProgress = -1;
    const RENDER_TIMEOUT_MS = 15 * 60 * 1000; // 15 minute timeout

    const cleanup = () => {
      try { fs.unlinkSync(propsFile); } catch {}
    };

    const handleFailure = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      console.error(`[videoRenderer] Render failed for job ${jobId}: ${error.message}`);
      try { setJobError(jobId, error.message); } catch {}
      reject(error);
    };

    const entryPoint = path.resolve(getRemotionProjectPath(), 'src/index.ts');

    const concurrency = getOptimalConcurrency();
    // Browser launch timeout: 90s for dev/WSL, 30s in production
    const browserTimeout = process.env.NODE_ENV === 'production' ? '30000' : '90000';

    // Use bundled browser if available (avoids search delay)
    const bundledBrowser = path.resolve(getRemotionProjectPath(), 'node_modules/.remotion/chrome-headless-shell/linux64/chrome-headless-shell-linux64/chrome-headless-shell');
    const browserArgs: string[] = fs.existsSync(bundledBrowser)
      ? [`--browser-executable=${bundledBrowser}`]
      : [];

    // Performance flags: gl=angle for GPU, JPEG frames (faster encode), scale down slightly
    const perfArgs = [
      '--gl=angle',           // GPU-accelerated rendering
      '--jpeg-quality=85',    // Faster frame encoding than PNG
      '--scale=1',            // Full resolution
      '--muted',              // Skip audio decode during frame render
    ];

    const args = command === remotionBin
      ? ['render', entryPoint, 'LyricVideo', `--props=${propsFile}`, `--output=${outputPath}`, `--timeout=${browserTimeout}`, `--concurrency=${concurrency}`, ...browserArgs, ...perfArgs]
      : ['remotion', 'render', entryPoint, 'LyricVideo', `--props=${propsFile}`, `--output=${outputPath}`, `--timeout=${browserTimeout}`, `--concurrency=${concurrency}`, ...browserArgs, ...perfArgs];

    const proc = spawn(
      command,
      args,
      {
        cwd: getRemotionProjectPath(),
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    // Kill render if it exceeds timeout
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      handleFailure(new Error('Render timed out after 15 minutes'));
    }, RENDER_TIMEOUT_MS);

    proc.stdout.on('data', (data) => {
      const output = data.toString();
      for (const line of output.split(STDOUT_LINE_SPLIT_REGEX)) {
        const match = line.match(FRAME_PROGRESS_REGEX);
        if (!match) continue;
        const renderedFrames = parseInt(match[1], 10);
        const totalFrames = parseInt(match[2], 10);
        if (totalFrames <= 0) continue;
        const progress = Math.min(Math.round((renderedFrames / totalFrames) * 100), 99);
        if (progress !== lastProgress) {
          lastProgress = progress;
          updateJob(jobId, { progress });
        }
      }
    });

    proc.stderr.on('data', (data) => {
      const output = data.toString();
      if (stderr.length < 10000) stderr += output;
      for (const line of output.split(STDOUT_LINE_SPLIT_REGEX)) {
        const match = line.match(FRAME_PROGRESS_REGEX);
        if (!match) continue;
        const renderedFrames = parseInt(match[1], 10);
        const totalFrames = parseInt(match[2], 10);
        if (totalFrames <= 0) continue;
        const progress = Math.min(Math.round((renderedFrames / totalFrames) * 100), 99);
        if (progress !== lastProgress) {
          lastProgress = progress;
          updateJob(jobId, { progress });
        }
      }
    });
    proc.on('error', (error) => handleFailure(new Error(`Failed to start Remotion: ${error.message}`)));

    proc.on('close', (code) => {
      clearTimeout(timeout);
      if (settled) return;
      if (code === 0) {
        settled = true;
        cleanup();
        console.log(`[videoRenderer] Render completed for job ${jobId}`);
        setJobComplete(jobId, outputPath);
        resolve(outputPath);
      } else {
        handleFailure(new Error(stderr.trim().slice(0, 500) || `Remotion render exited with code ${code}`));
      }
    });
  });
}
