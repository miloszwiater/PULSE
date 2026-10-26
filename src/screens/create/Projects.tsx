import { useRef, useState } from 'react';
import { PROJECT_KINDS, projectSchema, type Project, type ProjectKind, type Song } from '../../../shared/schema';
import { newId } from '../../../shared/domain/snapshot';
import { useShallow } from 'zustand/react/shallow';
import { useRow, useStore, remove, commit } from '../../data/store';
import { moveSong, putRow, saveSong } from '../../data/actions';
import { navigate, useQuery } from '../../app/router';
import { Button, Confirm, Empty, Field, IconButton, ScreenHeader, Segmented, Sheet } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { coverFromFile } from '../../ui/heroPhoto';
import { plural } from '../../ui/format';
import { toast } from '../../ui/toast';

export const KIND_LABEL: Record<ProjectKind, string> = { single: 'Singiel', ep: 'EP', album: 'Album', collection: 'Kolekcja' };

/** Cover: the person's own image, or a typographic sleeve in the project's tone. */
export function Sleeve({ p, size }: { p: Project; size?: number }) {
  return (
    <span className="sleeve" style={{ '--tone': `var(--tone-${p.tone})`, width: size, height: size } as React.CSSProperties}>
      {p.cover_data ? <img src={p.cover_data} alt="" /> : (
        <span className="sleeve__gen" aria-hidden="true">
          <span className="sleeve__grooves" />
          <span className="sleeve__name">{p.title}</span>
        </span>
      )}
    </span>
  );
}

export function ProjectsScreen() {
  const q = useQuery();
  const projects = useStore((s) => s.snap.projects);
  const songs = useStore((s) => s.snap.songs);
  const [showArchived, setShowArchived] = useState(false);
  const [newOpen, setNewOpen] = useState(q.get('new') === '1');
  const list = projects.filter((p) => p.archived === showArchived).sort((a, b) => (b.last_worked_at ?? b.updated_at) - (a.last_worked_at ?? a.updated_at));
  return (
    <div className="screen projects">
      <ScreenHeader title="Projekty" onBack actions={<Button size="sm" variant="secondary" icon="plus" onClick={() => setNewOpen(true)}>Nowy</Button>} />
      <p className="learn__desc">Miejsce na albumy, EP-ki i kolekcje: okładka, kolejność utworów, teksty i notatki. Nie jest potrzebne, żeby tworzyć.</p>
      {list.length ? (
        <ul className="crate">
          {list.map((p) => {
            const n = songs.filter((s) => s.project_id === p.id).length;
            return (
              <li key={p.id}>
                <button className="crate__item" onClick={() => navigate(`/projekty/${p.id}`)}>
                  <span className="crate__art" style={{ '--tone': `var(--tone-${p.tone})` } as React.CSSProperties}><span className="crate__disc" aria-hidden="true" /><Sleeve p={p} /></span>
                  <span className="crate__title">{p.title}</span>
                  <span className="crate__meta">{KIND_LABEL[p.kind]}{n ? `, ${n} ${plural(n, 'utwór', 'utwory', 'utworów')}` : ''}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <Empty icon="folder" title={showArchived ? 'Archiwum jest puste' : 'Jeszcze bez projektów'} action={!showArchived ? <Button variant="primary" icon="plus" onClick={() => setNewOpen(true)}>Utwórz projekt</Button> : undefined}>
          {!showArchived && 'Np. EP z kilkoma utworami nad którymi pracujesz — z tekstami w jednym miejscu.'}
        </Empty>
      )}
      <button className="btn btn--quiet" onClick={() => setShowArchived(!showArchived)}>{showArchived ? 'Pokaż aktywne' : 'Pokaż archiwum'}</button>
      <NewProjectSheet open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

function NewProjectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<ProjectKind>('ep');
  const count = useStore((s) => s.snap.projects.length);
  return (
    <Sheet open={open} onClose={onClose} title="Nowy projekt"
      footer={<Button variant="primary" block disabled={!title.trim()} onClick={() => {
        const p = projectSchema.parse({ id: newId('pj'), updated_at: Date.now(), title: title.trim(), kind, tone: count % 8 });
        putRow('projects', p);
        setTitle('');
        onClose();
        navigate(`/projekty/${p.id}`);
      }}>Utwórz</Button>}>
      <Field label="Nazwa"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} data-autofocus placeholder="Tytuł roboczy" /></Field>
      <Segmented label="Rodzaj" value={kind} onChange={setKind} options={PROJECT_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} />
    </Sheet>
  );
}

export function ProjectScreen({ id }: { id: string }) {
  const p = useRow('projects', id);
  const songs = useStore(useShallow((s) => Object.values(s.rows.songs).filter((x) => x.deleted_at == null && x.project_id === id).sort((a, b) => a.position - b.position)));
  const [notes, setNotes] = useState(p?.notes ?? '');
  const [title, setTitle] = useState(p?.title ?? '');
  const [song, setSong] = useState<Song | 'new' | null>(null);
  const [confirmDel, setConfirmDel] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  if (!p || p.deleted_at != null) return <div className="screen"><ScreenHeader title="Projekt" onBack /><Empty title="Nie ma takiego projektu." /></div>;
  const save = (patch: Partial<Project>) => putRow('projects', { ...p, ...patch });
  return (
    <div className="screen project" style={{ '--tone': `var(--tone-${p.tone})` } as React.CSSProperties}>
      <ScreenHeader title="" onBack={() => navigate('/projekty')} actions={<IconButton icon="trash" label="Usuń projekt" onClick={() => setConfirmDel(true)} />} />
      <div className="project__top">
        <button className="project__cover" onClick={() => file.current?.click()} aria-label="Zmień okładkę">
          <Sleeve p={p} />
          <span className="project__cover-hint"><Icon name="image" size={16} /> Okładka</span>
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          try { save({ cover_data: await coverFromFile(f) }); toast('Okładka zapisana.', 'ok'); } catch { toast('Nie udało się wczytać obrazu.', 'error'); }
          e.target.value = '';
        }} />
        <div className="project__ident">
          <textarea className="project__title" rows={1} ref={(el) => { if (el) { el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; } }} value={title} onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))} onBlur={() => title.trim() && title !== p.title && save({ title: title.trim() })} maxLength={160} aria-label="Nazwa projektu" />
          <div className="cluster">
            {p.cover_data && <button className="btn btn--quiet" onClick={() => save({ cover_data: '' })}>Usuń zdjęcie</button>}
            {!p.cover_data && <button className="btn btn--quiet" onClick={() => save({ tone: (p.tone + 1) % 8 })}>Inny kolor okładki</button>}
          </div>
        </div>
      </div>

      <div className="project__kind"><Segmented label="Rodzaj" value={p.kind} onChange={(k) => save({ kind: k })} options={PROJECT_KINDS.map((k) => ({ value: k, label: KIND_LABEL[k] }))} /></div>

      <section className="block" aria-labelledby="tl-h">
        <div className="block__head">
          <h2 className="block__title" id="tl-h">Utwory</h2>
          <button className="btn btn--quiet" onClick={() => setSong('new')}><Icon name="plus" size={16} /> Dodaj</button>
        </div>
        {songs.length ? (
          <ol className="tracklist">
            {songs.map((s, i) => (
              <li key={s.id} className="track">
                <span className="track__n num">{i + 1}</span>
                <button className="track__main" onClick={() => setSong(s)}>
                  <span className="track__title">{s.title}</span>
                  <span className="track__meta">{s.lyrics ? (() => { const n = s.lyrics.split('\n').filter(Boolean).length; return `${n} ${plural(n, 'wers', 'wersy', 'wersów')} tekstu`; })() : 'bez tekstu'}{s.done ? ' · gotowy' : ''}</span>
                </button>
                <span className="track__order">
                  <IconButton icon="up" label="Wyżej" disabled={i === 0} onClick={() => moveSong(s, -1)} />
                  <IconButton icon="down" label="Niżej" disabled={i === songs.length - 1} onClick={() => moveSong(s, 1)} />
                </span>
              </li>
            ))}
          </ol>
        ) : <p className="muted small">Dodaj utwory, żeby ułożyć kolejność i trzymać teksty w jednym miejscu.</p>}
      </section>

      <div className="block"><Field label="Notatki do projektu">
        <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => notes !== p.notes && save({ notes })} maxLength={8000} placeholder="Koncept, klimat, kolejność, pomysły na okładkę." />
      </Field></div>
      <div className="cluster" style={{ marginTop: 16 }}>
        <Button variant="ghost" onClick={() => { save({ archived: !p.archived }); toast(p.archived ? 'Przywrócono z archiwum.' : 'Przeniesiono do archiwum.', 'ok'); }}>{p.archived ? 'Przywróć z archiwum' : 'Przenieś do archiwum'}</Button>
      </div>

      <SongSheet value={song} projectId={p.id} onClose={() => setSong(null)} />
      <Confirm open={confirmDel} onClose={() => setConfirmDel(false)} danger title="Usunąć projekt?" confirmLabel="Usuń"
        text="Projekt i jego utwory (z tekstami) znikną. Sesje zostają w historii."
        onConfirm={() => {
          commit([{ entity: 'projects', deleteId: p.id }, ...songs.map((s) => ({ entity: 'songs' as const, deleteId: s.id }))]);
          navigate('/projekty', { replace: true });
        }} />
    </div>
  );
}

