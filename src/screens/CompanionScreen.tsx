import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { MentorMessage } from '../../shared/schema';
import { bookSchema } from '../../shared/schema';
import { understand } from '../../shared/domain/companion';
import { newId } from '../../shared/domain/snapshot';
import { BOOK_BY_KEY } from '../../shared/catalog/books';
import { LESSON_BY_KEY } from '../../shared/catalog/academy';
import { api, ApiError } from '../data/api';
import { useMentorMessages, useStore } from '../data/store';
import { syncNow } from '../data/sync';
import { clockNow } from '../data/clock';
import { putRow, setDayOff, startSession, storeLocalExchange } from '../data/actions';
import { back, navigate, useQuery } from '../app/router';
import { Button, IconButton } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/toast';
import { ProposalSheet } from './plan/ProposalSheet';

const EXAMPLES = [
  'Jutro pracuję 12 godzin, przełóż muzykę',
  'Nie mam dzisiaj energii',
  'Jestem chory przez kilka dni',
  'Mam dzisiaj wenę, chcę tworzyć',
  'W tym tygodniu chcę trochę pouczyć się śpiewu',
  'Od dawna nie robiłem muzyki, pomóż mi wrócić',
];

let statusCache: { configured: boolean } | null = null;

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

function runAction(id: string) {
  const [kind, a, b] = id.split(':');
  if (kind === 'start') {
    startSession(a === 'focus' ? { focus: true } : { minutes: a ? Number(a) : null });
    navigate('/sesja');
  } else if (kind === 'open') navigate(id.slice(5));
  else if (kind === 'day' && a === 'off' && b) { setDayOff(b); toast('Dzień oznaczony jako wolny od planu.', 'ok'); }
}

export function CompanionScreen() {
  const q = useQuery();
  const snap = useStore((s) => s.snap);
  const rows = useMentorMessages();
  const [status, setStatus] = useState(statusCache);
  const [text, setText] = useState('');
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [proposalId, setProposalId] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sentQ = useRef(false);
  const messages = useMemo(() => Object.values(rows).filter((m) => m.deleted_at == null).sort((a, b) => a.at - b.at), [rows]);
  const online = typeof navigator === 'undefined' || navigator.onLine;
  const configured = !!status?.configured;

  useEffect(() => {
    if (statusCache) return;
    api<{ configured: boolean }>('/api/mentor/status').then((s) => { statusCache = s; setStatus(s); }).catch(() => setStatus({ configured: false }));
  }, []);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, pending]);

  const send = async (raw: string) => {
    const content = raw.trim();
    if (!content || pending) return;
    setError(null);
    setText('');
    const s = useStore.getState().snap;
    const local = understand(content, s, clockNow(), { aiAvailable: configured && online });
    if (local.intent !== 'unknown' || !configured || !online) {
      const cards: MentorMessage['cards'] = [];
      if (local.proposal) cards.push({ type: 'proposal', id: local.proposal.id, title: local.proposal.title });
      for (const a of local.actions) cards.push({ type: 'action', id: a.id, title: a.label });
      const reply = local.text || 'Bez połączenia z AI rozumiem tylko typowe sytuacje: pracę, energię, chorobę, wenę, naukę i powrót po przerwie.';
      storeLocalExchange(content, reply, cards, local.proposal);
      if (local.proposal) setProposalId(local.proposal.id);
      return;
    }
    const id = newId('mm');
    setPending(content);
    try {
      await api('/api/mentor/chat', { body: { message_id: id, content, mode: 'chat' } });
      await syncNow();
    } catch (e) {
      const err = e as ApiError;
      setError(err.message || 'Nie udało się wysłać wiadomości.');
      setText(content);
    } finally {
      setPending(null);
    }
  };

  useEffect(() => {
    const initial = q.get('q');
    if (initial && !sentQ.current && status) { sentQ.current = true; void send(initial); history.replaceState(null, '', '/towarzysz'); }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  const proposal = proposalId ? snap.proposals.find((p) => p.id === proposalId) ?? null : null;

  return (
    <div className="companion">
      <header className="companion__top">
        <IconButton icon="back" label="Wróć" onClick={() => back('/')} />
        <div className="companion__title">
          <h1>Towarzysz</h1>
          <p>{status == null ? 'Sprawdzam połączenie…' : configured ? (online ? 'Rozumie zwykłe wiadomości; trudniejsze pytania idą do AI' : 'Offline — działa lokalnie') : 'Działa lokalnie, bez AI'}</p>
        </div>
      </header>

      <div className="companion__scroll">
        {!messages.length && !pending && (
          <div className="companion__intro">
            <p>Napisz, co się dzieje — zwykłymi słowami. Plan dopasuje się do pracy, energii i zdrowia, ale każda zmiana czeka na Twoje „Zastosuj”.</p>
            {status && !configured && <p className="dim small">AI nie jest skonfigurowane na serwerze (brak klucza). Typowe sytuacje i tak są rozumiane lokalnie.</p>}
          </div>
        )}
        <ol className="chat">
          {messages.map((m) => <Message key={m.id} m={m} onProposal={setProposalId} />)}
          {pending && (
            <>
              <li className="msg msg--user"><div className="msg__bubble">{pending}</div></li>
              <li className="msg msg--assistant is-thinking" aria-live="polite"><div className="msg__bubble"><span className="dots"><span /><span /><span /></span></div></li>
            </>
          )}
        </ol>
        {error && <p className="companion__error" role="alert">{error}</p>}
        <div ref={endRef} />
      </div>

      <footer className="composer">
        {!pending && (
          <div className="composer__quick">
            {EXAMPLES.map((e) => <button key={e} className="prompt" onClick={() => void send(e)}>{e}</button>)}
          </div>
        )}
        <form className="composer__form" onSubmit={(e) => { e.preventDefault(); void send(text); }}>
          <textarea className="textarea composer__input" rows={1} value={text} onChange={(e) => setText(e.target.value)} maxLength={2000}
            placeholder="Np. „w piątek pracuję 8–20”" disabled={!!pending} enterKeyHint="send"
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(text); } }} aria-label="Wiadomość do Towarzysza" />
          <Button variant="primary" icon="send" aria-label="Wyślij" disabled={!!pending || !text.trim()} />
        </form>
      </footer>

      <ProposalSheet open={!!proposal} proposal={proposal} onClose={() => setProposalId(null)} />
    </div>
  );
}

