import { useTranslation } from 'react-i18next';
import { formatMicrousd } from '../utils';

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
  metrics: Record<string, unknown>;
  economics: Economics | null;
  whatChanged: string[];
};

export function OwnerOverviewSection({ metrics, economics, whatChanged }: Props) {
  const { t } = useTranslation('owner');

  return (
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
