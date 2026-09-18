import { useTranslation } from 'react-i18next';
import type { OwnerUserRow } from '../../../lib/api/owner';
import { OwnerSectionState } from '../components/OwnerSectionState';
import { formatMicrousd } from '../utils';

type Props = {
  users: OwnerUserRow[];
  loading: boolean;
  error: boolean;
  onRetry: () => void;
};

export function OwnerUsersSection({ users, loading, error, onRetry }: Props) {
  const { t } = useTranslation('owner');

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
        <div className="rounded-xl border border-white/10 overflow-x-auto">
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
                <tr key={user.id} className="border-t border-white/5">
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
    </div>
  );
}
