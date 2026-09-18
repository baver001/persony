import { useTranslation } from 'react-i18next';
import type { OwnerPricingEntry } from '../../../lib/api/owner';
import { OwnerSectionState } from '../components/OwnerSectionState';
import { formatMicrousd } from '../utils';

type Props = {
  catalogVersion: string | null;
  entries: OwnerPricingEntry[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function OwnerPricingSection({
  catalogVersion,
  entries,
  loading,
  error,
  onRetry,
}: Props) {
  const { t } = useTranslation('owner');

  return (
    <div className="space-y-4">
      {catalogVersion && (
        <p className="text-xs text-zinc-500 font-mono">{t('pricingCatalog')}: {catalogVersion}</p>
      )}
      <OwnerSectionState
        loading={loading}
        error={error}
        empty={!loading && !error && entries.length === 0}
        emptyMessage={t('pricingEmpty')}
        onRetry={onRetry}
      />
      {entries.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[720px]">
            <thead className="bg-white/5 text-zinc-400 text-left">
              <tr>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Dimension</th>
                <th className="px-3 py-2">Price/M</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Freshness</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e) => (
                <tr key={e.id} className="border-t border-white/5">
                  <td className="px-3 py-2 font-mono text-xs">{e.provider}/{e.model}</td>
                  <td className="px-3 py-2">{e.dimension}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatMicrousd(e.priceMicrousdPerUnit)}
                  </td>
                  <td className="px-3 py-2">{e.pricingTier}</td>
                  <td className="px-3 py-2">{e.timeRule}</td>
                  <td className="px-3 py-2">
                    <span
                      className={
                        e.freshness === 'stale'
                          ? 'text-amber-400'
                          : e.freshness === 'verified'
                            ? 'text-emerald-400/90'
                            : 'text-zinc-500'
                      }
                    >
                      {e.freshness}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
