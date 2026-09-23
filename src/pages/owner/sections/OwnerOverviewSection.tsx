import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatMicrousd } from '../utils';

type OwnerKpis = {
  totalUsers: number;
  newUsers24h: number;
  dau: number;
  aiCalls24h: number;
  aiCalls7d: number;
  voiceCalls24h: number;
  activePersonas: number;
  failedInferenceRuns: number;
  totalMessages: number;
};

type TrendPoint = {
  current: number;
  previous: number;
  deltaPercent: number | null;
};

type OwnerPeriods = Record<
  string,
  {
    aiCalls?: number;
    dau?: number;
    newUsers?: number;
    voiceCalls?: number;
  }
>;

type OwnerTrends = Record<
  string,
  {
    aiCalls?: TrendPoint;
    dau?: TrendPoint;
    voiceCalls?: TrendPoint;
  }
>;

type Economics = {
  aiCostTodayMicrousd: number;
  aiCost7dMicrousd: number;
  costCoverageTodayPercent: number;
  unpricedCallsToday: number;
  callsToday: number;
  energyConsumedToday: number;
  fallbackRateToday: number;
  avgLatencyMsToday: number | null;
};

type Props = {
  kpis: OwnerKpis | null;
  periods?: OwnerPeriods | null;
  trends?: OwnerTrends | null;
  economics: Economics | null;
  whatChanged: string[];
};

const KPI_FIELDS: Array<{ key: keyof OwnerKpis; labelKey: string }> = [
  { key: 'totalUsers', labelKey: 'kpiTotalUsers' },
  { key: 'dau', labelKey: 'kpiDau' },
  { key: 'newUsers24h', labelKey: 'kpiNewUsers24h' },
  { key: 'aiCalls24h', labelKey: 'kpiAiCalls24h' },
  { key: 'aiCalls7d', labelKey: 'kpiAiCalls7d' },
  { key: 'voiceCalls24h', labelKey: 'kpiVoiceCalls24h' },
  { key: 'activePersonas', labelKey: 'kpiActivePersonas' },
  { key: 'failedInferenceRuns', labelKey: 'kpiFailedInferences' },
];

const PERIOD_OPTIONS = ['24h', '7d', '30d', '90d'] as const;
type PeriodId = (typeof PERIOD_OPTIONS)[number];

