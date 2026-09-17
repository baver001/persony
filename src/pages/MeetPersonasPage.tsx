import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Persona } from '../types';
import { fetchAvailablePersonas, installPersona } from '../lib/api/personas';
import { PersonyLogo } from '../components/PersonyLogo';

type Props = {
  theme: 'dark' | 'light';
  onStartChat: (persona: Persona) => void;
};

export function MeetPersonasPage({ theme, onStartChat }: Props) {
  const { t } = useTranslation(['personas', 'common']);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);
  const isDark = theme === 'dark';

  useEffect(() => {
    void (async () => {
      try {
        setPersonas(await fetchAvailablePersonas());
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleStart = async (persona: Persona) => {
    setStartingId(persona.id);
    try {
      await installPersona(persona.id);
      onStartChat(persona);
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-py-chat text-py-text px-4 py-8 sm:py-12">
      <div className="py-chat-thread space-y-8">
        <header className="text-center space-y-3">
          <PersonyLogo size={48} theme={theme} className="mx-auto" />
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            {t('personas:meetTitle')}
          </h1>
          <p className="text-sm text-py-text-secondary max-w-lg mx-auto leading-relaxed">
            {t('personas:meetSubtitle')}
          </p>
        </header>

        {loading ? (
          <p className="text-center text-sm text-py-text-muted">{t('common:loading')}</p>
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
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h2 className="font-semibold truncate">{persona.name}</h2>
                      <p className="text-xs text-py-text-secondary truncate">{persona.tagline}</p>
                    </div>
                    {persona.badge && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-py-accent/15 text-py-accent shrink-0">
                        {persona.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-py-text-muted mt-2 line-clamp-3 leading-relaxed">
                    {persona.description}
                  </p>
                  {persona.disclosure && (
                    <p className="text-[11px] text-py-text-muted mt-2 italic">{persona.disclosure}</p>
                  )}
                  <button
                    type="button"
                    disabled={startingId === persona.id}
                    onClick={() => void handleStart(persona)}
                    className="mt-4 self-start px-4 py-2 rounded-full text-xs font-semibold bg-py-accent text-white hover:opacity-90 disabled:opacity-50"
                  >
                    {startingId === persona.id ? t('common:loading') : t('personas:startChat')}
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
