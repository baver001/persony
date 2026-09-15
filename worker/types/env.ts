export interface PersonyEnv {
  GEMINI_API_KEY: string;
  DB?: D1Database;
  ASSETS?: Fetcher;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  /** When true, allow X-Persony-Dev-User-Id for local persona sync without Clerk */
  PERSONY_DEV_MODE?: string;
  PERSONY_DEV_USER_ID?: string;
}
