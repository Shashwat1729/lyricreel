import { readFile, rm } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { runProcess, tail } from '../lib/process';
import type { TranscriptResult, WordTimestamp } from '../types';

let whisperAvailable: boolean | null = null;

/** Whether the Python + WhisperX toolchain can be imported (cached after the first check). */
export async function isWhisperAvailable(): Promise<boolean> {
  if (!config.whisper.enabled) return false;
  if (whisperAvailable !== null) return whisperAvailable;
  try {
    const { code } = await runProcess(config.pythonPath, ['-c', 'import whisperx'], { timeoutMs: 60_000 });
    whisperAvailable = code === 0;
  } catch {
    whisperAvailable = false;
  }
  if (!whisperAvailable) console.warn('[whisperx] WhisperX not available; lyrics will come from LRCLIB only');
  return whisperAvailable;
}

export async function transcribeAudio(
  audioPath: string,
  opts: { onSpawn?: (kill: () => void) => void } = {},
): Promise<TranscriptResult> {
  const outputPath = path.join(config.tempDir, `whisperx-${randomUUID()}.json`);

  try {
    const result = await runProcess(
      config.pythonPath,
      [
        path.join(config.scriptsDir, 'whisperx_transcribe.py'),
        '--audio', audioPath,
        '--model_size', config.whisper.modelSize,
        '--device', config.whisper.device,
        '--compute_type', config.whisper.computeType,
        '--output', outputPath,
      ],
      {
        timeoutMs: config.whisper.timeoutMs,
        onSpawn: opts.onSpawn,
        onStderr: (s) => { const t = s.trim(); if (t) console.log(`[whisperx] ${t}`); },
      },
    );

    if (result.code !== 0) {
      throw new Error(`WhisperX failed (${result.signal ?? `exit ${result.code}`}): ${tail(result.stderr) || 'no output'}`);
    }

    const parsed = JSON.parse(await readFile(outputPath, 'utf-8')) as TranscriptResult;
    return { ...parsed, word_segments: extractWordTimestamps(parsed) };
  } finally {
    await rm(outputPath, { force: true }).catch(() => undefined);
  }
}

export function extractWordTimestamps(result: Partial<TranscriptResult>): WordTimestamp[] {
  if (!Array.isArray(result.word_segments)) return [];
  return result.word_segments
    .filter((w): w is WordTimestamp =>
      !!w && typeof w.word === 'string' && w.word.trim() !== '' &&
      Number.isFinite(w.start) && Number.isFinite(w.end))
    .map((w) => ({ word: w.word.trim(), start: w.start, end: Math.max(w.start, w.end) }))
    .sort((a, b) => a.start - b.start);
}
