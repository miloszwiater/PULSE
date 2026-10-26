import { useState } from 'react';
import { BOOK_BY_KEY, CATEGORY_LABEL, DIFFICULTY_LABEL, PL_LABEL, SKILL_LABEL, type CatalogBook } from '../../../shared/catalog/books';
import { PATH_BY_KEY } from '../../../shared/catalog/academy';
import { bookSchema, type Book, type BookStatus, type Proposal } from '../../../shared/schema';
import {
  BOOK_FLOW, BOOK_STATUS_LABEL, deadlineShiftProposal, duplicateOf, finishedRow, hoursLabel, matchCatalog, newBookRow, nextBookAfter,
  ownedRow, planReading, readingHours, reflectionFor, statusRow, suggestDeadline, type BookRecommendation,
} from '../../../shared/domain/library';
import { addDays } from '../../../shared/time';
import { newId } from '../../../shared/domain/snapshot';
import { remove, useRow, useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { putRow } from '../../data/actions';
import { Button, Chip, Confirm, Field, Sheet } from '../../ui/kit';
import { BookCover } from '../../ui/Cover';
import { shortDate } from '../../ui/format';
import { toast } from '../../ui/toast';
import { ProposalSheet } from '../plan/ProposalSheet';

/** What is and is not known about an edition — never more certain than the sources. */
export function EditionFacts({ book }: { book: CatalogBook }) {
  const sure = book.pl === 'orig' || book.pl === 'verified';
  return (
    <div className="facts">
      <span className={`src-tag${sure ? ' is-ok' : ''}`}>{PL_LABEL[book.pl]}</span>
      {book.verified ? <span className="src-tag is-ok">autor i tytuł sprawdzone</span> : <span className="src-tag">część danych do sprawdzenia</span>}
      {book.pl_note && <p className="dim xs">{book.pl_note}</p>}
      {book.unverified_note && <p className="dim xs">Niepotwierdzone: {book.unverified_note}</p>}
      <p className="dim xs">Potwierdzano istnienie wydania, nie aktualną dostępność w księgarniach.</p>
    </div>
  );
}

function Meta({ book }: { book: CatalogBook }) {
  return (
    <p className="muted small">
      {book.author}{book.year ? `, ${book.year}` : ''}<br />
      {CATEGORY_LABEL[book.category]} · {DIFFICULTY_LABEL[book.difficulty]}<br />
      Czas czytania: {hoursLabel(readingHours({ pages: book.pages, catalog_key: book.key }))} (szacunek){book.dip ? ' · do czytania fragmentami' : ''}
    </p>
  );
}

function Reflection({ cat, seed }: { cat: CatalogBook | undefined; seed: number }) {
  const r = reflectionFor(cat, seed);
  if (!r) return null;
  return (
    <details className="reflect">
      <summary>Opcjonalna myśl przy czytaniu</summary>
      <p className="small">{r.prompt}</p>
      <p className="dim xs">{r.carry}</p>
    </details>
  );
}

/* ---------- catalog entry ---------- */

export function CatalogSheet({ rec, onClose, onAdded }: { rec: BookRecommendation | { book: CatalogBook; why: string; horizon?: boolean }; onClose: () => void; onAdded: (id: string) => void }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const { book, why } = rec;
  const own = ownedRow(snap, book);
  const dl = suggestDeadline(snap, { pages: book.pages, catalog_key: book.key }, clock.today);
  const add = (status: BookStatus, msg: string) => {
    const b = newBookRow(book, status, why, snap, clock.today, Date.now());
    putRow('books', b);
    toast(msg, 'ok');
    onAdded(b.id);
  };
  return (
    <Sheet open onClose={onClose} title={book.title} tall
      footer={own ? <Button variant="primary" onClick={() => onAdded(own.id)}>Otwórz na półce</Button> : (
        <>
          <Button variant="secondary" onClick={() => add('planned', 'Dodano: Chcę przeczytać.')}>Chcę przeczytać</Button>
          <Button variant="primary" onClick={() => add('reading', 'Miłej lektury.')}>Zaczynam czytać</Button>
        </>
      )}>
      <div className="bookhead"><BookCover title={book.title} author={book.author} width={86} /><Meta book={book} /></div>
      {book.original && book.original !== book.title && <p className="dim xs">Tytuł oryginalny: {book.original}</p>}
      {own && <p className="callout"><span>Ta pozycja jest już na półce: <strong>{BOOK_STATUS_LABEL[own.status]}</strong>.</span></p>}
      <div className="stack"><span className="field__label">O czym</span><p className="small">{book.summary}</p></div>
      <div className="stack"><span className="field__label">Rozwija</span><div className="cluster">{book.skills.map((s) => <span key={s} className="tag">{SKILL_LABEL[s]}</span>)}</div></div>
      <div className="stack"><span className="field__label">Perspektywa</span><p className="small">{book.learning_goal}</p></div>
      <div className="stack"><span className="field__label">Dlaczego dla Ciebie</span><p className="small">{why}</p></div>
      {book.warn && <p className="callout callout--warn"><span>{book.warn}</span></p>}
      {book.paths.length > 0 && <div className="stack"><span className="field__label">Pasuje do ścieżek</span><p className="small">{book.paths.map((p) => PATH_BY_KEY[p].title).join(', ')}</p></div>}
      <EditionFacts book={book} />
      <Reflection cat={book} seed={0} />
      <p className="dim xs">Książka nie obiecuje poprawy warsztatu — poszerza materiał, z którego można czerpać. Przy starcie dziś: orientacyjnie do {shortDate(dl.due)}. {dl.explanation}</p>
      {!own && (
        <div className="cluster">
          <Button size="sm" variant="ghost" onClick={() => add('suggested', 'Zapisano jako zaproponowaną.')}>Zapisz na później</Button>
          <Button size="sm" variant="ghost" onClick={() => add('dropped', 'Nie będzie więcej proponowana.')}>Nie dla mnie</Button>
        </div>
      )}
    </Sheet>
  );
}

/* ---------- finishing: optional feedback ---------- */

const RATING_LABEL = ['', 'wcale', 'słabo', 'średnio', 'dobrze', 'bardzo'];
const CLARITY: { v: NonNullable<Book['clarity']>; label: string }[] = [{ v: 'clear', label: 'Tak' }, { v: 'partly', label: 'W części' }, { v: 'hard', label: 'Trudna' }];
const DIRECTION: { v: NonNullable<Book['direction']>; label: string }[] = [{ v: 'more', label: 'Tak, podobnie' }, { v: 'different', label: 'Raczej coś innego' }, { v: 'unsure', label: 'Nie wiem' }];

/** Three optional questions. "Pomiń" finishes the book without any of them. */
export function FinishSheet({ book, onClose, onDone }: { book: Book; onClose: () => void; onDone: () => void }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const [rating, setRating] = useState<number | null>(book.rating);
  const [clarity, setClarity] = useState<Book['clarity']>(book.clarity);
  const [direction, setDirection] = useState<Book['direction']>(book.direction);
  const finish = (withAnswers: boolean) => {
    putRow('books', withAnswers ? finishedRow(book, { rating, clarity, direction }, Date.now()) : statusRow(snap, book, 'read', clock.today, Date.now()));
    toast('Ukończona.', 'ok');
    onDone();
  };
  return (
    <Sheet open onClose={onClose} title="Ukończona" footer={<><Button variant="ghost" onClick={() => finish(false)}>Pomiń pytania</Button><Button variant="primary" onClick={() => finish(true)}>Zapisz i dalej</Button></>}>
      <p className="muted small">Trzy krótkie pytania — wszystkie opcjonalne. Odpowiedzi wpływają tylko na następne propozycje.</p>
      <div className="stack" role="group" aria-label="Jak bardzo się podobała">
        <span className="field__label">Jak bardzo się podobała?</span>
        <div className="cluster">{[1, 2, 3, 4, 5].map((n) => <Chip key={n} on={rating === n} onClick={() => setRating(rating === n ? null : n)}>{n} · {RATING_LABEL[n]}</Chip>)}</div>
      </div>
      <div className="stack" role="group" aria-label="Czy była zrozumiała">
        <span className="field__label">Czy była zrozumiała?</span>
        <div className="cluster">{CLARITY.map((c) => <Chip key={c.v} on={clarity === c.v} onClick={() => setClarity(clarity === c.v ? null : c.v)}>{c.label}</Chip>)}</div>
      </div>
      <div className="stack" role="group" aria-label="Czy iść w podobnym kierunku">
        <span className="field__label">Iść dalej w podobnym kierunku?</span>
        <div className="cluster">{DIRECTION.map((c) => <Chip key={c.v} on={direction === c.v} onClick={() => setDirection(direction === c.v ? null : c.v)}>{c.label}</Chip>)}</div>
      </div>
    </Sheet>
  );
}

/* ---------- shelf entry ---------- */

export function BookSheet({ id, onClose, onNext }: { id: string; onClose: () => void; onNext: (r: BookRecommendation) => void }) {
  const clock = useClock();
  const b = useRow('books', id);
  const snap = useStore((s) => s.snap);
  const [notes, setNotes] = useState(b?.notes ?? '');
  const [confirmDel, setConfirmDel] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  if (!b) return null;
  const cat = b.catalog_key ? BOOK_BY_KEY[b.catalog_key] : matchCatalog(b.title, b.author);
  const save = (patch: Partial<Book>, msg?: string) => { putRow('books', bookSchema.parse({ ...b, ...patch, updated_at: Date.now() })); if (msg) toast(msg, 'ok'); };
  const setStatus = (st: BookStatus) => {
    if (st === 'read' && b.status !== 'read') { setFinishing(true); return; }
    putRow('books', statusRow(snap, b, st, clock.today, Date.now()));
    toast(`Status: ${BOOK_STATUS_LABEL[st]}.`, 'ok');
  };
  const dl = suggestDeadline(snap, b, clock.today);
  const idx = BOOK_FLOW.indexOf(b.status);
  const next = b.status === 'read' ? nextBookAfter(snap, b) : null;
  const open = b.status !== 'read' && b.status !== 'dropped';
  const move = (days: number) => save({ due_date: addDays(b.due_date && b.due_date >= clock.today ? b.due_date : clock.today, days) }, 'Termin przesunięty.');
  return (
    <>
    <Sheet open onClose={() => { if (finishing || proposal) return; if (notes !== b.notes) save({ notes }); onClose(); }} title={b.title} tall>
      <div className="bookhead">
        <BookCover title={b.title} author={b.author} width={86} />
        {cat ? <Meta book={cat} /> : <p className="muted small">{b.author}{b.topic ? <><br />{b.topic}</> : null}{b.pages ? <><br />Czas czytania: {hoursLabel(readingHours(b))} (szacunek)</> : null}</p>}
      </div>
      <div className="stack">
        <span className="field__label">Status</span>
        <div className="book-flow" role="group" aria-label="Status książki">
          {(['planned', 'bought', 'reading', 'read'] as const).map((st) => (
            <button key={st} className={`book-flow__step${b.status === st ? ' is-on' : ''}${idx > BOOK_FLOW.indexOf(st) ? ' is-past' : ''}`} aria-pressed={b.status === st} onClick={() => setStatus(st)}>{BOOK_STATUS_LABEL[st]}</button>
          ))}
        </div>
        <div className="cluster">
          {(['suggested', 'paused', 'dropped'] as const).map((st) => <Chip key={st} on={b.status === st} onClick={() => setStatus(st)}>{BOOK_STATUS_LABEL[st]}</Chip>)}
        </div>
      </div>

      {b.status === 'read' && (
        <div className="stack">
          <span className="field__label">Twoja ocena</span>
          <p className="small">
            {b.rating ? `${b.rating}/5 · ${RATING_LABEL[b.rating]}` : 'bez oceny'}
            {b.clarity ? ` · ${CLARITY.find((c) => c.v === b.clarity)?.label.toLowerCase()}` : ''}
            {b.direction ? ` · ${DIRECTION.find((c) => c.v === b.direction)?.label.toLowerCase()}` : ''}
          </p>
          <Button size="sm" variant="ghost" onClick={() => setFinishing(true)}>Zmień odpowiedzi</Button>
        </div>
      )}
      {next && (
        <div className="callout callout--violet" style={{ display: 'grid', gap: 8 }}>
          <span><strong>Co dalej?</strong> {next.book.title} — {next.book.author}</span>
          <span className="small">{next.why}</span>
          <Button size="sm" variant="secondary" onClick={() => onNext(next)}>Zobacz</Button>
        </div>
      )}

      {open && (
        <Field label="Termin orientacyjny" hint={b.due_date ? 'Elastyczny — bez kar za przekroczenie.' : dl.explanation}>
          <div className="inline-add">
            <input className="input" type="date" value={b.due_date ?? ''} onChange={(e) => save({ due_date: e.target.value || null })} />
            {!b.due_date ? <Button variant="secondary" onClick={() => save({ due_date: dl.due })}>Proponowany</Button> : <Button variant="ghost" onClick={() => save({ due_date: null })}>Bez terminu</Button>}
          </div>
          {b.due_date && (
            <div className="cluster" style={{ marginTop: 8 }}>
              <Button size="sm" variant="ghost" onClick={() => move(7)}>+ tydzień</Button>
              <Button size="sm" variant="ghost" onClick={() => move(14)}>+ 2 tygodnie</Button>
              <Button size="sm" variant="ghost" onClick={() => save({ due_date: dl.due }, 'Termin dopasowany do grafiku.')}>Wg grafiku</Button>
            </div>
          )}
        </Field>
      )}
      {(b.status === 'reading' || b.status === 'bought' || b.status === 'planned') && (
        <div className="cluster">
          <Button size="sm" variant="secondary" icon="calendar" onClick={() => setProposal(planReading(snap, clock, b))}>Zaplanuj czytanie</Button>
          {b.status === 'reading' && <Button size="sm" variant="ghost" onClick={() => setProposal(deadlineShiftProposal(snap, clock, { bookId: b.id, reason: 'busy' }))}>Brak czasu — przesuń</Button>}
        </div>
      )}

      {cat && <div className="stack"><span className="field__label">O czym</span><p className="small">{cat.summary}</p></div>}
      {(b.learning_goal || cat) && <div className="stack"><span className="field__label">Perspektywa</span><p className="small">{cat?.learning_goal ?? b.learning_goal}</p></div>}
      {b.reason && <div className="stack"><span className="field__label">Dlaczego ją dodano</span><p className="small">{b.reason}</p></div>}
      {cat?.warn && <p className="callout callout--warn"><span>{cat.warn}</span></p>}
      {cat && b.status === 'reading' && <Reflection cat={cat} seed={b.started_at ? Math.floor(b.started_at / 86400000) : 0} />}
      {cat && <EditionFacts book={cat} />}
      <Field label="Notatki"><textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== b.notes && save({ notes })} maxLength={8000} /></Field>
      <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirmDel(true)}>Usuń z półki</Button>
      <Confirm open={confirmDel} onClose={() => setConfirmDel(false)} danger title="Usunąć pozycję?" confirmLabel="Usuń" text="Notatki do tej książki też znikną. Zniknie też informacja o odrzuceniu — pozycja może wrócić do propozycji." onConfirm={() => { remove('books', b.id); onClose(); }} />
    </Sheet>
    {finishing && <FinishSheet book={b} onClose={() => setFinishing(false)} onDone={() => setFinishing(false)} />}
    <ProposalSheet open={!!proposal} proposal={proposal} onClose={() => setProposal(null)} transient={!!proposal && !snap.proposals.some((p) => p.id === proposal.id)} />
    </>
  );
}

