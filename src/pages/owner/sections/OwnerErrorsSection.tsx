import { useTranslation } from 'react-i18next';
import type { OwnerInferenceListItem } from '../../../lib/api/owner';
import { OwnerSectionState } from '../components/OwnerSectionState';
import { formatMicrousd } from '../utils';

type Props = {
  totalFailed: number;
  byErrorCode: Array<{ errorCode: string; count: number }>;
  recent: OwnerInferenceListItem[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function OwnerErrorsSection({
  totalFailed,
  byErrorCode,
  recent,
  loading,
  error,
  onRetry,
}: Props) {
  const { t } = useTranslation('owner');

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{t('errorsTotal', { count: totalFailed })}</p>
      <OwnerSectionState
        loading={loading && recent.length === 0}
        error={error && recent.length === 0}
        empty={!loading && !error && recent.length === 0}
        emptyMessage={t('errorsEmpty')}
        onRetry={onRetry}
      />
      {byErrorCode.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {byErrorCode.map((row) => (
            <div key={row.errorCode} className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-zinc-500 font-mono truncate">{row.errorCode}</div>
              <div className="text-lg font-semibold mt-1">{row.count}</div>
            </div>
          ))}
        </div>
      )}
      {recent.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-white/5 text-zinc-400 text-left">
              <tr>
                <th className="px-3 py-2">{t('inferenceColTime')}</th>
                <th className="px-3 py-2">{t('errorsColOperation')}</th>
                <th className="px-3 py-2">{t('errorsColCode')}</th>
                <th className="px-3 py-2">{t('inferenceColModel')}</th>
                <th className="px-3 py-2">{t('inferenceColCogs')}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((item) => (
                <tr key={item.id} className="border-t border-white/5">
                  <td className="px-3 py-2 text-xs text-zinc-400">
                    {new Date(item.startedAt).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{item.operationType}</td>
                  <td className="px-3 py-2 text-amber-300 text-xs font-mono">
                    {item.errorCode || '—'}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {item.actualProvider}/{item.actualModel}
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatMicrousd(item.providerCostMicrousd)}
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
