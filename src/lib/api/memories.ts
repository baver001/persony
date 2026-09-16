import { getApiHeaders } from './headers';

export type MemoryDto = {
  id: string;
  userId: string;
  personaId: string | null;
  scope: 'user' | 'relationship' | 'room';
  kind: string;
  content: string;
  confidence: number;
  importance: number;
  sensitivity: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export async function fetchMemories(params?: {
  scope?: string;
  personaId?: string;
}): Promise<MemoryDto[]> {
  const qs = new URLSearchParams();
  if (params?.scope) qs.set('scope', params.scope);
  if (params?.personaId) qs.set('personaId', params.personaId);
  const res = await fetch(`/api/memories?${qs.toString()}`, { headers: await getApiHeaders() });
  if (!res.ok) throw new Error('Failed to load memories');
  const data = (await res.json()) as { memories: MemoryDto[] };
  return data.memories;
}

export async function updateMemory(
  id: string,
  patch: { content?: string; status?: 'active' | 'disabled' | 'deleted' }
): Promise<MemoryDto> {
  const res = await fetch(`/api/memories/${id}`, {
    method: 'PATCH',
    headers: await getApiHeaders(),
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error('Failed to update memory');
  const data = (await res.json()) as { memory: MemoryDto };
  return data.memory;
}
