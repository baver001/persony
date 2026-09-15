import React, { useEffect, useState } from 'react';
import { Search, Users } from 'lucide-react';
type DiscoverPersona = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  avatarUrl: string;
  installCount: number;
  category: string;
};

interface DiscoverViewProps {
  onOpenPersona: (slug: string) => void;
  onBack: () => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({ onOpenPersona, onBack }) => {
  const [personas, setPersonas] = useState<DiscoverPersona[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void fetch('/api/discover')
      .then((r) => r.json())
      .then((d: { personas: DiscoverPersona[] }) => setPersonas(d.personas || []))
      .catch(() => setPersonas([]));
  }, []);

  const filtered = personas.filter((p) => {
    const q = query.toLowerCase();
    return !q || p.name.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q);
  });

  return (
    <div className="flex flex-col h-full bg-py-app">
      <header className="flex items-center gap-3 p-4 border-b border-py-border">
        <button type="button" onClick={onBack} className="text-sm text-py-text-muted hover:text-py-text">
          ← Chats
        </button>
        <h1 className="text-lg font-semibold">Discover</h1>
      </header>

      <div className="p-4">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-py-border bg-py-surface">
          <Search size={16} className="text-py-text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск персон..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-sm text-py-text-muted py-8">Публичных персон пока нет</p>
        ) : (
          filtered.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onOpenPersona(p.slug)}
              className="w-full text-left rounded-xl border border-py-border p-4 hover:bg-py-hover transition-colors"
            >
              <div className="flex items-start gap-3">
                {p.avatarUrl ? (
                  <img src={p.avatarUrl} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-py-accent/20" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-xs text-py-text-muted">{p.tagline}</div>
                  <p className="text-sm text-py-text-muted mt-1 line-clamp-2">{p.description}</p>
                  <div className="flex items-center gap-1 mt-2 text-xs text-py-text-muted">
                    <Users size={12} />
                    {p.installCount} installs
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
