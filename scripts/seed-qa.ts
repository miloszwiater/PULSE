// Seeds a LOCAL dev account with realistic, awkward data so layout problems show up before they reach a phone:
// after-midnight bedtime, a night-shift Saturday, overlapping blocks, very long titles, every book status,
// projects with long lyrics, sick days, pending proposals, a long chat.
//
//   npx tsx scripts/seed-qa.ts <outDir>      (dev server on :5173; writes <outDir>/state.json with the session cookie)
import { writeFileSync } from 'node:fs';
import { ENTITIES, type EntityName } from '../shared/schema';
import { BOOK_BY_KEY } from '../shared/catalog/books';
import { addDays } from '../shared/time';

const BASE = process.env.BASE ?? 'http://localhost:5173';
const out = process.argv[2];
if (!out) throw new Error('usage: npx tsx scripts/seed-qa.ts <outDir>');
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Warsaw' }).format(new Date());
const now = Date.now();
const H = 3600e3;
const email = `qa${now}@pulse.test`;

let cookie = '';
const call = async (path: string, init: RequestInit = {}) => {
  const res = await fetch(BASE + path, { ...init, headers: { 'content-type': 'application/json', 'x-pulse': '1', cookie, ...(init.headers ?? {}) } });
  const set = res.headers.getSetCookie?.() ?? [];
  if (set.length) cookie = set.map((c) => c.split(';')[0]).join('; ');
  if (!res.ok) throw new Error(`${path} ${res.status} ${await res.text()}`);
  return res.json() as Promise<Record<string, unknown>>;
};
await call('/api/auth/register', { method: 'POST', body: JSON.stringify({ email, password: 'haslo-testowe-123', name: 'Miłosz', code: 'dev-invite' }) });

let n = 0;
const ops: unknown[] = [];
const put = <K extends EntityName>(entity: K, id: string, data: Record<string, unknown>) => {
  const row = ENTITIES[entity].parse({ id, updated_at: now + n, ...data });
  ops.push({ op_id: `seed_${++n}_${id}`, entity, action: 'put', id, ts: now + n, data: row });
};
const day = (i: number) => addDays(today, i);

// Profile: the real account's settings (wake 07:00, sleep 00:30 — after midnight).
put('profile', 'me', {
  display_name: 'Miłosz', artist_name: 'Miłosz Wiater (Kern Dev Studio — bardzo długi pseudonim)', timezone: 'Europe/Warsaw', start_date: day(-35), onboarding_done: true,
  wake_min: 420, bed_min: 30, weekly_session_target: 3, session_default_min: 60, learning_per_week: 2,
  genres: ['Emocjonalny rap', 'Melodyjny rap', 'Rap-rock', 'Alternatywny rap'], inspirations: ['Opał', 'Gibbs', 'Machine Gun Kelly', 'Linkin Park', 'Bardzo Długa Nazwa Artysty Która Nie Mieści Się W Jednej Linii'],
  music_style: 'Emocjonalny, wielowarstwowy rap z melodią i gitarami — obraz zamiast deklaracji.', vision: 'Muzyka ma być stałą częścią życia, nie ucieczką od niego. Dobre teksty, własny głos, spokój wokół tego.',
  focus_apps: ['Instagram', 'TikTok'], scene: 'auto',
});

// Schedule
put('routines', 'rt_work', { kind: 'work', title: 'Praca — zmiana poranna w magazynie', weekdays: [0, 1, 2, 3, 4], start_min: 480, end_min: 960 });
put('routines', 'rt_commute', { kind: 'commute', title: 'Dojazd do pracy', weekdays: [0, 1, 2, 3, 4], start_min: 435, end_min: 480 });
put('routines', 'rt_gym', { kind: 'sport', title: 'Siłownia', weekdays: [1, 3], start_min: 1020, end_min: 1080 });

