import { Check, Loader2 } from 'lucide-react';

export interface WorkItem {
  label: string;
  state: 'waiting' | 'active' | 'done';
  progress?: number;
  detail?: string;
}

export function WorkingStep({ title, thumbnail, items, onCancel }: { title: string; thumbnail?: string; items: WorkItem[]; onCancel: () => void }) {
  return (
    <div className="mx-auto flex w-full max-w-[560px] animate-fade-up flex-col gap-7 px-4 py-12 sm:py-20" aria-busy="true">
      <div className="flex items-center gap-4">
        {thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="h-[72px] w-32 shrink-0 rounded-xl bg-raised object-cover" />
        ) : (
          <div className="flex h-[72px] w-[72px] shrink-0 items-end justify-center gap-1 rounded-xl bg-panel p-4" aria-hidden>
            {[0.5, 0.9, 0.65, 1, 0.75].map((h, i) => (
              <span key={i} className="w-1.5 origin-bottom animate-eq rounded-full bg-accent" style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
        )}
        <div className="min-w-0">
          <p className="eyebrow">Working on it</p>
          <h1 className="truncate font-display text-[28px] font-extrabold tracking-tight">{title || 'Your song'}</h1>
        </div>
      </div>

      <ol className="card flex flex-col divide-y divide-line">
        {items.map((item) => (
          <li key={item.label} className="flex flex-col gap-2.5 px-5 py-4">
            <div className="flex items-center gap-3">
              <span className={`flex h-6 w-6 items-center justify-center rounded-full ${item.state === 'done' ? 'bg-accent-soft text-accent' : item.state === 'active' ? 'text-accent' : 'border border-line-bright'}`}>
                {item.state === 'done' ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : item.state === 'active' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              </span>
              <span className={item.state === 'waiting' ? 'text-muted' : 'font-semibold'}>{item.label}</span>
              {item.state === 'active' && typeof item.progress === 'number' && item.progress > 0 && (
                <span className="ml-auto font-mono text-xs text-muted">{Math.round(item.progress)}%</span>
              )}
            </div>
            {item.state === 'active' && item.detail && <p className="pl-9 text-sm text-muted">{item.detail}</p>}
            {item.state === 'active' && typeof item.progress === 'number' && item.progress > 0 && (
              <div className="ml-9 h-1.5 overflow-hidden rounded-full bg-line-strong">
                <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${item.progress}%` }} />
              </div>
            )}
          </li>
        ))}
      </ol>

      <button type="button" onClick={onCancel} className="btn-ghost self-start">Cancel</button>
    </div>
  );
}
