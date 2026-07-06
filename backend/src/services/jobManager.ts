import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { Job } from '../types';

const jobs = new Map<string, Job>();

const JOB_TTL_MS = 60 * 60 * 1000; // 1 hour
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes

export function createJob(): Job {
  const job: Job = {
    id: uuidv4(),
    status: 'pending',
    progress: 0,
    audioFile: '',
    theme: 'neon',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  jobs.set(job.id, job);
  return job;
}

export function getJob(id: string): Job | undefined {
  return jobs.get(id);
}

export function updateJob(id: string, updates: Partial<Job>): Job {
  const currentJob = jobs.get(id);
  if (!currentJob) {
    throw new Error(`Job not found: ${id}`);
  }

  const updatedJob: Job = {
    ...currentJob,
    ...updates,
    id: currentJob.id,
    updatedAt: new Date(),
  };

  jobs.set(id, updatedJob);
  return updatedJob;
}

export function setJobProcessing(id: string): void {
  updateJob(id, { status: 'rendering' });
}

export function setJobComplete(id: string, result: string): void {
  updateJob(id, { status: 'complete', progress: 100, outputFile: result, error: undefined });
}

export function setJobError(id: string, error: string): void {
  updateJob(id, { status: 'error', error });
}

export function getAllJobs(): Job[] {
  return Array.from(jobs.values());
}

/** Evict expired jobs and delete their rendered files */
function cleanupExpiredJobs(): void {
  const now = Date.now();
  let cleaned = 0;

  for (const [id, job] of jobs.entries()) {
    const age = now - job.createdAt.getTime();
    if (age > JOB_TTL_MS && (job.status === 'complete' || job.status === 'error')) {
      // Delete rendered file if exists
      if (job.outputFile) {
        try { fs.unlinkSync(job.outputFile); } catch { /* already gone */ }
      }
      // Delete uploaded audio file if exists
      if (job.audioFile) {
        try { fs.unlinkSync(job.audioFile); } catch { /* already gone */ }
      }
      jobs.delete(id);
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[jobManager] Cleaned ${cleaned} expired jobs. Active: ${jobs.size}`);
  }
}

export function startJobCleanup(): void {
  setInterval(cleanupExpiredJobs, CLEANUP_INTERVAL_MS);
}
