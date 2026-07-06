import { spawn } from 'child_process';
import { readFile, rm } from 'fs/promises';
import path from 'path';
import { TranscriptResult as TranscriptionResult, WordTimestamp } from '../types';

const SCRIPTS_DIR = path.resolve(__dirname, '../../scripts');
const PYTHON = process.env.PYTHON_PATH || 'python';

export async function transcribeAudio(
  audioPath: string,
  modelSize: string = process.env.WHISPERX_MODEL_SIZE || 'base'
): Promise<TranscriptionResult> {
  const outputPath = path.join(
    path.dirname(audioPath),
    `${path.basename(audioPath, path.extname(audioPath))}-${Date.now()}-${process.pid}.json`
  );

  try {
    await new Promise<void>((resolve, reject) => {
      const python = spawn(
        PYTHON,
        [
          path.join(SCRIPTS_DIR, 'whisperx_transcribe.py'),
          '--audio', audioPath,
          '--model_size', modelSize,
          '--output', outputPath,
        ],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      );

      let stderr = '';

      python.stderr.on('data', (data) => {
        const message = data.toString();
        stderr += message;

        if (message.trim()) {
          console.error(`[WhisperX] ${message.trim()}`);
        }
      });

      python.on('error', (error) => {
        reject(new Error(`Failed to start WhisperX process: ${error.message}`));
      });

      python.on('close', (code, signal) => {
        if (code !== 0) {
          const details = stderr.trim();
          const reason = signal
            ? `signal ${signal}`
            : code === null
              ? 'unknown exit status'
              : `exit code ${code}`;

          reject(
            new Error(
              details
                ? `WhisperX transcription failed with ${reason}: ${details}`
                : `WhisperX transcription failed with ${reason}`
            )
          );
          return;
        }

        resolve();
      });
    });

    const rawResult = await readFile(outputPath, 'utf-8');

    try {
      return JSON.parse(rawResult) as TranscriptionResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to parse WhisperX output JSON: ${message}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Transcription failed for ${audioPath}: ${message}`);
    throw error;
  } finally {
    try {
      await rm(outputPath, { force: true });
    } catch (cleanupError) {
      const message = cleanupError instanceof Error ? cleanupError.message : String(cleanupError);
      console.warn(`Failed to clean up WhisperX output ${outputPath}: ${message}`);
    }
  }
}

export function extractWordTimestamps(result: TranscriptionResult): WordTimestamp[] {
  if (!Array.isArray(result.word_segments)) {
    throw new Error('Transcription result is missing word_segments');
  }

  const words = result.word_segments.map((word, index) => {
    if (typeof word.word !== 'string' || typeof word.start !== 'number' || typeof word.end !== 'number') {
      throw new Error(`Invalid word segment at index ${index}`);
    }

    return {
      word: word.word,
      start: word.start,
      end: word.end,
    };
  });

  return words.sort((a, b) => a.start - b.start);
}
