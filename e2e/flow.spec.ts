import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { newUser, pull, push, warsawToday } from './helpers';

test('Creative Workflow: one tap start → pause → finish saves without a form', async ({ page }) => {
  await page.clock.install();
  await newUser(page);
  await page.getByRole('button', { name: 'Twórz' }).click();
  await page.locator('.launch__disc').click();
  await expect(page).toHaveURL(/\/sesja/);
  await page.clock.fastForward('01:00:00');
  await page.getByRole('button', { name: 'Pauza' }).click();
  await page.clock.fastForward('00:20:00');
  await page.getByRole('button', { name: 'Wznów' }).click();
  await page.clock.fastForward('00:30:00');
  await expect(page.locator('.session3__time')).toHaveText(/1:30:0\d/);
  await page.getByRole('button', { name: 'Zakończ' }).click();
  await expect(page.locator('.finished__time')).toHaveText('1 h 30 min');
  await page.getByRole('button', { name: 'Gotowe' }).click();
  await expect(page).toHaveURL(/\/tworz/);
  await expect(page.locator('.hist')).toContainText('1 h 30 min');
  await page.goto('/ty/rytm');
  await expect(page.locator('.block__title').first()).toContainText('1 h 30 min');
});

test('custom workflow starts with its length and focus', async ({ page }) => {
  await newUser(page);
  await page.goto('/tworz');
  await page.getByRole('button', { name: 'Wieczór w studiu' }).click();
  await page.getByRole('button', { name: 'Zacznij: Wieczór w studiu' }).click();
  await expect(page).toHaveURL(/\/sesja/);
  await expect(page.locator('.session3__title')).toHaveText('Wieczór w studiu');
  await expect(page.locator('.session3__target')).toContainText('1 h 30 min');
  await expect(page.locator('.session3')).toHaveClass(/is-focus/);
});

test('timer survives a locked phone / killed tab (timestamps, not ticks)', async ({ page }) => {
  await page.clock.install();
  await newUser(page);
  await page.goto('/tworz');
  await page.locator('.launch__disc').click();
  await expect(page).toHaveURL(/\/sesja/);
  await page.waitForTimeout(800); // let the outbox persist
  await page.clock.fastForward('00:47:00');
  await page.reload();
  await expect(page.locator('.session3__time')).toHaveText(/47:\d\d/);
});

test('spontaneous session covers same-day planned music automatically; time counted once', async ({ page }) => {
  await page.clock.install();
  await newUser(page);
  const today = warsawToday();
  await push(page.request, [{
    op_id: `op_plan_${Date.now()}`, entity: 'events', action: 'put', id: 'ev_planned_1', ts: Date.now(),
    data: { id: 'ev_planned_1', updated_at: Date.now(), kind: 'music', title: 'Czas na muzykę', date: today, start_min: 1320, end_min: 1410 },
  }]);
  await page.goto('/tworz');
  await page.locator('.launch__disc').click();
  await page.clock.fastForward('05:00:00');
  await page.getByRole('button', { name: 'Zakończ' }).click();
  await expect(page.locator('.finished__plan')).toContainText('Czas na muzykę');
  await page.waitForTimeout(1500);
  const { rows } = await pull(page.request);
  expect(['covered', 'done']).toContain(rows.events.find((e) => e.id === 'ev_planned_1')!.status);
  const sessions = rows.sessions.filter((s) => s.status === 'finished');
  expect(sessions).toHaveLength(1);
  expect(sessions[0].active_seconds).toBeGreaterThanOrEqual(5 * 3600);
  expect(sessions[0].active_seconds).toBeLessThan(5 * 3600 + 60);
});

test('saving the same session twice does not double time or count', async ({ page }) => {
  await newUser(page);
  const now = Date.now();
  const row = { id: 'se_dup', updated_at: now, type: 'create', status: 'finished', started_at: now - 3600e3, ended_at: now, active_seconds: 3600 };
  const op = { op_id: 'op_dup_1', entity: 'sessions', action: 'put', id: 'se_dup', data: row, ts: now };
  const a = await push(page.request, [op]);
  const b = await push(page.request, [op]);
  expect(a.results[0].status).toBe('applied');
  expect(b.results[0].status).toBe('duplicate');
  await push(page.request, [{ ...op, op_id: 'op_dup_2' }]);
  const { rows } = await pull(page.request);
  expect(rows.sessions.filter((s) => s.id === 'se_dup')).toHaveLength(1);
});

