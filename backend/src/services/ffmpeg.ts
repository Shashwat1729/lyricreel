import { spawn } from 'child_process';
import path from 'path';

const FFMPEG = process.env.FFMPEG_PATH || 'ffmpeg';

export async function getAudioDuration(audioPath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, ['-i', audioPath, '-f', 'null', '-'], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', () => {
      const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+)\.(\d+)/);
      if (match) {
        const hours = parseInt(match[1]);
        const mins = parseInt(match[2]);
        const secs = parseInt(match[3]);
        const ms = parseInt(match[4]);
        resolve(hours * 3600 + mins * 60 + secs + ms / 100);
      } else {
        reject(new Error('Could not determine audio duration'));
      }
    });
  });
}

export async function normalizeAudio(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, [
      '-i', inputPath,
      '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11',
      '-ar', '44100',
      '-y',
      outputPath,
    ]);
    proc.on('close', (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`FFmpeg normalize failed with code ${code}`));
    });
    proc.on('error', reject);
  });
}

export async function extractAudio(inputPath: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(FFMPEG, [
      '-i', inputPath,
      '-vn', '-acodec', 'pcm_s16le',
      '-ar', '16000', '-ac', '1',
      '-y', outputPath,
    ]);
    proc.on('close', (code) => {
      if (code === 0) resolve(outputPath);
      else reject(new Error(`FFmpeg extract failed with code ${code}`));
    });
    proc.on('error', reject);
  });
}
