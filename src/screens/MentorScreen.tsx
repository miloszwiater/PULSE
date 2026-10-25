import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MentorMessage } from '../../shared/schema';
import { insights } from '../../shared/domain/insights';
import { newId } from '../../shared/domain/snapshot';
import { EXERCISE_BY_ID } from '../../shared/catalog/exercises';
import { BOOK_BY_KEY } from '../../shared/catalog/books';
import { bookSchema } from '../../shared/schema';
import { api, ApiError } from '../data/api';
import { useMentorMessages, useStore } from '../data/store';
import { syncNow } from '../data/sync';
import { useClock } from '../data/clock';
import { putRow } from '../data/actions';
import { back, useQuery } from '../app/router';
import { Button, Chip, IconButton } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/toast';
import { InsightView } from './InsightView';
import { ExerciseSheet } from './growth/SkillScreen';
import { ProposalSheet } from './plan/ProposalSheet';

const QUICK = [
  'Jestem po pracy i nie mam siły. Co ma sens dzisiaj?',
  'Na czym najbardziej opłaca się skupić w tym tygodniu?',
  'Za dużo zaczynam, za mało kończę. Jak to zmienić?',
  'Jakie ćwiczenie na flow zrobić dziś przy beacie?',
];

let statusCache: { configured: boolean; model: string } | null = null;

/** Minimal, safe formatting: paragraphs, "- " lists and **bold**. No HTML injection. */
function Formatted({ text }: { text: string }) {
  const blocks = text.split(/\n{2,}/);
  const inline = (s: string): ReactNode[] => s.split(/(\*\*[^*]+\*\*)/g).map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p}</span>));
  return (
    <>
      {blocks.map((b, i) => {
        const lines = b.split('\n');
        if (lines.every((l) => /^\s*([-•]|\d+\.)\s/.test(l))) return <ul key={i}>{lines.map((l, j) => <li key={j}>{inline(l.replace(/^\s*([-•]|\d+\.)\s/, ''))}</li>)}</ul>;
        return <p key={i}>{lines.map((l, j) => <span key={j}>{inline(l)}{j < lines.length - 1 && <br />}</span>)}</p>;
      })}
    </>
  );
}

export function MentorScreen() {
  const q = useQuery();
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const rows = useMentorMessages();
  const [status, setStatus] = useState(statusCache);
  const [text, setText] = useState(q.get('analyze') ? 'Wklejam fragment do omówienia technik (obraz, rytm, puenta, spójność):\n\n' : '');
  const [pending, setPending] = useState<{ id: string; content: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showObs, setShowObs] = useState(true);
  const [exercise, setExercise] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const obs = useMemo(() => insights(snap, clock.today), [snap, clock.today]);
  const messages = useMemo(() => Object.values(rows).filter((m) => m.deleted_at == null).sort((a, b) => a.at - b.at), [rows]);
  const offline = typeof navigator !== 'undefined' && !navigator.onLine;

  useEffect(() => {
    if (statusCache) return;
    api<{ configured: boolean; model: string }>('/api/mentor/status').then((s) => { statusCache = s; setStatus(s); }).catch(() => setStatus(null));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, pending]);
  useEffect(() => { if (messages.length) setShowObs(false); }, [messages.length]);

  const send = async (content: string, mode: 'chat' | 'weekly_review' | 'monthly_review' = 'chat') => {
    if (!content.trim() && mode === 'chat') return;
    const id = newId('mm');
    setPending({ id, content: mode === 'weekly_review' ? 'Przegląd tygodnia' : mode === 'monthly_review' ? 'Przegląd miesiąca' : content.trim() });
    setError(null);
    setText('');
    try {
      await api('/api/mentor/chat', { body: { message_id: id, content: mode === 'chat' ? content.trim() : 'review', mode } });
      await syncNow();
    } catch (e) {
      const err = e as ApiError;
      setError(err.status === 503 && (err.body as { error?: string })?.error === 'not_configured' ? 'Mentor AI nie jest skonfigurowany.' : err.message);
      if (mode === 'chat') setText(content);
    } finally {
      setPending(null);
    }
  };
  useEffect(() => {
    if (q.get('review') === '1' && status?.configured) void send('', 'weekly_review');
    if (q.get('review') === 'month' && status?.configured) void send('', 'monthly_review');
  }, [status?.configured]); // eslint-disable-line react-hooks/exhaustive-deps

  const configured = status?.configured;
  const proposal = proposalId ? snap.proposals.find((p) => p.id === proposalId) ?? null : null;

  return (
    <div className="mentor">
      <header className="mentor__top">
        <IconButton icon="back" label="Wróć" onClick={() => back('/')} />
        <div className="mentor__title">
          <h1>Mentor</h1>
          <p>{status == null ? (offline ? 'Offline' : 'Sprawdzam połączenie…') : configured ? 'Mówi na podstawie Twoich danych' : 'Tylko obserwacje z danych'}</p>
        </div>
        <button className="btn btn--quiet" onClick={() => setShowObs(!showObs)} aria-expanded={showObs}>{showObs ? 'Ukryj' : `Obserwacje${obs.length ? ` (${obs.length})` : ''}`}</button>
      </header>

      <div className="mentor__scroll">
        {showObs && (
          <section className="mentor__obs" aria-label="Obserwacje z danych">
            <p className="dim xs">Wyliczone regułami z Twoich zapisów — działają bez AI. Każda ma dowody.</p>
            {obs.length ? obs.map((i) => <InsightView key={i.key} insight={i} />) : <p className="muted small">Brak obserwacji. Pojawią się, gdy będzie wystarczająco danych — PULSE nie zgaduje.</p>}
          </section>
        )}

        {status && !configured && (
          <div className="callout"><Icon name="info" size={18} /><span><strong>Rozmowa z mentorem AI jest wyłączona.</strong> Na serwerze nie ustawiono klucza dostawcy AI (ANTHROPIC_API_KEY). Plan, sesje, statystyki i obserwacje z danych działają normalnie.</span></div>
        )}

        <ol className="chat">
          {messages.map((m) => <Message key={m.id} m={m} onExercise={setExercise} onProposal={setProposalId} />)}
          {pending && (
            <>
              <li className="msg msg--user"><div className="msg__bubble">{pending.content}</div></li>
              <li className="msg msg--assistant is-thinking" aria-live="polite"><div className="msg__bubble"><span className="dots"><span /><span /><span /></span> Analizuję dane…</div></li>
            </>
          )}
        </ol>
        {!messages.length && !pending && configured && (
          <div className="mentor__empty">
            <p className="muted small">Mentor widzi Twój plan, sesje, oceny ćwiczeń, lektury i samopoczucie — nie widzi audio ani tekstów, których nie wkleisz. Propozycje zmian w planie zawsze trafiają do Twojej akceptacji.</p>
          </div>
        )}
        {error && <p className="mentor__error" role="alert">{error}</p>}
        <div ref={endRef} />
      </div>

      <footer className="composer">
        {configured && !pending && (
          <div className="composer__quick">
            {QUICK.map((qq) => <Chip key={qq} onClick={() => void send(qq)}>{qq}</Chip>)}
            <Chip icon="chart" onClick={() => void send('', 'weekly_review')}>Przegląd tygodnia</Chip>
            <Chip icon="calendar" onClick={() => void send('', 'monthly_review')}>Przegląd miesiąca</Chip>
          </div>
        )}
        <form className="composer__form" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <textarea className="textarea composer__input" rows={1} value={text} onChange={(e) => setText(e.target.value)} maxLength={6000}
            placeholder={configured ? 'Napisz do mentora…' : 'Mentor AI niedostępny'} disabled={!configured || !!pending || offline}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void send(text); } }} aria-label="Wiadomość do mentora" />
          <Button variant="primary" icon="chevron" aria-label="Wyślij" disabled={!configured || !!pending || !text.trim() || offline} />
        </form>
      </footer>

      <ExerciseSheet exercise={exercise ? EXERCISE_BY_ID[exercise] ?? null : null} onClose={() => setExercise(null)} />
      <ProposalSheet open={!!proposal} proposal={proposal} onClose={() => setProposalId(null)} />
    </div>
  );
}

