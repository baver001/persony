/** Official portraits and Avatar Studio — Cloudflare Workers AI. */
export const WORKERS_AI_AVATAR_MODEL = '@cf/black-forest-labs/flux-2-klein-9b';

export type WorkersAvatarResult = {
  imageDataUrl: string;
  model: string;
  latencyMs: number;
  usageEstimated: true;
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function imageBytesToDataUrl(bytes: Uint8Array, mime = 'image/jpeg'): string {
  return `data:${mime};base64,${bytesToBase64(bytes)}`;
}

/** Normalize Workers AI image payloads (base64 string, { image }, or raw bytes). */
export function workersAiImageToDataUrl(payload: unknown): string {
  if (typeof payload === 'string') {
    if (payload.startsWith('data:')) return payload;
    return `data:image/jpeg;base64,${payload}`;
  }
  if (payload instanceof Uint8Array) return imageBytesToDataUrl(payload);
  if (payload instanceof ArrayBuffer) return imageBytesToDataUrl(new Uint8Array(payload));
  if (payload && typeof payload === 'object') {
    const record = payload as { image?: unknown; result?: unknown };
    if (record.image != null) return workersAiImageToDataUrl(record.image);
    if (record.result != null) return workersAiImageToDataUrl(record.result);
  }
  throw new Error('Workers AI returned no image');
}

export async function generateAvatarWithWorkersAi(
  ai: Ai,
  prompt: string,
  personaName?: string
): Promise<WorkersAvatarResult> {
  const started = Date.now();
  const text = [
    prompt.trim(),
    personaName?.trim() ? `Character name: ${personaName.trim()}.` : '',
    'Square portrait, single person, no text, no watermark.',
  ]
    .filter(Boolean)
    .join(' ');

  const form = new FormData();
  form.append('prompt', text);
  form.append('width', '1024');
  form.append('height', '1024');
  const formResponse = new Response(form);
  const contentType = formResponse.headers.get('content-type');
  if (!formResponse.body || !contentType) {
    throw new Error('Failed to serialize FLUX multipart body');
  }

  const response = await ai.run(WORKERS_AI_AVATAR_MODEL, {
    multipart: {
      body: formResponse.body as unknown as object,
      contentType,
    },
  });

  return {
    imageDataUrl: workersAiImageToDataUrl(response),
    model: WORKERS_AI_AVATAR_MODEL,
    latencyMs: Date.now() - started,
    usageEstimated: true,
  };
}
