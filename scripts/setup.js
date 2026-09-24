/* Checks the local toolchain and prepares folders + .env. Safe to run repeatedly. */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const isWin = process.platform === 'win32';

function has(cmd, args = ['--version']) {
  try {
    execFileSync(cmd, args, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

console.log('LyricReel setup\n');

for (const dir of ['uploads', 'renders', 'temp']) {
  fs.mkdirSync(path.join(root, dir), { recursive: true });
}
console.log('[ok] uploads/, renders/ and temp/ folders');

const envPath = path.join(root, '.env');
if (!fs.existsSync(envPath)) {
  fs.copyFileSync(path.join(root, '.env.example'), envPath);
  console.log('[ok] created .env from .env.example');
}

const python = isWin ? 'python' : 'python3';
const checks = [
  ['ffmpeg', has('ffmpeg', ['-version']), 'required for YouTube downloads. https://ffmpeg.org/download.html'],
  ['yt-dlp', has('yt-dlp'), 'required for YouTube links: pip install yt-dlp'],
  ['python', has(python), 'needed only for WhisperX'],
  ['whisperx', has(python, ['-c', 'import whisperx']), 'optional: pip install whisperx (better timing, works without LRCLIB)'],
];
for (const [name, ok, hint] of checks) console.log(`${ok ? '[ok]  ' : '[--]  '}${name}${ok ? '' : `  (${hint})`}`);

console.log('\nDone. Start everything with: npm run dev');
