import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  acceptMemoryCandidate,
  fetchMemoryCandidates,
  fetchMemories,
  rejectMemoryCandidate,
  updateMemory,
  type MemoryCandidateDto,
  type MemoryDto,
} from '../lib/api/memories';

type Props = {
  onBack: () => void;
};

const KIND_ORDER = ['preference', 'goal', 'project', 'fact', 'decision', 'instruction', 'relationship', 'open_task', 'summary'];

function groupByKind(memories: MemoryDto[]): Record<string, MemoryDto[]> {
  const groups: Record<string, MemoryDto[]> = {};
  for (const memory of memories) {
    const key = memory.kind || 'other';
    groups[key] = groups[key] ? [...groups[key], memory] : [memory];
  }
  return groups;
}

export function MemoryPage({ onBack }: Props) {
  const { t } = useTranslation(['memory', 'common']);
  const [scope, setScope] = useState<'user' | 'relationship'>('user');
  const [memories, setMemories] = useState<MemoryDto[]>([]);
  const [candidates, setCandidates] = useState<MemoryCandidateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [memoryRows, pending] = await Promise.all([
        fetchMemories({ scope }),
        fetchMemoryCandidates(),
      ]);
      setMemories(memoryRows);
      setCandidates(pending);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [scope]);

  const grouped = useMemo(() => groupByKind(memories), [memories]);
  const orderedKinds = useMemo(
    () => [
      ...KIND_ORDER.filter((kind) => grouped[kind]?.length),
      ...Object.keys(grouped).filter((kind) => !KIND_ORDER.includes(kind)),
    ],
    [grouped]
  );

  const handleSave = async (id: string) => {
    const updated = await updateMemory(id, { content: draft });
    setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
    setEditingId(null);
    setDraft('');
  };

  const handleDisable = async (id: string) => {
    await updateMemory(id, { status: 'disabled' });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  const kindLabel = (kind: string) => {
    const key = `memory:${kind}` as const;
    return t(key, { defaultValue: t('memory:other') });
  };

  return (
    <div className="min-h-screen bg-py-app text-py-text p-4 sm:p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-py-text-secondary hover:text-py-text transition-colors"
        >
          ← {t('common:back')}
        </button>

        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{t('memory:title')}</h1>
          <div className="flex gap-2">
            {(['user', 'relationship'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setScope(tab)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  scope === tab
                    ? 'bg-py-accent text-white'
                    : 'bg-py-input border border-py-border text-py-text-secondary'
                }`}
              >
                {tab === 'user' ? t('memory:aboutYou') : t('memory:relationshipTab')}
              </button>
            ))}
          </div>
        </div>

        {candidates.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-py-text-secondary uppercase tracking-wide">
              {t('memory:pendingTitle')}
            </h2>
            <ul className="space-y-2">
              {candidates.map((candidate) => (
                <li
                  key={candidate.id}
                  className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2"
                >
                  <p className="text-xs text-amber-200/80 uppercase">{candidate.sensitivity}</p>
                  <p className="text-sm">{candidate.content}</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="text-xs px-3 py-1 rounded-full bg-py-accent text-white"
                      onClick={() =>
                        void acceptMemoryCandidate(candidate.id).then(() => void load())
                      }
                    >
                      {t('memory:accept')}
                    </button>
                    <button
                      type="button"
                      className="text-xs px-3 py-1 rounded-full bg-py-input border border-py-border"
                      onClick={() =>
                        void rejectMemoryCandidate(candidate.id).then(() => void load())
                      }
                    >
                      {t('memory:reject')}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {loading ? (
          <p className="text-zinc-500">{t('common:loading')}</p>
        ) : memories.length === 0 ? (
          <p className="text-zinc-400">{t('memory:empty')}</p>
        ) : (
          <div className="space-y-6">
            {orderedKinds.map((kind) => (
              <section key={kind} className="space-y-3">
                <h2 className="text-sm font-semibold text-py-text-secondary uppercase tracking-wide">
                  {kindLabel(kind)}
                </h2>
                <ul className="space-y-3">
                  {(grouped[kind] ?? []).map((memory) => (
                    <li
                      key={memory.id}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
                    >
                      {editingId === memory.id ? (
                        <textarea
                          className="w-full rounded-lg bg-zinc-900 border border-white/10 p-2 text-sm"
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                        />
                      ) : (
                        <p className="text-sm">{memory.content}</p>
                      )}
                      <div className="flex gap-2">
                        {editingId === memory.id ? (
                          <button
                            type="button"
                            className="text-xs px-3 py-1 rounded-full bg-white text-black"
                            onClick={() => void handleSave(memory.id)}
                          >
                            {t('common:save')}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="text-xs px-3 py-1 rounded-full bg-white/10"
                            onClick={() => {
                              setEditingId(memory.id);
                              setDraft(memory.content);
                            }}
                          >
                            {t('common:edit')}
                          </button>
                        )}
                        <button
                          type="button"
                          className="text-xs px-3 py-1 rounded-full bg-white/10 text-red-300"
                          onClick={() => void handleDisable(memory.id)}
                        >
                          {t('memory:disable')}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
