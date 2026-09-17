import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchMemories, updateMemory, type MemoryDto } from '../lib/api/memories';

type Props = {
  onBack: () => void;
};

export function MemoryPage({ onBack }: Props) {
  const { t } = useTranslation(['memory', 'common']);
  const [memories, setMemories] = useState<MemoryDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        setMemories(await fetchMemories({ scope: 'user' }));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (id: string) => {
    const updated = await updateMemory(id, { content: draft });
    setMemories((prev) => prev.map((m) => (m.id === id ? updated : m)));
    setEditingId(null);
    setDraft('');
  };

  const handleDisable = async (id: string) => {
    const updated = await updateMemory(id, { status: 'disabled' });
    setMemories((prev) => prev.filter((m) => m.id !== id || updated.status === 'active'));
    if (updated.status !== 'active') {
      setMemories((prev) => prev.filter((m) => m.id !== id));
    }
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
        <h1 className="text-2xl font-semibold">{t('memory:title')}</h1>
        {loading ? (
          <p className="text-zinc-500">{t('common:loading')}</p>
        ) : memories.length === 0 ? (
          <p className="text-zinc-400">{t('memory:empty')}</p>
        ) : (
          <ul className="space-y-3">
            {memories.map((memory) => (
              <li
                key={memory.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
              >
                <div className="text-xs uppercase tracking-wide text-zinc-500">{memory.kind}</div>
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
        )}
      </div>
    </div>
  );
}
