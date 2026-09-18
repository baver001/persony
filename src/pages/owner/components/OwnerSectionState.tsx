import { useTranslation } from 'react-i18next';

type Props = {
  loading?: boolean;
  error?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  onRetry?: () => void;
};

export function OwnerSectionState({ loading, error, empty, emptyMessage, onRetry }: Props) {
  const { t } = useTranslation(['owner', 'common']);

  if (loading) {
    return <p className="text-zinc-500 text-sm">{t('common:loading')}</p>;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm">
        <p>{t('owner:sectionLoadError')}</p>
        {onRetry && (
          <button type="button" className="mt-2 text-red-200 underline" onClick={onRetry}>
            {t('owner:inferenceRetry')}
          </button>
        )}
      </div>
    );
  }

  if (empty) {
    return <p className="text-zinc-500 text-sm">{emptyMessage ?? t('owner:sectionEmpty')}</p>;
  }

  return null;
}