const STATUS_PL = { pending: 'czeka na decyzję', applied: 'zastosowana', rejected: 'odrzucona', reverted: 'cofnięta' } as const;

function Message({ m, onProposal }: { m: MentorMessage; onProposal: (id: string) => void }) {
  const proposals = useStore((s) => s.rows.proposals);
  const books = useStore((s) => s.snap.books);
  return (
    <li className={`msg msg--${m.role}`}>
      <div className="msg__bubble">{m.role === 'assistant' ? <Formatted text={m.content} /> : m.content}</div>
      {m.cards.length > 0 && (
        <div className="msg__cards">
          {m.cards.map((c) => {
            if (c.type === 'action') return <Button key={c.id} size="sm" variant="secondary" onClick={() => runAction(c.id)}>{c.title}</Button>;
            if (c.type === 'lesson') {
              const l = LESSON_BY_KEY[c.id];
              if (!l) return null;
              return (
                <button key={c.id} className="mcard" onClick={() => navigate(`/nauka/${l.path}/${l.key}`)}>
                  <span className="mcard__kind">Lekcja · {l.minutes} min</span>
                  <span className="mcard__title">{l.title}</span>
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
                  <span className="mcard__kind">Książka</span>
                  <span className="mcard__title">{b.title} — {b.author}</span>
                  {c.why && <span className="mcard__why">{c.why}</span>}
                  <Button size="sm" variant="secondary" disabled={owned} onClick={() => {
                    const now = Date.now();
                    putRow('books', bookSchema.parse({ id: newId('bk'), updated_at: now, title: b.title, author: b.author, topic: b.topic, learning_goal: b.learning_goal, pages: b.pages, practice: b.practice, catalog_key: b.key, reason: c.why || b.why, status: 'planned', status_changed_at: now }));
                    toast('Dodano do listy książek.', 'ok');
                  }}>{owned ? 'Na liście' : 'Dodaj do listy'}</Button>
                </div>
              );
            }
            if (c.type === 'proposal') {
              const p = proposals[c.id];
              return (
                <button key={c.id} className={`mcard mcard--proposal${p?.status === 'pending' ? ' is-pending' : ''}`} onClick={() => p && onProposal(c.id)} disabled={!p}>
                  <span className="mcard__kind">Propozycja · {p ? STATUS_PL[p.status] : 'synchronizacja…'}</span>
                  <span className="mcard__title">{c.title ?? p?.title}</span>
                  {p?.status === 'pending' && <span className="mcard__why">{p.changes.length} {p.changes.length === 1 ? 'zmiana' : 'zmiany'} — zobacz i zdecyduj</span>}
                </button>
              );
            }
            return null;
          })}
        </div>
      )}
      {m.role === 'assistant' && m.cards.some((c) => c.type === 'proposal') && <span className="msg__hint"><Icon name="info" size={14} /> Nic się nie zmienia bez „Zastosuj”.</span>}
    </li>
  );
}
