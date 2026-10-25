import { expect, type Page, type APIRequestContext } from '@playwright/test';

export const CODE = process.env.SIGNUP_CODE ?? 'dev-invite';

/** Creates a fresh account (invite code) and completes onboarding with a fixed Mon–Fri 8–16 job. */
export async function newUser(page: Page, name = 'Test') {
  const email = `t${Date.now()}${Math.floor(Math.random() * 1e6)}@pulse.test`;
  const res = await page.request.post('/api/auth/register', {
    headers: { 'x-pulse': '1' }, data: { email, password: 'haslo-testowe-123', name, code: CODE },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  await page.goto('/');
  await expect(page.locator('.onb')).toBeVisible();
  for (let i = 0; i < 5; i++) await page.locator('.onb__foot .btn--primary').click();
  await expect(page.locator('.today__headline')).toBeVisible();
  return email;
}

export async function pull(request: APIRequestContext) {
  const r = await request.get('/api/sync?since=0', { headers: { 'x-pulse': '1' } });
  expect(r.ok()).toBeTruthy();
  return (await r.json()) as { rows: Record<string, Record<string, unknown>[]> };
}

export async function push(request: APIRequestContext, ops: unknown[]) {
  const r = await request.post('/api/sync', { headers: { 'x-pulse': '1' }, data: { ops } });
  expect(r.ok(), await r.text()).toBeTruthy();
  return (await r.json()) as { results: { op_id: string; status: string }[] };
}

export function warsawToday(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());
}
