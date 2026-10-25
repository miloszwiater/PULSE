import { useMemo, useState } from 'react';
import { BOOK_BY_KEY, type CatalogBook } from '../../../shared/catalog/books';
import { PATH_BY_KEY } from '../../../shared/catalog/academy';
import { bookSchema, type Book, type BookStatus } from '../../../shared/schema';
import { BOOK_FLOW, BOOK_STATUS_LABEL, suggestDeadline } from '../../../shared/domain/library';
import { nextBookAfter, recommendBooks } from '../../../shared/domain/academy';
import { newId } from '../../../shared/domain/snapshot';
import { useRow, useStore, remove } from '../../data/store';
import { useClock } from '../../data/clock';
import { putRow } from '../../data/actions';
import { Button, Chip, Confirm, Field, ScreenHeader, Sheet } from '../../ui/kit';
import { BookCover } from '../../ui/Cover';
import { shortDate } from '../../ui/format';
import { toast } from '../../ui/toast';

const GROUPS: { status: BookStatus; title: string }[] = [
  { status: 'reading', title: 'W trakcie czytania' },
  { status: 'bought', title: 'Kupione' },
  { status: 'planned', title: 'Polecone, na liście' },
  { status: 'paused', title: 'Odłożone' },
  { status: 'read', title: 'Ukończone' },
];

