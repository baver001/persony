import { buildAvatarApiPrompt, type AvatarPersonaContext } from '../avatar-prompt';
import { avatarErrorMessage } from '../avatar-errors';
import { compressAvatarDataUrl } from '../../utils/avatarImage';
import i18n from '../../i18n';
import { getApiHeaders } from './headers';

const avatarT = (key: string) => i18n.t(`personas:${key}`);

export type GeneratePersonaAvatarInput = AvatarPersonaContext & {
  personaId: string;
  userDirection?: string;
};

export async function generatePersonaAvatar(
  input: GeneratePersonaAvatarInput
): Promise<string> {
  const prompt = buildAvatarApiPrompt(input, input.userDirection ?? '');
  const res = await fetch('/api/generate-avatar', {
    method: 'POST',
    headers: await getApiHeaders(),
    body: JSON.stringify({
      prompt,
      personaName: input.name?.trim() || undefined,
      personaId: input.personaId,
      clientRequestId: `avatar_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    }),
  });

  if (!res.ok) {
    const errJson = (await res.json().catch(() => null)) as {
      error_code?: string;
      error?: string;
      message?: string;
    } | null;
    const fallback = errJson?.error || errJson?.message || 'GENERATION_FAILED';
    throw new Error(avatarErrorMessage(errJson?.error_code, fallback, avatarT));
  }

  const data = (await res.json()) as { imageDataUrl?: string };
  if (!data.imageDataUrl) throw new Error('GENERATION_FAILED');

  return compressAvatarDataUrl(data.imageDataUrl);
}
