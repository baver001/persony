import { getApiHeaders } from './headers';

export type RoomParticipant = {
  personaId: string;
  personaVersion: number;
  role: string;
};

export type RoomConversation = {
  id: string;
  ownerUserId: string;
  type: 'room';
  title: string | null;
  personaId: string | null;
  personaVersion: number | null;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string | null;
  participants: RoomParticipant[];
};

export async function fetchRooms(): Promise<RoomConversation[]> {
  const res = await fetch('/api/rooms', { headers: await getApiHeaders() });
  if (!res.ok) return [];
  const data = (await res.json()) as { rooms?: RoomConversation[] };
  return data.rooms ?? [];
}

export async function createRoom(title: string, personaIds: string[]): Promise<RoomConversation | null> {
  const res = await fetch('/api/rooms', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify({ title, personaIds }),
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { room?: RoomConversation };
  return data.room ?? null;
}
