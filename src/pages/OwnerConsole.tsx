import { useCallback, useEffect, useState } from 'react';
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
  fetchOwnerInferenceList,
  fetchOwnerInferenceDetail,
  fetchOwnerPricing,
  type OwnerInferenceListItem,
  type OwnerInferenceDetail,
  type OwnerPricingEntry,
} from '../lib/api/owner';
import { OwnerShell } from './owner/OwnerShell';
import { OwnerOverviewSection } from './owner/sections/OwnerOverviewSection';
import { OwnerEconomySection } from './owner/sections/OwnerEconomySection';
import { OwnerInferenceSection } from './owner/sections/OwnerInferenceSection';
import { OwnerPricingSection } from './owner/sections/OwnerPricingSection';
import type { OwnerSectionId } from './owner/types';
import { useOwnerNoIndex } from './owner/utils';

type Props = {
  onBack: () => void;
};

type EconomicsData = Awaited<ReturnType<typeof fetchOwnerEconomics>>['economics'];

export function OwnerConsole({ onBack }: Props) {
  const { t } = useTranslation(['owner', 'common']);
  const { isSignedIn, isLoaded } = usePersonyAuth();
  const [section, setSection] = useState<OwnerSectionId>('overview');
  const [overview, setOverview] = useState<Record<string, unknown> | null>(null);
  const [battery, setBattery] = useState<Record<string, unknown> | null>(null);
  const [users, setUsers] = useState<Array<Record<string, string | null>>>([]);
  const [memoryStats, setMemoryStats] = useState<Record<string, number> | null>(null);
  const [audit, setAudit] = useState<Array<Record<string, string>>>([]);
  const [aiOverview, setAiOverview] = useState<Record<string, unknown> | null>(null);
  const [economics, setEconomics] = useState<EconomicsData | null>(null);
  const [economyError, setEconomyError] = useState(false);
  const [economyLoading, setEconomyLoading] = useState(false);
  const [pricingEntries, setPricingEntries] = useState<OwnerPricingEntry[]>([]);
  const [pricingVersion, setPricingVersion] = useState<string | null>(null);
  const [pricingError, setPricingError] = useState(false);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [inferenceItems, setInferenceItems] = useState<OwnerInferenceListItem[]>([]);
  const [inferenceTotal, setInferenceTotal] = useState(0);
  const [inferenceDetail, setInferenceDetail] = useState<OwnerInferenceDetail | null>(null);
  const [inferenceError, setInferenceError] = useState(false);
  const [inferenceLoading, setInferenceLoading] = useState(false);
  const [error, setError] = useState<'AUTH_REQUIRED' | 'FORBIDDEN' | 'INTERNAL_ERROR' | null>(
    null
  );

  useOwnerNoIndex(t('common:ownerConsole'), t('common:appTitle'));

  const loadEconomy = useCallback(async () => {
    setEconomyLoading(true);
    setEconomyError(false);
    try {
      const data = await fetchOwnerEconomics();
      setEconomics(data.economics);
    } catch {
      setEconomyError(true);
    } finally {
      setEconomyLoading(false);
    }
  }, []);

  const loadPricing = useCallback(async () => {
    setPricingLoading(true);
    setPricingError(false);
    try {
      const data = await fetchOwnerPricing();
      setPricingEntries(data.entries);
      setPricingVersion(data.catalogVersion);
    } catch {
      setPricingError(true);
    } finally {
      setPricingLoading(false);
    }
  }, []);

  const loadInference = useCallback(async () => {
    setInferenceLoading(true);
    setInferenceError(false);
    try {
      const data = await fetchOwnerInferenceList({ limit: 50 });
      setInferenceItems(data.items);
      setInferenceTotal(data.total);
      setInferenceDetail(null);
    } catch {
      setInferenceError(true);
      setInferenceItems([]);
    } finally {
      setInferenceLoading(false);
    }
  }, []);

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
        } else if (section === 'economy') {
          await loadEconomy();
        } else if (section === 'pricing') {
          await loadPricing();
        } else if (section === 'inference') {
          await loadInference();
        }
      } catch {
        // section-level errors handled per section
      }
    })();
  }, [section, error, overview, loadEconomy, loadPricing, loadInference]);

  const loadInferenceDetail = async (id: string) => {
    try {
      setInferenceLoading(true);
      setInferenceError(false);
      const data = await fetchOwnerInferenceDetail(id);
      setInferenceDetail(data.inference);
    } catch {
      setInferenceError(true);
    } finally {
      setInferenceLoading(false);
    }
  };

  const metrics = (overview?.metrics as Record<string, unknown>) || {};

  if (error === 'AUTH_REQUIRED') {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 text-zinc-400">{t('owner:authRequired')}</div>
    );
  }
  if (error === 'FORBIDDEN') {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 text-red-300">{t('owner:forbidden')}</div>
    );
  }
  if (error === 'INTERNAL_ERROR') {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 text-red-300">{t('owner:internalError')}</div>
    );
  }
  if (!overview) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 text-zinc-500">{t('common:loading')}</div>
    );
  }

  return (
    <OwnerShell
      section={section}
      onSectionChange={setSection}
      onBack={onBack}
      title={t('common:ownerConsole')}
    >
      {section === 'overview' && (
        <OwnerOverviewSection
          metrics={metrics}
          economics={economics}
          whatChanged={(overview.whatChanged as string[]) || []}
        />
      )}

      {section === 'economy' && (
        <OwnerEconomySection
          economics={economics}
          loading={economyLoading}
          error={economyError}
          onRetry={() => void loadEconomy()}
        />
      )}

      {section === 'pricing' && (
        <OwnerPricingSection
          catalogVersion={pricingVersion}
          entries={pricingEntries}
          loading={pricingLoading}
          error={pricingError}
          onRetry={() => void loadPricing()}
        />
      )}

      {section === 'inference' && (
        <OwnerInferenceSection
          items={inferenceItems}
          total={inferenceTotal}
          detail={inferenceDetail}
          loading={inferenceLoading}
          error={inferenceError}
          onSelect={(id) => void loadInferenceDetail(id)}
          onRetry={() => void loadInference()}
        />
      )}

      {section === 'users' && (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
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
        </div>
      )}

      {section === 'ai' && (
        <div className="space-y-4 text-sm">
          <p className="text-zinc-300">
            {t('owner:aiHint', { count: String(metrics.failedInferenceRuns ?? 0) })}
          </p>
          {aiOverview && (
            <label className="block space-y-2">
              <span className="text-xs text-zinc-400 uppercase tracking-wide">
                {t('owner:chatProvider')}
              </span>
              <select
                className="w-full max-w-xs bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                value={String(aiOverview.chatTextProvider ?? 'google')}
                onChange={(e) => {
                  const value = e.target.value;
                  void updateOwnerSystemSetting('chat_text_provider', value, 'owner_console').then(
                    (ok) => {
                      if (ok) setAiOverview({ ...aiOverview, chatTextProvider: value });
                    }
                  );
                }}
              >
                <option value="google">google</option>
                <option value="deepseek">deepseek</option>
                <option value="auto">auto</option>
              </select>
            </label>
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
    </OwnerShell>
  );
}
