/// <reference types="@cloudflare/workers-types" />

interface Env {
  GEMINI_API_KEY: string;
  DB: D1Database;
  ASSETS: Fetcher;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  PERSONY_DEV_MODE?: string;
  PERSONY_DEV_USER_ID?: string;
}
