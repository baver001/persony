import React, { useState } from 'react';
import { X, CloudUpload } from 'lucide-react';
import { buildLocalExport, markCloudMigrationCompleted } from '../lib/cloudMigration';
import type { Persona, ChatMessage } from '../types';
import { getApiHeaders } from '../lib/api/headers';

interface CloudImportModalProps {
  isOpen: boolean;
  personas: Persona[];
  messagesByPersona: Record<string, ChatMessage[]>;
  onImported: (personaIdMap: Record<string, string>) => void;
  onDismiss: () => void;
}

export const CloudImportModal: React.FC<CloudImportModalProps> = ({
  isOpen,
  personas,
  messagesByPersona,
  onImported,
  onDismiss,
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const customCount = personas.filter((p) => p.isCustom).length;
  const messageCount = Object.values(messagesByPersona).reduce<number>(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0
  );

  const handleImport = async () => {
    setIsImporting(true);
    setError(null);
    try {
      const payload = buildLocalExport(personas, messagesByPersona);
      const res = await fetch('/api/import/legacy', {
        method: 'POST',
        headers: await getApiHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(data.error || `Import failed (${res.status})`);
      }

      const data = (await res.json()) as {
        result: { personaIdMap: Record<string, string>; skipped: boolean };
      };

      markCloudMigrationCompleted();
      onImported(data.result.personaIdMap);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-py-border bg-py-surface p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-py-accent/15 p-2 text-py-accent">
              <CloudUpload size={20} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-py-text">Import your existing Persony data?</h2>
              <p className="mt-1 text-sm text-py-text-muted">
                Перенесём локальные персоны и сообщения в облако. Локальные данные не удаляются до
                успешного импорта.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-py-text-muted hover:bg-py-hover"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 rounded-xl bg-py-app/60 p-3 text-sm text-py-text-muted">
          {customCount} custom personas · {messageCount} messages
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <div className="mt-5 flex gap-2">
          <button
            type="button"
            onClick={onDismiss}
            className="flex-1 rounded-xl border border-py-border px-4 py-2.5 text-sm text-py-text hover:bg-py-hover"
            disabled={isImporting}
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="flex-1 rounded-xl bg-py-accent px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
            disabled={isImporting}
          >
            {isImporting ? 'Importing…' : 'Import'}
          </button>
        </div>
      </div>
    </div>
  );
};
