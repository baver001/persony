export function personaSharePath(personaIdOrSlug: string): string {
  return `/p/${encodeURIComponent(personaIdOrSlug)}`;
}

export function personaShareUrl(personaIdOrSlug: string): string {
  return `${window.location.origin}${personaSharePath(personaIdOrSlug)}`;
}

export async function copyPersonaShareLink(personaIdOrSlug: string): Promise<boolean> {
  const url = personaShareUrl(personaIdOrSlug);
  try {
    await navigator.clipboard.writeText(url);
    return true;
  } catch {
    return false;
  }
}
