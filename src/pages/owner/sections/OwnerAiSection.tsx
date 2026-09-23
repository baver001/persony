import { useTranslation } from 'react-i18next';
import { updateOwnerSystemSetting } from '../../../lib/api/owner';
import { OwnerSectionState } from '../components/OwnerSectionState';

type RoutingRow = {
  provider: string;
  modelId: string;
  displayName: string;
  status: string;
  operations: string[];
  supportsUsage: boolean;
  enabled: boolean;
  lastVerifiedAt: string;
};

type AiOverview = {
  chatTextProvider: string;
  providers: Record<string, { configured: boolean }>;
  billingEnabled: boolean;
  routingMatrix?: RoutingRow[];
};

type Props = {
  overview: AiOverview | null;
  failedInferenceRuns: number;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onProviderChange: (provider: string) => void;
};

export function OwnerAiSection({
  overview,
  failedInferenceRuns,
  loading,
  error,
  onRetry,
  onProviderChange,
}: Props) {
  const { t } = useTranslation('owner');

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{t('aiHint', { count: failedInferenceRuns })}</p>
      <OwnerSectionState
        loading={loading && !overview}
        error={error && !overview}
        empty={!loading && !error && !overview}
        emptyMessage={t('sectionEmpty')}
        onRetry={onRetry}
      />
      {overview && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(overview.providers).map(([id, meta]) => (
              <div key={id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs text-zinc-500 uppercase">{id}</div>
                <div className="mt-1 text-sm">
                  {meta.configured ? (
                    <span className="text-emerald-400">{t('providerConfigured')}</span>
                  ) : (
                    <span className="text-amber-300">{t('providerMissing')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <label className="block space-y-2">
            <span className="text-xs text-zinc-400 uppercase tracking-wide">
              {t('chatProvider')}
            </span>
            <select
              className="w-full max-w-xs bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm min-h-[44px]"
              value={overview.chatTextProvider ?? 'google'}
              onChange={(e) => {
                const value = e.target.value;
                void updateOwnerSystemSetting('chat_text_provider', value, 'owner_console').then(
                  (ok) => {
                    if (ok) onProviderChange(value);
                  }
                );
              }}
            >
              <option value="google">google</option>
              <option value="deepseek">deepseek</option>
              <option value="auto">auto</option>
            </select>
          </label>
          <p className="text-xs text-zinc-500">
            {overview.billingEnabled
              ? `${t('billingEnabledLabel')}: ${t('yes')}`
              : t('billingDisabledBeta')}
          </p>
          {overview.routingMatrix && overview.routingMatrix.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-sm font-medium">{t('aiRoutingMatrix')}</h3>
              <p className="text-xs text-zinc-500">{t('aiRoutingMatrixHint')}</p>
              <ul className="md:hidden space-y-2 max-h-[50vh] overflow-y-auto">
                {overview.routingMatrix.map((row) => (
                  <li
                    key={`${row.provider}:${row.modelId}`}
                    className="rounded-xl border border-white/10 bg-white/[0.02] p-3 space-y-1"
                  >
                    <div className="font-mono text-xs">{row.provider}/{row.modelId}</div>
                    <div className="text-[11px] text-zinc-500">{row.displayName}</div>
                    <div className="text-[11px] text-zinc-400">
                      {row.enabled ? row.status : 'disabled'} · usage:{' '}
                      {row.supportsUsage ? t('yes') : t('no')}
                    </div>
                    <div className="text-[11px] font-mono text-zinc-500 break-words">
                      {row.operations.join(', ')}
                    </div>
                  </li>
                ))}
              </ul>
              <div className="hidden md:block rounded-xl border border-white/10 overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead className="bg-white/5 text-zinc-400 text-left">
                    <tr>
                      <th className="px-3 py-2">{t('aiRoutingColModel')}</th>
                      <th className="px-3 py-2">{t('aiRoutingColStatus')}</th>
                      <th className="px-3 py-2">{t('aiRoutingColOperations')}</th>
                      <th className="px-3 py-2">{t('aiRoutingColUsage')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.routingMatrix.map((row) => (
                      <tr key={`${row.provider}:${row.modelId}`} className="border-t border-white/5">
                        <td className="px-3 py-2">
                          <div className="font-mono text-xs">
                            {row.provider}/{row.modelId}
                          </div>
                          <div className="text-xs text-zinc-500">{row.displayName}</div>
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {row.enabled ? row.status : 'disabled'}
                        </td>
                        <td className="px-3 py-2 text-xs font-mono">{row.operations.join(', ')}</td>
                        <td className="px-3 py-2 text-xs">
                          {row.supportsUsage ? t('yes') : t('no')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