test('server recomputes session time from timestamps (client cannot inflate it)', async ({ page }) => {
  await newUser(page);
  const now = Date.now();
  await push(page.request, [{ op_id: 'op_inflate_1', entity: 'sessions', action: 'put', id: 'se_infl', ts: now,
    data: { id: 'se_infl', updated_at: now, type: 'create', status: 'finished', started_at: now - 600e3, ended_at: now, active_seconds: 86000 } }]);
  const { rows } = await pull(page.request);
  expect(rows.sessions.find((s) => s.id === 'se_infl')!.active_seconds).toBe(600);
});

test('data written by the previous version (v2 rows) survives the update', async ({ page }) => {
  await newUser(page);
  const now = Date.now();
  // Rows shaped exactly like v2 wrote them: no workflow_id, kind, cover_data, lesson_key…
  await push(page.request, [
    { op_id: 'op_v2_session', entity: 'sessions', action: 'put', id: 'se_v2', ts: now, data: { id: 'se_v2', updated_at: now, type: 'write', status: 'finished', started_at: now - 7200e3, ended_at: now - 3600e3, active_seconds: 3600, outcome: 'demo', outcome_note: 'stara notatka', category: 'songwriting' } },
    { op_id: 'op_v2_project', entity: 'projects', action: 'put', id: 'pj_v2', ts: now, data: { id: 'pj_v2', updated_at: now, title: 'Stary projekt', stage: 'demo' } },
    { op_id: 'op_v2_book_1', entity: 'books', action: 'put', id: 'bk_v2', ts: now, data: { id: 'bk_v2', updated_at: now, title: 'Writing Better Lyrics', author: 'Pat Pattison', status: 'reading', progress: 50 } },
  ]);
  await page.reload();
  await page.goto('/tworz');
  await expect(page.locator('.hist')).toContainText('stara notatka');
  await page.goto('/projekty');
  await expect(page.locator('.crate__title', { hasText: 'Stary projekt' })).toBeVisible();
  await page.goto('/nauka/ksiazki');
  await expect(page.locator('.block', { hasText: 'W trakcie czytania' })).toContainText('Writing Better Lyrics');
  const { rows } = await pull(page.request);
  expect(rows.projects.find((p) => p.id === 'pj_v2')!.kind).toBe('single');
  expect(rows.sessions.find((s) => s.id === 'se_v2')!.outcome).toBe('demo');
});

test('data persists after a fresh install: lesson progress, book, project with song', async ({ page }) => {
  await newUser(page);
  await page.goto('/nauka/theory/theory-rhythm');
  await page.getByRole('button', { name: 'Oznacz jako ukończoną' }).click();
  await page.goto('/nauka/ksiazki');
  await page.locator('.shelf__item').first().click();
  await page.getByRole('button', { name: 'Zaczynam czytać' }).click();
  await page.getByRole('button', { name: 'Zamknij' }).click();
  await page.goto('/projekty?new=1');
  await page.locator('.sheet input').fill('Nocny przystanek');
  await page.getByRole('button', { name: 'Utwórz', exact: true }).click();
  await expect(page).toHaveURL(/\/projekty\/pj_/);
  await page.getByRole('button', { name: /Dodaj/ }).first().click();
  await page.locator('.sheet input').first().fill('Przystanek');
  await page.locator('.sheet textarea').first().fill('wers pierwszy\nwers drugi');
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await page.waitForTimeout(1500);
  await page.evaluate(() => indexedDB.deleteDatabase('keyval-store'));
  await page.reload();
  await page.goto('/nauka/theory');
  await expect(page.locator('.pathstate__count')).toContainText('1');
  await page.goto('/nauka/ksiazki');
  await expect(page.locator('.block', { hasText: 'W trakcie czytania' })).toBeVisible();
  await page.goto('/projekty');
  await page.locator('.crate__title', { hasText: 'Nocny przystanek' }).click();
  await expect(page.locator('.track')).toContainText('2 wersy');
});

