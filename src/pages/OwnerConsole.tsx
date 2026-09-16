import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersonyAuth } from '../components/PersonyAuthProvider';
import { fetchMeProfile, fetchOwnerOverview } from '../lib/api/me';

type Props = {
  onBack: () => void;
};

function useOwnerNoIndex() {
  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]');
    const tag = existing ?? document.createElement('meta');
    tag.setAttribute('name', 'robots');
    tag.setAttribute('content', 'noindex, nofollow, noarchive');
    if (!existing) document.head.appendChild(tag);
    document.title = 'Owner Console';
    return () => {
      tag.setAttribute('content', 'index,follow');
      document.title = 'Persony — AI Messenger';
    };
  }, []);
}

export function OwnerConsole({ onBack }: Props) {
  const { t } = useTranslation('common');
  const { isSignedIn, isLoaded } = usePersonyAuth();
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<'AUTH_REQUIRED' | 'FORBIDDEN' | 'INTERNAL_ERROR' | null>(
    null
  );

  useOwnerNoIndex();

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setError('AUTH_REQUIRED');
      return;
    }

    void (async () => {
      try {
        const profile = await fetchMeProfile();
        if (!profile.isOwner) {
          setError('FORBIDDEN');
          return;
        }
        setOverview(await fetchOwnerOverview());
      } catch (e) {
        setError(e instanceof Error ? (e.message as typeof error) : 'INTERNAL_ERROR');
      }
    })();
  }, [isLoaded, isSignedIn]);

  const metrics = (overview?.metrics as Record<string, unknown>) || {};

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <button type="button" onClick={onBack} className="text-sm text-zinc-400 hover:text-zinc-200">
          ← {t('back')}
        </button>
        <h1 className="text-2xl font-semibold">{t('ownerConsole')}</h1>
        {error === 'AUTH_REQUIRED' ? (
          <p className="text-zinc-400">Sign in required.</p>
        ) : error === 'FORBIDDEN' ? (
          <p className="text-red-300">Access denied</p>
        ) : error === 'INTERNAL_ERROR' ? (
          <p className="text-red-300">Server error. Try again later.</p>
        ) : !overview ? (
          <p className="text-zinc-500">{t('loading')}</p>
        ) : (
          <>
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(metrics).map(([key, value]) => (
                <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="text-xs text-zinc-500 uppercase">{key}</div>
                  <div className="text-lg font-medium">
                    {value === null || value === undefined ? 'Not configured' : String(value)}
                  </div>
                </div>
              ))}
            </section>
            <section className="rounded-xl border border-white/10 bg-white/5 p-4">
              <h2 className="font-medium mb-2">What changed</h2>
              <ul className="list-disc pl-5 text-sm text-zinc-300 space-y-1">
                {((overview.whatChanged as string[]) || []).map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
