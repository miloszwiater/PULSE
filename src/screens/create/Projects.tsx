import { useEffect, useState } from 'react';
import { PROJECT_STAGES, projectSchema, type Project, type ProjectStage } from '../../../shared/schema';
import { newId } from '../../../shared/domain/snapshot';
import { countsAsSession, sessionDate } from '../../../shared/domain/sessions';
import { durationLabel } from '../../../shared/time';
import { useShallow } from 'zustand/react/shallow';
import { useRow, useStore, remove } from '../../data/store';
import { useClock } from '../../data/clock';
import { putRow, startSession } from '../../data/actions';
import { navigate, useQuery } from '../../app/router';
import { Button, Confirm, Empty, Field, Row, ScreenHeader, Section, Segmented, Sheet } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { dayLabel, OUTCOME_LABEL, STAGE_LABEL } from '../../ui/format';
import { toast } from '../../ui/toast';

export function ProjectsScreen() {
  const q = useQuery();
  const clock = useClock();
  const projects = useStore((s) => s.snap.projects);
  const [filter, setFilter] = useState<'active' | 'released' | 'archived'>('active');
  const [newOpen, setNewOpen] = useState(q.get('new') === '1');
  const list = projects
    .filter((p) => (filter === 'archived' ? p.archived : !p.archived && (filter === 'released' ? p.stage === 'released' : p.stage !== 'released')))
    .sort((a, b) => (b.last_worked_at ?? b.updated_at) - (a.last_worked_at ?? a.updated_at));
  return (
    <div className="screen">
      <ScreenHeader title="Projekty" onBack actions={<Button size="sm" variant="secondary" icon="plus" onClick={() => setNewOpen(true)}>Nowy</Button>} />
      <Segmented label="Filtr projektów" value={filter} onChange={setFilter} options={[{ value: 'active', label: 'W pracy' }, { value: 'released', label: 'Wydane' }, { value: 'archived', label: 'Archiwum' }]} />
      <div style={{ marginTop: 16 }}>
        {list.length ? (
          <div className="list">
            {list.map((p) => (
              <Row key={p.id} leading={<StageMark stage={p.stage} />} title={p.title}
                sub={`${STAGE_LABEL[p.stage]}${p.working_title && p.working_title !== p.title ? ` · „${p.working_title}”` : ''}${p.last_worked_at ? ` · ${dayLabel(new Date(p.last_worked_at).toISOString().slice(0, 10), clock.today).toLowerCase()}` : ''}`}
                onClick={() => navigate(`/projekty/${p.id}`)} />
            ))}
          </div>
        ) : (
          <Empty icon="folder" title={filter === 'active' ? 'Nic w pracy' : 'Pusto'}>
            {filter === 'active' ? 'Dodaj utwór, nad którym pracujesz — nawet jeśli to tylko pomysł.' : 'Tu pojawią się projekty z tym statusem.'}
          </Empty>
        )}
      </div>
      <NewProjectSheet open={newOpen} onClose={() => setNewOpen(false)} />
    </div>
  );
}

export function StageMark({ stage }: { stage: ProjectStage }) {
  const i = PROJECT_STAGES.indexOf(stage);
  return (
    <span className="stage-mark" aria-hidden="true">
      {PROJECT_STAGES.map((s, j) => <span key={s} className={j <= i ? 'is-on' : ''} />)}
    </span>
  );
}

function NewProjectSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [stage, setStage] = useState<ProjectStage>('idea');
  return (
    <Sheet open={open} onClose={onClose} title="Nowy projekt"
      footer={<Button variant="primary" block disabled={!title.trim()} onClick={() => {
        const p = projectSchema.parse({ id: newId('pj'), updated_at: Date.now(), title: title.trim(), working_title: title.trim(), stage });
        putRow('projects', p);
        setTitle('');
        onClose();
        navigate(`/projekty/${p.id}`);
      }}>Utwórz</Button>}>
      <Field label="Tytuł lub robocza nazwa"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} data-autofocus /></Field>
      <Field label="Etap">
        <select className="select" value={stage} onChange={(e) => setStage(e.target.value as ProjectStage)}>
          {PROJECT_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
        </select>
      </Field>
    </Sheet>
  );
}

