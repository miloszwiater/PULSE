import { useEffect, useMemo, useState } from 'react';
import { BOOKS, BOOK_BY_KEY, CATEGORY_LABEL, SKILL_LABEL, type CatalogBook, type LibraryCategory, type Skill } from '../../../shared/catalog/books';
import type { BookStatus, Proposal } from '../../../shared/schema';
import { BOOK_STATUS_LABEL, bookNudges, deadlineShiftProposal, hoursLabel, libraryCounts, ownedRow, readingHours, recommendBooks, searchCatalog, type BookRecommendation } from '../../../shared/domain/library';
import { useStore } from '../../data/store';
import { navigate, useQuery } from '../../app/router';
import { useClock } from '../../data/clock';
import { Button, Chip, Empty, ScreenHeader, Segmented } from '../../ui/kit';
import { BookCover } from '../../ui/Cover';
import { Icon } from '../../ui/Icon';
import { shortDate } from '../../ui/format';
import { ProposalSheet } from '../plan/ProposalSheet';
import { BookSheet, CatalogSheet, CustomBookSheet } from './BookSheets';

type Tab = 'shelf' | 'rec' | 'catalog';

const GROUPS: { status: BookStatus; title: string }[] = [
  { status: 'reading', title: 'Czytam' },
  { status: 'bought', title: 'Kupione' },
  { status: 'planned', title: 'Chcę przeczytać' },
  { status: 'suggested', title: 'Zaproponowane' },
  { status: 'paused', title: 'Odłożone' },
  { status: 'read', title: 'Ukończone' },
  { status: 'dropped', title: 'Odrzucone' },
];

