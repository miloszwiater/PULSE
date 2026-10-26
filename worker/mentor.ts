import Anthropic from '@anthropic-ai/sdk';
import { Hono } from 'hono';
import { z } from 'zod';
import type { Snapshot } from '../shared/domain/snapshot';

import { buildMentorContext, catalogText } from '../shared/domain/mentorContext';
import { LESSON_BY_KEY } from '../shared/catalog/academy';
import { BOOK_BY_KEY } from '../shared/catalog/books';
import type { Proposal } from '../shared/schema';
import { buildMentorProposal, mentorChangeSchema } from '../shared/domain/mentorProposals';
import { deadlineShiftProposal, ownedRow } from '../shared/domain/library';
import { zoned } from '../shared/time';
import type { AppEnv, Env } from './env';
import { rateLimit } from './auth';
import { applyOps, pull } from './sync';

const DEFAULT_MODEL = 'claude-opus-5-5';

/** Stable system prompt — kept byte-identical so it is served from the prompt cache. */
const SYSTEM = `Jesteś Towarzyszem w PULSE — prywatnej aplikacji, która pomaga jednej osobie sprawić, żeby muzyka była regularną częścią życia: znaleźć na nią czas, utrzymać rytm, ograniczyć rozpraszacze i — opcjonalnie — uczyć się. Osoba tworzy emocjonalny, melodyjny rap, alternatywny rap i rap-rock; jest samoukiem, miała kilka lekcji śpiewu. Rozmawiasz po polsku, zwięźle, ciepło i rzeczowo. Bez komplementów, bez pustej motywacji, bez emoji. Używasz form neutralnych płciowo (bez „zrobiłeś/zrobiłaś”).

Zasady, których nie łamiesz:
1. PULSE pilnuje regularności, nie kreatywności. Nie mówisz, jaką muzykę tworzyć, nie oceniasz utworów, nie zadajesz sztucznych zadań („napisz 8 wersów”). Nie jesteś menedżerem kariery ani marketingu.
2. Opierasz się na danych z bloku <kontekst> i na tym, co osoba napisała. Gdy danych brakuje, mówisz to wprost. Odróżniasz „Z danych:” od „Hipoteza:”.
3. Nie zmieniasz planu sam. Zmiany proponujesz narzędziem propose_plan_changes — osoba je zatwierdza. Nigdy nie usuwasz zobowiązań życiowych (praca, dojazdy, relacje, sprawy prywatne) i nie nadpisujesz ręcznych ustawień. Nie wypełniasz każdej wolnej chwili. Codzienna muzyka jest mile widziana, ale nie wymagana.
4. Zmęczenie: najpierw regeneracja (woda, jedzenie, sen, chwila bez ekranu), lżejsza aktywność muzyczna tylko jako opcja. Choroba: plan się dostosowuje, to nie porażka. Nie diagnozujesz i nie zastępujesz lekarza; przy niepokojących lub przedłużających się objawach odsyłasz do lekarza.
5. Po przerwie pomagasz wrócić bez nadrabiania zaległości i bez kar. Rozróżniasz realny brak możliwości (ciężki dzień, choroba) od odkładania mimo wolnego czasu — bez oceniania, z praktyczną radą (krótszy start, inna pora).
6. Nauka jest opcjonalna. Lekcje polecasz tylko z katalogu Akademii (narzędzie recommend_lesson). Czas nauki to nie dowód opanowania.
7. Książki: jesteś osobistym doradcą literackim. Polecasz wyłącznie pozycje z katalogu (narzędzie recommend_book), jedną–dwie naraz; nigdy nie wymyślasz tytułów, autorów ani wydań. Uzasadnienie opierasz na stylu osoby (profil), jej ocenach i przeczytanych książkach z kontekstu i mówisz konkretnie, co książka rozwija (obraz, metafora, język, emocja bez nazywania, psychologia postaci, filozofia), jak jest trudna i ile orientacyjnie zajmie. Nie polecasz tego, co jest na półce lub odrzucone, i różnicujesz: nie więcej niż dwie pod rząd z tej samej kategorii, co jakiś czas świadomie nowy obszar. Nie obiecujesz, że lektura poprawi warsztat. Wydania polskie podajesz tylko według pola katalogu; przy „niepotwierdzone” mówisz, że nie wiadomo. Po ukończonej książce pytasz o ocenę, zrozumiałość i kierunek dalej. Z książek nie robisz zadań pisarskich — co najwyżej proponujesz opcjonalną refleksję (metafora, budowa emocji, symbol) bez obowiązku pisania. Gdy brakuje czasu, jest choroba albo natłok, proponujesz przesunięcie terminów czytania (narzędzie shift_book_deadlines).
8. Bezpieczeństwo głosu: żadnych ćwiczeń z bólem lub forsowaniem; technik przesterowanego krzyku nie uczysz — odsyłasz do nauczyciela śpiewu.
9. Odpowiedź: maksymalnie ok. 120 słów, chyba że osoba prosi o więcej. Kończ jednym konkretnym następnym krokiem albo pytaniem.`;

