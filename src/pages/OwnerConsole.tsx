import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePersonyAuth } from '../components/PersonyAuthProvider';
import { fetchMeProfile, fetchOwnerOverview } from '../lib/api/me';
import {
  fetchOwnerAiOverview,
  fetchOwnerAudit,
  fetchOwnerEconomics,
  fetchOwnerBatteryOverview,
  fetchOwnerMemoryStats,
  fetchOwnerUsers,
  fetchOwnerPersonasOverview,
  fetchOwnerInferenceList,
  fetchOwnerInferenceDetail,
  fetchOwnerPricing,
  type OwnerInferenceListItem,
  type OwnerInferenceDetail,
  type OwnerPricingEntry,
  type OwnerUserRow,
  type OwnerPersonaRow,
} from '../lib/api/owner';
import { OwnerShell } from './owner/OwnerShell';
import { OwnerOverviewSection } from './owner/sections/OwnerOverviewSection';
import { OwnerEconomySection } from './owner/sections/OwnerEconomySection';
import { OwnerInferenceSection } from './owner/sections/OwnerInferenceSection';
import { OwnerPricingSection } from './owner/sections/OwnerPricingSection';
import { OwnerAiSection } from './owner/sections/OwnerAiSection';
import { OwnerUsersSection } from './owner/sections/OwnerUsersSection';
import { OwnerPersonasSection } from './owner/sections/OwnerPersonasSection';
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
  const [users, setUsers] = useState<OwnerUserRow[]>([]);
  const [usersError, setUsersError] = useState(false);
  const [usersLoading, setUsersLoading] = useState(false);
  const [personas, setPersonas] = useState<OwnerPersonaRow[]>([]);
  const [personasError, setPersonasError] = useState(false);
  const [personasLoading, setPersonasLoading] = useState(false);
  const [memoryStats, setMemoryStats] = useState<Record<string, number> | null>(null);
  const [audit, setAudit] = useState<Array<Record<string, string>>>([]);
  const [aiOverview, setAiOverview] = useState<Awaited<
    ReturnType<typeof fetchOwnerAiOverview>
  > | null>(null);
  const [aiError, setAiError] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
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
  const [inferenceCostFilter, setInferenceCostFilter] = useState('');
  const [inferenceStatusFilter, setInferenceStatusFilter] = useState('');
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

  const loadInference = useCallback(
    async (filters?: { costConfidence?: string; status?: string }) => {
      const costConfidence = filters?.costConfidence ?? inferenceCostFilter;
      const status = filters?.status ?? inferenceStatusFilter;
      setInferenceLoading(true);
      setInferenceError(false);
      try {
        const data = await fetchOwnerInferenceList({
          limit: 50,
          costConfidence: costConfidence || undefined,
          status: status || undefined,
        });
        setInferenceItems(data.items);
        setInferenceTotal(data.total);
        setInferenceDetail(null);
      } catch {
        setInferenceError(true);
        setInferenceItems([]);
      } finally {
        setInferenceLoading(false);
      }
    },
    [inferenceCostFilter, inferenceStatusFilter]
  );

  const loadUsers = useCallback(async () => {
    setUsersLoading(true);
    setUsersError(false);
    try {
      const data = await fetchOwnerUsers();
      setUsers(data.users);
    } catch {
      setUsersError(true);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadPersonas = useCallback(async () => {
    setPersonasLoading(true);
    setPersonasError(false);
    try {
      const data = await fetchOwnerPersonasOverview();
      setPersonas(data.personas);
    } catch {
      setPersonasError(true);
      setPersonas([]);
    } finally {
      setPersonasLoading(false);
    }
  }, []);

  const loadAi = useCallback(async () => {
    setAiLoading(true);
    setAiError(false);
    try {
      setAiOverview(await fetchOwnerAiOverview());
    } catch {
      setAiError(true);
      setAiOverview(null);
    } finally {
      setAiLoading(false);
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
          await loadUsers();
        } else if (section === 'personas') {
          await loadPersonas();
        } else if (section === 'memory') {
          const data = await fetchOwnerMemoryStats();
          setMemoryStats(data.stats);
        } else if (section === 'audit') {
          const data = await fetchOwnerAudit();
          setAudit(data.entries);
        } else if (section === 'ai') {
          await loadAi();
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
  }, [section, error, overview, loadEconomy, loadPricing, loadInference, loadUsers, loadPersonas, loadAi]);

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
          costConfidenceFilter={inferenceCostFilter}
          statusFilter={inferenceStatusFilter}
          onCostConfidenceFilterChange={(value) => {
            setInferenceCostFilter(value);
            void loadInference({ costConfidence: value, status: inferenceStatusFilter });
          }}
          onStatusFilterChange={(value) => {
            setInferenceStatusFilter(value);
            void loadInference({ costConfidence: inferenceCostFilter, status: value });
          }}
          onSelect={(id) => void loadInferenceDetail(id)}
          onRetry={() => void loadInference()}
        />
      )}

      {section === 'users' && (
        <OwnerUsersSection
          users={users}
          loading={usersLoading}
          error={usersError}
          onRetry={() => void loadUsers()}
        />
      )}

      {section === 'personas' && (
        <OwnerPersonasSection
          personas={personas}
          loading={personasLoading}
          error={personasError}
          onRetry={() => void loadPersonas()}
        />
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
        <OwnerAiSection
          overview={aiOverview}
          failedInferenceRuns={Number(metrics.failedInferenceRuns ?? 0)}
          loading={aiLoading}
          error={aiError}
          onRetry={() => void loadAi()}
          onProviderChange={(provider) => {
            if (aiOverview) setAiOverview({ ...aiOverview, chatTextProvider: provider });
          }}
        />
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
