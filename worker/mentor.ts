import Anthropic from '@anthropic-ai/sdk';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Snapshot } from '../shared/domain/snapshot';
import { alive, newId } from '../shared/domain/snapshot';
import { buildMentorContext, catalogText } from '../shared/domain/mentorContext';
import { EXERCISE_BY_ID } from '../shared/catalog/exercises';
import { BOOK_BY_KEY } from '../shared/catalog/books';
import { eventSchema, type PEvent, type Proposal } from '../shared/schema';
import { hhmm, parseHHMM, plDate, zoned } from '../shared/time';
import { RULES, dayContext } from '../shared/domain/day';
import type { AppEnv, Env } from './env';
import { rateLimit } from './auth';
import { applyOps, pull } from './sync';

const DEFAULT_MODEL = 'claude-opus-5-5';

/** Stable system prompt — kept byte-identical so it is served from the prompt cache. */
const SYSTEM = `Jesteś mentorem w PULSE — prywatnym systemie rozwoju kariery muzycznej jednego artysty (rap melancholijny i emocjonalny, gitarowe brzmienia, obrazowe teksty). Rozmawiasz po polsku, zwięźle i konkretnie, jak doświadczony, życzliwy, ale wymagający mentor. Bez komplementów, bez cytatów motywacyjnych, bez emoji.

Zasady, których nie łamiesz:
1. Opierasz się wyłącznie na danych z bloku <kontekst> i na tym, co użytkownik napisał w rozmowie. Gdy danych brakuje, mówisz to wprost.
2. Rozróżniasz: „Z danych:” (fakt policzony z zapisów), „Z Twojej relacji:” (to, co użytkownik zadeklarował) i „Hipoteza:” (Twoja interpretacja). Oznaczaj to w odpowiedzi, gdy wnioskujesz.
3. Nie masz dostępu do audio ani tekstów utworów. Nie oceniasz jakości muzyki ani tekstu, chyba że użytkownik wkleił fragment w tej rozmowie — wtedy mówisz o technice (obraz, rytm, puenta, spójność) z niepewnością, bez wyroków. Godziny pracy to ilość, nie dowód poprawy jakości.
4. Nie piszesz całych tekstów za użytkownika. Możesz dać przykład techniki na 1–2 wersach.
5. Nie zmieniasz planu sam. Zmiany proponujesz narzędziem propose_plan_changes — użytkownik je zatwierdza. Nie przesuwasz wszystkiego na jutro; nie wypełniasz każdej wolnej chwili; szanujesz pracę zarobkową, odpoczynek, relacje i dni wolne. Przy zmęczeniu najpierw regeneracja, lekka sesja tylko jako opcja.
6. Ćwiczenia i książki polecasz tylko z katalogu (narzędzia recommend_exercise, recommend_book), z krótkim „dlaczego teraz”.
7. Nie diagnozujesz chorób i nie zastępujesz lekarza. Nie obiecujesz sukcesu.
8. Teksty powstają przy beacie, w DAW. Nie zadawaj codziennego pisania „na sucho”.
9. Odpowiedź: maksymalnie ok. 150 słów, chyba że użytkownik prosi o więcej (np. podsumowanie tygodnia). Kończ jednym konkretnym następnym krokiem.`;

const SYSTEM_FULL = `${SYSTEM}\n\n${catalogText()}`;

const changeSchema = z.object({
  action: z.enum(['move', 'shorten', 'excuse', 'add']),
  event_id: z.string().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  start: z.string().nullable(),
  minutes: z.number().int().min(15).max(300).nullable(),
  title: z.string().max(160).nullable(),
  kind: z.enum(['music', 'training', 'reading', 'promo', 'rest']).nullable(),
  exercise_id: z.string().nullable(),
});

