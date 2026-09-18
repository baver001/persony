import { useTranslation } from 'react-i18next';
import type { OwnerPersonaRow } from '../../../lib/api/owner';
import { OwnerSectionState } from '../components/OwnerSectionState';
import { formatMicrousd } from '../utils';

type Props = {
  personas: OwnerPersonaRow[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function OwnerPersonasSection({ personas, loading, error, onRetry }: Props) {
  const { t } = useTranslation('owner');

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-400">{t('personasAnalyticsHint')}</p>
      <OwnerSectionState
        loading={loading && personas.length === 0}
        error={error && personas.length === 0}
        empty={!loading && !error && personas.length === 0}
        emptyMessage={t('sectionEmpty')}
        onRetry={onRetry}
      />
      {personas.length > 0 && (
        <div className="rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-white/5 text-zinc-400 text-left">
              <tr>
                <th className="px-3 py-2">{t('personasColName')}</th>
                <th className="px-3 py-2">{t('personasColStatus')}</th>
                <th className="px-3 py-2">{t('personasColInferences30d')}</th>
                <th className="px-3 py-2">{t('personasColKnownCogs30d')}</th>
                <th className="px-3 py-2">{t('personasColUnpriced30d')}</th>
              </tr>
            </thead>
            <tbody>
              {personas.map((persona) => (
                <tr key={persona.id} className="border-t border-white/5">
                  <td className="px-3 py-2">
                    <div className="font-medium">{persona.name}</div>
                    <div className="text-xs text-zinc-500 font-mono">{persona.slug || persona.id}</div>
                  </td>
                  <td className="px-3 py-2">{persona.status}</td>
                  <td className="px-3 py-2">{persona.inferenceCount30d}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatMicrousd(persona.knownCostMicrousd30d, 4)}
                  </td>
                  <td className="px-3 py-2">
                    {persona.unpricedCount30d > 0 ? (
                      <span className="text-amber-300">{persona.unpricedCount30d}</span>
                    ) : (
                      persona.unpricedCount30d
                    )}
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
