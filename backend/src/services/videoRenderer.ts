import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { config } from '../config';
import { errorMessage } from '../lib/errors';
import { completeJob, failJob, getJob, isTerminal, setCancelHandler, updateJob } from './jobManager';
import type { VideoConfig } from '../types';

/*
 * Rendering uses Remotion's Node APIs (loaded from the remotion/ project so the backend doesn't
 * need its own copy). The project is bundled once and reused for every render, and renders run
 * through a small queue so several requests can't starve the machine.
 */

const COMPOSITION_ID = 'LyricVideo';

interface RemotionModules {
  bundle: (opts: { entryPoint: string; onProgress?: (p: number) => void }) => Promise<string>;
  selectComposition: (opts: Record<string, unknown>) => Promise<{ durationInFrames: number; fps: number }>;
  renderMedia: (opts: Record<string, unknown>) => Promise<unknown>;
  makeCancelSignal: () => { cancelSignal: unknown; cancel: () => void };
}

let modules: RemotionModules | null = null;
let serveUrlPromise: Promise<string> | null = null;

function loadRemotion(): RemotionModules {
  if (modules) return modules;
  const pkg = path.join(config.remotionDir, 'package.json');
  if (!fs.existsSync(pkg)) throw new Error(`Remotion project not found at ${config.remotionDir}`);
  const req = createRequire(pkg);
  try {
    const bundler = req('@remotion/bundler');
    const renderer = req('@remotion/renderer');
    modules = {
      bundle: bundler.bundle,
      selectComposition: renderer.selectComposition,
      renderMedia: renderer.renderMedia,
      makeCancelSignal: renderer.makeCancelSignal,
    };
    return modules;
  } catch (err) {
    throw new Error(`Remotion is not installed. Run "npm install" in the remotion folder (${errorMessage(err)})`);
  }
}

function getServeUrl(): Promise<string> {
  if (!serveUrlPromise) {
    const { bundle } = loadRemotion();
    console.log('[render] Bundling Remotion project (first render only)...');
    serveUrlPromise = bundle({ entryPoint: path.join(config.remotionDir, 'src/index.ts') })
      .then((url) => { console.log('[render] Bundle ready'); return url; })
      .catch((err) => { serveUrlPromise = null; throw err; });
  }
  return serveUrlPromise;
}

/** Start bundling in the background so the first render doesn't pay for it. */
export function warmUpRenderer(): void {
  try {
    getServeUrl().catch((err) => console.warn(`[render] Warm-up bundle failed: ${errorMessage(err)}`));
  } catch (err) {
    console.warn(`[render] ${errorMessage(err)}`);
  }
}

function frameConcurrency(): number {
  if (config.render.concurrency) return config.render.concurrency;
  const cores = os.cpus().length || 2;
  return Math.max(1, Math.min(8, Math.floor(cores / 2)));
}

function findBrowser(): string | null {
  if (config.render.browserExecutable) return config.render.browserExecutable;
  return null;
}

interface QueueItem {
  jobId: string;
  video: VideoConfig;
  outputPath: string;
}

const queue: QueueItem[] = [];
let running = 0;

export function queuePosition(jobId: string): number {
  return queue.findIndex((q) => q.jobId === jobId) + 1;
}

function refreshQueueMessages(): void {
  queue.forEach((item, i) => updateJob(item.jobId, { status: 'queued', message: `Waiting for ${i + 1} render${i ? 's' : ''} ahead` }));
}

/** Add a render to the queue. Progress, completion and errors are reported on the job. */
export function enqueueRender(jobId: string, video: VideoConfig, outputPath: string): void {
  queue.push({ jobId, video, outputPath });
  setCancelHandler(jobId, () => {
    const idx = queue.findIndex((q) => q.jobId === jobId);
    if (idx >= 0) { queue.splice(idx, 1); refreshQueueMessages(); }
  });
  refreshQueueMessages();
  pump();
}

function pump(): void {
  while (running < config.render.maxConcurrent && queue.length) {
    const item = queue.shift()!;
    refreshQueueMessages();
    const job = getJob(item.jobId);
    if (!job || isTerminal(job)) continue;
    running++;
    runRender(item)
      .catch((err) => {
        const job = getJob(item.jobId);
        if (job && !isTerminal(job)) failJob(item.jobId, friendlyRenderError(err));
        console.error(`[render] Job ${item.jobId} failed: ${errorMessage(err)}`);
        fs.rmSync(item.outputPath, { force: true });
      })
      .finally(() => { running--; pump(); });
  }
}

function friendlyRenderError(err: unknown): string {
  const msg = errorMessage(err, 'Render failed');
  if (/cancel/i.test(msg)) return 'Render cancelled';
  if (/browser|chrom/i.test(msg) && /(download|launch|found|executable)/i.test(msg)) {
    return 'Could not start the headless browser for rendering. Set REMOTION_BROWSER_EXECUTABLE or allow Remotion to download Chrome Headless Shell.';
  }
  return msg.length > 500 ? `${msg.slice(0, 500)}…` : msg;
}

async function runRender({ jobId, video, outputPath }: QueueItem): Promise<void> {
  const { selectComposition, renderMedia, makeCancelSignal } = loadRemotion();
  const { cancelSignal, cancel } = makeCancelSignal();
  setCancelHandler(jobId, cancel);

  updateJob(jobId, { status: 'rendering', progress: 1, message: 'Preparing renderer' });
  const serveUrl = await getServeUrl();

  const inputProps = {
    audioSrc: `http://127.0.0.1:${config.port}/uploads/${path.basename(video.audioFile)}`,
    words: video.words,
    theme: video.theme,
    title: video.title ?? null,
    artist: video.artist ?? null,
    clipStart: video.clipStart,
    durationInSeconds: video.durationInSeconds,
  };

  const browserExecutable = findBrowser();
  const common = {
    serveUrl,
    inputProps,
    timeoutInMilliseconds: 60_000,
    ...(browserExecutable ? { browserExecutable } : {}),
    ...(config.render.gl ? { chromiumOptions: { gl: config.render.gl } } : {}),
    logLevel: 'warn',
  };

  const composition = await selectComposition({ ...common, id: COMPOSITION_ID });
  const job = getJob(jobId);
  if (!job || isTerminal(job)) return;

  updateJob(jobId, { message: 'Rendering frames', progress: 2 });
  let lastPct = -1;

  await renderMedia({
    ...common,
    composition,
    codec: 'h264',
    outputLocation: outputPath,
    overwrite: true,
    imageFormat: 'jpeg',
    jpegQuality: 85,
    concurrency: frameConcurrency(),
    cancelSignal,
    onProgress: ({ progress, renderedFrames, encodedFrames, stitchStage }: { progress: number; renderedFrames: number; encodedFrames: number; stitchStage: string }) => {
      const pct = Math.min(99, Math.max(2, Math.round(progress * 100)));
      if (pct === lastPct) return;
      lastPct = pct;
      const message = stitchStage === 'muxing'
        ? 'Adding audio'
        : renderedFrames < composition.durationInFrames
          ? `Rendering frames (${renderedFrames}/${composition.durationInFrames})`
          : `Encoding video (${encodedFrames}/${composition.durationInFrames})`;
      updateJob(jobId, { progress: pct, message });
    },
  });

  if (!fs.existsSync(outputPath)) throw new Error('Render finished but the video file is missing');
  completeJob(jobId, { outputFile: outputPath });
  console.log(`[render] Job ${jobId} complete -> ${path.basename(outputPath)}`);
}
