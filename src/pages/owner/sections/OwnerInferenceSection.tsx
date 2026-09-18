import { useTranslation } from 'react-i18next';
import type { OwnerInferenceDetail, OwnerInferenceListItem } from '../../../lib/api/owner';
import { OwnerSectionState } from '../components/OwnerSectionState';
import { formatMicrousd } from '../utils';

type Props = {
  items: OwnerInferenceListItem[];
  total: number;
  detail: OwnerInferenceDetail | null;
  loading: boolean;
  error: boolean;
  costConfidenceFilter: string;
  statusFilter: string;
  operationFilter: string;
  onCostConfidenceFilterChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  onOperationFilterChange: (value: string) => void;
  onSelect: (id: string) => void;
  onRetry: () => void;
};

function formatLatency(ms: number | null): string {
  if (ms == null) return '—';
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function isLegacyEconomicsRow(item: OwnerInferenceListItem): boolean {
  return (
    (item.costConfidence === 'actual' || item.costConfidence === 'estimated') &&
    !item.costCalculatedAt
  );
}

export function OwnerInferenceSection({
  items,
  total,
  detail,
  loading,
  error,
  costConfidenceFilter,
  statusFilter,
  operationFilter,
  onCostConfidenceFilterChange,
  onStatusFilterChange,
  onOperationFilterChange,
  onSelect,
  onRetry,
}: Props) {
  const { t } = useTranslation('owner');

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:justify-between">
        <p className="text-sm text-zinc-400">{t('inferenceTitle')} · {total}</p>
        <div className="flex flex-wrap gap-2">
          <label className="text-xs text-zinc-500 flex flex-col gap-1">
            {t('inferenceFilterOperation')}
            <select
              className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm min-h-[40px]"
              value={operationFilter}
              onChange={(e) => onOperationFilterChange(e.target.value)}
            >
              <option value="">{t('inferenceFilterAll')}</option>
              <option value="chat_text">chat_text</option>
              <option value="voice_call">voice_call</option>
              <option value="voice_transcription">voice_transcription</option>
              <option value="avatar_generation">avatar_generation</option>
              <option value="call_summary">call_summary</option>
              <option value="persona_generation">persona_generation</option>
            </select>
          </label>
          <label className="text-xs text-zinc-500 flex flex-col gap-1">
            {t('inferenceFilterConfidence')}
            <select
              className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm min-h-[40px]"
              value={costConfidenceFilter}
              onChange={(e) => onCostConfidenceFilterChange(e.target.value)}
            >
              <option value="">{t('inferenceFilterAll')}</option>
              <option value="actual">actual</option>
              <option value="estimated">estimated</option>
              <option value="unpriced">unpriced</option>
            </select>
          </label>
          <label className="text-xs text-zinc-500 flex flex-col gap-1">
            {t('inferenceFilterStatus')}
            <select
              className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1.5 text-sm min-h-[40px]"
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
            >
              <option value="">{t('inferenceFilterAll')}</option>
              <option value="completed">completed</option>
              <option value="failed">failed</option>
              <option value="streaming">streaming</option>
            </select>
          </label>
        </div>
      </div>
      <OwnerSectionState
        loading={loading && items.length === 0}
        error={error && items.length === 0}
        empty={!loading && !error && items.length === 0}
        emptyMessage={t('inferenceEmpty')}
        onRetry={onRetry}
      />
      {items.length > 0 && (
        <ul className="md:hidden space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="w-full rounded-xl border border-white/10 bg-white/[0.02] p-3 text-left hover:bg-white/5 min-h-[44px]"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-mono text-zinc-300">{item.operationType}</span>
                  <span className="text-xs font-mono shrink-0">
                    {formatMicrousd(item.providerCostMicrousd)}
                  </span>
                </div>
                <div className="mt-1 text-[11px] text-zinc-500 truncate">
                  {item.actualProvider}/{item.actualModel}
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-zinc-400">
                  <span>{item.costConfidence}</span>
                  {isLegacyEconomicsRow(item) && (
                    <span className="text-amber-300/90">{t('inferenceLegacyBadge')}</span>
                  )}
                  {item.costCalculatedAt && (
                    <span className="text-emerald-300/80">{t('inferenceImmutableBadge')}</span>
                  )}
                  <span>·</span>
                  <span>{item.status}</span>
                  <span>·</span>
                  <span>{new Date(item.startedAt).toLocaleString()}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {items.length > 0 && (
        <div className="hidden md:block rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-white/5 text-zinc-400 text-left">
              <tr>
                <th className="px-3 py-2 min-w-[120px]">{t('inferenceColTime')}</th>
                <th className="px-3 py-2">{t('inferenceColOperation')}</th>
                <th className="px-3 py-2">{t('inferenceColModel')}</th>
                <th className="px-3 py-2">{t('inferenceColCogs')}</th>
                <th className="px-3 py-2">{t('inferenceColConfidence')}</th>
                <th className="px-3 py-2">{t('inferenceColStatus')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                  onClick={() => onSelect(item.id)}
                >
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {new Date(item.startedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-xs font-mono">{item.operationType}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {item.actualProvider}/{item.actualModel}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatMicrousd(item.providerCostMicrousd)}
                  </td>
                  <td className="px-3 py-2">
                    <span>{item.costConfidence}</span>
                    {isLegacyEconomicsRow(item) && (
                      <span className="ml-1 text-[10px] text-amber-300/90">{t('inferenceLegacyBadge')}</span>
                    )}
                    {item.costCalculatedAt && (
                      <span className="ml-1 text-[10px] text-emerald-300/80">{t('inferenceImmutableBadge')}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">{item.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {detail && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h3 className="font-medium">{t('inferenceDetail')}</h3>
          <div className="text-xs text-zinc-400 font-mono break-all">{detail.id}</div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-zinc-500 text-xs">{t('inferenceColOperation')}</dt>
              <dd className="font-mono text-xs">{detail.operationType}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">{t('inferenceMetaLatency')}</dt>
              <dd>{formatLatency(detail.latencyMs)}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">{t('inferenceMetaUsageEstimated')}</dt>
              <dd>{detail.usageEstimated ? t('yes') : t('no')}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">{t('inferenceMetaEnergy')}</dt>
              <dd>{detail.energyCharged}</dd>
            </div>
            <div>
              <dt className="text-zinc-500 text-xs">{t('inferenceMetaCostSettled')}</dt>
              <dd>
                {detail.costCalculatedAt
                  ? new Date(detail.costCalculatedAt).toLocaleString()
                  : t('inferenceMetaCostUnsettled')}
              </dd>
            </div>
            {detail.errorCode && (
              <div className="sm:col-span-2">
                <dt className="text-zinc-500 text-xs">{t('errorsColCode')}</dt>
                <dd className="font-mono text-xs text-red-300">{detail.errorCode}</dd>
              </div>
            )}
          </dl>
          {detail.costExplanation.explainable ? (
            <ul className="space-y-2 text-sm">
              {detail.costExplanation.lines.map((line) => (
                <li
                  key={`${line.pricingEntryId}-${line.dimension}`}
                  className="flex flex-wrap gap-x-2 justify-between border-b border-white/5 pb-2"
                >
                  <span>
                    {line.units.toLocaleString()} {line.dimension} ×{' '}
                    {formatMicrousd(line.priceMicrousdPerUnit)}/M
                  </span>
                  <span className="font-mono">{formatMicrousd(line.costMicrousd)}</span>
                </li>
              ))}
              <li className="flex justify-between font-medium pt-1">
                <span>{t('inferenceTotalKnownCogs')}</span>
                <span className="font-mono">
                  {formatMicrousd(detail.costExplanation.totalMicrousd)}
                </span>
              </li>
            </ul>
          ) : (
            <p className="text-amber-300/90 text-sm">{t('inferenceUnpriced')}</p>
          )}
          {isLegacyEconomicsRow(detail) && (
            <p className="text-xs text-amber-300/90">{t('inferenceLegacyHint')}</p>
          )}
          {detail.costExplanation.recomputed && (
            <p className="text-xs text-zinc-500">{t('inferenceRecomputed')}</p>
          )}
        </section>
      )}
    </div>
  );
}
