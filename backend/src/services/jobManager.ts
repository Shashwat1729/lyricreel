import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config';
import type { Job, JobKind } from '../types';

const jobs = new Map<string, Job>();
const cancelHandlers = new Map<string, () => void>();

const TERMINAL = new Set<Job['status']>(['complete', 'error', 'cancelled']);

export function isTerminal(job: Job): boolean {
  return TERMINAL.has(job.status);
}

export function createJob(kind: JobKind, init: Partial<Job> = {}): Job {
  const now = Date.now();
  const job: Job = { status: 'pending', progress: 0, ...init, id: randomUUID(), kind, createdAt: now, updatedAt: now };
  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

/** Update a job. Updates to a job that is already finished are ignored (e.g. late progress after cancel). */
export function updateJob(id: string, updates: Partial<Omit<Job, 'id' | 'kind' | 'createdAt'>>): Job | undefined {
  const current = jobs.get(id);
  if (!current) return undefined;
  if (isTerminal(current)) return current;
  const next: Job = { ...current, ...updates, id: current.id, kind: current.kind, updatedAt: Date.now() };
  if (typeof next.progress === 'number') next.progress = Math.max(0, Math.min(100, Math.round(next.progress)));
  jobs.set(id, next);
  if (isTerminal(next)) cancelHandlers.delete(id);
  return next;
}

export function completeJob(id: string, updates: Partial<Job> = {}): void {
  updateJob(id, { ...updates, status: 'complete', progress: 100, message: undefined, error: undefined });
}

export function failJob(id: string, error: string): void {
  updateJob(id, { status: 'error', error, message: undefined });
}

export function setCancelHandler(id: string, handler: () => void): void {
  cancelHandlers.set(id, handler);
}

/** Cancel a running job. Returns false if the job is unknown or already finished. */
export function cancelJob(id: string): boolean {
  const job = jobs.get(id);
  if (!job || isTerminal(job)) return false;
  const handler = cancelHandlers.get(id);
  updateJob(id, { status: 'cancelled', message: undefined, error: 'Cancelled' });
  cancelHandlers.delete(id);
  try { handler?.(); } catch (err) { console.warn(`[jobs] Cancel handler for ${id} failed:`, err); }
  return true;
}

/** Public view of a job (no absolute paths) */
export function serializeJob(job: Job) {
  return {
    id: job.id,
    kind: job.kind,
    status: job.status,
    progress: job.progress,
    message: job.message,
    error: job.error,
    filename: job.audioFile ? path.basename(job.audioFile) : undefined,
    outputFile: job.outputFile ? path.basename(job.outputFile) : undefined,
    videoId: job.kind === 'render' && job.status === 'complete' ? job.id : undefined,
    metadata: job.metadata,
    transcript: job.transcript,
  };
}

function activeFiles(): Set<string> {
  const set = new Set<string>();
  for (const job of jobs.values()) {
    if (isTerminal(job)) continue;
    if (job.audioFile) set.add(path.resolve(job.audioFile));
    if (job.outputFile) set.add(path.resolve(job.outputFile));
  }
  return set;
}

function sweepDir(dir: string, maxAgeMs: number, keep: Set<string>): number {
  let removed = 0;
  let entries: string[];
  try { entries = fs.readdirSync(dir); } catch { return 0; }
  const cutoff = Date.now() - maxAgeMs;
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (keep.has(full)) continue;
    try {
      const stat = fs.statSync(full);
      if (stat.isFile() && stat.mtimeMs < cutoff) {
        fs.unlinkSync(full);
        removed++;
      }
    } catch { /* raced with another delete */ }
  }
  return removed;
}

/** Forget old finished jobs and delete stale files on disk (never ones an active job still uses). */
export function runCleanup(): void {
  const now = Date.now();
  let evicted = 0;
  for (const [id, job] of jobs) {
    const stale = now - job.updatedAt > config.jobTtlMs;
    // Guard against jobs that got stuck without ever finishing
    const stuck = !isTerminal(job) && now - job.updatedAt > Math.max(config.render.timeoutMs, config.whisper.timeoutMs) * 2;
    if ((isTerminal(job) && stale) || stuck) {
      if (stuck) cancelJob(id);
      jobs.delete(id);
      evicted++;
    }
  }

  const keep = activeFiles();
  const files = sweepDir(config.uploadDir, config.fileTtlMs, keep)
    + sweepDir(config.renderDir, config.fileTtlMs, keep)
    + sweepDir(config.tempDir, Math.min(config.fileTtlMs, 6 * 3_600_000), keep);

  if (evicted || files) console.log(`[jobs] Cleanup: ${evicted} jobs evicted, ${files} files removed, ${jobs.size} jobs tracked`);
}

let cleanupTimer: NodeJS.Timeout | null = null;

export function startJobCleanup(intervalMs = 10 * 60_000): void {
  if (cleanupTimer) return;
  runCleanup();
  cleanupTimer = setInterval(runCleanup, intervalMs);
  cleanupTimer.unref();
}

export function cancelAllJobs(): void {
  for (const id of jobs.keys()) cancelJob(id);
}
