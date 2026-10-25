import { Hono } from 'hono';
import type { AppEnv } from './env';
import { authRoutes, requireAppHeader, requireUser } from './auth';
import { syncRoutes } from './sync';
import { mentorRoutes } from './mentor';
import { pushRoutes, runScheduledReminders } from './push';

const app = new Hono<AppEnv>();

app.use('/api/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'no-store');
  c.header('X-Content-Type-Options', 'nosniff');
});
app.use('/api/*', requireAppHeader);
app.route('/api/auth', authRoutes);

app.get('/api/me', requireUser, (c) => c.json({ user: c.get('user') }));
app.use('/api/sync/*', requireUser);
app.use('/api/sync', requireUser);
app.route('/api/sync', syncRoutes);
app.use('/api/mentor/*', requireUser);
app.route('/api/mentor', mentorRoutes);
app.use('/api/push/*', requireUser);
app.route('/api/push', pushRoutes);
app.get('/api/health', (c) => c.json({ ok: true }));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Błąd serwera.' }, 500);
});
app.notFound((c) => (c.req.path.startsWith('/api/') ? c.json({ error: 'not found' }, 404) : c.env.ASSETS ? c.env.ASSETS.fetch(c.req.raw) : c.text('not found', 404)));

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledController, env: AppEnv['Bindings'], ctx: ExecutionContext) {
    ctx.waitUntil(runScheduledReminders(env));
  },
} satisfies ExportedHandler<AppEnv['Bindings']>;
