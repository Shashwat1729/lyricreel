import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { getAudioDuration } from '../services/ffmpeg';

const ALLOWED_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.ogg', '.flac', '.aac', '.opus', '.webm']);

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, config.uploadDir),
    filename: (_req, file, cb) => cb(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`),
  }),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.has(ext)) cb(null, true);
    else cb(new Error(`Unsupported file type "${ext || 'unknown'}". Use MP3, WAV, M4A, OGG or FLAC.`));
  },
});

const router = Router();

router.post('/', (req: Request, res: Response, next: NextFunction) => {
  upload.single('audio')(req, res, async (err: unknown) => {
    try {
      if (err) {
        const code = (err as { code?: string }).code;
        if (code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: `File too large (max ${Math.round(config.maxUploadBytes / 1048576)} MB)` });
        }
        return res.status(400).json({ error: err instanceof Error ? err.message : 'Upload failed' });
      }
      if (!req.file) return res.status(400).json({ error: 'No audio file provided (field name "audio")' });

      const duration = await getAudioDuration(req.file.path);
      if (duration && duration > config.maxMediaSeconds) {
        fs.rmSync(req.file.path, { force: true });
        return res.status(400).json({ error: `Audio is too long (max ${Math.round(config.maxMediaSeconds / 60)} minutes)` });
      }

      res.json({
        fileId: path.parse(req.file.filename).name,
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        duration: duration ?? undefined,
      });
    } catch (e) {
      next(e);
    }
  });
});

export default router;
