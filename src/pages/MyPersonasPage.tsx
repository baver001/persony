import { useEffect, useState } from 'react';
import { ArrowLeft, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Persona } from '../types';
import { fetchMyPersonas } from '../lib/api/personas';

type Props = {
  theme: 'dark' | 'light';
  onBack: () => void;
  onStartChat: (persona: Persona) => void;
  onCreatePersona: () => void;
};

export function MyPersonasPage({ theme, onBack, onStartChat, onCreatePersona }: Props) {
  const { t } = useTranslation(['personas', 'common']);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const isDark = theme === 'dark';

  useEffect(() => {
    void (async () => {
      try {
        const mine = await fetchMyPersonas();
        setPersonas(mine.filter((persona) => persona.isCustom));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-py-chat text-py-text px-4 py-8 sm:py-12">
      <div className="py-chat-thread space-y-8">
        <header className="space-y-4">
          <button
            type="button"
            onClick={onBack}
            className={`inline-flex items-center gap-1.5 text-xs transition-colors ${
              isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-neutral-500 hover:text-neutral-800'
            }`}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            {t('common:back')}
          </button>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
                {t('personas:myPersonasTitle')}
              </h1>
              <p className="text-sm text-py-text-secondary max-w-lg leading-relaxed">
                {t('personas:myPersonasSubtitle')}
              </p>
            </div>
            <button
              type="button"
              onClick={onCreatePersona}
              className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-py-accent text-white hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('common:createPersona')}
            </button>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-py-text-muted">{t('common:loading')}</p>
        ) : personas.length === 0 ? (
          <div className="py-surface-card p-6 text-center space-y-3">
            <p className="text-sm text-py-text-secondary">{t('personas:myPersonasEmpty')}</p>
            <button
              type="button"
              onClick={onCreatePersona}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold bg-py-accent text-white hover:opacity-90"
            >
              <Plus className="w-3.5 h-3.5" />
              {t('personas:createTitle')}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {personas.map((persona) => (
              <article
                key={persona.id}
                className="py-surface-card p-4 flex gap-4 transition-colors hover:border-py-text-muted"
              >
                <img
                  src={persona.avatar}
                  alt=""
                  className="w-16 h-16 rounded-full object-cover ring-1 ring-py-border shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="min-w-0 flex-1 flex flex-col">
                  <h3 className="font-semibold truncate">{persona.name}</h3>
                  <p className="text-xs text-py-text-secondary truncate">{persona.tagline}</p>
                  <p className="text-xs text-py-text-muted mt-2 line-clamp-2 leading-relaxed">
                    {persona.description}
                  </p>
                  <button
                    type="button"
                    onClick={() => onStartChat(persona)}
                    className="mt-4 self-start px-4 py-2 rounded-full text-xs font-semibold bg-py-accent text-white hover:opacity-90"
                  >
                    {t('personas:startChat')}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
