import { useTranslation } from 'react-i18next';
import { updateOwnerSystemSetting } from '../../../lib/api/owner';
import { OwnerSectionState } from '../components/OwnerSectionState';

type AiOverview = {
  chatTextProvider: string;
  providers: Record<string, { configured: boolean }>;
  billingEnabled: boolean;
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
            {t('billingEnabledLabel')}: {overview.billingEnabled ? t('yes') : t('no')}
          </p>
        </>
      )}
    </div>
  );
}
