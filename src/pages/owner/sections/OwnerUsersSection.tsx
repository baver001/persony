import { useTranslation } from 'react-i18next';
import type { OwnerInferenceListItem, OwnerUserRow } from '../../../lib/api/owner';
import { OwnerSectionState } from '../components/OwnerSectionState';
import { formatMicrousd } from '../utils';

type Props = {
  users: OwnerUserRow[];
  selectedUser: OwnerUserRow | null;
  userInferences: OwnerInferenceListItem[];
  userInferencesTotal: number;
  userInferencesLoading: boolean;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onSelectUser: (user: OwnerUserRow) => void;
  onClearUser: () => void;
  onSelectInference: (id: string) => void;
};

export function OwnerUsersSection({
  users,
  selectedUser,
  userInferences,
  userInferencesTotal,
  userInferencesLoading,
  loading,
  error,
  onRetry,
  onSelectUser,
  onClearUser,
  onSelectInference,
}: Props) {
  const { t } = useTranslation(['owner', 'common']);

  return (
    <div className="space-y-4">
      <OwnerSectionState
        loading={loading && users.length === 0}
        error={error && users.length === 0}
        empty={!loading && !error && users.length === 0}
        emptyMessage={t('sectionEmpty')}
        onRetry={onRetry}
      />
      {users.length > 0 && (
        <ul className="md:hidden space-y-2">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => onSelectUser(user)}
                className={`w-full rounded-xl border border-white/10 p-3 text-left min-h-[44px] ${
                  selectedUser?.id === user.id ? 'bg-white/10' : 'bg-white/[0.02] hover:bg-white/5'
                }`}
              >
                <div className="font-mono text-xs text-zinc-300 truncate">{user.id}</div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-zinc-400">
                  <span>{user.inferenceCount7d} inf / 7d</span>
                  <span>{formatMicrousd(user.knownCostMicrousd7d, 4)} COGS</span>
                  <span>{user.preferredLocale || '—'}</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {users.length > 0 && (
        <div className="hidden md:block rounded-xl border border-white/10 overflow-x-auto">
          <table className="w-full text-sm min-w-[560px]">
            <thead className="bg-white/5 text-zinc-400 text-left">
              <tr>
                <th className="px-3 py-2">ID</th>
                <th className="px-3 py-2">{t('usersColLocale')}</th>
                <th className="px-3 py-2">{t('usersColInferences7d')}</th>
                <th className="px-3 py-2">{t('usersColKnownCogs7d')}</th>
                <th className="px-3 py-2">{t('usersColCreated')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className={`border-t border-white/5 cursor-pointer hover:bg-white/5 ${
                    selectedUser?.id === user.id ? 'bg-white/10' : ''
                  }`}
                  onClick={() => onSelectUser(user)}
                >
                  <td className="px-3 py-2 font-mono text-xs">{user.id}</td>
                  <td className="px-3 py-2">{user.preferredLocale || '—'}</td>
                  <td className="px-3 py-2">{user.inferenceCount7d}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    {formatMicrousd(user.knownCostMicrousd7d, 4)}
                  </td>
                  <td className="px-3 py-2 text-zinc-400 text-xs">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedUser && (
        <section className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-medium">{t('usersDetailTitle')}</h3>
            <button
              type="button"
              className="text-xs text-zinc-400 hover:text-zinc-200 min-h-[44px] px-2"
              onClick={onClearUser}
            >
              {t('usersDetailClose')}
            </button>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-zinc-500">ID</dt>
              <dd className="font-mono text-xs break-all">{selectedUser.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t('usersColLocale')}</dt>
              <dd>{selectedUser.preferredLocale || '—'}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t('usersColInferences7d')}</dt>
              <dd>{selectedUser.inferenceCount7d}</dd>
            </div>
            <div>
              <dt className="text-xs text-zinc-500">{t('usersColKnownCogs7d')}</dt>
              <dd className="font-mono">{formatMicrousd(selectedUser.knownCostMicrousd7d, 4)}</dd>
            </div>
          </dl>
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">
              {t('usersDetailInferences', { count: userInferencesTotal })}
            </p>
            {userInferencesLoading && (
              <p className="text-sm text-zinc-500">{t('common:loading')}</p>
            )}
            {!userInferencesLoading && userInferences.length === 0 && (
              <p className="text-sm text-zinc-500">{t('usersDetailInferencesEmpty')}</p>
            )}
            {userInferences.length > 0 && (
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
                    {userInferences.map((item) => (
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
