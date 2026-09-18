export interface PersonyEnv {
  GEMINI_API_KEY: string;
  /** Optional — enables DeepSeek text chat when routed. */
  DEEPSEEK_API_KEY?: string;
  /** Paddle API key — not used until billing is enabled. */
  PADDLE_API_KEY?: string;
  /** Paddle webhook secret — not used until billing is enabled. */
  PADDLE_WEBHOOK_SECRET?: string;
  /** Public Paddle client token for future Checkout.js. */
  PADDLE_CLIENT_TOKEN?: string;
  /** When `true`, billing checkout and webhooks are active. */
  BILLING_ENABLED?: string;
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
