import type { ChatMessage } from '../../types';
import { getApiHeaders } from './headers';

export type CloudConversation = {
  id: string;
  personaId: string | null;
  lastMessageAt: string | null;
};

export type CloudMessage = {
  id: string;
  sender: 'user' | 'character' | 'system';
  text: string;
  createdAt: string;
};

export async function fetchMe(): Promise<{
  userId: string | null;
  isAuthenticated: boolean;
}> {
  const res = await fetch('/api/me', { headers: await getApiHeaders() });
  if (!res.ok) return { userId: null, isAuthenticated: false };
  return res.json();
}

export async function ensureConversation(personaId: string): Promise<CloudConversation | null> {
  const res = await fetch('/api/conversations', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify({ personaId }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { conversation: CloudConversation };
  return data.conversation;
}

export async function fetchConversationMessages(conversationId: string): Promise<CloudMessage[]> {
  const res = await fetch(`/api/conversations/${conversationId}/messages`, {
    headers: await getApiHeaders(),
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { messages: CloudMessage[] };
  return data.messages;
}

export async function sendCloudMessage(
  conversationId: string,
  text: string
): Promise<Response> {
  return fetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify({ text }),
  });
}

export function cloudMessageToChatMessage(msg: CloudMessage, personaId: string): ChatMessage {
  return {
    id: msg.id,
    characterId: personaId,
    sender: msg.sender === 'character' ? 'character' : msg.sender === 'user' ? 'user' : 'system',
    text: msg.text,
    timestamp: new Date(msg.createdAt).getTime(),
    status: 'sent',
  };
}