export function BooksScreen() {
  const snap = useStore((s) => s.snap);
  const clock = useClock();
  const recs = useMemo(() => recommendBooks(snap, 4), [snap]);
  const [open, setOpen] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<{ book: CatalogBook; why: string } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const books = snap.books;
  return (
    <div className="screen learn books">
      <ScreenHeader title="Książki" onBack actions={<Button size="sm" variant="ghost" icon="plus" onClick={() => setCustomOpen(true)}>Własna</Button>} />
      <p className="learn__desc">Polecona → Kupiona → W trakcie czytania → Ukończona. Termin jest orientacyjny i zawsze można go przesunąć.</p>

      {GROUPS.map((g) => {
        const list = books.filter((b) => b.status === g.status);
        if (!list.length) return null;
        return (
          <section key={g.status} className="block" aria-label={g.title}>
            <h2 className="block__title">{g.title}</h2>
            <ul className="shelf">
              {list.map((b) => (
                <li key={b.id}>
                  <button className="shelf__item" onClick={() => setOpen(b.id)}>
                    <BookCover title={b.title} author={b.author} width={56} />
                    <span className="shelf__text">
                      <span className="shelf__title">{b.title}</span>
                      <span className="shelf__by">{b.author}</span>
                      {b.due_date && b.status !== 'read' && <span className="shelf__due">orientacyjnie do {shortDate(b.due_date)}{b.due_date < clock.today ? ' — można przesunąć' : ''}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}

      <section className="block" aria-labelledby="rec-h">
        <h2 className="block__title" id="rec-h">Polecane teraz</h2>
        {!books.length && <p className="muted small">Rekomendacje opierają się na ścieżkach, które masz w toku. Bez rozpoczętej ścieżki — na kierunku Twojej muzyki.</p>}
        <ul className="shelf">
          {recs.map((r) => (
            <li key={r.book.key}>
              <button className="shelf__item" onClick={() => setCatalog(r)}>
                <BookCover title={r.book.title} author={r.book.author} width={56} />
                <span className="shelf__text">
                  <span className="shelf__title">{r.book.title}</span>
                  <span className="shelf__by">{r.book.author}{r.book.pl ? ' · jest po polsku' : ''}</span>
                  <span className="shelf__why">{r.why}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {catalog && <CatalogSheet rec={catalog} onClose={() => setCatalog(null)} onAdded={(id) => { setCatalog(null); setOpen(id); }} />}
      {open && <BookSheet id={open} onClose={() => setOpen(null)} onNext={(r) => { setOpen(null); setCatalog(r); }} />}
      <CustomBookSheet open={customOpen} onClose={() => setCustomOpen(false)} onAdded={(id) => { setCustomOpen(false); setOpen(id); }} />
    </div>
  );
}

function addFromCatalog(book: CatalogBook, status: BookStatus, due: string | null, why: string): Book {
  const now = Date.now();
  const b = bookSchema.parse({
    id: newId('bk'), updated_at: now, title: book.title, author: book.author, topic: book.topic, learning_goal: book.learning_goal,
    status, pages: book.pages, practice: book.practice, catalog_key: book.key, reason: why, status_changed_at: now, due_date: due,
  });
  putRow('books', b);
  return b;
}

function CatalogSheet({ rec, onClose, onAdded }: { rec: { book: CatalogBook; why: string }; onClose: () => void; onAdded: (id: string) => void }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const { book, why } = rec;
  const dl = suggestDeadline(snap, { pages: book.pages }, clock.today);
  return (
    <Sheet open onClose={onClose} title={book.title}
      footer={<><Button variant="secondary" onClick={() => { const b = addFromCatalog(book, 'planned', null, why); toast('Dodano do listy.', 'ok'); onAdded(b.id); }}>Na listę</Button><Button variant="primary" onClick={() => { const b = addFromCatalog(book, 'reading', dl.due, why); toast('Miłej lektury.', 'ok'); onAdded(b.id); }}>Zaczynam czytać</Button></>}>
      <div className="bookhead"><BookCover title={book.title} author={book.author} width={86} /><p className="muted small">{book.author}<br />ok. {book.pages} stron{book.pl ? <><br />jest polskie wydanie</> : null}{!book.verified ? <><br /><span className="src-tag">dane wydania do sprawdzenia</span></> : null}</p></div>
      <div className="stack"><span className="field__label">Czego uczy</span><p>{book.learning_goal}</p></div>
      <div className="stack"><span className="field__label">Dlaczego teraz</span><p className="small">{why}</p></div>
      {book.paths.length > 0 && <div className="stack"><span className="field__label">Pasuje do ścieżek</span><p className="small">{book.paths.map((p) => PATH_BY_KEY[p].title).join(', ')}</p></div>}
      <div className="stack"><span className="field__label">Jak łączy się z praktyką</span><p className="small">{book.practice}</p></div>
      <p className="dim xs">Jeśli zaczniesz teraz: orientacyjnie do {shortDate(dl.due)} — {dl.explanation}</p>
    </Sheet>
  );
}

function CustomBookSheet({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: string) => void }) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [pages, setPages] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title="Własna pozycja"
      footer={<Button variant="primary" block disabled={!title.trim()} onClick={() => {
        const now = Date.now();
        const b = bookSchema.parse({ id: newId('bk'), updated_at: now, title: title.trim(), author: author.trim(), pages: pages ? Math.min(5000, Number(pages)) : null, status: 'planned', status_changed_at: now });
        putRow('books', b);
        setTitle(''); setAuthor(''); setPages('');
        onAdded(b.id);
      }}>Dodaj</Button>}>
      <Field label="Tytuł"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></Field>
      <Field label="Autor"><input className="input" value={author} onChange={(e) => setAuthor(e.target.value)} maxLength={200} /></Field>
      <Field label="Liczba stron" hint="Opcjonalnie — tylko do zaproponowania terminu."><input className="input" type="number" inputMode="numeric" value={pages} onChange={(e) => setPages(e.target.value)} /></Field>
    </Sheet>
  );
}

function BookSheet({ id, onClose, onNext }: { id: string; onClose: () => void; onNext: (r: { book: CatalogBook; why: string }) => void }) {
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
    save(patch, `Status: ${BOOK_STATUS_LABEL[st]}.`);
  };
  const dl = suggestDeadline(snap, b, clock.today);
  const idx = BOOK_FLOW.indexOf(b.status);
  const next = b.status === 'read' ? nextBookAfter(snap, b.catalog_key) : null;
  return (
    <Sheet open onClose={() => { if (notes !== b.notes) save({ notes }); onClose(); }} title={b.title} tall>
      <div className="bookhead"><BookCover title={b.title} author={b.author} width={86} /><p className="muted small">{b.author}{b.topic ? <><br />{b.topic}</> : null}</p></div>
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
      </div>
      {next && (
        <div className="callout callout--violet" style={{ display: 'grid', gap: 8 }}>
          <span><strong>Co dalej?</strong> {next.book.title} — {next.book.author}</span>
          <span className="small">{next.why}</span>
          <Button size="sm" variant="secondary" onClick={() => onNext(next)}>Zobacz</Button>
        </div>
      )}
      {b.status !== 'read' && b.status !== 'dropped' && (
        <Field label="Termin orientacyjny" hint={b.due_date ? 'Elastyczny — bez kar za przekroczenie.' : dl.explanation}>
          <div className="inline-add">
            <input className="input" type="date" value={b.due_date ?? ''} onChange={(e) => save({ due_date: e.target.value || null })} />
            {!b.due_date ? <Button variant="secondary" onClick={() => save({ due_date: dl.due })}>Proponowany</Button> : <Button variant="ghost" onClick={() => save({ due_date: null })}>Bez terminu</Button>}
          </div>
        </Field>
      )}
      {(b.learning_goal || cat) && <div className="stack"><span className="field__label">Czego uczy</span><p className="small">{b.learning_goal || cat?.learning_goal}</p></div>}
      <Field label="Notatki"><textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== b.notes && save({ notes })} maxLength={8000} /></Field>
      <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirmDel(true)}>Usuń z listy</Button>
      <Confirm open={confirmDel} onClose={() => setConfirmDel(false)} danger title="Usunąć pozycję?" confirmLabel="Usuń" text="Notatki do tej książki też znikną." onConfirm={() => { remove('books', b.id); onClose(); }} />
    </Sheet>
  );
}