/* ---------- own entry ---------- */

export function CustomBookSheet({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: string) => void }) {
  const snap = useStore((s) => s.snap);
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [pages, setPages] = useState('');
  const dup = title.trim() ? duplicateOf(snap, title, author) : undefined;
  const cat = title.trim() ? matchCatalog(title, author) : undefined;
  const reset = () => { setTitle(''); setAuthor(''); setPages(''); };
  return (
    <Sheet open={open} onClose={onClose} title="Własna pozycja"
      footer={dup
        ? <Button variant="primary" block onClick={() => { const id = dup.id; reset(); onAdded(id); }}>Otwórz istniejącą</Button>
        : <Button variant="primary" block disabled={!title.trim()} onClick={() => {
          const now = Date.now();
          const b = bookSchema.parse({
            id: newId('bk'), updated_at: now, title: (cat?.title ?? title.trim()), author: (cat?.author ?? author.trim()),
            pages: pages ? Math.min(5000, Math.max(0, Number(pages))) : (cat?.pages ?? null),
            topic: cat?.topic ?? '', learning_goal: cat?.learning_goal ?? '', catalog_key: cat?.key ?? null,
            status: 'planned', status_changed_at: now,
          });
          putRow('books', b);
          reset();
          onAdded(b.id);
        }}>Dodaj</Button>}>
      <Field label="Tytuł"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></Field>
      <Field label="Autor"><input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={200} /></Field>
      <Field label="Liczba stron" hint="Opcjonalnie — tylko do oszacowania czasu i terminu."><input className="input" type="number" inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value)} /></Field>
      {dup && <p className="callout callout--warn"><span>Ta pozycja już jest na półce ({BOOK_STATUS_LABEL[dup.status]}) — nie dodaję drugiej.</span></p>}
      {!dup && cat && <p className="callout"><span>To pozycja z katalogu — dołączę jej opis i dane.</span></p>}
    </Sheet>
  );
}
