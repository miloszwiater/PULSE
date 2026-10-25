import { useEffect, useState } from 'react';
import { eventSchema, routineExceptionSchema, SKILL_CATEGORIES, type EventKind, type PEvent } from '../../../shared/schema';
import { newId } from '../../../shared/domain/snapshot';
import { detectConflicts, resolveConflicts } from '../../../shared/domain/planner';
import { CATEGORY_SHORT, EXERCISES, EXERCISE_BY_ID } from '../../../shared/catalog/exercises';
import { hhmm, parseHHMM } from '../../../shared/time';
import type { Block } from '../../../shared/domain/day';
import type { Proposal } from '../../../shared/schema';
import { commit, remove, useRow, useStore } from '../../data/store';
import { clockNow } from '../../data/clock';
import { logManualSession, setEventStatus, startSession } from '../../data/actions';
import { navigate } from '../../app/router';
import { Button, Chip, Field, Sheet, Toggle } from '../../ui/kit';
import { KIND_LABEL, STATUS_LABEL, longDate } from '../../ui/format';
import { toast } from '../../ui/toast';

const EDITABLE_KINDS: EventKind[] = ['music', 'training', 'reading', 'promo', 'work', 'commute', 'private', 'relationship', 'sport', 'rest', 'other'];

export type EventDraft = { id?: string; date: string; start_min: number; end_min: number; kind?: EventKind; title?: string; notes?: string };

/** After any change to obligations, surface the consequences immediately. */
export function useConflictFollowUp() {
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const check = () => {
    const snap = useStore.getState().snap;
    const c = clockNow();
    const conflicts = detectConflicts(snap, c, 14);
    if (conflicts.length) setProposal(resolveConflicts(snap, c, conflicts));
  };
  return { proposal, setProposal, check };
}

