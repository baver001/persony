import { useTranslation } from 'react-i18next';
import type { OwnerInferenceListItem, OwnerPersonaRow } from '../../../lib/api/owner';
import { OwnerSectionState } from '../components/OwnerSectionState';
import { formatMicrousd } from '../utils';

type Props = {
  personas: OwnerPersonaRow[];
  selectedPersona: OwnerPersonaRow | null;
  personaInferences: OwnerInferenceListItem[];
  personaInferencesTotal: number;
  personaInferencesLoading: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onSelectPersona: (persona: OwnerPersonaRow) => void;
  onClearPersona: () => void;
  onSelectInference: (id: string) => void;
};

export function OwnerPersonasSection({
  personas,
  selectedPersona,
  personaInferences,
  personaInferencesTotal,
  personaInferencesLoading,
  loading,
  error,
  onRetry,
  onSelectPersona,
  onClearPersona,
  onSelectInference,
}: Props) {
  const { t } = useTranslation(['owner', 'common']);

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
                <tr
                  key={persona.id}
                  className={`border-t border-white/5 cursor-pointer hover:bg-white/5 ${
                    selectedPersona?.id === persona.id ? 'bg-white/10' : ''
                  }`}
                  onClick={() => onSelectPersona(persona)}
                >
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
      {selectedPersona && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{t('personasDetailTitle')}</h3>
            <button
              type="button"
              className="text-xs text-zinc-400 hover:text-zinc-200 min-h-[44px] px-2"
              onClick={onClearPersona}
            >
              {t('usersDetailClose')}
            </button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">{t('personasColName')}</dt>
              <dd>{selectedPersona.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">ID</dt>
              <dd className="font-mono text-xs break-all">{selectedPersona.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t('personasColInferences30d')}</dt>
              <dd>{selectedPersona.inferenceCount30d}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t('personasColKnownCogs30d')}</dt>
              <dd className="font-mono">{formatMicrousd(selectedPersona.knownCostMicrousd30d, 4)}</dd>
            </div>
          </dl>
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">
              {t('personasDetailInferences', { count: personaInferencesTotal })}
            </p>
            {personaInferencesLoading && (
              <p className="text-sm text-zinc-500">{t('common:loading')}</p>
            )}
            {!personaInferencesLoading && personaInferences.length === 0 && (
              <p className="text-sm text-zinc-500">{t('personasDetailInferencesEmpty')}</p>
            )}
            {personaInferences.length > 0 && (
              <div className="rounded-lg border border-white/10 overflow-x-auto">
                <table className="w-full text-xs min-w-[520px]">
                  <thead className="bg-white/5 text-zinc-400 text-left">
                    <tr>
                      <th className="px-2 py-1.5">{t('inferenceColTime')}</th>
                      <th className="px-2 py-1.5">{t('inferenceColOperation')}</th>
                      <th className="px-2 py-1.5">{t('inferenceColCogs')}</th>
                      <th className="px-2 py-1.5">{t('inferenceColStatus')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {personaInferences.map((item) => (
                      <tr
                        key={item.id}
                        className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                        onClick={() => onSelectInference(item.id)}
                      >
                        <td className="px-2 py-1.5 text-zinc-400">
                          {new Date(item.startedAt).toLocaleString()}
                        </td>
                        <td className="px-2 py-1.5 font-mono">{item.operationType}</td>
                        <td className="px-2 py-1.5 font-mono">
                          {formatMicrousd(item.providerCostMicrousd)}
                        </td>
                        <td className="px-2 py-1.5">{item.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