const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'propose_plan_changes',
    description: 'Tworzy propozycję zmian w kalendarzu, którą użytkownik zobaczy i może zatwierdzić lub odrzucić. Używaj tylko identyfikatorów wydarzeń z kontekstu. Akcje: move (przenieś na date/start), shorten (skróć do minutes), excuse (usprawiedliw/odpuść bez kary), add (nowe wydarzenie: date, start, minutes, title, kind, opcjonalnie exercise_id).',
    strict: true,
    input_schema: {
      type: 'object',
      additionalProperties: false,
      required: ['title', 'rationale', 'changes'],
      properties: {
        title: { type: 'string', description: 'Krótki tytuł propozycji' },
        rationale: { type: 'string', description: 'Uzasadnienie oparte na danych' },
        changes: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['action', 'event_id', 'date', 'start', 'minutes', 'title', 'kind', 'exercise_id'],
            properties: {
              action: { type: 'string', enum: ['move', 'shorten', 'excuse', 'add'] },
              event_id: { type: ['string', 'null'] },
              date: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
              start: { type: ['string', 'null'], description: 'HH:MM' },
              minutes: { type: ['integer', 'null'] },
              title: { type: ['string', 'null'] },
              kind: { type: ['string', 'null'], enum: ['music', 'training', 'reading', 'promo', 'rest', null] },
              exercise_id: { type: ['string', 'null'] },
            },
          },
        },
      },
    },
  },
  {
    name: 'recommend_exercise',
    description: 'Pokazuje użytkownikowi kartę ćwiczenia z katalogu PULSE.',
    strict: true,
    input_schema: {
      type: 'object', additionalProperties: false, required: ['exercise_id', 'why'],
      properties: { exercise_id: { type: 'string' }, why: { type: 'string' } },
    },
  },
  {
    name: 'recommend_book',
    description: 'Pokazuje użytkownikowi kartę książki z katalogu PULSE z uzasadnieniem „dlaczego teraz”.',
    strict: true,
    input_schema: {
      type: 'object', additionalProperties: false, required: ['catalog_key', 'why'],
      properties: { catalog_key: { type: 'string' }, why: { type: 'string' } },
    },
  },
];

export interface MentorCard {
  type: 'exercise' | 'book' | 'proposal';
  id: string;
  why?: string;
  title?: string;
}

async function loadSnapshot(env: Env, userId: string): Promise<Snapshot> {
  const { rows } = await pull(env, userId, 0);
  const r = rows as Record<string, unknown[]>;
  return {
    profile: (r.profile?.[0] as Snapshot['profile']) ?? null,
    routines: r.routines as never, routine_exceptions: r.routine_exceptions as never, day_states: r.day_states as never,
    events: r.events as never, sessions: r.sessions as never, attempts: r.attempts as never, skill_levels: r.skill_levels as never,
    projects: r.projects as never, goals: r.goals as never, milestones: r.milestones as never, books: r.books as never,
    promo_tasks: r.promo_tasks as never, care: r.care as never, proposals: r.proposals as never,
  };
}

/** Turns validated model tool input into a proposal of concrete row changes. Invalid items are dropped with a note. */
function buildProposal(snap: Snapshot, input: { title: string; rationale: string; changes: z.infer<typeof changeSchema>[] }, now: number): { proposal: Proposal | null; problems: string[] } {
  const problems: string[] = [];
  const pid = newId('pr');
  const changes: Proposal['changes'] = [];
  const events = alive(snap.events);
  for (const ch of input.changes.slice(0, 20)) {
    const e = ch.event_id ? events.find((x) => x.id === ch.event_id) : undefined;
    if (ch.action !== 'add' && !e) { problems.push(`nie znaleziono wydarzenia ${ch.event_id}`); continue; }
    if (e && (e.kind === 'work' || e.kind === 'commute' || e.kind === 'relationship' || e.kind === 'private')) {
      problems.push(`„${e.title}” to zobowiązanie życiowe — mentor go nie zmienia`); continue;
    }
    const before = e ? (e as unknown as Record<string, unknown>) : null;
    if (ch.action === 'excuse' && e) {
      changes.push({ entity: 'events', before, after: { ...e, status: 'excused', updated_at: now, proposal_id: pid }, label: `${e.title} (${plDate(e.date)}) → odpuszczone bez kary` });
    } else if (ch.action === 'shorten' && e && ch.minutes) {
      const end = e.start_min + Math.min(ch.minutes, e.end_min - e.start_min);
      changes.push({ entity: 'events', before, after: { ...e, end_min: end, updated_at: now, proposal_id: pid }, label: `${e.title}: skrócone do ${end - e.start_min} min` });
    } else if (ch.action === 'move' && e && ch.date && ch.start) {
      const start = parseHHMM(ch.start);
      if (start == null) { problems.push(`zła godzina ${ch.start}`); continue; }
      const len = ch.minutes ?? e.end_min - e.start_min;
      const ctx = dayContext(snap, ch.date, undefined, { ignoreEventId: e.id });
      const clash = ctx.blocks.find((b) => b.start < start + len && start < b.end);
      if (clash) { problems.push(`${plDate(ch.date)} ${ch.start} koliduje z: ${clash.title}`); continue; }
      if (ctx.mode === 'none') { problems.push(`${plDate(ch.date)}: ${ctx.reason}`); continue; }
      changes.push({ entity: 'events', before, after: { ...e, date: ch.date, start_min: start, end_min: start + len, updated_at: now, proposal_id: pid, source: 'mentor' }, label: `${e.title} → ${plDate(ch.date)} ${hhmm(start)}–${hhmm(start + len)}` });
    } else if (ch.action === 'add' && ch.date && ch.start && ch.minutes && ch.title) {
      const start = parseHHMM(ch.start);
      if (start == null) { problems.push(`zła godzina ${ch.start}`); continue; }
      const ctx = dayContext(snap, ch.date);
      const clash = ctx.blocks.find((b) => b.start < start + ch.minutes! && start < b.end);
      if (clash) { problems.push(`${plDate(ch.date)} ${ch.start} koliduje z: ${clash.title}`); continue; }
      if (ctx.mode === 'none' && ch.kind !== 'rest') { problems.push(`${plDate(ch.date)}: ${ctx.reason}`); continue; }
      const minutes = ctx.mode === 'light' && ch.kind !== 'rest' ? Math.min(ch.minutes, RULES.lightMax) : ch.minutes;
      const ex = ch.exercise_id ? EXERCISE_BY_ID[ch.exercise_id] : undefined;
      const row: PEvent = eventSchema.parse({
        id: newId('ev'), updated_at: now, kind: ch.kind ?? 'music', title: ch.title, date: ch.date, start_min: start,
        end_min: start + minutes, source: 'mentor', proposal_id: pid, exercise_id: ex?.id ?? null, category: ex?.category ?? null,
      });
      changes.push({ entity: 'events', before: null, after: row as unknown as Record<string, unknown>, label: `Nowe: ${row.title} ${plDate(row.date)} ${hhmm(row.start_min)}–${hhmm(row.end_min)}` });
    } else {
      problems.push(`niepełna zmiana (${ch.action})`);
    }
  }
  if (!changes.length) return { proposal: null, problems };
  return {
    proposal: { id: pid, updated_at: now, deleted_at: null, source: 'mentor', title: input.title.slice(0, 200), rationale: input.rationale.slice(0, 3000), changes, status: 'pending', decided_at: null },
    problems,
  };
}