// Events: planned music/learning/reading, one past midnight, overlaps, long titles, past statuses, a night shift
put('events', 'ev_m1', { kind: 'music', title: 'Czas na muzykę', date: day(0), start_min: 1080, end_min: 1170, priority: 2 });
put('events', 'ev_l1', { kind: 'training', title: 'Nauka: Oddech i podparcie', date: day(0), start_min: 1200, end_min: 1230, priority: 3, lesson_key: 'vocal-breath' });
put('events', 'ev_over', { kind: 'music', title: 'Sesja nocna — dopracowanie refrenu i nagranie demo (bardzo długi tytuł bloku)', date: day(0), start_min: 1410, end_min: 1500 });
put('events', 'ev_overlap', { kind: 'relationship', title: 'Kolacja z rodziną', date: day(0), start_min: 1110, end_min: 1230 });
put('events', 'ev_r1', { kind: 'reading', title: 'Czytanie: Pani Dalloway', date: day(1), start_min: 1200, end_min: 1225, priority: 3 });
put('events', 'ev_m2', { kind: 'music', title: 'Czas na muzykę', date: day(2), start_min: 1140, end_min: 1230 });
put('events', 'ev_rest', { kind: 'rest', title: 'Regeneracja po zmianie', date: day(2), start_min: 960, end_min: 1020 });
put('events', 'ev_night', { kind: 'work', title: 'Praca', date: day(5), start_min: 720, end_min: 1350 });
put('events', 'ev_done', { kind: 'music', title: 'Czas na muzykę', date: day(-2), start_min: 1140, end_min: 1230, status: 'done' });
put('events', 'ev_skip', { kind: 'music', title: 'Czas na muzykę', date: day(-3), start_min: 1140, end_min: 1230, status: 'skipped' });
put('events', 'ev_priv', { kind: 'private', title: 'Wizyta u lekarza', date: day(3), start_min: 600, end_min: 660 });
put('events', 'ev_other', { kind: 'other', title: 'Spotkanie w sprawie wynajmu studia i omówienie kosztów', date: day(4), start_min: 1020, end_min: 1110 });

// Sessions over five weeks
const sess = (id: string, daysAgo: number, startH: number, minutes: number, extra: Record<string, unknown> = {}) => {
  const start = Date.parse(day(-daysAgo) + 'T00:00:00Z') + startH * H;
  put('sessions', id, { type: 'create', status: 'finished', started_at: start, ended_at: start + minutes * 60e3, active_seconds: minutes * 60, ...extra });
};
sess('se1', 1, 18, 95, { title: 'Wieczór w studiu', outcome_note: 'Dokończony pierwszy zwrotek i melodia refrenu — bardzo długa notatka, która zajmuje więcej niż jedną linię w historii sesji.' });
sess('se2', 2, 18, 70); sess('se3', 4, 19, 185, { title: 'Długa sesja' }); sess('se4', 6, 20, 8); sess('se5', 9, 18, 60, { source: 'manual' });
sess('se6', 11, 19, 45, { project_id: 'pj1' }); sess('se7', 13, 18, 120); sess('se8', 16, 21, 75); sess('se9', 20, 18, 50); sess('se10', 23, 19, 90); sess('se11', 28, 18, 65);

// Workflows
put('workflows', 'wf1', { name: 'Wieczór w studiu', minutes: 90, focus: true, tone: 0, intention: 'Telefon w drugim pokoju, tylko słuchawki.', position: 0 });
put('workflows', 'wf2', { name: 'Szybki szkic', minutes: 25, tone: 2, position: 1 });
put('workflows', 'wf3', { name: 'Bardzo długa nazwa własnego workflow która musi się zawijać', minutes: null, tone: 3, intention: 'Bez limitu — tworzę, dopóki płynie, a potem odpoczywam i nic nie nadrabiam.', position: 2 });

// Projects and songs
const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
put('projects', 'pj1', { title: 'Album 01 — Nocne miasto i inne historie o powrotach', kind: 'album', tone: 0, stage: 'sketch', last_worked_at: now - 3 * 86400e3, notes: 'Koncept: powroty. Dłuższa notatka do projektu, która też musi się zawijać w polu tekstowym.' });
put('projects', 'pj2', { title: 'EP Bez tytułu', kind: 'ep', tone: 2, cover_data: png });
put('projects', 'pj3', { title: 'Singiel', kind: 'single', tone: 4 });
put('projects', 'pj4', { title: 'Kolekcja szkiców', kind: 'collection', tone: 5 });
const lyrics = Array.from({ length: 24 }, (_, i) => `Wers numer ${i + 1} — dłuższa linijka tekstu, żeby sprawdzić zawijanie w polu`).join('\n');
['Intro', 'Bez tytułu', 'Dla nas', 'Znowu sen — wersja z gitarą i bardzo długim tytułem utworu', 'Nocne rozmowy'].forEach((t, i) => put('songs', `sg${i}`, { project_id: 'pj1', title: t, lyrics: i === 1 ? lyrics : '', position: i, done: i < 2 }));

