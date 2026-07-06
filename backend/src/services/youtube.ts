import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR || './uploads');

export interface YouTubeDownloadResult {
  filename: string;
  filepath: string;
  title: string;
  duration: number;
}

/**
 * Strictly validate YouTube URL using URL parser (not regex alone).
 * Prevents SSRF and command injection.
 */
function validateYouTubeUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid URL format');
  }

  // Must be HTTPS
  if (url.protocol !== 'https:') {
    throw new Error('Only HTTPS YouTube URLs are allowed');
  }

  // Validate hostname
  const allowedHosts = ['www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com', 'music.youtube.com'];
  if (!allowedHosts.includes(url.hostname)) {
    throw new Error('URL must be from youtube.com or youtu.be');
  }

  // Validate path structure
  if (url.hostname === 'youtu.be') {
    // Short URL: must have /<videoId>
    if (!/^\/[a-zA-Z0-9_-]{11}$/.test(url.pathname)) {
      throw new Error('Invalid youtu.be video URL');
    }
  } else {
    // Long URL: must be /watch or /shorts/<id>
    if (url.pathname === '/watch') {
      const v = url.searchParams.get('v');
      if (!v || !/^[a-zA-Z0-9_-]{11}$/.test(v)) {
        throw new Error('Invalid YouTube video ID');
      }
    } else if (url.pathname.startsWith('/shorts/')) {
      const id = url.pathname.replace('/shorts/', '');
      if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) {
        throw new Error('Invalid YouTube Shorts ID');
      }
    } else {
      throw new Error('Unsupported YouTube URL format. Use /watch?v= or /shorts/ or youtu.be/');
    }
  }

  // Return sanitized URL (strip any extra params that could be dangerous)
  return url.toString();
}

export async function downloadFromYouTube(rawUrl: string, quality: string = '192'): Promise<YouTubeDownloadResult> {
  const url = validateYouTubeUrl(rawUrl);

  const fileId = uuidv4();
  const outputTemplate = path.join(UPLOAD_DIR, `${fileId}.%(ext)s`);
  const expectedOutput = path.join(UPLOAD_DIR, `${fileId}.mp3`);

  return new Promise((resolve, reject) => {
    // Get video info first (with safety flags)
    const infoProc = spawn('yt-dlp', [
      '--dump-json',
      '--no-download',
      '--no-exec',
      '--no-playlist',
      url,
    ]);

    let infoJson = '';
    let infoErr = '';
    const MAX_INFO_SIZE = 1024 * 1024; // 1MB cap

    infoProc.stdout.on('data', (data) => { if (infoJson.length < MAX_INFO_SIZE) infoJson += data.toString(); });
    infoProc.stderr.on('data', (data) => { if (infoErr.length < 10000) infoErr += data.toString(); });

    infoProc.on('error', (err) => {
      reject(new Error(`yt-dlp not found. Install: pip install yt-dlp\n${err.message}`));
    });

    infoProc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Failed to get video info: ${infoErr.trim().slice(0, 200) || `exit code ${code}`}`));
      }

      let title = 'Unknown';
      let duration = 0;

      try {
        const info = JSON.parse(infoJson);
        title = info.title || 'Unknown';
        duration = info.duration || 0;

        // Reject very long videos (>15min) to prevent abuse
        if (duration > 900) {
          return reject(new Error('Video too long (max 15 minutes). YouTube Shorts should be under 60 seconds.'));
        }
      } catch {
        // Continue with defaults
      }

      // Download audio only as MP3 with dynamic format selection for speed
      // Lower quality = pick smaller source format = faster download
      const formatFilter = quality === '64' ? 'worstaudio'
        : quality === '128' ? 'worstaudio*[abr<=128]/worstaudio'
        : quality === '320' ? 'bestaudio'
        : 'bestaudio*[abr<=192]/bestaudio'; // 192 default

      const dlProc = spawn('yt-dlp', [
        '-x',
        '--audio-format', 'mp3',
        '--audio-quality', quality === '320' ? '0' : quality === '192' ? '2' : quality === '128' ? '5' : '8',
        '-f', formatFilter,
        '--no-playlist',
        '--no-exec',
        '--max-filesize', '50M',
        '-o', outputTemplate,
        url,
      ]);

      let dlErr = '';
      dlProc.stderr.on('data', (data) => { if (dlErr.length < 10000) dlErr += data.toString(); });

      dlProc.on('error', (err) => {
        reject(new Error(`yt-dlp not found. Install: pip install yt-dlp\n${err.message}`));
      });

      dlProc.on('close', (dlCode) => {
        if (dlCode !== 0) {
          return reject(new Error(`Download failed: ${dlErr.trim().slice(0, 200) || `exit code ${dlCode}`}`));
        }

        if (!fs.existsSync(expectedOutput)) {
          const files = fs.readdirSync(UPLOAD_DIR).filter(f => f.startsWith(fileId));
          if (files.length === 0) {
            return reject(new Error('Download completed but output file not found'));
          }
          resolve({
            filename: files[0],
            filepath: path.join(UPLOAD_DIR, files[0]),
            title,
            duration,
          });
        } else {
          resolve({
            filename: `${fileId}.mp3`,
            filepath: expectedOutput,
            title,
            duration,
          });
        }
      });
    });
  });
}
