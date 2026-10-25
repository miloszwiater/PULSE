// Renders the mentor chat with stored messages and cards (no AI call needed).
import { chromium, devices } from '@playwright/test';
const out = process.argv[2];
const BASE = 'http://localhost:5173';
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices['iPhone 13'], locale: 'pl-PL', timezoneId: 'Europe/Warsaw' });
const page = await ctx.newPage();
await page.request.post(BASE + '/api/auth/register', { headers: { 'x-pulse': '1' }, data: { email: `m${Date.now()}@pulse.test`, password: 'haslo-testowe-123', name: 'M', code: 'dev-invite' } });
await page.goto(BASE + '/');
for (let i = 0; i < 6; i++) { await page.locator('.onb__foot .btn--primary').click(); await page.waitForTimeout(120); }
const now = Date.now();
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());
const ops = [
  { entity: 'mentor_messages', id: 'm1_u', data: { id: 'm1_u', updated_at: now, role: 'user', content: 'Jestem po pracy i nie mam siły. Co ma sens dzisiaj?', at: now, cards: [] } },
  { entity: 'mentor_messages', id: 'm1_a', data: { id: 'm1_a', updated_at: now + 1, role: 'assistant', at: now + 1, proposal_id: 'pr_x', cards: [
    { type: 'exercise', id: 'fl-pauses', why: 'Krótkie, 35 min, bez pisania od zera.' },
    { type: 'book', id: 'tweedy-onesong', why: 'Krótka lektura o kończeniu piosenek.' },
    { type: 'proposal', id: 'pr_x', title: 'Lżejszy wieczór' }],
    content: '**Z danych:** w tym tygodniu masz 2 z 4 sesji, obie na tekście.\n\n**Hipoteza:** zmęczenie po zmianie obniża jakość wieczornych sesji.\n\n- dziś 30 min flow na gotowym tekście albo odpoczynek\n- dłuższą sesję przenieś na sobotę\n\nNastępny krok: zdecyduj o propozycji poniżej.' } },
  { entity: 'proposals', id: 'pr_x', data: { id: 'pr_x', updated_at: now, source: 'mentor', title: 'Lżejszy wieczór', rationale: 'Po 9 h pracy lepiej skrócić sesję.', status: 'pending', changes: [
    { entity: 'events', before: null, after: { id: 'ev_m1', updated_at: now, kind: 'training', title: 'Pauza jako narzędzie', date: today, start_min: 1200, end_min: 1230, exercise_id: 'fl-pauses', category: 'flow', source: 'mentor', proposal_id: 'pr_x' }, label: 'Nowe: Pauza jako narzędzie, 20:00–20:30' }] } },
].map((o, i) => ({ op_id: `op_qam_${now}_${i}`, action: 'put', ts: now, ...o }));
const r = await page.request.post(BASE + '/api/sync', { headers: { 'x-pulse': '1' }, data: { ops } });
console.log(await r.text());
await page.goto(BASE + '/mentor');
await page.waitForTimeout(1500);
await page.screenshot({ path: `${out}/q_mentor.png` });
await page.locator('.mcard--proposal').click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${out}/q_mentor_prop.png` });
await browser.close();
