'use client';

import { useParams } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Download, Share2, RotateCcw, Maximize2, Volume2, VolumeX } from 'lucide-react';
import Link from 'next/link';

export default function VideoViewerPage() {
  const { id } = useParams();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
  const videoUrl = `${apiUrl}/video/${id}`;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onTime = () => setProgress(video.currentTime / (video.duration || 1));
    const onMeta = () => { setDuration(video.duration); setLoaded(true); };
    const onEnd = () => setPlaying(false);
    const onErr = () => setError(true);

    video.addEventListener('timeupdate', onTime);
    video.addEventListener('loadedmetadata', onMeta);
    video.addEventListener('ended', onEnd);
    video.addEventListener('error', onErr);
    return () => {
      video.removeEventListener('timeupdate', onTime);
      video.removeEventListener('loadedmetadata', onMeta);
      video.removeEventListener('ended', onEnd);
      video.removeEventListener('error', onErr);
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
    setPlaying(!playing);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pct * duration;
  };

  const toggleFullscreen = () => {
    const container = document.getElementById('video-container');
    if (!container) return;
    if (!fullscreen) container.requestFullscreen?.();
    else document.exitFullscreen?.();
    setFullscreen(!fullscreen);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  if (error) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass p-12 text-center max-w-md"
        >
          <div className="text-5xl mb-4">🎬</div>
          <h1 className="text-2xl font-bold mb-2">Video Not Found</h1>
          <p className="text-white/50 mb-6">This video may have expired or is still rendering.</p>
          <Link href="/create" className="inline-flex items-center gap-2 px-6 py-3 bg-accent/90 text-black font-bold rounded-full hover:bg-accent transition-all">
            <RotateCcw className="w-4 h-4" /> Create New Video
          </Link>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">Your Lyric Video</h1>
          <Link href="/create" className="text-sm text-accent hover:underline flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> New Video
          </Link>
        </div>

        {/* Video Player Container */}
        <div id="video-container" className="relative rounded-2xl overflow-hidden bg-black shadow-[0_0_60px_rgba(168,85,247,0.1)] border border-white/5">
          {/* Aspect ratio wrapper (9:16) */}
          <div className="relative w-full" style={{ paddingBottom: '177.78%' }}>
            <video
              ref={videoRef}
              src={videoUrl}
              className="absolute inset-0 w-full h-full object-contain bg-black"
              playsInline
              muted={muted}
              preload="metadata"
              onClick={togglePlay}
            />

            {/* Loading overlay */}
            {!loaded && !error && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              </div>
            )}

            {/* Play overlay (when paused) */}
            {loaded && !playing && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex items-center justify-center bg-black/20 cursor-pointer"
                onClick={togglePlay}
              >
                <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center hover:bg-white/30 transition-colors">
                  <Play className="w-7 h-7 text-white ml-1" fill="white" />
                </div>
              </motion.div>
            )}
          </div>

          {/* Controls */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 pt-12">
            {/* Progress bar */}
            <div className="w-full h-1.5 bg-white/10 rounded-full cursor-pointer mb-3 group" onClick={seek}>
              <div
                className="h-full bg-accent rounded-full relative transition-all group-hover:h-2"
                style={{ width: `${progress * 100}%` }}
              >
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-accent rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button onClick={togglePlay} className="text-white/80 hover:text-white transition-colors">
                  {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" fill="white" />}
                </button>
                <button onClick={() => setMuted(!muted)} className="text-white/80 hover:text-white transition-colors">
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="text-xs text-white/50">
                  {formatTime(progress * duration)} / {formatTime(duration)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={toggleFullscreen} className="text-white/80 hover:text-white transition-colors">
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          <a
            href={videoUrl}
            download
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-accent/90 text-black font-bold rounded-xl hover:bg-accent transition-all hover:scale-[1.02]"
          >
            <Download className="w-4 h-4" /> Download MP4
          </a>
          <button
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
            className="flex items-center justify-center gap-2 px-5 py-3.5 glass rounded-xl hover:bg-white/10 transition-colors"
          >
            <Share2 className="w-4 h-4" /> Share
          </button>
        </div>

        {/* Specs */}
        <div className="mt-4 flex items-center justify-center gap-4 text-xs text-white/30">
          <span>1080 × 1920</span>
          <span>H.264 MP4</span>
          <span>YouTube Shorts Ready</span>
        </div>
      </motion.div>
    </main>
  );
}
