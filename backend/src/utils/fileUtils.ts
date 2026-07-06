import path from 'path';
import { mkdir, unlink } from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';

export function getUploadDir(): string {
  return path.resolve(process.env.UPLOAD_DIR || './uploads');
}

export function getRenderDir(): string {
  return path.resolve(process.env.RENDER_DIR || './renders');
}

export async function ensureDir(dir: string): Promise<void> {
  try {
    await mkdir(dir, { recursive: true });
  } catch (error) {
    console.error('[fileUtils] Failed to ensure directory: ' + dir, error);
    throw error;
  }
}

export function getFilePath(dir: string, filename: string): string {
  return path.resolve(dir, filename);
}

export async function cleanupFile(filepath: string): Promise<void> {
  try {
    await unlink(filepath);
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;

    if (nodeError.code === 'ENOENT') {
      console.warn('[fileUtils] File not found during cleanup: ' + filepath);
      return;
    }

    console.error('[fileUtils] Failed to clean up file: ' + filepath, error);
    throw error;
  }
}

export function generateUniqueFilename(originalName: string): string {
  return uuidv4() + path.extname(originalName);
}

export async function ensureDirs(): Promise<void> {
  await ensureDir(getUploadDir());
  await ensureDir(getRenderDir());
  await ensureDir(path.resolve('./temp'));
}
