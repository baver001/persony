import { getApiHeaders } from './headers';

export type CloudMessage = {
  id: string;
  conversationId: string;
  senderType: 'user' | 'persona';
  senderUserId: string | null;
  senderPersonaId: string | null;
  text: string;
  createdAt: string;
};

export type CloudConversation = {
  id: string;
  ownerUserId: string;
  type: 'direct' | 'room';
  title: string | null;
  personaId: string | null;
  personaVersion: number | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
};

export async function listConversations(): Promise<CloudConversation[]> {
  const res = await fetch('/api/conversations', { headers: await getApiHeaders() });
  if (!res.ok) return [];
  const data = (await res.json()) as { conversations?: CloudConversation[] };
  return data.conversations ?? [];
}

export async function ensureDirectConversation(personaId: string): Promise<CloudConversation | null> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify({ personaId }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { conversation?: CloudConversation };
  return data.conversation ?? null;
}

export async function fetchConversationMessages(
  conversationId: string,
  options?: { before?: string; limit?: number }
): Promise<CloudMessage[]> {
  const params = new URLSearchParams();
  if (options?.before) params.set('before', options.before);
  if (options?.limit) params.set('limit', String(options.limit));

  const qs = params.toString();
  const url = `/api/conversations/${conversationId}/messages${qs ? `?${qs}` : ''}`;
  const res = await fetch(url, { headers: await getApiHeaders() });
  if (!res.ok) return [];
  const data = (await res.json()) as { messages?: CloudMessage[] };
  return data.messages ?? [];
}

export async function sendConversationMessage(
  conversationId: string,
  text: string,
  clientRequestId: string,
  modelText?: string
): Promise<Response> {
  return fetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify({
      text,
      clientRequestId,
      ...(modelText ? { modelText } : {}),
    }),
  });
}

export async function deleteConversation(conversationId: string): Promise<boolean> {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
    headers: await getApiHeaders(),
  });
  return res.ok;
}
