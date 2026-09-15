export interface PersonyEnv {
  GEMINI_API_KEY: string;
  DEEPSEEK_API_KEY?: string;
  DB?: D1Database;
  ASSETS?: Fetcher;
  KNOWLEDGE_BUCKET?: R2Bucket;
  CLERK_SECRET_KEY?: string;
  CLERK_PUBLISHABLE_KEY?: string;
  PADDLE_WEBHOOK_SECRET?: string;
  PADDLE_API_KEY?: string;
  /** When true, allow X-Persony-Dev-User-Id for local persona sync without Clerk */
  PERSONY_DEV_MODE?: string;
  PERSONY_DEV_USER_ID?: string;
  /** Text chat provider preference: gemini | deepseek */
  PERSONY_TEXT_PROVIDER?: string;
  PERSONY_GENERATE_PROVIDER?: string;
  PERSONY_ENABLE_DEEPSEEK?: string;
  /** Target AI gross margin override (0-1) */
  PERSONY_AI_MARGIN?: string;
}