export const mentorRoutes = new Hono<AppEnv>();

mentorRoutes.get('/status', (c) => c.json({ configured: !!c.env.ANTHROPIC_API_KEY, model: c.env.AI_MODEL || DEFAULT_MODEL }));

const chatBody = z.object({
  message_id: z.string().min(8).max(64),
  content: z.string().trim().min(1).max(6000),
  mode: z.enum(['chat', 'weekly_review']).default('chat'),
});

mentorRoutes.post('/chat', async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ error: 'not_configured' }, 503);
  const user = c.get('user');
  if (!(await rateLimit(c.env, `mentor:${user.id}`, 40, 3600e3))) return c.json({ error: 'Limit rozmów z mentorem na tę godzinę został wyczerpany.' }, 429);
  const parsed = chatBody.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: 'invalid body' }, 400);
  const { message_id, content, mode } = parsed.data;

  // Idempotency: a retried send returns the stored answer instead of calling the model again.
  const existing = await c.env.DB.prepare("SELECT id FROM mentor_messages WHERE user_id = ? AND id = ?").bind(user.id, `${message_id}_a`).first();
  if (existing) return c.json({ duplicate: true });

  const snap = await loadSnapshot(c.env, user.id);
  const now = Date.now();
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const z0 = zoned(now, tz);
  const contextText = buildMentorContext(snap, { today: z0.date, nowMin: z0.minutes, nowMs: now });

  const history = (await c.env.DB.prepare('SELECT role, content FROM mentor_messages WHERE user_id = ? AND deleted_at IS NULL ORDER BY at DESC LIMIT 16').bind(user.id).all<{ role: 'user' | 'assistant'; content: string }>()).results.reverse();
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const h of history) {
    const last = messages[messages.length - 1];
    if (last && last.role === h.role) { last.content = `${last.content as string}\n\n${h.content}`; continue; }
    messages.push({ role: h.role, content: h.content });
  }
  while (messages.length && messages[0].role !== 'user') messages.shift();
  const ask = mode === 'weekly_review'
    ? 'Przygotuj przegląd mijającego tygodnia: co zostało zrobione, które umiejętności były rozwijane, jakie były przeszkody, i jedną realistyczną zmianę na kolejny tydzień. Do 250 słów.'
    : content;
  const userTurn: Anthropic.Beta.BetaMessageParam = {
    role: 'user',
    content: [{ type: 'text', text: `<kontekst>\n${contextText}\n</kontekst>` }, { type: 'text', text: ask }],
  };
  if (messages.length && messages[messages.length - 1].role === 'user') messages.pop();
  messages.push(userTurn);

  const client = new Anthropic({ apiKey: c.env.ANTHROPIC_API_KEY });
  const cards: MentorCard[] = [];
  const proposals: Proposal[] = [];
  let text = '';
  try {
    for (let turn = 0; turn < 3; turn++) {
      const res = await client.beta.messages.create({
        model: c.env.AI_MODEL || DEFAULT_MODEL,
        max_tokens: 4000,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: [{ type: 'text', text: SYSTEM_FULL, cache_control: { type: 'ephemeral' } }],
        tools: TOOLS,
        tool_choice: { type: 'auto' },
        messages,
      });
      if (res.stop_reason === 'refusal') { text = text || 'Mentor nie może odpowiedzieć na tę wiadomość.'; break; }
      for (const b of res.content) if (b.type === 'text') text += (text ? '\n\n' : '') + b.text;
      const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
      if (res.stop_reason !== 'tool_use' || !uses.length) break;
      messages.push({ role: 'assistant', content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const u of uses) {
        const input = u.input as Record<string, unknown>;
        if (u.name === 'recommend_exercise') {
          const ok = typeof input.exercise_id === 'string' && !!EXERCISE_BY_ID[input.exercise_id];
          if (ok) cards.push({ type: 'exercise', id: input.exercise_id as string, why: String(input.why ?? '') });
          results.push({ type: 'tool_result', tool_use_id: u.id, content: ok ? 'Karta ćwiczenia pokazana.' : 'Nie ma takiego ćwiczenia w katalogu.', is_error: !ok });
        } else if (u.name === 'recommend_book') {
          const ok = typeof input.catalog_key === 'string' && !!BOOK_BY_KEY[input.catalog_key];
          if (ok) cards.push({ type: 'book', id: input.catalog_key as string, why: String(input.why ?? '') });
          results.push({ type: 'tool_result', tool_use_id: u.id, content: ok ? 'Karta książki pokazana.' : 'Nie ma takiej książki w katalogu.', is_error: !ok });
        } else if (u.name === 'propose_plan_changes') {
          const p = z.object({ title: z.string(), rationale: z.string(), changes: z.array(changeSchema) }).safeParse(input);
          if (!p.success) { results.push({ type: 'tool_result', tool_use_id: u.id, content: 'Niepoprawne dane propozycji.', is_error: true }); continue; }
          const { proposal, problems } = buildProposal(snap, p.data, now);
          if (proposal) { proposals.push(proposal); cards.push({ type: 'proposal', id: proposal.id, title: proposal.title }); }
          results.push({
            type: 'tool_result', tool_use_id: u.id,
            content: proposal ? `Propozycja zapisana i pokazana do zatwierdzenia (${proposal.changes.length} zmian).${problems.length ? ` Odrzucone elementy: ${problems.join('; ')}.` : ''}` : `Nie utworzono propozycji: ${problems.join('; ')}.`,
            is_error: !proposal,
          });
        } else {
          results.push({ type: 'tool_result', tool_use_id: u.id, content: 'Nieznane narzędzie.', is_error: true });
        }
      }
      messages.push({ role: 'user', content: results });
    }
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) return c.json({ error: 'Klucz API mentora jest nieprawidłowy.' }, 502);
    if (err instanceof Anthropic.RateLimitError) return c.json({ error: 'Dostawca AI ogranicza teraz zapytania. Spróbuj za chwilę.' }, 503);
    if (err instanceof Anthropic.APIError) return c.json({ error: `Błąd dostawcy AI (${err.status ?? '?'})` }, 502);
    return c.json({ error: 'Nie udało się połączyć z mentorem.' }, 502);
  }

  const userMsg = { id: `${message_id}_u`, updated_at: now, deleted_at: null, role: 'user', content: mode === 'weekly_review' ? 'Przegląd tygodnia' : content, at: now, proposal_id: null, cards: [] };
  const botMsg = { id: `${message_id}_a`, updated_at: now + 1, deleted_at: null, role: 'assistant', content: text || 'Brak odpowiedzi tekstowej — zobacz karty poniżej.', at: now + 1, proposal_id: proposals[0]?.id ?? null, cards };
  await applyOps(c.env, user.id, [
    ...proposals.map((p) => ({ op_id: `op_${p.id}`, entity: 'proposals' as const, action: 'put' as const, id: p.id, data: p as unknown as Record<string, unknown>, ts: now })),
    { op_id: `op_${userMsg.id}`, entity: 'mentor_messages', action: 'put', id: userMsg.id, data: userMsg, ts: now },
    { op_id: `op_${botMsg.id}`, entity: 'mentor_messages', action: 'put', id: botMsg.id, data: botMsg, ts: now },
  ]);
  return c.json({ ok: true });
});
