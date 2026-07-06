import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700', '800', '900'],
});

export const metadata: Metadata = {
  title: 'LyricFlow — Lyric Video Generator',
  description: 'Create stunning lyric videos in seconds. Paste a YouTube link or upload any song. Get word-level synced lyrics and beautiful karaoke videos ready for Shorts, Reels & TikTok.',
  keywords: ['lyric video', 'karaoke', 'youtube shorts', 'tiktok', 'reels', 'music video', 'transcription'],
  authors: [{ name: 'LyricFlow' }],
  openGraph: {
    title: 'LyricFlow — Lyric Video Generator',
    description: 'Create stunning lyric videos in seconds. Word-level synced lyrics for Shorts, Reels & TikTok.',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'LyricFlow — Lyric Video Generator',
    description: 'Create stunning lyric videos in seconds. Word-level synced lyrics for Shorts, Reels & TikTok.',
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: '#050508',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className={`${inter.className} min-h-screen bg-bg-primary text-white antialiased selection:bg-accent selection:text-black`}>
        {/* Background effects */}
        <div className="fixed inset-0 bg-bg-primary -z-50" />
        <div className="fixed inset-0 bg-dot-pattern opacity-30 -z-40" />
        <div className="fixed inset-0 bg-radial-overlay -z-30" />
        
        {/* Animated orbs for atmosphere */}
        <div className="fixed top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-neon-purple/20 blur-[150px] -z-20 animate-pulse-slow" />
        <div className="fixed bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-accent/10 blur-[120px] -z-20 animate-pulse-slow" style={{ animationDelay: '2s' }} />
        
        {/* Main content */}
        <div className="relative z-0">
          {children}
        </div>
      </body>
    </html>
  );
}
