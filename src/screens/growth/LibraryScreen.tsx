import { useMemo, useState } from 'react';
import { bookSchema, type Book, type BookStatus } from '../../../shared/schema';
import { BOOKS, BOOK_BY_KEY, type CatalogBook } from '../../../shared/catalog/books';
import { BOOK_FLOW, BOOK_STATUS_LABEL, suggestDeadline } from '../../../shared/domain/library';
import { artistStage } from '../../../shared/domain/roadmap';
import { categoryStats } from '../../../shared/domain/training';
import { newId, type Snapshot } from '../../../shared/domain/snapshot';
import { useRow, useStore, remove } from '../../data/store';
import { useClock } from '../../data/clock';
import { putRow, startSession } from '../../data/actions';
import { navigate } from '../../app/router';
import { Button, Chip, Confirm, Empty, Field, Row, ScreenHeader, Section, Segmented, Sheet } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { shortDate } from '../../ui/format';
import { toast } from '../../ui/toast';

/** Rule-based "why now": books whose craft matches neglected or priority areas; business books only near releases. */
function recommendBooks(snap: Snapshot, today: string): { book: CatalogBook; why: string }[] {
  const owned = new Set(snap.books.map((b) => b.catalog_key).filter(Boolean));
  const stage = artistStage(snap);
  const focus = new Set(snap.profile?.focus_categories ?? []);
  const stats = categoryStats(snap, today);
  const neglected = new Set(stats.filter((s) => s.daysSince == null || s.daysSince > 14).map((s) => s.category));
  const out: { book: CatalogBook; why: string; score: number }[] = [];
  for (const b of BOOKS) {
    if (owned.has(b.key)) continue;
    let score = 0;
    let why = b.why;
    if (b.kind === 'business') {
      if (stage === 'foundation' || stage === 'catalog') continue;
      score += 3;
      why = `Zbliża się etap wydań. ${b.why}`;
    }
    const hitFocus = b.categories.find((c) => focus.has(c));
    const hitNeglect = b.categories.find((c) => neglected.has(c));
    if (hitFocus) score += 2;
    if (hitNeglect) score += 1;
    if (b.kind === 'craft') score += 0.5;
    if (b.pages <= 200) score += 0.3;
    out.push({ book: b, why, score });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 4);
}

export function LibraryScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const [tab, setTab] = useState<'reading' | 'planned' | 'done'>('reading');
  const [open, setOpen] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogBook | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const recs = useMemo(() => recommendBooks(snap, clock.today), [snap, clock.today]);
  const by = (st: BookStatus[]) => snap.books.filter((b) => st.includes(b.status)).sort((a, b) => (b.status_changed_at ?? b.updated_at) - (a.status_changed_at ?? a.updated_at));
  const list = tab === 'reading' ? by(['reading']) : tab === 'planned' ? by(['planned', 'bought', 'paused']) : by(['read', 'dropped']);

  return (
    <div className="screen">
      <ScreenHeader title="Biblioteka" onBack actions={<Button size="sm" variant="secondary" icon="plus" onClick={() => setCustomOpen(true)}>Dodaj</Button>}
        sub="Czytanie ma pomagać tworzyć muzykę, nie zastępować jej. Bez raportowania stron i bez kar za terminy." />
      <Segmented label="Status" value={tab} onChange={setTab} options={[
        { value: 'reading', label: `Czytam${by(['reading']).length ? ` ${by(['reading']).length}` : ''}` },
        { value: 'planned', label: 'Na później' },
        { value: 'done', label: 'Przeczytane' },
      ]} />
      <div style={{ marginTop: 12 }}>
        {list.length ? (
          <div className="list">
            {list.map((b) => (
              <Row key={b.id} leading={<Icon name="book" />} title={b.title}
                sub={`${b.author}${b.author ? ' · ' : ''}${BOOK_STATUS_LABEL[b.status]}${b.due_date && b.status !== 'read' ? ` · orientacyjnie do ${shortDate(b.due_date)}` : ''}${b.progress != null && b.status === 'reading' ? ` · ${b.progress}%` : ''}`}
                onClick={() => setOpen(b.id)} />
            ))}
          </div>
        ) : (
          <Empty icon="book" title={tab === 'reading' ? 'Nic w trakcie' : tab === 'planned' ? 'Pusta lista' : 'Jeszcze nic'}>
            {tab === 'reading' ? 'Wybierz pozycję z rekomendacji poniżej albo dodaj własną.' : 'Tu trafią książki według statusu.'}
          </Empty>
        )}
      </div>

      <Section title="Dlaczego teraz — rekomendacje">
        <div className="list">
          {recs.map(({ book, why }) => (
            <button key={book.key} className="row row--action" onClick={() => setCatalog(book)}>
              <span className="row__main">
                <span className="row__title">{book.title}</span>
                <span className="row__sub">{book.author} · {why}</span>
              </span>
              <span className="row__trail"><Icon name="plus" size={18} /></span>
            </button>
          ))}
        </div>
        <p className="dim xs" style={{ marginTop: 8 }}>Dobór według Twoich priorytetów i zaniedbanych obszarów. Mentor AI może polecić coś konkretniej w rozmowie.</p>
      </Section>

      {open && <BookSheet id={open} onClose={() => setOpen(null)} />}
      {catalog && <CatalogSheet book={catalog} onClose={() => setCatalog(null)} onAdded={(id) => { setCatalog(null); setOpen(id); }} />}
      <CustomBookSheet open={customOpen} onClose={() => setCustomOpen(false)} onAdded={(id) => { setCustomOpen(false); setOpen(id); }} />
    </div>
  );
}

