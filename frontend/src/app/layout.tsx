import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-display', display: 'swap' });
const sans = DM_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-sans', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], weight: ['500'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'LyricReel · Lyric videos for Shorts, Reels & TikTok', template: '%s · LyricReel' },
  description: 'Paste a YouTube link or upload a song. LyricReel finds the lyrics, syncs every word and renders a vertical 1080×1920 lyric video. Runs locally, no API keys.',
  applicationName: 'LyricReel',
  openGraph: {
    title: 'LyricReel',
    description: 'Turn any song into a synced lyric video for Shorts, Reels and TikTok.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0C0C11',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
