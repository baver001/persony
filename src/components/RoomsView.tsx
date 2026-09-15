import React, { useState } from 'react';
import { Users, Plus } from 'lucide-react';
import { getApiHeaders } from '../lib/api/headers';

interface RoomsViewProps {
  onBack: () => void;
}

export const RoomsView: React.FC<RoomsViewProps> = ({ onBack }) => {
  const [status, setStatus] = useState<string | null>(null);

  const handleCreateDemo = async () => {
    setStatus('Creating...');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: await getApiHeaders(),
        body: JSON.stringify({
          title: 'Startup Room',
          personas: [
            { personaId: 'athena', role: 'strategist' },
            { personaId: 'nova', role: 'developer' },
          ],
        }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = (await res.json()) as { roomId: string };
      setStatus(`Room created: ${data.roomId.slice(0, 8)}…`);
    } catch {
      setStatus('Sign in and ensure D1 is configured');
    }
  };

  return (
    <div className="flex flex-col h-full bg-py-app">
      <header className="flex items-center gap-3 p-4 border-b border-py-border">
        <button type="button" onClick={onBack} className="text-sm text-py-text-muted">← Chats</button>
        <h1 className="text-lg font-semibold flex items-center gap-2">
          <Users size={18} />
          Rooms
        </h1>
      </header>
      <div className="flex-1 p-6 max-w-lg mx-auto w-full">
        <p className="text-sm text-py-text-muted mb-4">
          Рабочие пространства с несколькими Personas. Используйте @mention или Ask Team.
        </p>
        <button
          type="button"
          onClick={handleCreateDemo}
          className="flex items-center gap-2 rounded-xl bg-py-accent px-4 py-3 text-sm font-medium text-white"
        >
          <Plus size={16} />
          Create Startup Room
        </button>
        {status && <p className="mt-3 text-sm text-py-text-muted">{status}</p>}
      </div>
    </div>
  );
};