function Message({ m, onExercise, onProposal }: { m: MentorMessage; onExercise: (id: string) => void; onProposal: (id: string) => void }) {
  const proposals = useStore((s) => s.rows.proposals);
  const books = useStore((s) => s.snap.books);
  return (
    <li className={`msg msg--${m.role}`}>
      <div className="msg__bubble">{m.role === 'assistant' ? <Formatted text={m.content} /> : m.content}</div>
      {m.cards.length > 0 && (
        <div className="msg__cards">
          {m.cards.map((c) => {
            if (c.type === 'exercise') {
              const ex = EXERCISE_BY_ID[c.id];
              if (!ex) return null;
              return (
                <button key={c.id} className="mcard" onClick={() => onExercise(c.id)}>
                  <span className="mcard__kind">Ćwiczenie · {ex.minutes} min</span>
                  <span className="mcard__title">{ex.title}</span>
                  {c.why && <span className="mcard__why">{c.why}</span>}
                </button>
              );
            }
            if (c.type === 'book') {
              const b = BOOK_BY_KEY[c.id];
              if (!b) return null;
              const owned = books.some((x) => x.catalog_key === b.key);
              return (
                <div key={c.id} className="mcard">
                  <span className="mcard__kind">Lektura</span>
                  <span className="mcard__title">{b.title} — {b.author}</span>
                  {c.why && <span className="mcard__why">{c.why}</span>}
                  <Button size="sm" variant="secondary" disabled={owned} onClick={() => {
                    const now = Date.now();
                    putRow('books', bookSchema.parse({ id: newId('bk'), updated_at: now, title: b.title, author: b.author, topic: b.topic, learning_goal: b.learning_goal, pages: b.pages, practice: b.practice, catalog_key: b.key, reason: c.why || b.why, status: 'planned', status_changed_at: now }));
                    toast('Dodano do biblioteki.', 'ok');
                  }}>{owned ? 'W bibliotece' : 'Dodaj do biblioteki'}</Button>
                </div>
              );
            }
            const p = proposals[c.id];
            return (
              <button key={c.id} className="mcard mcard--proposal" onClick={() => p && onProposal(c.id)} disabled={!p}>
                <span className="mcard__kind">Propozycja zmian · {p ? ({ pending: 'czeka na decyzję', applied: 'zastosowana', rejected: 'odrzucona', reverted: 'cofnięta' } as const)[p.status] : 'synchronizacja…'}</span>
                <span className="mcard__title">{c.title ?? p?.title}</span>
              </button>
            );
          })}
        </div>
      )}
    </li>
  );
}