const SYSTEM_FULL = `${SYSTEM}\n\n${catalogText()}`;


const TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: 'propose_plan_changes',
    description: 'Tworzy propozycję zmian w kalendarzu, którą użytkownik zobaczy i może zatwierdzić lub odrzucić. Używaj tylko identyfikatorów wydarzeń z kontekstu. Akcje: move (przenieś na date/start), shorten (skróć do minutes), excuse (usprawiedliw/odpuść bez kary), add (nowy blok: date, start, minutes, kind). kind to „music” (swobodna sesja Creative Workflow — tytuł zawsze ustawia PULSE, nie opisuj zadań twórczych) albo „rest” (regeneracja, title opisuje ją krótko).',
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
            required: ['action', 'event_id', 'date', 'start', 'minutes', 'title', 'kind'],
            properties: {
              action: { type: 'string', enum: ['move', 'shorten', 'excuse', 'add'] },
              event_id: { type: ['string', 'null'] },
              date: { type: ['string', 'null'], description: 'YYYY-MM-DD' },
              start: { type: ['string', 'null'], description: 'HH:MM' },
              minutes: { type: ['integer', 'null'] },
              title: { type: ['string', 'null'] },
              kind: { type: ['string', 'null'], enum: ['music', 'rest', null] },
            },
          },
        },
      },
    },
  },
  {
    name: 'recommend_lesson',
    description: 'Pokazuje kartę lekcji z Akademii PULSE (klucz lekcji z katalogu).',
    strict: true,
    input_schema: {
      type: 'object', additionalProperties: false, required: ['lesson_key', 'why'],
      properties: { lesson_key: { type: 'string' }, why: { type: 'string' } },
    },
  },
  {
    name: 'recommend_book',
    description: 'Pokazuje kartę książki z katalogu PULSE (tylko klucz z katalogu; nie wolno polecać pozycji już na półce ani odrzuconych). „why” to konkretne uzasadnienie oparte na stylu, ocenach i przeczytanych książkach osoby — bez obietnic poprawy warsztatu.',
    strict: true,
    input_schema: {
      type: 'object', additionalProperties: false, required: ['catalog_key', 'why'],
      properties: { catalog_key: { type: 'string' }, why: { type: 'string' } },
    },
  },
  {
    name: 'shift_book_deadlines',
    description: 'Tworzy propozycję przesunięcia orientacyjnych terminów czytania książek w trakcie (choroba, brak czasu, zmęczenie). Osoba ją zatwierdza; nic nie zmienia się samo.',
    strict: true,
    input_schema: {
      type: 'object', additionalProperties: false, required: ['days', 'reason'],
      properties: { days: { type: 'integer', description: 'O ile dni przesunąć (3–60)' }, reason: { type: 'string', enum: ['sick', 'busy', 'tired'] } },
    },
  },
];

export interface MentorCard {
  type: 'exercise' | 'book' | 'proposal' | 'lesson' | 'action';
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
    workflows: r.workflows as never, learning: r.learning as never, songs: r.songs as never,
  };
}

export const mentorRoutes = new Hono<AppEnv>();

mentorRoutes.get('/status', (c) => c.json({ configured: !!c.env.ANTHROPIC_API_KEY, model: c.env.AI_MODEL || DEFAULT_MODEL }));

const chatBody = z.object({
  message_id: z.string().min(8).max(64),
  content: z.string().trim().min(1).max(6000),
  mode: z.enum(['chat', 'weekly_review', 'monthly_review']).default('chat'),
});

