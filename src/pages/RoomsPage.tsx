import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Persona } from '../types';
import { createRoom, fetchRooms, type RoomConversation } from '../lib/api/rooms';
import { fetchAvailablePersonas } from '../lib/api/personas';

type Props = {
  theme: 'dark' | 'light';
  onBack: () => void;
  onOpenPersona: (persona: Persona) => void;
};

export function RoomsPage({ theme, onBack, onOpenPersona }: Props) {
  const { t } = useTranslation(['rooms', 'common', 'personas']);
  const [rooms, setRooms] = useState<RoomConversation[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const isDark = theme === 'dark';

  useEffect(() => {
    void (async () => {
      try {
        const [roomList, personaList] = await Promise.all([fetchRooms(), fetchAvailablePersonas()]);
        setRooms(roomList);
        setPersonas(personaList);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const personaById = useMemo(
    () => new Map(personas.map((persona) => [persona.id, persona])),
    [personas]
  );

  const togglePersona = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((item) => item !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const handleCreate = async () => {
    if (!title.trim() || selectedIds.length < 2) return;
    setCreating(true);
    try {
      const room = await createRoom(title.trim(), selectedIds);
      if (room) {
        setRooms((prev) => [room, ...prev]);
        setShowCreate(false);
        setTitle('');
        setSelectedIds([]);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-py-app text-py-text' : 'bg-white text-zinc-900'}`}>
      <header className="border-b border-py-border px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={onBack}
            className="p-2 rounded-lg hover:bg-py-input text-py-text-secondary"
            aria-label={t('common:back')}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-base font-semibold truncate">{t('rooms:title')}</h1>
            <p className="text-xs text-py-text-secondary truncate">{t('rooms:subtitle')}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t('rooms:create')}
        </button>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-3">
        {loading && <p className="text-sm text-py-text-secondary">{t('common:loading')}</p>}
        {!loading && rooms.length === 0 && (
          <div className="py-surface-card p-6 text-center space-y-2">
            <Users className="w-8 h-8 mx-auto text-py-text-muted" />
            <p className="text-sm text-py-text-secondary">{t('rooms:empty')}</p>
          </div>
        )}

        {rooms.map((room) => (
          <article key={room.id} className="py-surface-card p-4 space-y-3">
            <div>
              <h2 className="font-semibold">{room.title || t('rooms:untitled')}</h2>
              <p className="text-xs text-py-text-muted mt-1">
                {t('rooms:participantCount', { count: room.participants.length })}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {room.participants.map((participant) => {
                const persona = personaById.get(participant.personaId);
                if (!persona) {
                  return (
                    <span
                      key={participant.personaId}
                      className="text-xs px-2 py-1 rounded-full bg-py-input border border-py-border"
                    >
                      {participant.personaId}
                    </span>
                  );
                }
                return (
                  <button
                    key={participant.personaId}
                    type="button"
                    onClick={() => onOpenPersona(persona)}
                    className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-full bg-py-input border border-py-border hover:border-py-text-muted text-sm transition-colors"
                  >
                    <img
                      src={persona.avatar}
                      alt=""
                      className="w-6 h-6 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    {persona.name}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-py-text-muted">{t('rooms:chatHint')}</p>
          </article>
        ))}
      </main>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-py-sidebar border border-py-border rounded-t-2xl sm:rounded-2xl p-4 space-y-4">
            <h2 className="text-sm font-semibold">{t('rooms:createTitle')}</h2>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('rooms:titlePlaceholder')}
              className="w-full bg-py-input border border-py-border rounded-xl px-3 py-2 text-sm"
            />
            <div className="space-y-2 max-h-56 overflow-y-auto">
              {personas.map((persona) => {
                const selected = selectedIds.includes(persona.id);
                return (
                  <button
                    key={persona.id}
                    type="button"
                    onClick={() => togglePersona(persona.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl border text-left transition-colors ${
                      selected
                        ? 'border-indigo-400 bg-indigo-500/10'
                        : 'border-py-border hover:border-py-text-muted'
                    }`}
                  >
                    <img
                      src={persona.avatar}
                      alt=""
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                    <span className="text-sm font-medium">{persona.name}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-py-text-muted">{t('rooms:selectHint')}</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 rounded-full text-sm text-py-text-secondary hover:bg-py-input"
              >
                {t('common:cancel')}
              </button>
              <button
                type="button"
                disabled={creating || !title.trim() || selectedIds.length < 2}
                onClick={() => void handleCreate()}
                className="px-4 py-2 rounded-full bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-medium disabled:opacity-50"
              >
                {creating ? t('common:loading') : t('rooms:create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
