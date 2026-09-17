import { getApiHeaders } from './headers';

export async function submitMessageFeedback(
  conversationId: string,
  messageId: string,
  feedback: 'up' | 'down'
): Promise<boolean> {
  const res = await fetch(`/api/conversations/${conversationId}/messages/${messageId}/feedback`, {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify({ feedback }),
  });
  return res.ok;
}
