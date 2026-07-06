'use client';

import { useState, useEffect, useCallback, useRef, useMemo, Component, memo, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoPlayer } from '@/components/VideoPlayer';
import { uploadSong, generateTranscript, generateVideo, pollStatus, getTranscriptStatus, getVideoStatus, downloadFromYouTube, getYouTubeStatus } from '@/lib/api';

// Error boundary
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[#080810]">
          <div className="text-center">
            <p className="text-white/60 mb-4">Something went wrong.</p>
            <button onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}
              className="px-4 py-2 bg-white/10 rounded-lg text-white/80 hover:bg-white/20">Reload</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface WordTimestamp { word: string; start: number; end: number; }

interface RecentVideo {
  title: string;
  videoUrl: string;
  timestamp: number;
}

const THEMES = [
  { id: 'neon', label: 'Neon', color: '#00ffaa' },
  { id: 'anime', label: 'Anime', color: '#ff6b9d' },
  { id: 'sad', label: 'Sad', color: '#74b9ff' },
  { id: 'synthwave', label: 'Synthwave', color: '#ff6ec7' },
  { id: 'minimalist', label: 'Minimal', color: '#ffffff' },
  { id: 'cinematic', label: 'Cinema', color: '#ffd700' },
] as const;

const QUALITY_OPTIONS = [
  { v: '64' as const, label: '64K', desc: '~5s' },
  { v: '128' as const, label: '128K', desc: '~10s' },
  { v: '192' as const, label: '192K', desc: '~20s' },
  { v: '320' as const, label: '320K', desc: '~30s' },
];

const PIPELINE_STEPS = ['Paste', 'Download', 'Lyrics', 'Customize', 'Render', 'Done'] as const;

type Phase = 'idle' | 'processing' | 'lyrics-preview' | 'rendering' | 'done';

// Helper to get step index from phase + statusText
const getStepIndex = (phase: Phase, statusText: string): number => {
  switch (phase) {
    case 'idle': return 0;
    case 'processing':
      return statusText.toLowerCase().includes('lyric') || statusText.toLowerCase().includes('transcript') ? 2 : 1;
    case 'lyrics-preview': return 3;
    case 'rendering': return 4;
    case 'done': return 5;
    default: return 0;
  }
};

