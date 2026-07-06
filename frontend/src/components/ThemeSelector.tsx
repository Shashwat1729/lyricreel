'use client';

const themes = [
  { id: 'neon', name: 'Neon', gradient: 'from-cyan-400 to-green-400', emoji: '🟢' },
  { id: 'anime', name: 'Anime', gradient: 'from-pink-500 to-purple-600', emoji: '🌸' },
  { id: 'sad', name: 'Sad', gradient: 'from-blue-400 to-slate-600', emoji: '🌧️' },
  { id: 'synthwave', name: 'Synthwave', gradient: 'from-purple-500 to-orange-400', emoji: '🌆' },
  { id: 'minimalist', name: 'Minimalist', gradient: 'from-gray-400 to-white', emoji: '⬜' },
  { id: 'cinematic', name: 'Cinematic', gradient: 'from-yellow-400 to-amber-600', emoji: '🎬' },
];

interface Props {
  selected: string;
  onSelect: (id: string) => void;
}

export function ThemeSelector({ selected, onSelect }: Props) {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Choose Theme</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {themes.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className={`p-6 rounded-xl border-2 transition-all text-left
              ${selected === t.id
                ? 'border-accent bg-accent/10 scale-[1.02]'
                : 'border-white/10 bg-white/5 hover:border-white/30'
              }`}
          >
            <div className={`w-full h-20 rounded-lg bg-gradient-to-br ${t.gradient} mb-3 opacity-80`} />
            <div className="flex items-center gap-2">
              <span>{t.emoji}</span>
              <span className="font-medium">{t.name}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