function formatDelta(delta: number | null | undefined): string {
  if (delta === null || delta === undefined) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}%`;
}

function PeriodBarChart({
  periods,
  metric,
  label,
}: {
  periods: OwnerPeriods;
  metric: 'aiCalls' | 'dau' | 'voiceCalls';
  label: string;
}) {
  const entries = PERIOD_OPTIONS.map((id) => ({
    id,
    value: periods[id]?.[metric] ?? 0,
  }));
  const max = Math.max(...entries.map((entry) => entry.value), 1);

  return (
    <div className="space-y-2">
      <div className="text-xs text-zinc-500">{label}</div>
      <div className="flex items-end gap-2 h-20">
        {entries.map((entry) => (
          <div key={entry.id} className="flex-1 min-w-0 flex flex-col items-center gap-1">
            <div
              className="w-full rounded-t bg-sky-500/70 transition-all"
              style={{ height: `${Math.max(8, (entry.value / max) * 100)}%` }}
              title={`${entry.id}: ${entry.value}`}
            />
            <span className="text-[10px] text-zinc-500 tabular-nums">{entry.id}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function OwnerOverviewSection({ kpis, periods, trends, economics, whatChanged }: Props) {
  const { t } = useTranslation('owner');
  const [period, setPeriod] = useState<PeriodId>('24h');

  const periodTrends = trends?.[period];
  const periodSnapshot = periods?.[period];

  return (
    <>
      {kpis && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{t('overviewKpiTitle')}</h3>
            <div className="flex gap-1">
              {PERIOD_OPTIONS.map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setPeriod(id)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                    period === id
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'border-white/10 text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {t(`period${id}`)}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {KPI_FIELDS.map(({ key, labelKey }) => (
              <div key={key} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-zinc-500">{t(labelKey)}</div>
                <div className="text-lg font-medium tabular-nums">{kpis[key]}</div>
              </div>
            ))}
          </div>
          {periods && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 grid gap-4 sm:grid-cols-3">
              <PeriodBarChart periods={periods} metric="aiCalls" label={t('chartAiCalls')} />
              <PeriodBarChart periods={periods} metric="dau" label={t('chartDau')} />
              <PeriodBarChart periods={periods} metric="voiceCalls" label={t('chartVoiceCalls')} />
            </div>
          )}
          {periodSnapshot && (
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              {periodSnapshot.aiCalls !== undefined && (
                <div>
                  <div className="text-xs text-zinc-500">{t('kpiAiCallsPeriod', { period })}</div>
                  <div className="font-medium tabular-nums">{periodSnapshot.aiCalls}</div>
                  {periodTrends?.aiCalls && (
                    <div className="text-[11px] text-zinc-500">
                      {t('trendVsPrevious', { delta: formatDelta(periodTrends.aiCalls.deltaPercent) })}
                    </div>
                  )}
                </div>
              )}
              {periodSnapshot.dau !== undefined && (
                <div>
                  <div className="text-xs text-zinc-500">{t('kpiDauPeriod', { period })}</div>
                  <div className="font-medium tabular-nums">{periodSnapshot.dau}</div>
                  {periodTrends?.dau && (
                    <div className="text-[11px] text-zinc-500">
                      {t('trendVsPrevious', { delta: formatDelta(periodTrends.dau.deltaPercent) })}
                    </div>
                  )}
                </div>
              )}
              {periodSnapshot.voiceCalls !== undefined && (
                <div>
                  <div className="text-xs text-zinc-500">{t('kpiVoiceCallsPeriod', { period })}</div>
                  <div className="font-medium tabular-nums">{periodSnapshot.voiceCalls}</div>
                  {periodTrends?.voiceCalls && (
                    <div className="text-[11px] text-zinc-500">
                      {t('trendVsPrevious', {
                        delta: formatDelta(periodTrends.voiceCalls.deltaPercent),
                      })}
                    </div>
                  )}
                </div>
              )}
              {periodSnapshot.newUsers !== undefined && (
                <div>
                  <div className="text-xs text-zinc-500">{t('kpiNewUsersPeriod', { period })}</div>
                  <div className="font-medium tabular-nums">{periodSnapshot.newUsers}</div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
      {economics && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h3 className="font-medium">{t('economicsTitle')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-zinc-500">{t('knownAiCogsToday')}</div>
              <div className="font-mono">{formatMicrousd(economics.aiCostTodayMicrousd, 4)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t('costCoverageToday')}</div>
              <div>
                {economics.costCoverageTodayPercent}%
                {economics.unpricedCallsToday > 0 && (
                  <span className="text-xs text-amber-400/90 block">
                    {t('unpricedCalls', { count: economics.unpricedCallsToday })}
                  </span>
                )}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t('aiCost7d')}</div>
              <div className="font-mono">{formatMicrousd(economics.aiCost7dMicrousd, 4)}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t('callsToday')}</div>
              <div>{economics.callsToday}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t('energyToday')}</div>
              <div>{economics.energyConsumedToday}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t('fallbackRate')}</div>
              <div>{(economics.fallbackRateToday * 100).toFixed(1)}%</div>
            </div>
            <div>
              <div className="text-xs text-zinc-500">{t('avgLatency')}</div>
              <div>
                {economics.avgLatencyMsToday
                  ? `${Math.round(economics.avgLatencyMsToday)} ms`
                  : '—'}
              </div>
            </div>
          </div>
        </section>
      )}
      <section className="rounded-xl border border-white/10 bg-white/5 p-4">
        <h3 className="font-medium mb-2">{t('whatChanged')}</h3>
        <ul className="list-disc pl-5 text-sm text-zinc-300 space-y-1">
          {whatChanged.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>
    </>
  );
}