test('companion without AI: 12-hour shift tomorrow becomes a proposal, applied only on approval', async ({ page }) => {
  await newUser(page);
  await page.goto('/towarzysz');
  await expect(page.getByText('Działa lokalnie, bez AI')).toBeVisible();
  await page.locator('.composer__input').fill('Jutro pracuję 12 godzin, przełóż muzykę');
  await page.keyboard.press('Enter');
  await expect(page.locator('.sheet__title')).toContainText('Praca');
  let { rows } = await pull(page.request);
  expect(rows.events.filter((e) => e.kind === 'work')).toHaveLength(0);
  await page.getByRole('button', { name: 'Zastosuj' }).click();
  await page.waitForTimeout(1500);
  ({ rows } = await pull(page.request));
  const work = rows.events.find((e) => e.kind === 'work')!;
  expect(Number(work.end_min) - Number(work.start_min)).toBe(720);
});

test('sick report adjusts the day and is not punished', async ({ page }) => {
  await newUser(page);
  await page.getByRole('button', { name: 'Choroba' }).click();
  await page.getByRole('button', { name: '3 dni' }).click();
  await page.getByRole('button', { name: 'Zapisz' }).click();
  await expect(page.locator('.today__headline')).toHaveText('Dziś zdrowie jest pierwsze.');
  await page.goto('/plan');
  await expect(page.locator('.daystatus')).toContainText('Choroba');
});

test('no horizontal overflow on main screens (375px)', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 740 });
  await newUser(page);
  for (const path of ['/', '/plan', '/plan?v=week', '/plan?v=month', '/tworz', '/nauka', '/nauka/vocal', '/nauka/flow/flow-grid', '/nauka/ksiazki', '/ty', '/ty/rytm', '/towarzysz', '/skupienie', '/care', '/ustawienia', '/projekty', '/profil']) {
    await page.goto(path);
    await page.waitForTimeout(300);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `overflow on ${path}`).toBeLessThanOrEqual(0);
  }
});