function SongSheet({ value, projectId, onClose }: { value: Song | 'new' | null; projectId: string; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [lyrics, setLyrics] = useState('');
  const [notes, setNotes] = useState('');
  const [done, setDone] = useState(false);
  const [key, setKey] = useState<unknown>(null);
  if (value !== key) {
    setKey(value);
    const s = value && value !== 'new' ? value : null;
    setTitle(s?.title ?? ''); setLyrics(s?.lyrics ?? ''); setNotes(s?.notes ?? ''); setDone(s?.done ?? false);
  }
  if (!value) return null;
  const existing = value !== 'new' ? value : null;
  const save = () => {
    if (!title.trim()) return;
    saveSong({ ...(existing ?? {}), project_id: projectId, title: title.trim(), lyrics, notes, done });
    onClose();
  };
  return (
    <Sheet open onClose={() => { if (existing && title.trim()) save(); else onClose(); }} title={existing ? existing.title : 'Nowy utwór'} tall
      footer={<>{existing && <IconButton icon="trash" label="Usuń utwór" onClick={() => { remove('songs', existing.id); onClose(); }} />}<Button variant="primary" disabled={!title.trim()} onClick={save}>Zapisz</Button></>}>
      <Field label="Tytuł"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} data-autofocus={!existing || undefined} /></Field>
      <label className="field">
        <span className="field__label">Tekst</span>
        <textarea className="textarea lyrics" value={lyrics} onChange={(e) => setLyrics(e.target.value)} maxLength={20000} placeholder="Tekst zostaje prywatny — Towarzysz AI go nie dostaje." />
      </label>
      <Field label="Notatki"><textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} /></Field>
      <label className="check"><input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} /> Gotowy</label>
    </Sheet>
  );
}
