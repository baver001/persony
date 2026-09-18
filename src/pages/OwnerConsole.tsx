import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersonyAuth } from '../components/PersonyAuthProvider';
import { fetchMeProfile, fetchOwnerOverview } from '../lib/api/me';
import {
  fetchOwnerAiOverview,
  updateOwnerSystemSetting,
  fetchOwnerAudit,
  fetchOwnerEconomics,
  fetchOwnerBatteryOverview,
  fetchOwnerMemoryStats,
  fetchOwnerUsers,
} from '../lib/api/owner';

type Props = {
  onBack: () => void;
};

type OwnerSection =
  | 'overview'
  | 'users'
  | 'personas'
  | 'memory'
  | 'battery'
  | 'ai'
  | 'settings'
  | 'audit';

const SECTIONS: OwnerSection[] = [
  'overview',
  'users',
  'personas',
  'memory',
  'battery',
  'ai',
  'settings',
  'audit',
];

function useOwnerNoIndex(title: string, appTitle: string) {
  useEffect(() => {
    const existing = document.querySelector('meta[name="robots"]');
    const tag = existing ?? document.createElement('meta');
    tag.setAttribute('name', 'robots');
    tag.setAttribute('content', 'noindex, nofollow, noarchive');
    if (!existing) document.head.appendChild(tag);
    document.title = title;
    return () => {
      tag.setAttribute('content', 'index,follow');
      document.title = appTitle;
    };
  }, [title, appTitle]);
}

