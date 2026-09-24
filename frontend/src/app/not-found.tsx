import Link from 'next/link';
import { Logo } from '@/components/Logo';

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <h1 className="font-display text-4xl font-extrabold">Page not found</h1>
      <Link href="/" className="btn-primary">Back home</Link>
    </div>
  );
}
