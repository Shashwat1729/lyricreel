import { Check } from 'lucide-react';

const STEPS = ['Source', 'Lyrics', 'Style', 'Render'] as const;

export function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-center gap-2 text-sm" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
            {i > 0 && <span className="hidden h-px w-6 bg-line-strong sm:block" aria-hidden />}
            <span
              className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-xs font-bold ${
                done ? 'bg-accent-soft text-accent' : active ? 'bg-accent text-ink' : 'border border-line-bright text-muted'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={`hidden sm:inline ${active ? 'font-semibold text-fg' : 'text-muted'}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}
