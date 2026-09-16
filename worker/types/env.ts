export interface PersonyEnv {
  GEMINI_API_KEY: string;
  ENVIRONMENT?: 'development' | 'production' | string;
  DB?: D1Database;
  ASSETS?: Fetcher;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  /** When true, allow dev auth bypass — ignored when ENVIRONMENT=production */
  PERSONY_DEV_MODE?: string;
  PERSONY_DEV_USER_ID?: string;
  /** Canonical public app URL (OAuth redirects, self-links). */
  APP_URL?: string;
  /** Comma-separated Clerk user IDs granted OWNER on first auth. */
  PERSONY_OWNER_CLERK_IDS?: string;
}