// Singleton AudioContext to avoid leak
let sharedAudioCtx: AudioContext | null = null;
const getAudioCtx = (): AudioContext => {
  if (!sharedAudioCtx || sharedAudioCtx.state === 'closed') {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioCtx;
};

// Play completion chime using Web Audio API
const playCompletionChime = () => {
  try {
    const ctx = getAudioCtx();
    const playNote = (freq: number, startTime: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.3, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = ctx.currentTime;
    playNote(523.25, now, 0.15); // C5
    playNote(659.25, now + 0.15, 0.25); // E5
    // Singleton — don't close
  } catch (e) {
    // Audio not supported, fail silently
  }
};

// Floating particles component
const FloatingParticles = () => {
  const particles = useMemo(() => Array.from({ length: 10 }, (_, i) => ({
    id: i,
    x: (i * 13 + 7) % 100,
    y: (i * 17 + 11) % 100,
    size: 2 + (i % 3),
    duration: 15 + (i * 3),
    delay: i * 0.7,
  })), []);

  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white/10"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -30, 0],
            x: [0, 10, -10, 0],
            opacity: [0.1, 0.3, 0.1],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </>
  );
};

// Waveform visualizer component
const WaveformVisualizer = () => {
  const bars = [0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.5];
  return (
    <div className="flex items-end justify-center gap-1 h-12">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          className="w-2 bg-accent/60 rounded-full"
          animate={{
            height: [`${height * 100}%`, `${height * 40}%`, `${height * 100}%`],
          }}
          transition={{
            duration: 0.5 + i * 0.1,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
};

// Progress steps indicator
const ProgressSteps = ({ currentStep }: { currentStep: number }) => (
  <div className="flex items-center justify-center gap-1.5 py-4">
    {PIPELINE_STEPS.map((step, i) => (
      <div key={step} className="flex items-center">
        <div className="flex flex-col items-center">
          <div
            className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
              i < currentStep
                ? 'bg-accent'
                : i === currentStep
                ? 'bg-accent ring-2 ring-accent/30 ring-offset-2 ring-offset-[#080810]'
                : 'bg-white/20'
            }`}
          />
          <span className={`text-xs mt-1.5 font-medium ${i <= currentStep ? 'text-white/70' : 'text-white/25'}`}>
            {step}
          </span>
        </div>
        {i < PIPELINE_STEPS.length - 1 && (
          <div className={`w-8 h-px mx-1 ${i < currentStep ? 'bg-accent/50' : 'bg-white/10'}`} />
        )}
      </div>
    ))}
  </div>
);

// Shimmer loading placeholder
const ShimmerPlaceholder = ({ className }: { className?: string }) => (
  <div className={`relative overflow-hidden bg-white/5 rounded ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
  </div>
);

// Success animation component
const LyricsFoundSuccess = ({ onComplete }: { onComplete: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onComplete, 1500);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex flex-col items-center justify-center py-12"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', damping: 10 }}
        className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4"
      >
        <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <motion.path
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={3}
            d="M5 13l4 4L19 7"
          />
        </svg>
      </motion.div>
      <p className="text-green-400 font-medium">Lyrics synced!</p>
    </motion.div>
  );
};

// Toast notification
const Toast = ({ message, onClose }: { message: string; onClose: () => void }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="fixed top-14 left-1/2 -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-5 py-2 text-white text-sm z-50"
    >
      {message}
    </motion.div>
  );
};

// Recent video card
const RecentVideoCard = ({ video, onClick }: { video: RecentVideo; onClick: () => void }) => {
  const timeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'Just now';
  };

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start p-3 bg-white/[0.03] border border-white/[0.06] rounded-xl hover:bg-white/[0.06] transition-colors text-left w-full"
    >
      <p className="text-white/70 text-sm truncate w-full">{video.title}</p>
      <p className="text-white/30 text-xs mt-1">{timeAgo(video.timestamp)}</p>
    </button>
  );
};

// Memoized lyric word component (outside CreatePage to preserve memo identity)
const LyricWordMemo = memo(({ w, isActive, isPast, themeColor }: { w: WordTimestamp; isActive: boolean; isPast: boolean; themeColor: string }) => (
  <span
    className={`inline-block mr-2 transition-all duration-150 ${
      isActive ? 'scale-110' : isPast ? 'text-white/70' : 'text-white/30'
    }`}
    style={isActive ? { color: themeColor, filter: `drop-shadow(0 0 8px ${themeColor}99)` } : {}}
  >
    {w.word}
  </span>
));
LyricWordMemo.displayName = 'LyricWordMemo';

function CreatePage() {
  const [url, setUrl] = useState('');
  const [videoId, setVideoId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [songName, setSongName] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [words, setWords] = useState<WordTimestamp[]>([]);
  const [theme, setTheme] = useState('neon');
  const [videoUrl, setVideoUrl] = useState('');
  const [statusText, setStatusText] = useState('');
  const [error, setError] = useState('');
  const [fileInfo, setFileInfo] = useState<{ fileId: string; filename: string } | null>(null);
  const [renderProgress, setRenderProgress] = useState(0);
  const [showUpload, setShowUpload] = useState(false);
  const [quality, setQuality] = useState<'64' | '128' | '192' | '320'>('128');
  const [loadingTitle, setLoadingTitle] = useState(false);
  const [autoRenderCountdown, setAutoRenderCountdown] = useState(0);
  const [autoRenderCancelled, setAutoRenderCancelled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [recentVideos, setRecentVideos] = useState<RecentVideo[]>([]);

  // YouTube Player API for syncing lyrics to playback time
  const playerRef = useRef<any>(null);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const timeUpdateRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  // Get selected theme color
  const selectedThemeColor = THEMES.find(t => t.id === theme)?.color || '#00ffaa';

  // Load preferences from localStorage on mount
  useEffect(() => {
    const storedQuality = localStorage.getItem('preferred-quality');
    if (storedQuality && ['64', '128', '192', '320'].includes(storedQuality)) {
      setQuality(storedQuality as '64' | '128' | '192' | '320');
    }
    const storedHistory = localStorage.getItem('recent-videos');
    if (storedHistory) {
      try {
        setRecentVideos(JSON.parse(storedHistory));
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }, []);

  // Save quality preference
  useEffect(() => {
    try { localStorage.setItem('preferred-quality', quality); } catch {}
  }, [quality]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === ' ' && playerRef.current && phase !== 'idle') {
        e.preventDefault();
        const state = playerRef.current.getPlayerState?.();
        if (state === 1) playerRef.current.pauseVideo();
        else playerRef.current.playVideo();
      } else if (e.key === 'Escape') {
        reset();
      } else if (e.key === 'Enter' && phase === 'lyrics-preview') {
        startRenderRef.current();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [phase]);

  // Global paste detection
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (phase !== 'idle' || document.activeElement === urlInputRef.current) return;
      const text = e.clipboardData?.getData('text');
      if (text && (text.includes('youtube') || text.includes('youtu.be'))) {
        setUrl(text);
        urlInputRef.current?.focus();
      }
    };
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [phase]);

  // Load YouTube IFrame API
  useEffect(() => {
    if ((window as any).YT) return;
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => {};
  }, []);

  // Create/update YT player when videoId changes
  useEffect(() => {
    if (!videoId) return;
    const initPlayer = () => {
      if (playerRef.current) {
        playerRef.current.loadVideoById(videoId);
        return;
      }
      playerRef.current = new (window as any).YT.Player('yt-player', {
        videoId,
        playerVars: { autoplay: 1, rel: 0, modestbranding: 1, playsinline: 1 },
        events: {
          onReady: () => setPlayerReady(true),
          onStateChange: (event: any) => {
            // YT.PlayerState.UNSTARTED = -1, detect autoplay block
            if (event.data === -1) {
              setTimeout(() => {
                if (playerRef.current?.getPlayerState?.() === -1) setAutoplayBlocked(true);
              }, 1000);
            } else if (event.data === 1) { // PLAYING
              setAutoplayBlocked(false);
            }
          },
        },
      });
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      (window as any).onYouTubeIframeAPIReady = initPlayer;
    }
  }, [videoId]);

  // Poll current time from YT player for lyrics sync (all active phases)
  useEffect(() => {
    if (!playerReady || phase === 'idle' || phase === 'done') return;
    timeUpdateRef.current = setInterval(() => {
      if (playerRef.current?.getCurrentTime) {
        setCurrentTime(playerRef.current.getCurrentTime());
      }
    }, 100);
    return () => { if (timeUpdateRef.current) clearInterval(timeUpdateRef.current); };
  }, [playerReady, phase]);

  // Poll current time from YT player for lyrics sync (all active phases)
  useEffect(() => {
    // No auto-render — let user choose when to render
    setAutoRenderCountdown(0);
  }, [phase, autoRenderCancelled]);

  // Use a ref for startRender to avoid stale closures in countdown
  const startRenderRef = useRef<() => void>(() => {});

  // Auto-render countdown tick
  useEffect(() => {
    if (phase !== 'lyrics-preview' || autoRenderCountdown <= 0 || autoRenderCancelled) return;
    const t = setInterval(() => {
      setAutoRenderCountdown(p => {
        if (p <= 1) {
          setTimeout(() => startRenderRef.current(), 0);
          return 0;
        }
        return p - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [phase, autoRenderCountdown, autoRenderCancelled]);

  // Play sound on completion and save to history
  useEffect(() => {
    if (phase === 'done') {
      playCompletionChime();
      // Save to recent videos
      if (title && videoUrl) {
        const newRecent: RecentVideo = { title, videoUrl, timestamp: Date.now() };
        setRecentVideos(prev => {
          const updated = [newRecent, ...prev.filter(v => v.videoUrl !== videoUrl)].slice(0, 5);
          return updated;
        });
      }
    }
  }, [phase, title, videoUrl]);

  // Persist recent videos to localStorage
  useEffect(() => {
    if (recentVideos.length > 0) {
      try { localStorage.setItem('recent-videos', JSON.stringify(recentVideos)); } catch {}
    }
  }, [recentVideos]);

  // Extract video ID from URL
  const pipelineTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    const m = url.match(/(?:v=|\/shorts\/|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    if (m && m[1] !== videoId) {
      setVideoId(m[1]);
    }
  }, [url]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch title from noembed then auto-start pipeline
  useEffect(() => {
    if (!videoId) return;
    setLoadingTitle(true);
    const ctrl = new AbortController();
    fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`, { signal: ctrl.signal })
      .then(r => r.json())
      .then(data => {
        setLoadingTitle(false);
        let parsedArtist = '';
        let parsedSong = '';
        if (data.title) {
          setTitle(data.title);
          const parts = data.title.split(/\s*[-–—]\s*/);
          if (parts.length >= 2) {
            parsedArtist = parts[0].trim();
            parsedSong = parts.slice(1).join(' ').replace(/\s*[\[\(].*[\]\)].*$/g, '').trim();
            setArtist(parsedArtist);
            setSongName(parsedSong);
          } else {
            parsedSong = data.title.replace(/\s*[\[\(].*[\]\)].*$/g, '').trim();
            setSongName(parsedSong);
          }
        }
        // Auto-start pipeline after metadata is fetched
        if (pipelineTriggeredRef.current !== videoId) {
          pipelineTriggeredRef.current = videoId;
          // Start pipeline with the parsed values directly (don't rely on state)
          setPhase('processing');
          setError('');
          setStatusText('Extracting audio from YouTube...');
          (async () => {
            try {
              const result = await downloadFromYouTube(`https://www.youtube.com/watch?v=${videoId}`, quality);
              setStatusText('Downloading audio track...');
              const dlStatus = await pollStatus(result.jobId, getYouTubeStatus, () => {});
              if (!dlStatus.filename) { setError(dlStatus.error || 'Download failed'); setPhase('idle'); return; }
              setFileInfo({ fileId: result.jobId, filename: dlStatus.filename });

              setStatusText('Finding synced lyrics...');
              const tj = await generateTranscript(dlStatus.filename, parsedSong || parsedArtist || data?.title || '', parsedArtist);
              const ts = await pollStatus(tj.jobId, getTranscriptStatus, () => {});

              if (!ts.transcript?.word_segments?.length) {
                setError("Couldn't find synced lyrics for this song. Try a well-known track.");
                setPhase('idle');
                return;
              }

              setWords(ts.transcript.word_segments);
              setStatusText('');
              setToast('✓ Lyrics synced!');
              setAutoRenderCancelled(false);
              setPhase('lyrics-preview');
            } catch (err: any) {
              const msg = err.message || 'Pipeline failed — check your connection and try again.';
              setError(msg);
              setPhase('idle');
            }
          })();
        }
      })
      .catch(() => {
        setLoadingTitle(false);
        // Even if noembed fails, start pipeline with whatever we have
        if (pipelineTriggeredRef.current !== videoId) {
          pipelineTriggeredRef.current = videoId;
          startPipeline();
        }
      });
    return () => ctrl.abort();
  }, [videoId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Main pipeline
  const startPipeline = useCallback(async () => {
    if (!url.trim() && !videoId) return;
    setError('');
    setPhase('processing');
    setStatusText('Extracting audio from YouTube...');

    try {
      const result = await downloadFromYouTube(url, quality);
      setStatusText('Downloading audio track...');
      const dlStatus = await pollStatus(result.jobId, getYouTubeStatus, () => {});
      if (!dlStatus.filename) { setError(dlStatus.error || 'Download failed'); setPhase('idle'); return; }
      setFileInfo({ fileId: result.jobId, filename: dlStatus.filename });

      setStatusText('Finding synced lyrics...');
      const tj = await generateTranscript(dlStatus.filename, songName, artist);
      const ts = await pollStatus(tj.jobId, getTranscriptStatus, () => {});

      if (!ts.transcript?.word_segments?.length) {
        setError("Couldn't find synced lyrics for this song. Try a well-known track.");
        setPhase('idle');
        return;
      }

      setWords(ts.transcript.word_segments);
      setStatusText('');
      setToast('✓ Lyrics synced!');
      setAutoRenderCancelled(false);
      setPhase('lyrics-preview');
    } catch (err: any) {
      setError(err.message || 'Pipeline failed — check your connection and try again.');
      setPhase('idle');
    }
  }, [url, videoId, songName, artist, quality]);

  const startRender = useCallback(async () => {
    if (!fileInfo) return;
    setError('');
    setPhase('rendering');
    setAutoRenderCountdown(0);
    setRenderProgress(0);
    setStatusText('Launching render engine...');

    try {
      const job = await generateVideo(fileInfo.filename, words, theme);
      const status = await pollStatus(job.jobId, getVideoStatus, (p) => {
        setRenderProgress(p);
        if (p < 30) setStatusText('Compositing frames...');
        else if (p < 70) setStatusText('Encoding video...');
        else setStatusText('Finalizing...');
      });
      if (status.outputFile) {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
        setVideoUrl(`${apiUrl}/video/${job.jobId}`);
        setPhase('done');
      }
    } catch (err: any) {
      setError(err.message || 'Render failed');
      setAutoRenderCancelled(false);
      setPhase('lyrics-preview');
    }
  }, [fileInfo, words, theme]);

  // Keep startRenderRef in sync
  useEffect(() => { startRenderRef.current = startRender; });

  const handleRetry = () => {
    setError('');
    pipelineTriggeredRef.current = null;
    if (videoId) {
      // Re-trigger pipeline
      setPhase('processing');
      startPipeline();
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: title || 'Lyric Video',
          url: videoUrl,
        });
      } catch (e) {
        // User cancelled or error
      }
    } else {
      try {
        await navigator.clipboard.writeText(videoUrl);
        setToast('Link copied!');
      } catch {
        setToast('Copy failed');
      }
    }
  };

  const reset = useCallback(() => {
    setUrl(''); setVideoId(null); setTitle(''); setArtist(''); setSongName('');
    setPhase('idle'); setWords([]); setVideoUrl(''); setStatusText(''); setError('');
    setFileInfo(null); setRenderProgress(0); setCurrentTime(0);
    setAutoRenderCountdown(0); setAutoRenderCancelled(false);
    pipelineTriggeredRef.current = null;
    if (playerRef.current) { playerRef.current.destroy(); playerRef.current = null; }
    setPlayerReady(false);
  }, []);

  // Handle Enter key on URL input (re-trigger on error)
  const handleUrlKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && error) {
      handleRetry();
    }
  };

  // Pre-compute lyric lines when words change
  const lyricLines = useMemo(() => {
    if (words.length === 0) return [];
    const lines: WordTimestamp[][] = [];
    let line: WordTimestamp[] = [];
    for (const w of words) {
      line.push(w);
      const endsPhrase = /[.!?,;:]$/.test(w.word) || (w.word.endsWith("'") && line.length > 3);
      if (line.length >= 8 || (line.length >= 4 && endsPhrase)) {
        lines.push(line);
        line = [];
      }
    }
    if (line.length) lines.push(line);
    return lines;
  }, [words]);

  // Get current line of lyrics based on playback time (natural phrase boundaries)
  const getCurrentLyricLine = () => {
    if (lyricLines.length === 0) return { before: [], current: [], after: [] };

    const activeIdx = lyricLines.findIndex(l => l[0].start <= currentTime && l[l.length - 1].end >= currentTime);
    const nextIdx = lyricLines.findIndex(l => l[0].start > currentTime);
    const safeIdx = activeIdx >= 0 ? activeIdx : nextIdx >= 0 ? nextIdx - 1 : lyricLines.length - 1;
    const finalIdx = Math.max(0, safeIdx);

    return {
      before: lyricLines.slice(Math.max(0, finalIdx - 1), finalIdx),
      current: lyricLines[finalIdx] || [],
      after: lyricLines.slice(finalIdx + 1, finalIdx + 3),
    };
  };

  const hasVideo = videoId !== null;
  const lyrics = useMemo(() => getCurrentLyricLine(), [lyricLines, currentTime]); // eslint-disable-line react-hooks/exhaustive-deps

    // (LyricWordMemo is defined above the component)

  const renderLyricWord = (w: WordTimestamp) => {
    const isActive = currentTime >= w.start && currentTime <= w.end;
    const isPast = currentTime > w.end;
    return <LyricWordMemo key={`${w.start}-${w.end}-${w.word}`} w={w} isActive={isActive} isPast={isPast} themeColor={selectedThemeColor} />;
  };

  return (
    <main className="relative overflow-hidden">
      {/* Atmospheric background with particles */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-950/30 via-[#080810] to-[#080810]" />
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[150px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[150px]" />
        <FloatingParticles />
      </div>

      {/* Accessibility: live status region */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">{error || statusText || (phase === 'done' ? 'Video ready' : '')}</div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && <Toast message={toast} onClose={() => setToast(null)} />}
      </AnimatePresence>

      {/* Progress steps indicator */}
      {hasVideo && <ProgressSteps currentStep={getStepIndex(phase, statusText)} />}

      {/* === IDLE: Clean input === */}
      <AnimatePresence mode="wait">
        {phase === 'idle' && !hasVideo && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6"
          >
            <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7 }}
              className="w-full max-w-xl text-center"
            >
              <a href="/" className="text-5xl mb-6 inline-block hover:scale-110 transition-transform">🎵</a>
              <h1 className="text-4xl md:text-5xl font-bold mb-3 bg-gradient-to-b from-white to-white/60 bg-clip-text text-transparent">
                Lyric Video Generator
              </h1>
              <p className="text-white/40 text-lg mb-10">Paste a YouTube link. Get a synced lyric video.</p>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-500/20 via-accent/20 to-blue-500/20 rounded-2xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                <input
                  ref={urlInputRef}
                  type="text" value={url} onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={handleUrlKeyDown}
                  placeholder="youtube.com/watch?v=..."
                  className="relative w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl px-6 py-5 text-lg text-white placeholder-white/25 focus:outline-none focus:border-white/20 transition-all"
                  autoFocus
                />
              </div>

              <div className="flex justify-center gap-6 mt-6 text-sm text-white/30">
                <button onClick={() => setShowUpload(!showUpload)} className="hover:text-white/60 transition-colors">
                  Upload MP3 instead
                </button>
              </div>

              {/* Error display */}
              {error && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                  <p className="text-red-400 text-sm">{error}</p>
                  <button onClick={() => setError('')} className="text-accent text-xs mt-1 hover:underline">Dismiss</button>
                </motion.div>
              )}

              {/* Quality picker */}
              <div className="mt-6 flex items-center justify-center gap-2">
                <span className="text-white/20 text-xs">Audio Quality:</span>
                {QUALITY_OPTIONS.map(q => (
                  <button key={q.v} onClick={() => setQuality(q.v)}
                    title={`${q.label} bitrate — ${q.desc} download`}
                    className={`px-2.5 py-1 rounded-md text-xs transition-all ${quality === q.v ? 'bg-accent/20 text-accent border border-accent/30' : 'bg-white/5 text-white/30 hover:text-white/50'}`}
                  >{q.label}</button>
                ))}
                <span className="text-white/15 text-[10px] ml-1">{QUALITY_OPTIONS.find(q => q.v === quality)?.desc}</span>
              </div>

              {showUpload && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-4">
                  <div className="flex gap-2 mb-3">
                    <input type="text" value={songName} onChange={(e) => setSongName(e.target.value)} placeholder="Song title"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none" />
                    <input type="text" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist"
                      className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none" />
                  </div>
                  <label className="block p-6 border-2 border-dashed border-white/10 rounded-xl text-center cursor-pointer hover:border-white/20 transition-colors"
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-accent/50'); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('border-accent/50'); }}
                    onDrop={(e) => {
                      e.preventDefault(); e.currentTarget.classList.remove('border-accent/50');
                      const file = e.dataTransfer.files?.[0];
                      if (file && file.type.startsWith('audio/')) {
                        const input = e.currentTarget.querySelector('input[type=file]') as HTMLInputElement;
                        const dt = new DataTransfer(); dt.items.add(file);
                        input.files = dt.files; input.dispatchEvent(new Event('change', { bubbles: true }));
                      }
                    }}
                  >
                    <input type="file" accept="audio/*" className="hidden" onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      setShowUpload(false); setPhase('processing'); setStatusText('Uploading...');
                      try {
                        const r = await uploadSong(file); setFileInfo(r);
                        setStatusText('Finding lyrics...'); 
                        const tj = await generateTranscript(r.filename, songName, artist);
                        const ts = await pollStatus(tj.jobId, getTranscriptStatus, () => {});
                        if (ts.transcript?.word_segments?.length) {
                          setWords(ts.transcript.word_segments);
                          setToast('✓ Lyrics synced!');
                          setAutoRenderCancelled(false);
                          setPhase('lyrics-preview');
                        }
                        else { setError("No lyrics found"); setShowUpload(false); setPhase('idle'); }
                      } catch (err: any) { setError(err.message); setShowUpload(false); setPhase('idle'); }
                    }} />
                    <p className="text-white/40 text-sm">Drop audio file or click to browse</p>
                  </label>
                </motion.div>
              )}

              {/* Recent videos section */}
              {recentVideos.length > 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-10"
                >
                  <p className="text-white/30 text-xs uppercase tracking-wider mb-3">Recent</p>
                  <div className="grid gap-2 max-w-sm mx-auto">
                    {recentVideos.slice(0, 3).map((video, i) => (
                      <RecentVideoCard
                        key={i}
                        video={video}
                        onClick={() => {
                          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
                          if (video.videoUrl.startsWith(apiBase)) window.open(video.videoUrl, '_blank');
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === MAIN EXPERIENCE: YouTube player + controls === */}
      <AnimatePresence mode="wait">
        {hasVideo && phase !== 'done' && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex flex-col"
          >
            {/* Back/Home link */}
            <a href="/" className="fixed top-4 left-4 z-50 text-white/40 hover:text-white/70 transition-colors text-sm font-medium">
              ← LyricFlow
            </a>

            {/* YouTube Player */}
            <div className="relative px-0 md:px-6 pt-0 md:pt-4">
              <div className={`relative mx-auto overflow-hidden rounded-none md:rounded-2xl shadow-2xl shadow-black/50 transition-all duration-700 ease-out ring-1 ring-white/5 ${
                phase === 'lyrics-preview' || phase === 'rendering' ? 'max-w-full md:max-w-2xl max-h-[35vh]' : 'max-w-full md:max-w-4xl'
              } aspect-video`}>
                <div id="yt-player" className="absolute inset-0 w-full h-full" />

                {/* Loading skeleton before player initializes */}
                {!playerReady && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-5">
                    <div className="w-10 h-10 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                  </div>
                )}

                {/* Autoplay blocked overlay */}
                {autoplayBlocked && (
                  <button onClick={() => { playerRef.current?.playVideo(); setAutoplayBlocked(false); }}
                    className="absolute inset-0 flex items-center justify-center bg-black/60 z-10 cursor-pointer">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                        <svg className="w-8 h-8 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                      </div>
                      <span className="text-white/80 text-sm">Tap to play</span>
                    </div>
                  </button>
                )}

                <AnimatePresence>
                  {phase === 'processing' && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pointer-events-none"
                    >
                      <div className="flex items-center gap-3">
                        <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-accent" />
                        </span>
                        <span className="text-white text-sm font-medium">{statusText}</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {(phase === 'processing') && (
                <div className="text-center mt-3 px-4">
                  {loadingTitle ? (
                    <ShimmerPlaceholder className="h-5 w-48 mx-auto" />
                  ) : title ? (
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="text-white/50 text-sm truncate max-w-md mx-auto">{title}</motion.p>
                  ) : null}
                </div>
              )}
            </div>

            {/* Bottom section */}
            <div className="flex flex-col items-center px-4 md:px-6 pb-16 md:pb-8 mt-2">
              <AnimatePresence mode="wait">
                {phase === 'processing' && (
                  <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} className="text-center mt-4">
                    <WaveformVisualizer />
                    <p className="text-white/40 text-sm mt-3">Listen to your song while we find the lyrics</p>
                    <button onClick={reset} className="mt-3 text-white/50 text-sm hover:text-white/80 transition-colors underline underline-offset-2">Cancel</button>
                  </motion.div>
                )}

                {phase === 'lyrics-preview' && (
                  <motion.div key="lyrics-preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-3xl">
                    <motion.div key="lyrics-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      <div className="mb-4 min-h-[80px] flex flex-col items-center justify-center text-center">
                        {lyrics.before.map((line) => (
                          <p key={`b${line[0]?.start}`} className="text-white/20 text-lg mb-1">{line.map(w => w.word).join(' ')}</p>
                        ))}
                        <p className="text-2xl md:text-3xl font-bold mb-1 leading-relaxed">
                          {lyrics.current.map(renderLyricWord)}
                        </p>
                        {lyrics.after.map((line) => (
                          <p key={`a${line[0]?.start}`} className="text-white/15 text-lg mt-1">{line.map(w => w.word).join(' ')}</p>
                        ))}
                      </div>

                      <div className="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-6 backdrop-blur-sm">
                        <p className="text-white/40 text-xs uppercase tracking-wider mb-3">Visual Theme</p>
                        <div className="flex flex-wrap gap-2 mb-5">
                          {THEMES.map(t => (
                            <button key={t.id} onClick={() => setTheme(t.id)}
                              aria-pressed={theme === t.id}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                theme === t.id ? 'border-2 text-white shadow-lg' : 'bg-white/[0.04] border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/[0.08]'
                              }`}
                              style={theme === t.id ? { borderColor: t.color, boxShadow: `0 0 15px ${t.color}30`, color: t.color } : {}}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>

                        {error && (
                          <div className="mb-3">
                            <p className="text-red-400 text-sm mb-2">{error}</p>
                            <button onClick={handleRetry} className="text-accent text-sm hover:underline">Try Again</button>
                          </div>
                        )}

                        <button onClick={startRender}
                          className="w-full py-4 bg-white text-black font-bold text-lg rounded-xl hover:scale-[1.01] transition-transform shadow-[0_0_30px_rgba(255,255,255,0.08)]"
                        >
                          Render Video
                        </button>
                        <p className="text-white/20 text-xs mt-2 text-center">
                          {words.length} words • {Math.max(1, Math.ceil(words.length / 80))} min render time
                        </p>
                        <p className="text-white/15 text-[10px] mt-2 text-center">
                          Enter to render • Space to pause • Esc to cancel
                        </p>
                      </div>
                    </motion.div>
                  </motion.div>
                )}

                {phase === 'rendering' && (
                  <motion.div key="rendering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -10 }} className="w-full max-w-3xl">
                    <div className="mb-6 h-[140px] flex flex-col items-center justify-center text-center overflow-hidden">
                      {lyrics.before.map((line) => (
                        <p key={`b${line[0]?.start}`} className="text-white/20 text-lg mb-1">{line.map(w => w.word).join(' ')}</p>
                      ))}
                      <p className="text-2xl md:text-3xl font-bold mb-1 leading-relaxed">
                        {lyrics.current.map(renderLyricWord)}
                      </p>
                      {lyrics.after.map((line) => (
                        <p key={`a${line[0]?.start}`} className="text-white/15 text-lg mt-1">{line.map(w => w.word).join(' ')}</p>
                      ))}
                    </div>

                    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 text-center">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                        <span className="text-white/50 text-sm">{statusText || 'Rendering your video...'}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          className="h-full bg-accent/60 rounded-full"
                          animate={{ width: `${Math.max(2, renderProgress)}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-white/20 text-xs mt-2">{renderProgress}% complete</p>
                      <button onClick={() => { setPhase('lyrics-preview'); setRenderProgress(0); setStatusText(''); }}
                        className="mt-3 text-white/30 text-sm hover:text-white/60 transition-colors underline underline-offset-2">Cancel render</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="md:hidden fixed bottom-0 left-0 right-0 pointer-events-none">
              <div className="h-12 bg-gradient-to-t from-[#080810] to-transparent" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === DONE === */}
      <AnimatePresence mode="wait">
        {phase === 'done' && (
          <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, y: -10 }}
            className="min-h-screen flex flex-col items-center justify-center px-4 md:px-6 py-8"
          >
            <motion.div className="w-full max-w-lg">
              <div className="text-center mb-6">
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring' }} className="text-5xl inline-block">🎬</motion.span>
                <h2 className="text-2xl font-bold mt-3">Your lyric video is ready</h2>
                {title && <p className="text-white/40 text-sm mt-1">{title}</p>}
              </div>

              {videoUrl && <VideoPlayer url={videoUrl} />}

              <div className="flex gap-3 mt-6">
                <button onClick={async () => {
                  try {
                    const res = await fetch(videoUrl);
                    const blob = await res.blob();
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `${title || 'lyric-video'}.mp4`;
                    a.click();
                    URL.revokeObjectURL(a.href);
                  } catch { window.open(videoUrl); }
                }} className="flex-1 py-4 bg-white text-black font-bold rounded-xl text-center hover:bg-white/90 transition-colors text-lg cursor-pointer">
                  Download MP4
                </button>
                <button onClick={handleShare} className="px-6 py-4 border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-white/20 transition-all">
                  Share
                </button>
                <button onClick={reset} className="px-6 py-4 border border-white/10 rounded-xl text-white/60 hover:text-white hover:border-white/20 transition-all">
                  New
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        @keyframes shimmer {
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </main>
  );
}

export default function CreatePageWrapped() {
  return <ErrorBoundary><CreatePage /></ErrorBoundary>;
}
