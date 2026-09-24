import Link from 'next/link';

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <span className="flex items-center justify-center rounded-lg bg-accent" style={{ width: size, height: size }} aria-hidden>
      <svg width={size * 0.58} height={size * 0.58} viewBox="0 0 24 24" fill="none" stroke="#0C0C11" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    </span>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-lg text-fg" aria-label="LyricReel home">
      <LogoMark />
      <span className="font-display text-[19px] font-extrabold tracking-tight">LyricReel</span>
    </Link>
  );
}
