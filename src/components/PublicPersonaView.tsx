import React, { useEffect, useState } from 'react';
import { getApiHeaders } from '../lib/api/headers';

type PublicPersona = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  avatarUrl: string;
  installCount: number;
  authorUserId: string;
};

interface PublicPersonaViewProps {
  slug: string;
  onChat: (personaId: string) => void;
  onBack: () => void;
}

export const PublicPersonaView: React.FC<PublicPersonaViewProps> = ({ slug, onChat, onBack }) => {
  const [persona, setPersona] = useState<PublicPersona | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetch(`/api/p/${slug}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { persona?: PublicPersona } | null) => setPersona(d?.persona || null))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleInstall = async () => {
    if (!persona) return;
    await fetch(`/api/personas/${persona.id}/install`, {
      method: 'POST',
      headers: await getApiHeaders(),
    });
    onChat(persona.id);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full text-py-text-muted">Loading…</div>;
  }

  if (!persona) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-py-text-muted">Persona not found</p>
        <button type="button" onClick={onBack} className="text-sm text-py-accent">← Back</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-py-app">
      <header className="p-4 border-b border-py-border">
        <button type="button" onClick={onBack} className="text-sm text-py-text-muted">← Back</button>
      </header>
      <div className="flex-1 overflow-y-auto p-6 max-w-lg mx-auto w-full">
        <div className="text-center">
          {persona.avatarUrl && (
            <img src={persona.avatarUrl} alt="" className="w-24 h-24 rounded-full mx-auto object-cover" />
          )}
          <h1 className="mt-4 text-2xl font-bold">{persona.name}</h1>
          <p className="text-py-text-muted">{persona.tagline}</p>
          <p className="mt-4 text-sm leading-relaxed">{persona.description}</p>
          <p className="mt-2 text-xs text-py-text-muted">{persona.installCount} users</p>
        </div>
        <button
          type="button"
          onClick={handleInstall}
          className="mt-8 w-full rounded-xl bg-py-accent py-3 font-semibold text-white hover:opacity-90"
        >
          Chat with Persona
        </button>
        <button
          type="button"
          onClick={async () => {
            const res = await fetch(`/api/personas/${persona.id}/remix`, {
              method: 'POST',
              headers: await getApiHeaders(),
            });
            const raw = await res.json();
            const newId = (raw as { personaId?: string }).personaId;
            if (newId) onChat(newId);
          }}
          className="mt-2 w-full rounded-xl border border-py-border py-3 text-sm hover:bg-py-hover"
        >
          Remix
        </button>
      </div>
    </div>
  );
};