export function ProjectScreen({ id }: { id: string }) {
  const p = useRow('projects', id);
  const clock = useClock();
  const tz = useStore((s) => s.snap.profile?.timezone ?? 'Europe/Warsaw');
  const sessions = useStore(useShallow((s) => s.snap.sessions.filter((x) => x.project_id === id && countsAsSession(x))));
  const [draft, setDraft] = useState<Project | null>(p ?? null);
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => { if (p && (!draft || draft.id !== p.id)) setDraft(p); }, [p]); // eslint-disable-line react-hooks/exhaustive-deps

  // Autosave edits (debounced) — no save button to forget.
  useEffect(() => {
    if (!draft || !p) return;
    const changed = (['title', 'working_title', 'description', 'stage', 'notes', 'inspirations', 'link', 'release_date', 'archived'] as const).some((k) => draft[k] !== p[k]);
    if (!changed) return;
    const t = setTimeout(() => putRow('projects', { ...p, ...draft, updated_at: Date.now() }), 600);
    return () => clearTimeout(t);
  }, [draft, p]);

  if (!p || p.deleted_at != null || !draft) {
    return <div className="screen"><ScreenHeader title="Projekt" onBack /><Empty icon="folder" title="Nie ma takiego projektu" /></div>;
  }
  const set = <K extends keyof Project>(k: K, v: Project[K]) => setDraft({ ...draft, [k]: v });
  const minutes = Math.round(sessions.reduce((t, s) => t + s.active_seconds, 0) / 60);
  const validLink = !draft.link || /^https?:\/\//i.test(draft.link);

  return (
    <div className="screen">
      <ScreenHeader title={draft.title || 'Bez tytułu'} onBack sub={`${sessions.length} sesji · ${durationLabel(minutes)}`} />
      <Button variant="primary" block icon="play" onClick={() => { startSession({ project_id: p.id, title: `Praca nad: ${p.title}`, type: 'create' }); navigate('/sesja'); }}>Sesja nad tym utworem</Button>

      <Section title="Etap">
        <div className="stage-picker" role="radiogroup" aria-label="Etap projektu">
          {PROJECT_STAGES.map((s) => (
            <button key={s} role="radio" aria-checked={draft.stage === s} className={`stage-picker__opt${draft.stage === s ? ' is-on' : ''}${PROJECT_STAGES.indexOf(s) < PROJECT_STAGES.indexOf(draft.stage) ? ' is-past' : ''}`} onClick={() => set('stage', s)}>
              {STAGE_LABEL[s]}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Karta utworu">
        <div className="stack">
          <Field label="Tytuł"><input className="input" value={draft.title} onChange={(e) => set('title', e.target.value)} maxLength={160} /></Field>
          <Field label="Robocza nazwa"><input className="input" value={draft.working_title} onChange={(e) => set('working_title', e.target.value)} maxLength={160} /></Field>
          <Field label="O czym jest"><textarea className="textarea" value={draft.description} onChange={(e) => set('description', e.target.value)} maxLength={2000} /></Field>
          <Field label="Inspiracje" hint="Techniki i nastroje, nie kopiowanie."><textarea className="textarea" value={draft.inspirations} onChange={(e) => set('inspirations', e.target.value)} maxLength={2000} /></Field>
          <Field label="Notatki"><textarea className="textarea" value={draft.notes} onChange={(e) => set('notes', e.target.value)} maxLength={8000} style={{ minHeight: 140 }} /></Field>
          <Field label="Link do pliku (poza aplikacją)" error={validLink ? null : 'Link musi zaczynać się od http:// lub https://'} hint="Np. Dysk, Dropbox, SoundCloud prywatnie.">
            <input className="input" type="url" inputMode="url" value={draft.link} onChange={(e) => set('link', e.target.value)} maxLength={500} />
          </Field>
          {draft.link && validLink && <a href={draft.link} target="_blank" rel="noreferrer noopener" className="small"><Icon name="link" size={14} /> Otwórz plik</a>}
          <Field label="Planowana premiera" hint="Ustawienie daty pozwala przygotować plan premiery w Karierze.">
            <input className="input" type="date" value={draft.release_date ?? ''} onChange={(e) => set('release_date', e.target.value || null)} />
          </Field>
        </div>
      </Section>

      <Section title="Sesje">
        {sessions.length ? (
          <div className="list">
            {sessions.sort((a, b) => b.started_at - a.started_at).map((s) => (
              <Row key={s.id} title={`${dayLabel(sessionDate(s, tz), clock.today)} · ${durationLabel(s.active_seconds / 60)}`} sub={`${OUTCOME_LABEL[s.outcome]}${s.outcome_note ? ` — ${s.outcome_note}` : ''}`} trailing={null} />
            ))}
          </div>
        ) : <p className="muted small">Jeszcze bez sesji. Powiąż sesję z projektem w trakcie pracy.</p>}
      </Section>

      <Section title="Porządki">
        <div className="cluster">
          <Button variant="secondary" size="sm" onClick={() => { set('archived', !draft.archived); toast(draft.archived ? 'Przywrócono z archiwum.' : 'Przeniesiono do archiwum.', 'ok'); }}>{draft.archived ? 'Przywróć' : 'Archiwizuj'}</Button>
          <Button variant="danger" size="sm" icon="trash" onClick={() => setConfirmDel(true)}>Usuń</Button>
        </div>
      </Section>
      <Confirm open={confirmDel} onClose={() => setConfirmDel(false)} danger title="Usunąć projekt?" confirmLabel="Usuń"
        text="Sesje powiązane z projektem zostaną zachowane w statystykach. Archiwizacja jest bezpieczniejsza."
        onConfirm={() => { remove('projects', p.id); navigate('/projekty', { replace: true }); }} />
    </div>
  );
}