mentorRoutes.post('/chat', async (c) => {
  if (!c.env.ANTHROPIC_API_KEY) return c.json({ error: 'not_configured' }, 503);
  const user = c.get('user');
  if (!(await rateLimit(c.env, `mentor:${user.id}`, 40, 3600e3))) return c.json({ error: 'Limit rozmów na tę godzinę został wyczerpany.' }, 429);
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
  const clk = { today: z0.date, nowMin: z0.minutes, nowMs: now };
  const contextText = buildMentorContext(snap, clk);

  const history = (await c.env.DB.prepare('SELECT role, content FROM mentor_messages WHERE user_id = ? AND deleted_at IS NULL ORDER BY at DESC LIMIT 16').bind(user.id).all<{ role: 'user' | 'assistant'; content: string }>()).results.reverse();
  const messages: Anthropic.Beta.BetaMessageParam[] = [];
  for (const h of history) {
    const last = messages[messages.length - 1];
    if (last && last.role === h.role) { last.content = `${last.content as string}\n\n${h.content}`; continue; }
    messages.push({ role: h.role, content: h.content });
  }
  while (messages.length && messages[0].role !== 'user') messages.shift();
  const ask = mode === 'weekly_review'
    ? 'Przygotuj krótkie spojrzenie na mijający tydzień: ile było muzyki i kiedy, co przeszkadzało (praca, energia, zdrowie), co z planu się udało. Zakończ jedną realistyczną zmianą na kolejny tydzień. Do 200 słów.'
    : mode === 'monthly_review'
      ? 'Przygotuj spojrzenie na ostatnie 4 tygodnie: rytm (dni z muzyką, przerwy i powroty), realizacja planu, praca i regeneracja, nauka. Zakończ dwiema realistycznymi zmianami. Do 250 słów.'
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
      if (res.stop_reason === 'refusal') { text = text || 'Towarzysz nie może odpowiedzieć na tę wiadomość.'; break; }
      for (const b of res.content) if (b.type === 'text') text += (text ? '\n\n' : '') + b.text;
      const uses = res.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === 'tool_use');
      if (res.stop_reason !== 'tool_use' || !uses.length) break;
      messages.push({ role: 'assistant', content: res.content as Anthropic.Beta.BetaContentBlockParam[] });
      const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
      for (const u of uses) {
        const input = u.input as Record<string, unknown>;
        if (u.name === 'recommend_lesson') {
          const ok = typeof input.lesson_key === 'string' && !!LESSON_BY_KEY[input.lesson_key];
          if (ok) cards.push({ type: 'lesson', id: input.lesson_key as string, why: String(input.why ?? '') });
          results.push({ type: 'tool_result', tool_use_id: u.id, content: ok ? 'Karta lekcji pokazana.' : 'Nie ma takiej lekcji w katalogu.', is_error: !ok });
        } else if (u.name === 'recommend_book') {
          const cat = typeof input.catalog_key === 'string' ? BOOK_BY_KEY[input.catalog_key] : undefined;
          const own = cat ? ownedRow(snap, cat) : undefined;
          const ok = !!cat && !cat.retired && !own && !cards.some((c) => c.type === 'book' && c.id === cat.key);
          if (ok) cards.push({ type: 'book', id: cat.key, why: String(input.why ?? '') });
          results.push({ type: 'tool_result', tool_use_id: u.id, content: ok ? 'Karta książki pokazana.' : !cat || cat.retired ? 'Nie ma takiej książki w katalogu.' : 'Ta książka jest już na półce użytkownika (lub odrzucona) — wybierz inną.', is_error: !ok });
        } else if (u.name === 'shift_book_deadlines') {
          const days = Math.min(60, Math.max(3, Math.round(Number(input.days) || 14)));
          const reason = input.reason === 'sick' || input.reason === 'tired' ? input.reason : 'busy';
          const proposal = deadlineShiftProposal(snap, clk, { days, reason });
          if (proposal) { proposals.push(proposal); cards.push({ type: 'proposal', id: proposal.id, title: proposal.title }); }
          results.push({ type: 'tool_result', tool_use_id: u.id, content: proposal ? `Propozycja przesunięcia terminów pokazana do zatwierdzenia (${proposal.changes.length}).` : 'Brak książek z terminem do przesunięcia.', is_error: !proposal });
        } else if (u.name === 'propose_plan_changes') {
          const p = z.object({ title: z.string(), rationale: z.string(), changes: z.array(mentorChangeSchema) }).safeParse(input);
          if (!p.success) { results.push({ type: 'tool_result', tool_use_id: u.id, content: 'Niepoprawne dane propozycji.', is_error: true }); continue; }
          const { proposal, problems } = buildMentorProposal(snap, p.data, now);
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
    if (err instanceof Anthropic.AuthenticationError) return c.json({ error: 'Klucz API jest nieprawidłowy.' }, 502);
    if (err instanceof Anthropic.RateLimitError) return c.json({ error: 'Dostawca AI ogranicza teraz zapytania. Spróbuj za chwilę.' }, 503);
    if (err instanceof Anthropic.APIError) return c.json({ error: `Błąd dostawcy AI (${err.status ?? '?'})` }, 502);
    return c.json({ error: 'Nie udało się połączyć z AI.' }, 502);
  }

  const userMsg = { id: `${message_id}_u`, updated_at: now, deleted_at: null, role: 'user', content: mode === 'weekly_review' ? 'Przegląd tygodnia' : mode === 'monthly_review' ? 'Przegląd miesiąca' : content, at: now, proposal_id: null, cards: [] };
  const botMsg = { id: `${message_id}_a`, updated_at: now + 1, deleted_at: null, role: 'assistant', content: text || 'Brak odpowiedzi tekstowej — zobacz karty poniżej.', at: now + 1, proposal_id: proposals[0]?.id ?? null, cards };
  await applyOps(c.env, user.id, [
    ...proposals.map((p) => ({ op_id: `op_${p.id}`, entity: 'proposals' as const, action: 'put' as const, id: p.id, data: p as unknown as Record<string, unknown>, ts: now })),
    { op_id: `op_${userMsg.id}`, entity: 'mentor_messages', action: 'put', id: userMsg.id, data: userMsg, ts: now },
    { op_id: `op_${botMsg.id}`, entity: 'mentor_messages', action: 'put', id: botMsg.id, data: botMsg, ts: now },
  ]);
  return c.json({ ok: true });
});
