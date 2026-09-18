import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CreateOwnerPricingEntryInput, OwnerPricingEntry } from '../../../lib/api/owner';
import { createOwnerPricingEntry } from '../../../lib/api/owner';
import { OwnerSectionState } from '../components/OwnerSectionState';
import { formatMicrousd } from '../utils';

type Props = {
  catalogVersion: string | null;
  entries: OwnerPricingEntry[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

const inputClass =
  'w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-400/40 focus:outline-none';

export function OwnerPricingSection({
  catalogVersion,
  entries,
  loading,
  error,
  onRetry,
}: Props) {
  const { t } = useTranslation('owner');
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [form, setForm] = useState<CreateOwnerPricingEntryInput>({
    provider: 'google',
    model: 'gemini-3.8-flash',
    dimension: 'text_input',
    priceMicrousdPerUnit: 150_000,
    unit: 'per_million_tokens',
    effectiveFrom: new Date().toISOString().slice(0, 10),
    pricingTier: 'default',
    timeRule: 'any',
    sourceReference: 'https://ai.google.dev/gemini-api/docs/pricing',
    verifiedAt: new Date().toISOString().slice(0, 10),
    reason: '',
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.reason.trim()) {
      setFormError(t('pricingReasonRequired'));
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      await createOwnerPricingEntry({
        ...form,
        effectiveFrom: `${form.effectiveFrom}T00:00:00.000Z`,
        verifiedAt: form.verifiedAt.slice(0, 10),
        reason: form.reason.trim(),
      });
      setShowForm(false);
      setForm((prev) => ({ ...prev, reason: '' }));
      onRetry();
    } catch {
      setFormError(t('pricingCreateFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {catalogVersion && (
          <p className="text-xs text-zinc-500 font-mono">{t('pricingCatalog')}: {catalogVersion}</p>
        )}
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
        >
          {showForm ? t('pricingCancelAdd') : t('pricingAddEntry')}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3"
        >
          <p className="text-sm text-zinc-300">{t('pricingAddHint')}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs text-zinc-400">
              {t('pricingColProvider')}
              <select
                className={inputClass}
                value={form.provider}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    provider: e.target.value as CreateOwnerPricingEntryInput['provider'],
                  }))
                }
              >
                <option value="google">google</option>
                <option value="deepseek">deepseek</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-zinc-400">
              {t('pricingColModel')}
              <input
                className={inputClass}
                value={form.model}
                onChange={(e) => setForm((prev) => ({ ...prev, model: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-xs text-zinc-400">
              {t('pricingColDimension')}
              <select
                className={inputClass}
                value={form.dimension}
                onChange={(e) => setForm((prev) => ({ ...prev, dimension: e.target.value }))}
              >
                <option value="text_input">text_input</option>
                <option value="text_output">text_output</option>
                <option value="cached_input">cached_input</option>
                <option value="per_image">per_image</option>
                <option value="per_minute">per_minute</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-zinc-400">
              {t('pricingColPrice')}
              <input
                type="number"
                className={inputClass}
                value={form.priceMicrousdPerUnit}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    priceMicrousdPerUnit: Number(e.target.value),
                  }))
                }
              />
            </label>
            <label className="space-y-1 text-xs text-zinc-400">
              {t('pricingColEffectiveFrom')}
              <input
                type="date"
                className={inputClass}
                value={form.effectiveFrom.slice(0, 10)}
                onChange={(e) => setForm((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
              />
            </label>
            <label className="space-y-1 text-xs text-zinc-400">
              {t('pricingColVerifiedAt')}
              <input
                type="date"
                className={inputClass}
                value={form.verifiedAt.slice(0, 10)}
                onChange={(e) => setForm((prev) => ({ ...prev, verifiedAt: e.target.value }))}
              />
            </label>
          </div>
          <label className="block space-y-1 text-xs text-zinc-400">
            {t('pricingColReason')}
            <textarea
              className={`${inputClass} min-h-[72px]`}
              value={form.reason}
              onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
              placeholder={t('pricingReasonPlaceholder')}
            />
          </label>
          {formError && <p className="text-xs text-rose-400">{formError}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-emerald-500/90 px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          >
            {submitting ? t('pricingSaving') : t('pricingSaveEntry')}
          </button>
        </form>
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
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-white/5 text-zinc-400 text-left">
              <tr>
                <th className="px-3 py-2">Model</th>
                <th className="px-3 py-2">Dimension</th>
                <th className="px-3 py-2">Price/M</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Time</th>
                <th className="px-3 py-2">Source</th>
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
                    <span className={e.source === 'db' ? 'text-sky-300' : 'text-zinc-500'}>
                      {e.source ?? 'code'}
                    </span>
                  </td>
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
