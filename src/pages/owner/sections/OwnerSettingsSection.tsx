import { useTranslation } from 'react-i18next';
import { updateOwnerSystemSetting } from '../../../lib/api/owner';
import { OwnerSectionState } from '../components/OwnerSectionState';

export type OwnerSystemSettings = {
  maintenance_mode: boolean;
  featured_personas: unknown;
  battery_enabled: boolean;
  battery_mode: string;
  target_ai_gross_margin: number | null;
};

type Props = {
  settings: OwnerSystemSettings | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onSettingsChange: (settings: OwnerSystemSettings) => void;
};

export function OwnerSettingsSection({
  settings,
  loading,
  error,
  onRetry,
  onSettingsChange,
}: Props) {
  const { t } = useTranslation('owner');

  const updateFlag = async (key: keyof OwnerSystemSettings, value: unknown) => {
    if (!settings) return;
    const ok = await updateOwnerSystemSetting(key, value, 'owner_console');
    if (ok) onSettingsChange({ ...settings, [key]: value } as OwnerSystemSettings);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{t('settingsIntro')}</p>
      <OwnerSectionState
        loading={loading && !settings}
        error={error && !settings}
        empty={!loading && !error && !settings}
        emptyMessage={t('sectionEmpty')}
        onRetry={onRetry}
      />
      {settings && (
        <div className="space-y-4">
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
            <h3 className="text-sm font-medium">{t('settingsFeatureFlags')}</h3>
            <label className="flex items-center justify-between gap-3 min-h-[44px]">
              <span className="text-sm">{t('settingsMaintenanceMode')}</span>
              <input
                type="checkbox"
                className="size-5 rounded border-white/20"
                checked={Boolean(settings.maintenance_mode)}
                onChange={(e) => void updateFlag('maintenance_mode', e.target.checked)}
              />
            </label>
            <label className="flex items-center justify-between gap-3 min-h-[44px]">
              <span className="text-sm">{t('settingsBatteryEnabled')}</span>
              <input
                type="checkbox"
                className="size-5 rounded border-white/20"
                checked={Boolean(settings.battery_enabled)}
                onChange={(e) => void updateFlag('battery_enabled', e.target.checked)}
              />
            </label>
            <label className="block space-y-2">
              <span className="text-xs text-zinc-400 uppercase tracking-wide">
                {t('settingsBatteryMode')}
              </span>
              <select
                className="w-full max-w-xs bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-sm min-h-[44px]"
                value={settings.battery_mode}
                onChange={(e) => void updateFlag('battery_mode', e.target.value)}
              >
                <option value="simulation">simulation</option>
                <option value="beta_regen">beta_regen</option>
                <option value="commercial">commercial</option>
                <option value="paid">paid</option>
                <option value="disabled">disabled</option>
              </select>
            </label>
          </section>
          <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
            <h3 className="text-sm font-medium">{t('settingsRetailReadOnly')}</h3>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs text-zinc-500">{t('targetAiGrossMargin')}</dt>
                <dd className="font-mono">
                  {settings.target_ai_gross_margin != null
                    ? `${(settings.target_ai_gross_margin * 100).toFixed(0)}%`
                    : '—'}
                </dd>
              </div>
            </dl>
            <p className="text-xs text-zinc-500">{t('settingsRetailHint')}</p>
          </section>
        </div>
      )}
    </div>
  );
}