export function EventSheet({ draft, onClose, onSaved }: { draft: EventDraft | null; onClose: () => void; onSaved?: (blocking: boolean) => void }) {
  const existing = useRow('events', draft?.id);
  const [form, setForm] = useState<PEvent | null>(null);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  useEffect(() => {
    if (!draft) { setForm(null); return; }
    const base = existing ?? eventSchema.parse({
      id: newId('ev'), updated_at: Date.now(), kind: draft.kind ?? 'music', title: draft.title ?? '', notes: draft.notes ?? '', date: draft.date,
      start_min: draft.start_min, end_min: draft.end_min, source: 'user',
    });
    setForm(base);
    setStart(hhmm(base.start_min));
    setEnd(hhmm(base.end_min));
  }, [draft?.id, draft?.date, draft?.start_min]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!draft || !form) return null;
  const isNew = !existing;
  const set = <K extends keyof PEvent>(k: K, v: PEvent[K]) => setForm({ ...form, [k]: v });
  const s = parseHHMM(start);
  let e = parseHHMM(end);
  if (s != null && e != null && e <= s) e += 1440; // overnight
  const valid = s != null && e != null && e - s >= 5 && e - s <= 1440 && (form.title.trim() || form.kind);
  const commitment = ['music', 'training', 'reading', 'promo'].includes(form.kind);
  const ex = form.exercise_id ? EXERCISE_BY_ID[form.exercise_id] : null;

  const save = () => {
    if (!valid) return;
    const title = form.title.trim() || (ex ? ex.title : KIND_LABEL[form.kind]);
    commit([{ entity: 'events', row: { ...form, title, start_min: s!, end_min: e! } }]);
    toast(isNew ? 'Dodano do planu.' : 'Zapisano zmiany.', 'ok');
    onClose();
    onSaved?.(!commitment);
  };

  const done = () => {
    logManualSession({ date: form.date, startMin: form.start_min, minutes: form.end_min - form.start_min, type: form.kind === 'training' ? 'training' : 'create', outcome: form.exercise_id ? 'exercise' : 'none', note: '', event: form });
    toast('Oznaczono jako zrobione — czas z planu zapisany jako sesja ręczna.', 'ok');
    onClose();
  };

  return (
    <Sheet open onClose={onClose} title={isNew ? 'Nowe w planie' : form.title || KIND_LABEL[form.kind]} tall
      footer={<><Button variant="ghost" onClick={onClose}>Anuluj</Button><Button variant="primary" onClick={save} disabled={!valid}>{isNew ? 'Dodaj' : 'Zapisz'}</Button></>}>
      {!isNew && commitment && form.status === 'planned' && (
        <div className="event-actions">
          <Button variant="primary" icon="play" onClick={() => { startSession({ event: form }); onClose(); navigate('/sesja'); }}>Rozpocznij</Button>
          <Button variant="secondary" icon="check" onClick={done}>Zrobione</Button>
          <Button variant="secondary" onClick={() => { setEventStatus(form, 'skipped', 'Oznaczono jako pominięte.'); onClose(); }}>Pomiń</Button>
          <Button variant="secondary" onClick={() => { setEventStatus(form, 'excused', 'Usprawiedliwione — nie wpływa na regularność.'); onClose(); }}>Usprawiedliw</Button>
        </div>
      )}
      {!isNew && form.status !== 'planned' && (
        <div className="callout">
          <span><strong>{STATUS_LABEL[form.status]}.</strong> {form.status === 'covered' ? 'Pokryte przez sesję spontaniczną — czas liczony raz.' : ''}</span>
          <button className="btn btn--quiet" onClick={() => { setEventStatus(form, 'planned', 'Przywrócono do planu.'); onClose(); }}>Przywróć</button>
        </div>
      )}

      <div className="stack">
        <span className="field__label">Rodzaj</span>
        <div className="cluster">
          {EDITABLE_KINDS.map((k) => (
            <Chip key={k} on={form.kind === k} onClick={() => set('kind', k)}>
              <span className="kind-dot" style={{ '--dot': `var(--k-${k})` } as React.CSSProperties} />{KIND_LABEL[k]}
            </Chip>
          ))}
        </div>
      </div>
      <Field label="Nazwa"><input className="input" value={form.title} onChange={(ev) => set('title', ev.target.value)} placeholder={ex ? ex.title : KIND_LABEL[form.kind]} maxLength={160} /></Field>
      <Field label="Dzień" hint={longDate(form.date)}><input className="input" type="date" value={form.date} onChange={(ev) => ev.target.value && set('date', ev.target.value)} /></Field>
      <div className="field-row">
        <Field label="Od"><input className="input" type="time" value={start} onChange={(ev) => setStart(ev.target.value)} /></Field>
        <Field label="Do" hint={s != null && e != null && e > 1440 ? 'Kończy się następnego dnia.' : undefined}><input className="input" type="time" value={end} onChange={(ev) => setEnd(ev.target.value)} /></Field>
      </div>

      {form.kind === 'training' && (
        <Field label="Ćwiczenie">
          <select className="select" value={form.exercise_id ?? ''} onChange={(ev) => {
            const x = EXERCISE_BY_ID[ev.target.value];
            setForm({ ...form, exercise_id: x?.id ?? null, category: x?.category ?? form.category });
          }}>
            <option value="">Bez konkretnego ćwiczenia</option>
            {SKILL_CATEGORIES.map((c) => (
              <optgroup key={c} label={CATEGORY_SHORT[c]}>
                {EXERCISES.filter((x) => x.category === c).map((x) => <option key={x.id} value={x.id}>{x.title} (poz. {x.level})</option>)}
              </optgroup>
            ))}
          </select>
        </Field>
      )}

      {commitment && (
        <>
          <div className="stack">
            <span className="field__label">Priorytet</span>
            <div className="segmented" role="radiogroup" aria-label="Priorytet">
              {[1, 2, 3].map((p) => (
                <button key={p} role="radio" aria-checked={form.priority === p} className={`segmented__opt${form.priority === p ? ' is-on' : ''}`} onClick={() => set('priority', p)}>
                  {p === 1 ? 'Ważne' : p === 2 ? 'Normalne' : 'Opcjonalne'}
                </button>
              ))}
            </div>
            <span className="field__hint">Przy konfliktach ważne rzeczy są przenoszone, opcjonalne — odpuszczane.</span>
          </div>
        </>
      )}
      {!commitment && (
        <Toggle checked={!form.flexible} onChange={(v) => set('flexible', !v)} label="Stały termin" hint="Planer nigdy go nie przesuwa." />
      )}
      <Field label="Notatki"><textarea className="textarea" value={form.notes} onChange={(ev) => set('notes', ev.target.value)} maxLength={2000} /></Field>
      {!isNew && (
        <Button variant="danger" icon="trash" onClick={() => {
          const prev = { ...form };
          remove('events', form.id);
          toast('Usunięto z planu.', 'ok', { label: 'Cofnij', run: () => commit([{ entity: 'events', row: { ...prev, deleted_at: null, updated_at: Date.now() } }]) });
          onClose();
          onSaved?.(!commitment);
        }}>Usuń z planu</Button>
      )}
    </Sheet>
  );
}

/** A block coming from the fixed schedule (routine). */
export function RoutineBlockSheet({ block, date, onClose, onChanged }: { block: Block | null; date: string; onClose: () => void; onChanged: () => void }) {
  if (!block?.routine_id) return null;
  return (
    <Sheet open onClose={onClose} title={block.title}
      footer={<Button variant="ghost" onClick={onClose}>Zamknij</Button>}>
      <p className="muted small">Stały grafik: {KIND_LABEL[block.kind]}, {hhmm(block.start)}–{hhmm(block.end)}.</p>
      <Button variant="secondary" block onClick={() => {
        commit([{ entity: 'routine_exceptions', row: routineExceptionSchema.parse({ id: `${block.routine_id}_${date}`, updated_at: Date.now(), routine_id: block.routine_id!, date }) }]);
        toast('Ten dzień bez tego bloku. Plan przeliczony.', 'ok');
        onClose();
        onChanged();
      }}>Tylko tego dnia: bez tego bloku</Button>
      <Button variant="ghost" block onClick={() => { onClose(); navigate('/plan?grafik=1'); }}>Edytuj stały grafik</Button>
    </Sheet>
  );
}