test('planning reset removes outdated plans, keeps real history, and nothing comes back', async ({ page }) => {
  test.setTimeout(150_000);
  await newUser(page);
  const me = await (await page.request.get('/api/me', { headers: { 'x-pulse': '1' } })).json();
  const uid: string = me.user.id;
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date(Date.now() + 2 * 86400e3));
  const now = Date.now();
  const put = (entity: string, id: string, data: Record<string, unknown>) => ({ op_id: `op_${entity}_${id}`, entity, action: 'put', id, ts: now, data: { id, updated_at: now, ...data } });
  await push(page.request, [
    put('events', 'ev_old_plan', { kind: 'training', title: 'Zmiana obrazu w 8 wersach', date, start_min: 600, end_min: 720, status: 'planned', source: 'planner', exercise_id: 'sw-image-shift', proposal_id: 'pr_old_plan' }),
    put('events', 'ev_work_keep', { kind: 'work', title: 'Praca', date, start_min: 1020, end_min: 1200, status: 'planned', source: 'user' }),
    put('proposals', 'pr_old_plan', { source: 'planner', title: 'Plan tygodnia od pn 26 paź', status: 'applied', changes: [] }),
    put('mentor_messages', 'mm_old_a', { role: 'assistant', content: 'Stara propozycja', at: now, proposal_id: 'pr_old_plan', cards: [{ type: 'proposal', id: 'pr_old_plan', title: 'Plan' }] }),
    put('mentor_messages', 'mm_old_u', { role: 'user', content: 'Zaplanuj mi tydzień', at: now - 1 }),
    put('mentor_messages', 'mm_keep_a', { role: 'assistant', content: 'Zwykła odpowiedź', at: now + 5, cards: [] }),
    put('sessions', 'se_real', { type: 'create', status: 'finished', started_at: now - 7200e3, ended_at: now - 4200e3, active_seconds: 3000, outcome_note: 'prawdziwa sesja' }),
    put('projects', 'pj_keep', { title: 'Projekt do zachowania', stage: 'demo', kind: 'ep' }),
    put('songs', 'so_keep', { project_id: 'pj_keep', title: 'Utwór', lyrics: 'tekst do zachowania' }),
    put('learning', 'vocal-breath', { kind: 'lesson', path_key: 'vocal', status: 'done', done_at: now }),
  ]);

  const shows = async () => {
    await page.goto(`/plan?d=${date}`);
    await page.waitForTimeout(700);
    const day = await page.getByText('Zmiana obrazu w 8 wersach').count();
    await page.goto(`/plan?v=month&d=${date}`);
    await page.waitForTimeout(700);
    const month = await page.locator('.monthgrid__planned').count();
    await page.goto(`/plan?v=week&d=${date}`);
    await page.waitForTimeout(700);
    const week = await page.locator('.weekrow__info', { hasText: 'bloki' }).count() + await page.locator('.weekrow__info', { hasText: '1 blok' }).count();
    return { day, month, week };
  };
  await page.reload();
  const before = await shows();
  expect(before.day).toBeGreaterThan(0);
  expect(before.month).toBeGreaterThan(0);

  const run = (extra: string[]) => execFileSync('node', ['scripts/reset-planning.mjs', '--user', uid, ...extra], { encoding: 'utf8' });
  const dry = run([]);
  expect(dry).toContain('Dry run');
  expect(dry).toContain('Zmiana obrazu w 8 wersach');
  expect(run(['--apply'])).toContain('(should be 0): {"events":0,"proposals":0,"chat":0}');
  expect(run([])).toContain('to remove: {"events":0,"proposals":0,"chat_assistant":0,"chat_user":0}'); // idempotent

  // The device syncs on the next open; the cached rows must not survive it.
  await page.goto('/');
  await page.waitForTimeout(2500);
  const after = await shows();
  expect(after.day).toBe(0);
  expect(after.month).toBe(0);
  // refresh does not bring them back
  await page.reload();
  await page.waitForTimeout(1500);
  expect((await shows()).day).toBe(0);

  // planning offers a fresh start, and the work block + real data are intact
  await page.goto('/plan');
  await expect(page.getByText('Plan jest pusty.')).toBeVisible();
  await page.goto(`/plan?d=${date}`);
  await expect(page.getByText('Praca').first()).toBeVisible();
  await page.goto('/tworz');
  await expect(page.locator('.hist')).toContainText('prawdziwa sesja');
  await page.goto('/projekty');
  await expect(page.locator('.crate__title', { hasText: 'Projekt do zachowania' })).toBeVisible();
  await page.goto('/nauka/vocal');
  await expect(page.locator('.pathstate__count')).toContainText('1');

  const { rows } = await pull(page.request);
  const live = (list: Record<string, unknown>[]) => list.filter((r) => r.deleted_at == null).map((r) => r.id);
  expect(live(rows.events)).toEqual(['ev_work_keep']);
  expect(live(rows.proposals)).toEqual([]);
  expect(live(rows.mentor_messages)).toEqual(['mm_keep_a']);
  expect(live(rows.sessions)).toEqual(['se_real']);
  expect(live(rows.songs)).toEqual(['so_keep']);
  expect(live(rows.learning)).toEqual(['vocal-breath']);
  expect(rows.songs.find((r) => r.id === 'so_keep')!.lyrics).toBe('tekst do zachowania');

  // the new planner starts from scratch: setup sheet → neutral Creative Workflow blocks only
  await page.goto('/plan?setup=1');
  await page.getByRole('button', { name: /Zobacz propozycję/ }).click();
  await expect(page.locator('.sheet__title')).toContainText('Plan do końca miesiąca');
  const labels = await page.locator('.changes__item').allTextContents();
  expect(labels.length).toBeGreaterThan(0);
  for (const l of labels) expect(l).toMatch(/Czas na muzykę|Nauka:/);
  expect(labels.join(' ')).not.toMatch(/wers|refren|nagryw|produk/i);
});
