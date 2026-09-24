'use client';

import { useEffect } from 'react';

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [message, onDone]);

  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4">
      {message ? (
        <div className="animate-fade-up rounded-full border border-line-strong bg-raised px-5 py-2.5 text-sm font-medium text-fg shadow-2xl">
          {message}
        </div>
      ) : null}
    </div>
  );
}
