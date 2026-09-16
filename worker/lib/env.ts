import type { PersonyEnv } from '../types/env';

export function isProduction(env: PersonyEnv): boolean {
  return env.ENVIRONMENT === 'production';
}

/** Dev auth bypass only when explicitly enabled and not production. */
export function isDevModeAllowed(env: PersonyEnv): boolean {
  if (isProduction(env)) return false;
  return env.PERSONY_DEV_MODE === 'true';
}

export function isDbConfigured(env: PersonyEnv): boolean {
  return Boolean(env.DB);
}
