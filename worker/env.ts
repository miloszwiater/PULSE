export interface Env {
  DB: D1Database;
  ASSETS?: Fetcher;
  /** Server-side only. When absent the mentor reports "not configured" and the rest of the app works. */
  ANTHROPIC_API_KEY?: string;
  AI_MODEL?: string;
  /** Required to create accounts after the first one. */
  SIGNUP_CODE?: string;
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  VAPID_SUBJECT?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export type AppEnv = { Bindings: Env; Variables: { user: AuthUser } };
