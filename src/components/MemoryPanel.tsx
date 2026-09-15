import React, { useEffect, useState } from 'react';
import { X, Brain, Trash2 } from 'lucide-react';
import { getApiHeaders } from '../lib/api/headers';

type MemoryItem = {
  id: string;
  scope: string;
  kind: string;
  content: string;
  confidence: number;
};

interface MemoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  personaId?: string;
}

export const MemoryPanel: React.FC<MemoryPanelProps> = ({ isOpen, onClose, personaId }) => {
  const [memories, setMemories] = useState<MemoryItem[]>([]);

  useEffect(() => {
    if (!isOpen) return;
    const params = new URLSearchParams();
    if (personaId) {
      params.set('scope', 'persona_relationship');
      params.set('personaId', personaId);
    } else {
      params.set('scope', 'user');
    }
    void (async () => {
      try {
        const res = await fetch(`/api/memory?${params}`, { headers: await getApiHeaders() });
        if (!res.ok) return;
        const d = (await res.json()) as { memories: MemoryItem[] };
        setMemories(d.memories || []);
      } catch {
        setMemories([]);
      }
    })();
  }, [isOpen, personaId]);

  const handleDelete = async (id: string) => {
    await fetch(`/api/memory/${id}`, { method: 'DELETE', headers: await getApiHeaders() });
    setMemories((prev) => prev.filter((m) => m.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md border-l border-py-border bg-py-surface shadow-xl flex flex-col">
      <header className="flex items-center justify-between p-4 border-b border-py-border">
        <h2 className="font-semibold flex items-center gap-2">
          <Brain size={18} />
          {personaId ? 'What this Persona remembers' : 'What Persony remembers about you'}
        </h2>
        <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-py-hover">
          <X size={18} />
        </button>
      </header>
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {memories.length === 0 ? (
          <p className="text-sm text-py-text-muted text-center py-8">Память пока пуста</p>
        ) : (
          memories.map((m) => (
            <div key={m.id} className="rounded-lg border border-py-border p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs text-py-accent uppercase">{m.kind}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(m.id)}
                  className="text-py-text-muted hover:text-red-400"
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <p className="mt-1">{m.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