// Books: every status, long titles, a custom one
const bk = (id: string, key: string | null, status: string, extra: Record<string, unknown> = {}) => {
  const c = key ? BOOK_BY_KEY[key] : null;
  put('books', id, { title: c?.title ?? 'Własna książka z bardzo długim tytułem, który się zawija', author: c?.author ?? 'Ktoś Znany', catalog_key: key, pages: c?.pages ?? 300, status, status_changed_at: now, ...extra });
};
bk('b1', 'woolf-dalloway', 'reading', { due_date: day(-4), started_at: now - 20 * 86400e3 }); bk('b2', 'camus-obcy', 'read', { rating: 5, clarity: 'clear', direction: 'more', finished_at: now - 5 * 86400e3 });
bk('b3', 'szymborska-wybor', 'planned'); bk('b4', 'kafka-proces', 'bought'); bk('b5', 'cioran-szczyty', 'suggested'); bk('b6', 'lakoff-metafory', 'paused'); bk('b7', 'hesse-wilk', 'dropped'); bk('b8', null, 'planned');
bk('b9', 'queneau-cwiczenia', 'read', { rating: 4, clarity: 'partly', direction: 'different', finished_at: now - 30 * 86400e3 });

// Academy progress
put('learning', 'vocal', { kind: 'path', path_key: 'vocal', status: 'active', started_at: now - 10 * 86400e3, last_opened_at: now - 86400e3 });
put('learning', 'vocal-breath', { kind: 'lesson', path_key: 'vocal', status: 'done', done_at: now - 5 * 86400e3, last_opened_at: now - 5 * 86400e3 });
put('learning', 'theory', { kind: 'path', path_key: 'theory', status: 'active', started_at: now - 6 * 86400e3, last_opened_at: now - 2 * 86400e3 });

// Wellbeing and day states
put('care', 'ca1', { at: now - 8 * 86400e3, date: day(-8), signal: 'sick', until: day(-6), note: 'Przeziębienie' });
put('care', 'ca2', { at: now - 3600e3, date: today, signal: 'low', note: 'Mało energii po pracy' });
put('day_states', day(-7), { date: day(-7), status: 'off' });

// Pending proposals with long labels, and a chat
const changes = Array.from({ length: 6 }, (_, i) => ({ entity: 'events', before: null, after: { id: `ev_p${i}`, updated_at: now, kind: 'music', title: 'Czas na muzykę', date: day(i + 1), start_min: 1140, end_min: 1230 }, label: `Nowe: Czas na muzykę — ${day(i + 1)} 19:00–20:30 (po regeneracji, z buforem po pracy)` }));
put('proposals', 'pr1', { source: 'planner', title: 'Plan tygodnia: 6 bloków muzyki i nauki', rationale: 'Dni z pracą mają jedną sesję po regeneracji; sobota wolna od planu. Pomijanie bloków nie wpływa na rytm.\nDrugi akapit uzasadnienia, dłuższy, żeby sprawdzić zawijanie w arkuszu.', changes });
put('proposals', 'pr2', { source: 'mentor', title: 'Przesunąć terminy czytania?', rationale: 'Terminy to tylko orientacja.', changes: changes.slice(0, 1) });
const msgs: [string, string][] = [['user', 'Jutro pracuję 12 godzin, przełóż muzykę'], ['assistant', 'Zapisuję pracę na jutro (12 h). Muzykę przesuwam na dzień po — proponuję zmianę, nic nie zmienia się bez „Zastosuj”.\n\nPo tak długiej zmianie najpierw regeneracja: woda, jedzenie, sen. Jeśli mimo to będzie ochota, wystarczy 15 minut czegokolwiek.'], ['user', 'Poleć mi książkę'], ['assistant', 'Z katalogu, według tego, co rozwijasz i co już oceniono:\n- „Kafka nad morzem” — Haruki Murakami (proza współczesna, średnia, ok. 14 h; jest polskie wydanie).']];
msgs.forEach(([role, content], i) => put('mentor_messages', `mm${i}_${role === 'user' ? 'u' : 'a'}`, { role, content, at: now - (10 - i) * 60e3, proposal_id: i === 1 ? 'pr1' : null, cards: i === 1 ? [{ type: 'proposal', id: 'pr1', title: 'Plan tygodnia: 6 bloków muzyki i nauki' }] : i === 3 ? [{ type: 'book', id: 'murakami-kafka', why: 'Nowy obszar na półce.' }, { type: 'action', id: 'open:/nauka/ksiazki', title: 'Otwórz Bibliotekę' }] : [] }));

const res = await call('/api/sync', { method: 'POST', body: JSON.stringify({ ops }) });
const bad = (res.results as { op_id: string; status: string }[]).filter((r) => r.status !== 'ok' && r.status !== 'applied' && r.status !== 'duplicate');
if (bad.length) console.log('rejected:', JSON.stringify(bad.slice(0, 5)));
const state = { cookies: cookie.split('; ').map((c) => { const [name, ...v] = c.split('='); return { name, value: v.join('='), domain: 'localhost', path: '/', httpOnly: true, secure: false, sameSite: 'Strict' as const, expires: -1 }; }), origins: [] };
writeFileSync(`${out}/state.json`, JSON.stringify(state));
console.log(`seeded ${ops.length} rows for ${email}; state → ${out}/state.json`);