function CatalogSheet({ book, onClose, onAdded }: { book: CatalogBook; onClose: () => void; onAdded: (id: string) => void }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const dl = suggestDeadline(snap, { pages: book.pages }, clock.today);
  const add = (status: BookStatus) => {
    const now = Date.now();
    const b = bookSchema.parse({
      id: newId('bk'), updated_at: now, title: book.title, author: book.author, topic: book.topic, learning_goal: book.learning_goal,
      status, pages: book.pages, practice: book.practice, catalog_key: book.key, reason: book.why, status_changed_at: now,
      due_date: status === 'reading' ? dl.due : null,
    });
    putRow('books', b);
    toast(`Dodano: ${book.title}.`, 'ok');
    onAdded(b.id);
  };
  return (
    <Sheet open onClose={onClose} title={book.title}
      footer={<><Button variant="secondary" onClick={() => add('planned')}>Na później</Button><Button variant="primary" onClick={() => add('reading')}>Zaczynam czytać</Button></>}>
      <p className="muted small">{book.author} · ok. {book.pages} stron{book.pl ? ' · jest polskie wydanie' : ''}</p>
      <div className="stack"><span className="field__label">Czego uczy</span><p>{book.learning_goal}</p></div>
      <div className="stack"><span className="field__label">Dlaczego teraz</span><p className="small">{book.why}</p></div>
      <div className="stack"><span className="field__label">Ćwiczenie po lekturze</span><p className="small">{book.practice}</p></div>
      <p className="dim xs">Jeśli zaczniesz teraz: termin orientacyjny {shortDate(dl.due)} — {dl.explanation}</p>
    </Sheet>
  );
}

function CustomBookSheet({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [goal, setGoal] = useState('');
  const [pages, setPages] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title="Własna pozycja"
      footer={<Button variant="primary" block disabled={!title.trim()} onClick={() => {
        const now = Date.now();
        const b = bookSchema.parse({ id: newId('bk'), updated_at: now, title: title.trim(), author: author.trim(), learning_goal: goal.trim(), pages: pages ? Number(pages) : null, status: 'planned', status_changed_at: now });
        putRow('books', b);
        setTitle(''); setAuthor(''); setGoal(''); setPages('');
        onAdded(b.id);
      }}>Dodaj</Button>}>
      <Field label="Tytuł"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></Field>
      <Field label="Autor"><input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={200} /></Field>
      <Field label="Czego chcesz się nauczyć"><input className="input" value={goal} onChange={(e) => setGoal(e.target.value)} maxLength={1000} /></Field>
      <Field label="Liczba stron" hint="Opcjonalnie — tylko do zaproponowania terminu."><input className="input" type="number" inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value)} /></Field>
    </Sheet>
  );
}

