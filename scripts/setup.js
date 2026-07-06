const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🎵 Lyric Video Generator - Setup\n');

// Create directories
const dirs = ['uploads', 'renders', 'temp'];
dirs.forEach(dir => {
  const p = path.join(__dirname, '..', dir);
  if (!fs.existsSync(p)) {
    fs.mkdirSync(p, { recursive: true });
    console.log(`✅ Created ${dir}/`);
  }
});

// Check FFmpeg
try {
  execSync('ffmpeg -version', { stdio: 'pipe' });
  console.log('✅ FFmpeg found');
} catch {
  console.log('❌ FFmpeg not found. Install: https://ffmpeg.org/download.html');
}

// Check Python
try {
  execSync('python3 --version', { stdio: 'pipe' });
  console.log('✅ Python3 found');
} catch {
  console.log('❌ Python3 not found');
}

// Check WhisperX
try {
  execSync('python3 -c "import whisperx"', { stdio: 'pipe' });
  console.log('✅ WhisperX found');
} catch {
  console.log('⚠️  WhisperX not installed. Run: pip install whisperx');
}

// Copy .env if needed
const envPath = path.join(__dirname, '..', '.env');
const envExample = path.join(__dirname, '..', '.env.example');
if (!fs.existsSync(envPath) && fs.existsSync(envExample)) {
  fs.copyFileSync(envExample, envPath);
  console.log('✅ Created .env from .env.example');
}

console.log('\n🚀 Setup complete! Run: npm run dev');
