import { test, expect } from '@playwright/test';
import { newUser, pull, push, warsawToday } from './helpers';

test('main flow: Creative Flow → pause → finish with demo → stats', async ({ page }) => {
  await page.clock.install();
  await newUser(page);
  await page.getByRole('button', { name: /Creative Flow/ }).click();
  await expect(page).toHaveURL(/\/sesja/);
  await page.clock.fastForward('01:00:00');
  await page.getByRole('button', { name: 'Pauza' }).click();
  await page.clock.fastForward('00:20:00');
  await page.getByRole('button', { name: 'Wznów' }).click();
  await page.clock.fastForward('00:30:00');
  await expect(page.locator('.session__time')).toHaveText(/1:30:0\d/);
  await page.getByRole('button', { name: 'Zakończ' }).click();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  await page.getByRole('button', { name: 'Zapisz sesję' }).click();
  await expect(page).toHaveURL(/\/tworz/);
  await expect(page.locator('.toast')).toContainText('1 h 30 min');
  await page.goto('/rozwoj/statystyki');
  await expect(page.locator('.figs')).toContainText('1 h 30 min');
  await expect(page.locator('.tag--violet')).toContainText('Demo: 1');
});

test('timer survives a locked phone / killed tab (timestamps, not ticks)', async ({ page }) => {
  await page.clock.install();
  await newUser(page);
  await page.getByRole('button', { name: /Creative Flow/ }).click();
  await expect(page).toHaveURL(/\/sesja/);
  await page.waitForTimeout(800); // let the outbox persist
  await page.clock.fastForward('00:47:00');
  await page.reload();
  await expect(page.locator('.session__time')).toHaveText(/47:\d\d/);
});

test('5-hour spontaneous demo covers a similar planned session; time counted once', async ({ page }) => {
  await page.clock.install();
  await newUser(page);
  const today = warsawToday();
  await push(page.request, [{
    op_id: `op_plan_${Date.now()}`, entity: 'events', action: 'put', id: 'ev_planned_1', ts: Date.now(),
    data: { id: 'ev_planned_1', updated_at: Date.now(), kind: 'music', title: 'Sesja twórcza', date: today, start_min: 1320, end_min: 1410 },
  }]);
  await page.reload();
  await page.getByRole('button', { name: /Creative Flow/ }).click();
  await page.clock.fastForward('05:00:00');
  await page.getByRole('button', { name: 'Zakończ' }).click();
  await page.getByRole('button', { name: 'Demo', exact: true }).click();
  const cover = page.locator('.check-row', { hasText: 'Sesja twórcza' });
  await expect(cover.locator('input')).toBeChecked();
  await page.getByRole('button', { name: 'Zapisz sesję' }).click();
  await page.waitForTimeout(1500);
  const { rows } = await pull(page.request);
  const ev = rows.events.find((e) => e.id === 'ev_planned_1')!;
  expect(ev.status).toBe('covered');
  const sessions = rows.sessions.filter((s) => s.status === 'finished');
  expect(sessions).toHaveLength(1);
  expect(sessions[0].active_seconds).toBeGreaterThanOrEqual(5 * 3600);
  expect(sessions[0].active_seconds).toBeLessThan(5 * 3600 + 60);
});

test('saving the same session twice does not double time or count', async ({ page }) => {
  await newUser(page);
  const now = Date.now();
  const row = { id: 'se_dup', updated_at: now, type: 'create', status: 'finished', started_at: now - 3600e3, ended_at: now, active_seconds: 3600, outcome: 'demo' };
  const op = { op_id: 'op_dup_1', entity: 'sessions', action: 'put', id: 'se_dup', data: row, ts: now };
  const a = await push(page.request, [op]);
  const b = await push(page.request, [op]);
  expect(a.results[0].status).toBe('applied');
  expect(b.results[0].status).toBe('duplicate');
  // a different op id for the same row (e.g. retry after app restart) is still one row
  await push(page.request, [{ ...op, op_id: 'op_dup_2' }]);
  const { rows } = await pull(page.request);
  expect(rows.sessions.filter((s) => s.id === 'se_dup')).toHaveLength(1);
  await page.goto('/rozwoj/statystyki');
  await expect(page.locator('.figs')).toContainText('1 h');
});

test('server recomputes session time from timestamps (client cannot inflate it)', async ({ page }) => {
  await newUser(page);
  const now = Date.now();
  await push(page.request, [{ op_id: 'op_inflate_1', entity: 'sessions', action: 'put', id: 'se_infl', ts: now,
    data: { id: 'se_infl', updated_at: now, type: 'create', status: 'finished', started_at: now - 600e3, ended_at: now, active_seconds: 86000 } }]);
  const { rows } = await pull(page.request);
  expect(rows.sessions.find((s) => s.id === 'se_infl')!.active_seconds).toBe(600);
});

test('data persists after restart: book status and project', async ({ page }) => {
  await newUser(page);
  await page.goto('/rozwoj/biblioteka');
  await page.locator('.row--action', { hasText: 'Writing Better Lyrics' }).click();
  await page.getByRole('button', { name: 'Zaczynam czytać' }).click();
  await page.getByRole('button', { name: 'Zamknij' }).click();
  await page.goto('/projekty?new=1');
  await page.getByLabel('Tytuł lub robocza nazwa').fill('Nocny przystanek');
  await page.getByRole('button', { name: 'Utwórz' }).click();
  await expect(page).toHaveURL(/\/projekty\/pj_/);
  await page.waitForTimeout(1500);
  // simulate a fresh install: wipe local storage, load from server
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await page.goto('/rozwoj/biblioteka');
  await expect(page.locator('.row', { hasText: 'Writing Better Lyrics' }).first()).toContainText('Czytam');
  await page.goto('/projekty');
  await expect(page.getByText('Nocny przystanek')).toBeVisible();
});

test('no AI key: honest mentor state, rest of the app works', async ({ page }) => {
  await newUser(page);
  await page.goto('/mentor');
  await expect(page.getByText('Rozmowa z mentorem AI jest wyłączona.')).toBeVisible();
  await expect(page.getByLabel('Wiadomość do mentora')).toBeDisabled();
  await page.goto('/plan');
  await expect(page.getByRole('button', { name: 'Zaplanuj resztę tygodnia' })).toBeVisible();
});

test('sick report adjusts plan and is not punished', async ({ page }) => {
  await newUser(page);
  await page.getByRole('button', { name: 'Choroba' }).click();
  await page.getByRole('button', { name: '3 dni' }).click();
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.locator('.today__headline')).toHaveText('Dziś odpoczywasz.');
  await page.goto('/plan');
  await expect(page.locator('.daystatus')).toContainText('Choroba');
});

test('no horizontal overflow on main screens (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await newUser(page);
  for (const path of ['/', '/plan', '/plan?v=week', '/plan?v=month', '/tworz', '/rozwoj', '/rozwoj/obszar/flow', '/rozwoj/biblioteka', '/rozwoj/styl', '/rozwoj/statystyki', '/kariera', '/kariera/roadmapa', '/kariera/promocja', '/kariera/cele', '/mentor', '/care', '/ustawienia', '/projekty']) {
    await page.goto(path);
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});