function BookSheet({ id, onClose }: { id: string; onClose: () => void }) {
  const clock = useClock();
  const b = useRow('books', id);
  const snap = useStore((s) => s.snap);
  const [notes, setNotes] = useState(b?.notes ?? '');
  const [confirmDel, setConfirmDel] = useState(false);
  if (!b) return null;
  const cat = b.catalog_key ? BOOK_BY_KEY[b.catalog_key] : null;
  const save = (patch: Partial<Book>, msg?: string) => { putRow('books', { ...b, ...patch }); if (msg) toast(msg, 'ok'); };
  const setStatus = (st: BookStatus) => {
    const patch: Partial<Book> = { status: st, status_changed_at: Date.now() };
    if (st === 'reading' && !b.due_date) patch.due_date = suggestDeadline(snap, b, clock.today).due;
    if (st === 'read') patch.progress = 100;
    save(patch, st === 'read' ? 'Przeczytana. Czas zamienić ją w praktykę na beacie.' : `Status: ${BOOK_STATUS_LABEL[st]}.`);
  };
  const dl = suggestDeadline(snap, b, clock.today);
  const idx = BOOK_FLOW.indexOf(b.status);
  return (
    <Sheet open onClose={() => { if (notes !== b.notes) save({ notes }); onClose(); }} title={b.title} tall>
      <p className="muted small">{b.author}{b.topic ? ` · ${b.topic}` : ''}</p>
      <div className="stack">
        <span className="field__label">Status</span>
        <div className="book-flow">
          {BOOK_FLOW.map((st, i) => (
            <button key={st} className={`book-flow__step${b.status === st ? ' is-on' : ''}${idx > i ? ' is-past' : ''}`} onClick={() => setStatus(st)}>{BOOK_STATUS_LABEL[st]}</button>
          ))}
        </div>
        <div className="cluster">
          {(['paused', 'dropped'] as const).map((st) => <Chip key={st} on={b.status === st} onClick={() => setStatus(st)}>{BOOK_STATUS_LABEL[st]}</Chip>)}
        </div>
        <span className="field__hint">Etap „Kupiona” można pominąć.</span>
      </div>
      {b.learning_goal && <div className="stack"><span className="field__label">Cel nauki</span><p className="small">{b.learning_goal}</p></div>}
      {b.status !== 'read' && b.status !== 'dropped' && (
        <Field label="Termin orientacyjny" hint={b.due_date ? 'Bez kar za przekroczenie.' : dl.explanation}>
          <div className="inline-add">
            <input className="input" type="date" value={b.due_date ?? ''} onChange={(e) => save({ due_date: e.target.value || null })} />
            {!b.due_date && <Button variant="secondary" onClick={() => save({ due_date: dl.due })}>Proponowany</Button>}
          </div>
        </Field>
      )}
      {b.status === 'reading' && (
        <div className="stack">
          <span className="field__label">Deklarowany postęp (opcjonalnie)</span>
          <div className="cluster">{[25, 50, 75].map((p) => <Chip key={p} on={b.progress === p} onClick={() => save({ progress: b.progress === p ? null : p })}>{p}%</Chip>)}</div>
        </div>
      )}
      {(b.practice || cat) && (
        <div className={`stack${b.status === 'read' ? ' callout callout--violet' : ''}`} style={b.status === 'read' ? { display: 'grid' } : undefined}>
          <span className="field__label">Ćwiczenie po lekturze</span>
          <p className="small">{b.practice || cat?.practice}</p>
          {b.status === 'read' && <Button size="sm" variant="primary" icon="play" onClick={() => { startSession({ exercise_id: 'an-reading-to-beat' }); onClose(); navigate('/sesja'); }}>Z lektury na beat</Button>}
        </div>
      )}
      <Field label="Notatki"><textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== b.notes && save({ notes })} maxLength={8000} /></Field>
      <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirmDel(true)}>Usuń z biblioteki</Button>
      <Confirm open={confirmDel} onClose={() => setConfirmDel(false)} danger title="Usunąć pozycję?" confirmLabel="Usuń" text="Notatki do tej książki też znikną." onConfirm={() => { remove('books', b.id); onClose(); }} />
    </Sheet>
  );
}
