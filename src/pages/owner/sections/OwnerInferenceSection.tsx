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
  onSelect: (id: string) => void;
  onRetry: () => void;
};

export function OwnerInferenceSection({
  items,
  total,
  detail,
  loading,
  error,
  onSelect,
  onRetry,
}: Props) {
  const { t } = useTranslation('owner');

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{t('inferenceTitle')} · {total}</p>
      <OwnerSectionState
        loading={loading && items.length === 0}
        error={error && items.length === 0}
        empty={!loading && !error && items.length === 0}
        emptyMessage={t('inferenceEmpty')}
        onRetry={onRetry}
      />
      {items.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-white/5 text-zinc-400 text-left">
              <tr>
                <th className="px-3 py-2 min-w-[120px]">{t('inferenceColTime')}</th>
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
                  <td className="px-3 py-2 font-mono text-xs">
                    {item.actualProvider}/{item.actualModel}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatMicrousd(item.providerCostMicrousd)}
                  </td>
                  <td className="px-3 py-2">{item.costConfidence}</td>
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
          {detail.costExplanation.recomputed && (
            <p className="text-xs text-zinc-500">{t('inferenceRecomputed')}</p>
          )}
        </section>
      )}
    </div>
  );
}
