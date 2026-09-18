import { useEffect, useState } from 'react';
import { ArrowLeft, Check, Link2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Persona } from '../types';
import { fetchPersonaBySlug, installPersona } from '../lib/api/personas';
import { copyPersonaShareLink } from '../lib/sharePersona';

type Props = {
  slug: string;
  theme: 'dark' | 'light';
  onBack: () => void;
  onStartChat: (persona: Persona) => void;
};

export function PublicPersonaPage({ slug, theme, onBack, onStartChat }: Props) {
  const { t } = useTranslation(['personas', 'common']);
  const [persona, setPersona] = useState<Persona | null>(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    void (async () => {
      try {
        const found = await fetchPersonaBySlug(slug);
        if (!found) {
          setNotFound(true);
          return;
        }
        setPersona(found);
      } finally {
        setLoading(false);
      }
    })();
  }, [slug]);

  const handleStart = async () => {
    if (!persona) return;
    setStarting(true);
    try {
      await installPersona(persona.id);
      onStartChat(persona);
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-py-app text-py-text' : 'bg-white text-zinc-900'}`}>
      <header className="border-b border-py-border px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-lg hover:bg-white/10 text-py-text-secondary"
          aria-label={t('common:back')}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-sm font-medium truncate">{persona?.name ?? t('personas:publicPageTitle')}</h1>
      </header>

      <main className="max-w-lg mx-auto p-4 sm:p-8">
        {loading && <p className="text-sm text-py-text-secondary">{t('common:loading')}</p>}
        {notFound && (
          <p className="text-sm text-py-text-secondary">{t('personas:personaNotFound')}</p>
        )}
        {persona && (
          <article className="py-surface-card p-6 space-y-5">
            <div className="flex flex-col items-center text-center gap-3">
              <img
                src={persona.avatar}
                alt=""
                className="w-24 h-24 rounded-full object-cover ring-2 ring-py-border"
                referrerPolicy="no-referrer"
              />
              <div>
                <h2 className="text-xl font-semibold">{persona.name}</h2>
                {persona.tagline && (
                  <p className="text-sm text-py-text-secondary mt-1">{persona.tagline}</p>
                )}
              </div>
            </div>

            {persona.description && (
              <p className="text-sm leading-relaxed text-py-text-secondary whitespace-pre-wrap">
                {persona.description}
              </p>
            )}

            {persona.disclosure && (
              <p className="text-xs text-py-text-muted border-t border-py-border pt-3">
                {persona.disclosure}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                disabled={starting}
                onClick={() => void handleStart()}
                className="flex-1 py-3 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-sm disabled:opacity-60 transition-colors"
              >
                {starting ? t('common:loading') : t('personas:startChat')}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!persona) return;
                  void copyPersonaShareLink(persona.id).then((ok) => {
                    if (ok) {
                      setCopiedShare(true);
                      window.setTimeout(() => setCopiedShare(false), 2000);
                    }
                  });
                }}
                className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-py-border hover:border-py-text-muted text-sm transition-colors"
              >
                {copiedShare ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                {copiedShare ? t('personas:shareLinkCopied') : t('personas:shareLink')}
              </button>
            </div>
          </article>
        )}
      </main>
    </div>
  );
}
