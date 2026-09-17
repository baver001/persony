import { useTranslation } from 'react-i18next';
import i18n, { setStoredLocale } from '../i18n';
import { updatePreferredLocale } from '../lib/api/me';

type Props = {
  onBack: () => void;
  isSignedIn: boolean;
};

export function SettingsPage({ onBack, isSignedIn }: Props) {
  const { t } = useTranslation(['settings', 'common']);

  const switchLocale = async (locale: 'en' | 'ru') => {
    setStoredLocale(locale);
    await i18n.changeLanguage(locale);
    if (isSignedIn) {
      try {
        await updatePreferredLocale(locale);
      } catch {
        // local preference still applies
      }
    }
  };

  return (
    <div className="min-h-screen bg-py-app text-py-text p-4 sm:p-8">
      <div className="max-w-xl mx-auto space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-py-text-secondary hover:text-py-text transition-colors"
        >
          ← {t('common:back')}
        </button>
        <h1 className="text-2xl font-semibold tracking-tight">{t('settings:title')}</h1>
        <section className="py-surface-card p-4 space-y-3">
          <h2 className="font-medium">{t('settings:language')}</h2>
          <div className="flex gap-2">
            <button
              type="button"
              className="px-4 py-2 rounded-full bg-py-input border border-py-border text-sm hover:border-py-text-muted transition-colors"
              onClick={() => void switchLocale('en')}
            >
              {t('settings:english')}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded-full bg-py-input border border-py-border text-sm hover:border-py-text-muted transition-colors"
              onClick={() => void switchLocale('ru')}
            >
              {t('settings:russian')}
            </button>
          </div>
        </section>
        <section className="py-surface-card p-4">
          <h2 className="font-medium mb-2">{t('settings:dataControls')}</h2>
          <p className="text-sm text-py-text-secondary">{t('settings:exportData')} — coming soon</p>
        </section>
      </div>
    </div>
  );
}
