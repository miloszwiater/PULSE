/**
 * Web Push (RFC 8291 aes128gcm + RFC 8292 VAPID) implemented on WebCrypto,
 * plus the cron-driven reminder policy. Delivery timing on iOS is decided
 * by Apple; reminders are best-effort and never promised to the minute.
 */
import { Hono } from 'hono';
import { z } from 'zod';
import type { AppEnv, Env } from './env';
import { pull } from './sync';
import type { Snapshot } from '../shared/domain/snapshot';
import { dueReminders, MAX_PER_DAY } from '../shared/domain/reminders';
import type { Profile } from '../shared/schema';

import { b64u, unb64u, encryptPayload } from '../shared/webpush';

const enc = new TextEncoder();

async function vapidJwt(env: Env, audience: string): Promise<string> {
  const pub = unb64u(env.VAPID_PUBLIC_KEY!);
  const jwk: JsonWebKey = { kty: 'EC', crv: 'P-256', d: env.VAPID_PRIVATE_KEY!, x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), ext: true };
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const header = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64u(enc.encode(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:admin@example.com' })));
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(`${header}.${claims}`)));
  return `${header}.${claims}.${b64u(sig)}`;
}

interface Sub { user_id: string; endpoint: string; p256dh: string; auth: string }

export async function sendPush(env: Env, sub: Sub, message: { title: string; body: string; url?: string; tag?: string }): Promise<number> {
  const url = new URL(sub.endpoint);
  const jwt = await vapidJwt(env, `${url.protocol}//${url.host}`);
  const body = await encryptPayload(sub.p256dh, sub.auth, JSON.stringify(message));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: '3600',
      Urgency: 'normal',
    },
    body: body as BodyInit,
  });
  if (res.status === 404 || res.status === 410) {
    await env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').bind(sub.user_id, sub.endpoint).run();
  }
  return res.status;
}

export const pushRoutes = new Hono<AppEnv>();

pushRoutes.get('/config', (c) => c.json({ available: !!(c.env.VAPID_PUBLIC_KEY && c.env.VAPID_PRIVATE_KEY), publicKey: c.env.VAPID_PUBLIC_KEY ?? null }));

const subBody = z.object({ endpoint: z.string().url().max(1000), keys: z.object({ p256dh: z.string().max(200), auth: z.string().max(100) }) });

pushRoutes.post('/subscribe', async (c) => {
  const p = subBody.safeParse(await c.req.json().catch(() => null));
  if (!p.success) return c.json({ error: 'invalid subscription' }, 400);
  await c.env.DB.prepare('INSERT OR REPLACE INTO push_subscriptions (user_id, endpoint, p256dh, auth, created_at) VALUES (?, ?, ?, ?, ?)')
    .bind(c.get('user').id, p.data.endpoint, p.data.keys.p256dh, p.data.keys.auth, Date.now()).run();
  return c.json({ ok: true });
});

pushRoutes.post('/unsubscribe', async (c) => {
  const p = z.object({ endpoint: z.string().max(1000) }).safeParse(await c.req.json().catch(() => null));
  if (!p.success) return c.json({ error: 'invalid' }, 400);
  await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE user_id = ? AND endpoint = ?').bind(c.get('user').id, p.data.endpoint).run();
  return c.json({ ok: true });
});

pushRoutes.post('/test', async (c) => {
  if (!c.env.VAPID_PUBLIC_KEY || !c.env.VAPID_PRIVATE_KEY) return c.json({ error: 'Powiadomienia nie są skonfigurowane na serwerze.' }, 503);
  const subs = (await c.env.DB.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').bind(c.get('user').id).all<Sub>()).results;
  if (!subs.length) return c.json({ error: 'To urządzenie nie ma aktywnej subskrypcji.' }, 400);
  const statuses = await Promise.all(subs.map((s) => sendPush(c.env, s, { title: 'PULSE', body: 'Powiadomienia działają.', tag: 'test' })));
  return c.json({ statuses });
});

export async function runScheduledReminders(env: Env): Promise<void> {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return;
  const users = (await env.DB.prepare('SELECT DISTINCT user_id FROM push_subscriptions').all<{ user_id: string }>()).results;
  const now = Date.now();
  for (const { user_id } of users) {
    const { rows } = await pull(env, user_id, 0);
    const r = rows as Record<string, unknown[]>;
    const snap = Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v])) as unknown as Snapshot;
    snap.profile = (r.profile?.[0] as Profile) ?? null;
    const due = dueReminders(snap, now);
    if (!due.length) continue;
    const subs = (await env.DB.prepare('SELECT * FROM push_subscriptions WHERE user_id = ?').bind(user_id).all<Sub>()).results;
    // Never more than MAX_PER_DAY reminders in 24 h — PULSE must not become noise.
    const sent = await env.DB.prepare('SELECT COUNT(*) AS n FROM notification_log WHERE user_id = ? AND sent_at > ?').bind(user_id, now - 24 * 3600e3).first<{ n: number }>();
    let budget = MAX_PER_DAY - (sent?.n ?? 0);
    for (const rem of due) {
      if (budget <= 0) break;
      const ins = await env.DB.prepare('INSERT OR IGNORE INTO notification_log (user_id, key, sent_at, title, body) VALUES (?, ?, ?, ?, ?)')
        .bind(user_id, rem.key, now, rem.title, rem.body).run();
      if (!ins.meta.changes) continue; // already sent
      budget--;
      await Promise.all(subs.map((s) => sendPush(env, s, { title: rem.title, body: rem.body, url: rem.url, tag: rem.key }).catch(() => 0)));
    }
  }
}
