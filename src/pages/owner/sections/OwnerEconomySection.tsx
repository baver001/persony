import { useTranslation } from 'react-i18next';
import { formatMicrousd } from '../utils';
type Economics = {
  aiCostTodayMicrousd: number;
  aiCost7dMicrousd: number;
  aiCost30dMicrousd: number;
  costCoverageTodayPercent: number;
  costCoverage7dPercent: number;
  unpricedCallsToday: number;
  estimatedCostCallsToday: number;
  callsToday: number;
  energyConsumedToday: number;
  costByProvider: Array<{ provider: string; costMicrousd: number; calls: number }>;
  simulatedRetailValueTodayMicrousd: number;
  simulatedGrossProfitTodayMicrousd: number;
  simulatedGrossMarginTodayPercent: number;
  retailPricingVersion: string;
  targetAiGrossMargin: number;
};

type Props = {
  economics: Economics | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function OwnerEconomySection({ economics, loading, error, onRetry }: Props) {
  const { t } = useTranslation(['owner', 'common']);

  if (loading) return <p className="text-zinc-500 text-sm">{t('common:loading')}</p>;
  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
        <p>{t('sectionLoadError')}</p>
        <button type="button" className="mt-2 underline text-red-200" onClick={onRetry}>
          {t('inferenceRetry')}
        </button>
      </div>
    );
  }
  if (!economics) return <p className="text-zinc-500">{t('sectionEmpty')}</p>;

  const cards = [
    { label: t('knownAiCogsToday'), value: formatMicrousd(economics.aiCostTodayMicrousd, 4) },
    { label: t('aiCost7d'), value: formatMicrousd(economics.aiCost7dMicrousd, 4) },
    { label: t('aiCost30d'), value: formatMicrousd(economics.aiCost30dMicrousd, 4) },
    { label: t('costCoverageToday'), value: `${economics.costCoverageTodayPercent}%` },
    { label: t('costCoverage7d'), value: `${economics.costCoverage7dPercent}%` },
    { label: t('unpricedCallsLabel'), value: String(economics.unpricedCallsToday) },
    { label: t('estimatedCallsLabel'), value: String(economics.estimatedCostCallsToday) },
    { label: t('callsToday'), value: String(economics.callsToday) },
    { label: t('energyToday'), value: String(economics.energyConsumedToday) },
    {
      label: t('simulatedRetailToday'),
      value: formatMicrousd(economics.simulatedRetailValueTodayMicrousd, 4),
    },
    {
      label: t('simulatedGrossMargin'),
      value: `${economics.simulatedGrossMarginTodayPercent}%`,
    },
    {
      label: t('targetAiGrossMargin'),
      value: `${Math.round(economics.targetAiGrossMargin * 100)}% (${economics.retailPricingVersion})`,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs text-zinc-500">{c.label}</div>
            <div className="text-lg font-mono mt-1">{c.value}</div>
          </div>
        ))}
      </div>
      {economics.costByProvider.length > 0 && (
        <section className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-white/5 text-zinc-400 text-left">
              <tr>
                <th className="px-3 py-2">Provider</th>
                <th className="px-3 py-2">Known COGS (7d)</th>
                <th className="px-3 py-2">Calls</th>
              </tr>
            </thead>
            <tbody>
              {economics.costByProvider.map((row) => (
                <tr key={row.provider} className="border-t border-white/5">
                  <td className="px-3 py-2">{row.provider}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatMicrousd(row.costMicrousd, 4)}
                  </td>
                  <td className="px-3 py-2">{row.calls}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