export function OwnerConsole({ onBack }: Props) {
  const { t } = useTranslation(['owner', 'common']);
  const { isSignedIn, isLoaded } = usePersonyAuth();
  const [section, setSection] = useState<OwnerSection>('overview');
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [battery, setBattery] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<Array<Record<string, string | null>>>([]);
  const [memoryStats, setMemoryStats] = useState<Record<string, number> | null>(null);
  const [audit, setAudit] = useState<Array<Record<string, string>>>([]);
  const [aiOverview, setAiOverview] = useState<Record<string, unknown> | null>(null);
  const [economics, setEconomics] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<'AUTH_REQUIRED' | 'FORBIDDEN' | 'INTERNAL_ERROR' | null>(
    null
  );

  useOwnerNoIndex(t('common:ownerConsole'), t('common:appTitle'));

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
        const [overviewData, economicsData] = await Promise.all([
          fetchOwnerOverview(),
          fetchOwnerEconomics().catch(() => null),
        ]);
        setOverview(overviewData);
        setEconomics(economicsData?.economics ?? null);
      } catch (e) {
        setError(e instanceof Error ? (e.message as typeof error) : 'INTERNAL_ERROR');
      }
    })();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (error || !overview) return;

    void (async () => {
      try {
        if (section === 'battery') {
          setBattery(await fetchOwnerBatteryOverview());
        } else if (section === 'users') {
          const data = await fetchOwnerUsers();
          setUsers(data.users);
        } else if (section === 'memory') {
          const data = await fetchOwnerMemoryStats();
          setMemoryStats(data.stats);
        } else if (section === 'audit') {
          const data = await fetchOwnerAudit();
          setAudit(data.entries);
        } else if (section === 'ai') {
          setAiOverview(await fetchOwnerAiOverview());
        }
      } catch {
        // section-level errors stay empty
      }
    })();
  }, [section, error, overview]);

  const metrics = (overview?.metrics as Record<string, unknown>) || {};
  const sectionLabel = useMemo(
    () => (key: OwnerSection) => t(`owner:sections.${key}`),
    [t]
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="max-w-6xl mx-auto p-4 sm:p-8 flex flex-col lg:flex-row gap-6">
        <aside className="lg:w-52 shrink-0 space-y-2">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-zinc-400 hover:text-zinc-200 mb-4 block"
          >
            ← {t('common:back')}
          </button>
          <h1 className="text-lg font-semibold px-2">{t('common:ownerConsole')}</h1>
          <nav className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
            {SECTIONS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setSection(key)}
                className={`px-3 py-2 rounded-lg text-left text-sm whitespace-nowrap transition-colors ${
                  section === key
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'
                }`}
              >
                {sectionLabel(key)}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 min-w-0 space-y-6">
          {error === 'AUTH_REQUIRED' ? (
            <p className="text-zinc-400">{t('owner:authRequired')}</p>
          ) : error === 'FORBIDDEN' ? (
            <p className="text-red-300">{t('owner:forbidden')}</p>
          ) : error === 'INTERNAL_ERROR' ? (
            <p className="text-red-300">{t('owner:internalError')}</p>
          ) : !overview ? (
            <p className="text-zinc-500">{t('common:loading')}</p>
          ) : (
            <>
              <h2 className="text-xl font-semibold">{sectionLabel(section)}</h2>

              {section === 'overview' && (
                <>
                  <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Object.entries(metrics).map(([key, value]) => (
                      <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-zinc-500 uppercase">{key}</div>
                        <div className="text-lg font-medium">
                          {value === null || value === undefined ? '—' : String(value)}
                        </div>
                      </div>
                    ))}
                  </section>
                  {economics && (
                    <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                      <h3 className="font-medium">{t('owner:economicsTitle')}</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-zinc-500">{t('owner:aiCostToday')}</div>
                          <div className="font-mono">
                            ${((economics.aiCostTodayMicrousd as number) / 1_000_000).toFixed(4)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500">{t('owner:aiCost7d')}</div>
                          <div className="font-mono">
                            ${((economics.aiCost7dMicrousd as number) / 1_000_000).toFixed(4)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500">{t('owner:callsToday')}</div>
                          <div>{String(economics.callsToday)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500">{t('owner:energyToday')}</div>
                          <div>{String(economics.energyConsumedToday)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500">{t('owner:fallbackRate')}</div>
                          <div>
                            {(((economics.fallbackRateToday as number) || 0) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-zinc-500">{t('owner:avgLatency')}</div>
                          <div>
                            {economics.avgLatencyMsToday
                              ? `${Math.round(economics.avgLatencyMsToday as number)} ms`
                              : '—'}
                          </div>
                        </div>
                      </div>
                    </section>
                  )}
                  <section className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="font-medium mb-2">{t('owner:whatChanged')}</h3>
                    <ul className="list-disc pl-5 text-sm text-zinc-300 space-y-1">
                      {((overview.whatChanged as string[]) || []).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </section>
                </>
              )}

              {section === 'users' && (
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5 text-zinc-400 text-left">
                      <tr>
                        <th className="px-3 py-2">ID</th>
                        <th className="px-3 py-2">Locale</th>
                        <th className="px-3 py-2">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <tr key={String(user.id)} className="border-t border-white/5">
                          <td className="px-3 py-2 font-mono text-xs">{user.id}</td>
                          <td className="px-3 py-2">{user.preferredLocale || '—'}</td>
                          <td className="px-3 py-2 text-zinc-400">{user.createdAt}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {section === 'personas' && (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-300">
                  <p>{t('owner:personasHint', { count: String(metrics.activePersonas ?? 0) })}</p>
                </div>
              )}

              {section === 'memory' && memoryStats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {Object.entries(memoryStats).map(([key, value]) => (
                    <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-4">
                      <div className="text-xs text-zinc-500 uppercase">{key}</div>
                      <div className="text-2xl font-semibold mt-1">{value}</div>
                    </div>
                  ))}
                </div>
              )}

              {section === 'battery' && battery && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {Object.entries((battery.metrics as Record<string, unknown>) || {}).map(
                      ([key, value]) => (
                        <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                          <div className="text-xs text-zinc-500 uppercase">{key}</div>
                          <div className="text-lg font-medium">{String(value ?? '—')}</div>
                        </div>
                      )
                    )}
                  </div>
                  <pre className="text-xs bg-black/40 border border-white/10 rounded-xl p-4 overflow-x-auto text-zinc-300">
                    {JSON.stringify(battery.config, null, 2)}
                  </pre>
                </div>
              )}

              {section === 'ai' && (
                <div className="space-y-4 text-sm">
                  <p className="text-zinc-300">
                    {t('owner:aiHint', { count: String(metrics.failedInferenceRuns ?? 0) })}
                  </p>
                  {aiOverview && (
                    <>
                      <label className="block space-y-2">
                        <span className="text-xs text-zinc-400 uppercase tracking-wide">
                          {t('owner:chatProvider')}
                        </span>
                        <select
                          className="w-full max-w-xs bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm"
                          value={String(aiOverview.chatTextProvider ?? 'google')}
                          onChange={(e) => {
                            const value = e.target.value;
                            void updateOwnerSystemSetting('chat_text_provider', value, 'owner_console')
                              .then((ok) => {
                                if (ok) {
                                  setAiOverview({ ...aiOverview, chatTextProvider: value });
                                }
                              });
                          }}
                        >
                          <option value="google">google</option>
                          <option value="deepseek">deepseek</option>
                          <option value="auto">auto</option>
                        </select>
                      </label>
                      <pre className="text-xs bg-black/40 border border-white/10 rounded-xl p-4 overflow-x-auto text-zinc-300">
                        {JSON.stringify(aiOverview, null, 2)}
                      </pre>
                    </>
                  )}
                </div>
              )}

              {section === 'settings' && (
                <p className="text-sm text-zinc-400">{t('owner:settingsHint')}</p>
              )}

              {section === 'audit' && (
                <ul className="space-y-2 text-sm">
                  {audit.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                    >
                      <span className="text-zinc-400">{entry.createdAt}</span>
                      <span className="mx-2 text-zinc-600">·</span>
                      <span className="font-medium">{entry.action}</span>
                      <span className="text-zinc-500 ml-2">
                        {entry.targetType}/{entry.targetId}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
