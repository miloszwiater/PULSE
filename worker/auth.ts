import { Hono, type Context, type MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { z } from 'zod';
import type { AppEnv, AuthUser, Env } from './env';

const COOKIE = 'pulse_sid';
const SESSION_DAYS = 180;
const PBKDF2_ITERATIONS = 100_000; // Workers' WebCrypto upper bound

const enc = new TextEncoder();
const b64 = (buf: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(buf as ArrayBuffer)));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const b64url = (buf: Uint8Array) => b64(buf).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', enc.encode(s));
  return Array.from(new Uint8Array(d), (b) => b.toString(16).padStart(2, '0')).join('');
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations }, key, 256);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await pbkdf2(password, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [alg, it, salt, hash] = stored.split('$');
  if (alg !== 'pbkdf2') return false;
  const got = await pbkdf2(password, unb64(salt), Number(it));
  const want = unb64(hash);
  if (got.length !== want.length) return false;
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

/** Sliding-window limiter on D1. Returns false when the key is over the limit. */
export async function rateLimit(env: Env, key: string, max: number, windowMs: number): Promise<boolean> {
  const now = Date.now();
  await env.DB.prepare('DELETE FROM rate_limits WHERE key = ? AND at < ?').bind(key, now - windowMs).run();
  const row = await env.DB.prepare('SELECT COUNT(*) AS n FROM rate_limits WHERE key = ?').bind(key).first<{ n: number }>();
  if ((row?.n ?? 0) >= max) return false;
  await env.DB.prepare('INSERT INTO rate_limits (key, at) VALUES (?, ?)').bind(key, now).run();
  return true;
}

async function createSession(c: Context<AppEnv>, userId: string) {
  const token = b64url(crypto.getRandomValues(new Uint8Array(32)));
  const now = Date.now();
  await c.env.DB.prepare('INSERT INTO auth_sessions (token_hash, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)')
    .bind(await sha256Hex(token), userId, now, now + SESSION_DAYS * 86400e3, (c.req.header('user-agent') ?? '').slice(0, 200)).run();
  setCookie(c, COOKIE, token, {
    httpOnly: true, secure: new URL(c.req.url).protocol === 'https:', sameSite: 'Strict', path: '/', maxAge: SESSION_DAYS * 86400,
  });
}

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(200),
  password: z.string().min(10, 'Hasło musi mieć co najmniej 10 znaków.').max(200),
});

const ip = (c: Context) => c.req.header('cf-connecting-ip') ?? 'local';

export const authRoutes = new Hono<AppEnv>();

authRoutes.get('/config', async (c) => {
  const row = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
  return c.json({ signupOpen: (row?.n ?? 0) === 0, signupWithCode: !!c.env.SIGNUP_CODE });
});

authRoutes.post('/register', async (c) => {
  if (c.env.RATE_LIMIT_OFF !== '1' && !(await rateLimit(c.env, `reg:${ip(c)}`, 10, 3600e3))) return c.json({ error: 'Za dużo prób. Spróbuj za godzinę.' }, 429);
  const body = await c.req.json().catch(() => null);
  const parsed = credentials.extend({ name: z.string().trim().max(80).default(''), code: z.string().max(200).optional() }).safeParse(body);
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Nieprawidłowe dane.' }, 400);
  const { email, password, name, code } = parsed.data;
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS n FROM users').first<{ n: number }>();
  const first = (count?.n ?? 0) === 0;
  if (!first && !(c.env.SIGNUP_CODE && code === c.env.SIGNUP_CODE)) {
    return c.json({ error: 'Rejestracja jest zamknięta. Potrzebny jest kod zaproszenia.' }, 403);
  }
  const exists = await c.env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
  if (exists) return c.json({ error: 'Konto z tym adresem już istnieje.' }, 409);
  const id = crypto.randomUUID();
  await c.env.DB.prepare('INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(id, email, name, await hashPassword(password), Date.now()).run();
  await createSession(c, id);
  return c.json({ user: { id, email, name } });
});

authRoutes.post('/login', async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = credentials.safeParse(body);
  if (!parsed.success) return c.json({ error: 'Podaj e-mail i hasło.' }, 400);
  const { email, password } = parsed.data;
  if (c.env.RATE_LIMIT_OFF !== '1' && (!(await rateLimit(c.env, `login:${ip(c)}`, 20, 900e3)) || !(await rateLimit(c.env, `login:${email}`, 10, 900e3)))) {
    return c.json({ error: 'Za dużo prób logowania. Odczekaj 15 minut.' }, 429);
  }
  const user = await c.env.DB.prepare('SELECT id, email, name, password_hash FROM users WHERE email = ?').bind(email)
    .first<{ id: string; email: string; name: string; password_hash: string }>();
  if (!user || !(await verifyPassword(password, user.password_hash))) return c.json({ error: 'Nieprawidłowy e-mail lub hasło.' }, 401);
  await createSession(c, user.id);
  return c.json({ user: { id: user.id, email: user.email, name: user.name } });
});

authRoutes.post('/logout', async (c) => {
  const token = getCookie(c, COOKIE);
  if (token) await c.env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
  deleteCookie(c, COOKIE, { path: '/' });
  return c.json({ ok: true });
});

export const requireUser: MiddlewareHandler<AppEnv> = async (c, next) => {
  const token = getCookie(c, COOKIE);
  if (!token) return c.json({ error: 'unauthenticated' }, 401);
  const row = await c.env.DB.prepare(
    'SELECT u.id, u.email, u.name, s.expires_at FROM auth_sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?',
  ).bind(await sha256Hex(token)).first<AuthUser & { expires_at: number }>();
  if (!row || row.expires_at < Date.now()) return c.json({ error: 'unauthenticated' }, 401);
  c.set('user', { id: row.id, email: row.email, name: row.name });
  await next();
};

/** Custom header requirement: cross-site forms cannot send it, so mutations are CSRF-safe. */
export const requireAppHeader: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.req.method !== 'GET' && c.req.method !== 'HEAD' && c.req.header('x-pulse') !== '1') {
    return c.json({ error: 'missing x-pulse header' }, 400);
  }
  await next();
};