export function BooksScreen() {
  const snap = useStore((s) => s.snap);
  const clock = useClock();
  const counts = useMemo(() => libraryCounts(snap), [snap]);
  const [tab, setTab] = useState<Tab>(() => (snap.books.length ? 'shelf' : 'rec'));
  const [open, setOpen] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<BookRecommendation | { book: CatalogBook; why: string } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  // Deep link from the Academy or the Companion: /nauka/ksiazki?b=<catalog key>
  const wanted = useQuery().get('b');
  useEffect(() => {
    const cat = wanted ? BOOK_BY_KEY[wanted] : undefined;
    if (!cat) return;
    const own = ownedRow(useStore.getState().snap, cat);
    if (own) setOpen(own.id); else setCatalog({ book: cat, why: cat.why });
    navigate('/nauka/ksiazki', { replace: true });
  }, [wanted]);
  const nudges = useMemo(() => bookNudges(snap, clock.today, clock.nowMs), [snap, clock.today, clock.nowMs]);
  const shelfSize = snap.books.length;

  return (
    <div className="screen learn books">
      <ScreenHeader title="Biblioteka" onBack actions={<Button size="sm" variant="ghost" icon="plus" onClick={() => setCustomOpen(true)}>Własna</Button>} />
      <p className="learn__desc">Książki, które poszerzają obraz, język i wrażliwość — nie tylko wiedzę o muzyce. Nic tu nie obiecuje efektu, a nic nie trzeba raportować.</p>

      {nudges.length > 0 && (
        <button className="notice" onClick={() => setProposal(deadlineShiftProposal(snap, clock, { reason: 'busy', bookId: nudges[0].book.id }))}>
          <Icon name="info" size={20} />
          <span>{nudges[0].text}</span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      <Segmented<Tab> label="Widok" value={tab} onChange={setTab} options={[
        { value: 'shelf', label: `Półka${shelfSize ? ` (${shelfSize})` : ''}` },
        { value: 'rec', label: 'Polecane' },
        { value: 'catalog', label: 'Katalog' },
      ]} />

      {tab === 'shelf' && <Shelf counts={counts} onOpen={setOpen} onGoto={setTab} />}
      {tab === 'rec' && <Recommended onOpen={setCatalog} />}
      {tab === 'catalog' && <Catalog onOpen={(b) => setCatalog({ book: b, why: b.why })} onOpenShelf={setOpen} />}

      {catalog && <CatalogSheet rec={catalog} onClose={() => setCatalog(null)} onAdded={(id) => { setCatalog(null); setOpen(id); }} />}
      {open && <BookSheet id={open} onClose={() => setOpen(null)} onNext={(r) => { setOpen(null); setCatalog(r); }} />}
      <CustomBookSheet open={customOpen} onClose={() => setCustomOpen(false)} onAdded={(id) => { setCustomOpen(false); setOpen(id); }} />
      <ProposalSheet open={!!proposal} proposal={proposal} onClose={() => setProposal(null)} transient={!!proposal && !snap.proposals.some((p) => p.id === proposal.id)} />
    </div>
  );
}

function Shelf({ counts, onOpen, onGoto }: { counts: Record<BookStatus, number>; onOpen: (id: string) => void; onGoto: (t: Tab) => void }) {
  const snap = useStore((s) => s.snap);
  const clock = useClock();
  if (!snap.books.length) {
    return <Empty icon="book" title="Półka jest pusta" action={<Button variant="primary" onClick={() => onGoto('rec')}>Zobacz polecane</Button>}>Dodaj książkę z katalogu albo własną pozycję. Statusy: Zaproponowana, Chcę przeczytać, Kupiona, Czytam, Ukończona, Odrzucona.</Empty>;
  }
  return (
    <>
      {GROUPS.map((g) => {
        const list = snap.books.filter((b) => b.status === g.status);
        if (!list.length) return null;
        return (
          <section key={g.status} className="block" aria-label={g.title}>
            <h2 className="block__title">{g.title} <span className="dim">{counts[g.status]}</span></h2>
            <ul className="shelf">
              {list.map((b) => (
                <li key={b.id}>
                  <button className="shelf__item" onClick={() => onOpen(b.id)}>
                    <BookCover title={b.title} author={b.author} width={56} />
                    <span className="shelf__text">
                      <span className="shelf__title">{b.title}</span>
                      <span className="shelf__by">{b.author}{b.status === 'read' && b.rating ? ` · ${b.rating}/5` : ''}</span>
                      {b.due_date && (b.status === 'reading' || b.status === 'bought' || b.status === 'planned') && <span className="shelf__due">orientacyjnie do {shortDate(b.due_date)}{b.due_date < clock.today ? ' — można przesunąć' : ''}</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

function Recommended({ onOpen }: { onOpen: (r: BookRecommendation) => void }) {
  const snap = useStore((s) => s.snap);
  const [light, setLight] = useState(false);
  const recs = useMemo(() => recommendBooks(snap, { limit: 5, light }), [snap, light]);
  const reading = snap.books.filter((b) => b.status === 'reading').length;
  return (
    <>
      <p className="muted small">Dobór opiera się na tym, co rozwijasz (obraz, metafora, język, emocja bez nazywania, postać), na Twoim profilu i ocenach przeczytanych książek. Co kilka propozycji pojawia się coś z innego obszaru — świadomie.</p>
      {reading >= 2 && <p className="callout"><span>Masz już {reading} książki w trakcie. Nowa może poczekać na półce.</span></p>}
      <div className="cluster"><Chip on={light} onClick={() => setLight(!light)}>Coś lżejszego</Chip></div>
      {recs.length === 0 ? <p className="muted small">Wszystko z katalogu jest już na Twojej półce.</p> : (
        <ul className="shelf">
          {recs.map((r) => (
            <li key={r.book.key}>
              <button className="shelf__item" onClick={() => onOpen(r)}>
                <BookCover title={r.book.title} author={r.book.author} width={56} />
                <span className="shelf__text">
                  <span className="shelf__title">{r.book.title}</span>
                  <span className="shelf__by">{r.book.author} · {CATEGORY_LABEL[r.book.category]} · {hoursLabel(readingHours({ pages: r.book.pages, catalog_key: r.book.key }))}</span>
                  <span className="shelf__why">{r.why}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

const CATEGORIES = Object.keys(CATEGORY_LABEL).filter((c) => BOOKS.some((b) => b.category === c && !b.retired)) as LibraryCategory[];
const SKILLS = (Object.keys(SKILL_LABEL) as Skill[]).filter((s) => BOOKS.some((b) => b.skills.includes(s) && !b.retired));

function Catalog({ onOpen, onOpenShelf }: { onOpen: (b: CatalogBook) => void; onOpenShelf: (id: string) => void }) {
  const snap = useStore((s) => s.snap);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<LibraryCategory | null>(null);
  const [skill, setSkill] = useState<Skill | null>(null);
  const [polishOnly, setPolishOnly] = useState(false);
  const [easy, setEasy] = useState(false);
  const [hideShelf, setHideShelf] = useState(false);
  const total = BOOKS.filter((b) => !b.retired).length;
  const list = useMemo(() => searchCatalog(snap, { query, category, skill, polishOnly, maxDifficulty: easy ? 1 : null, hideShelf }), [snap, query, category, skill, polishOnly, easy, hideShelf]);
  return (
    <>
      <div className="searchbox">
        <Icon name="search" size={18} />
        <input className="input" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tytuł, autor, temat…" aria-label="Szukaj w katalogu" enterKeyHint="search" />
      </div>
      <div className="chipscroll" role="group" aria-label="Kategoria">
        <Chip on={!category} onClick={() => setCategory(null)}>Wszystkie</Chip>
        {CATEGORIES.map((c) => <Chip key={c} on={category === c} onClick={() => setCategory(category === c ? null : c)}>{CATEGORY_LABEL[c]}</Chip>)}
      </div>
      <div className="chipscroll" role="group" aria-label="Umiejętność">
        {SKILLS.map((s) => <Chip key={s} tone="blue" on={skill === s} onClick={() => setSkill(skill === s ? null : s)}>{SKILL_LABEL[s]}</Chip>)}
      </div>
      <div className="cluster">
        <Chip on={polishOnly} onClick={() => setPolishOnly(!polishOnly)}>Po polsku</Chip>
        <Chip on={easy} onClick={() => setEasy(!easy)}>Lekkie</Chip>
        <Chip on={hideShelf} onClick={() => setHideShelf(!hideShelf)}>Ukryj to, co na półce</Chip>
      </div>
      <p className="dim xs" aria-live="polite">{list.length} z {total} pozycji</p>
      {list.length === 0 ? <p className="muted small">Nic nie pasuje. Zmień filtry albo dodaj własną pozycję.</p> : (
        <ul className="shelf">
          {list.map((b) => {
            const own = ownedRow(snap, b);
            return (
              <li key={b.key}>
                <button className="shelf__item" onClick={() => (own ? onOpenShelf(own.id) : onOpen(b))}>
                  <BookCover title={b.title} author={b.author} width={56} />
                  <span className="shelf__text">
                    <span className="shelf__title">{b.title}</span>
                    <span className="shelf__by">{b.author} · {CATEGORY_LABEL[b.category]}</span>
                    <span className="shelf__why">{b.summary}</span>
                    {own && <span className="shelf__due">Na półce: {BOOK_STATUS_LABEL[own.status]}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
