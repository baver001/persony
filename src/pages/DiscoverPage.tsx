import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { DISCOVER_SECTIONS } from '../../shared/personas/discover-sections';
import type { Persona } from '../types';
import { fetchAvailablePersonas, installPersona } from '../lib/api/personas';

type Props = {
  theme: 'dark' | 'light';
  onBack: () => void;
  onStartChat: (persona: Persona) => void;
};

export function DiscoverPage({ theme, onBack, onStartChat }: Props) {
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

  const personaById = useMemo(
    () => new Map(personas.map((persona) => [persona.id, persona])),
    [personas]
  );

  const handleStart = async (persona: Persona) => {
    setStartingId(persona.id);
    try {
      await installPersona(persona.id);
      onStartChat(persona);
    } finally {
      setStartingId(null);
    }
  };

  const renderCard = (persona: Persona) => (
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
            <h3 className="font-semibold truncate">{persona.name}</h3>
            <p className="text-xs text-py-text-secondary truncate">{persona.tagline}</p>
          </div>
          {persona.badge && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-py-accent/15 text-py-accent shrink-0">
              {persona.badge}
            </span>
          )}
        </div>
        <p className="text-xs text-py-text-muted mt-2 line-clamp-2 leading-relaxed">
          {persona.description}
        </p>
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
  );

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
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              {t('personas:discoverTitle')}
            </h1>
            <p className="text-sm text-py-text-secondary max-w-lg leading-relaxed">
              {t('personas:discoverSubtitle')}
            </p>
          </div>
        </header>

        {loading ? (
          <p className="text-sm text-py-text-muted">{t('common:loading')}</p>
        ) : (
          <div className="space-y-10">
            {DISCOVER_SECTIONS.map((section) => {
              const sectionPersonas = section.personaIds
                .map((id) => personaById.get(id))
                .filter((persona): persona is Persona => Boolean(persona));
              const unique = sectionPersonas.filter(
                (persona, index, arr) => arr.findIndex((p) => p.id === persona.id) === index
              );
              if (!unique.length) return null;

              return (
                <section key={section.id} className="space-y-3">
                  <h2 className="text-sm font-semibold tracking-wide text-py-text-secondary uppercase">
                    {t(`personas:discoverSection.${section.id}`)}
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">{unique.map(renderCard)}</div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
