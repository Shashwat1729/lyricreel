import { THEMES } from '@/lib/themes';
import type { ThemeName } from '@/types';

export function ThemePicker({ value, onChange }: { value: ThemeName; onChange: (t: ThemeName) => void }) {
  return (
    <fieldset className="card flex flex-col gap-3.5 p-5">
      <legend className="sr-only">Theme</legend>
      <h2 className="text-[15px] font-semibold" aria-hidden>Theme</h2>
      <div className="grid grid-cols-3 gap-2.5">
        {THEMES.map((t) => {
          const selected = t.id === value;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onChange(t.id)}
              aria-pressed={selected}
              title={t.mood}
              className={`flex flex-col overflow-hidden rounded-xl border-2 bg-ink text-fg transition-colors ${selected ? 'border-accent' : 'border-line-strong hover:border-line-bright'}`}
            >
              <span className="flex h-14 w-full items-center justify-center text-[15px]" style={{ background: t.background, fontFamily: t.fontFamily, fontWeight: t.fontWeight, color: t.accent }}>
                {t.uppercase ? 'AA' : 'Aa'}
              </span>
              <span className="py-1.5 text-center text-[13px]">{t.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
