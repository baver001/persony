import { getApiHeaders } from './headers';

async function ownerFetch<T>(path: string): Promise<T> {
  const res = await fetch(`/api${path}`, { headers: await getApiHeaders() });
  if (res.status === 401) throw new Error('AUTH_REQUIRED');
  if (res.status === 403) throw new Error('FORBIDDEN');
  if (!res.ok) throw new Error('INTERNAL_ERROR');
  return res.json() as Promise<T>;
}

export async function fetchOwnerBatteryOverview(): Promise<Record<string, unknown>> {
  return ownerFetch('/owner/battery/overview');
}

export async function fetchOwnerUsers(): Promise<{
  users: Array<{
    id: string;
    authProviderId: string | null;
    preferredLocale: string | null;
    createdAt: string;
  }>;
}> {
  return ownerFetch('/owner/users');
}

export async function fetchOwnerMemoryStats(): Promise<{
  stats: {
    activeMemories: number;
    pendingCandidates: number;
    relationshipMemories: number;
  };
}> {
  return ownerFetch('/owner/memory/stats');
}

export async function fetchOwnerAudit(): Promise<{
  entries: Array<{
    id: string;
    actorUserId: string;
    action: string;
    targetType: string;
    targetId: string;
    createdAt: string;
  }>;
}> {
  return ownerFetch('/owner/audit');
}
