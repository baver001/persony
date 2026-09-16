export type AppConfig = {
  authRequired: boolean;
  clerkPublishableKey: string | null;
};

let cachedConfig: AppConfig | null = null;

export async function fetchAppConfig(): Promise<AppConfig> {
  if (cachedConfig) return cachedConfig;

  try {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error(`config ${res.status}`);
    const data = (await res.json()) as AppConfig;
    cachedConfig = {
      authRequired: Boolean(data.authRequired),
      clerkPublishableKey: data.clerkPublishableKey || null,
    };
    return cachedConfig;
  } catch {
    const fallback: AppConfig = {
      authRequired: !import.meta.env.DEV,
      clerkPublishableKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || null,
    };
    cachedConfig = fallback;
    return fallback;
  }
}
