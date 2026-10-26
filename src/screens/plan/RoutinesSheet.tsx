import { useState } from 'react';
import { routineSchema, type EventKind, type Routine } from '../../../shared/schema';
import { newId } from '../../../shared/domain/snapshot';
import { hhmm, parseHHMM } from '../../../shared/time';
import { commit, remove, useStore } from '../../data/store';
import { Button, Chip, Field, Row, Sheet } from '../../ui/kit';
import { KIND_LABEL, WD_SHORT } from '../../ui/format';
import { useShallow } from 'zustand/react/shallow';

const KINDS: EventKind[] = ['work', 'commute', 'sport', 'relationship', 'private', 'rest', 'other'];

export function RoutinesSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const routines = useStore(useShallow((s) => s.snap.routines));
  const [edit, setEdit] = useState<Routine | null>(null);
  return (
    <>
      <Sheet open={open && !edit} onClose={onClose} title="Stały grafik"
        footer={<Button variant="primary" block icon="plus" onClick={() => setEdit(routineSchema.parse({ id: newId('rt'), updated_at: Date.now(), kind: 'work', title: 'Praca', weekdays: [0, 1, 2, 3, 4], start_min: 480, end_min: 960 }))}>Dodaj blok</Button>}>
        <p className="muted small">Powtarzające się obowiązki: praca, dojazdy, trening, stałe spotkania. Zmienny grafik dodawaj w Planie jako pojedyncze zmiany.</p>
        {routines.length ? (
          <div className="list">
            {routines.sort((a, b) => a.start_min - b.start_min).map((r) => (
              <Row key={r.id} leading={<span className="kind-dot" style={{ '--dot': `var(--k-${r.kind})` } as React.CSSProperties} />}
                title={r.title} sub={<span className="num">{r.weekdays.map((d) => WD_SHORT[d]).join(' ')} · {hhmm(r.start_min)}–{hhmm(r.end_min)}{r.active ? '' : ' · wyłączone'}</span>}
                onClick={() => setEdit(r)} />
            ))}
          </div>
        ) : <p className="muted small">Brak stałych bloków.</p>}
      </Sheet>
      {edit && <RoutineEditor routine={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

function RoutineEditor({ routine, onClose }: { routine: Routine; onClose: () => void }) {
  const exists = useStore((s) => !!s.rows.routines[routine.id]);
  const [r, setR] = useState(routine);
  const [start, setStart] = useState(hhmm(routine.start_min));
  const [end, setEnd] = useState(hhmm(routine.end_min));
  const s = parseHHMM(start);
  let e = parseHHMM(end);
  if (s != null && e != null && e <= s) e += 1440;
  const valid = s != null && e != null && r.weekdays.length > 0 && r.title.trim();
  return (
    <Sheet open onClose={onClose} title={exists ? 'Edytuj blok' : 'Nowy blok'} tall
      footer={<>
        {exists && <Button variant="danger" icon="trash" onClick={() => { remove('routines', r.id); onClose(); }} aria-label="Usuń" />}
        <Button variant="primary" disabled={!valid} onClick={() => { commit([{ entity: 'routines', row: { ...r, title: r.title.trim(), start_min: s!, end_min: e! } }]); onClose(); }}>Zapisz</Button>
      </>}>
      <div className="cluster">{KINDS.map((k) => <Chip key={k} on={r.kind === k} onClick={() => setR({ ...r, kind: k, title: r.title === KIND_LABEL[r.kind] || !r.title ? KIND_LABEL[k] : r.title })}>{KIND_LABEL[k]}</Chip>)}</div>
      <Field label="Nazwa"><input className="input" value={r.title} onChange={(ev) => setR({ ...r, title: ev.target.value })} maxLength={120} /></Field>
      <div className="stack"><span className="field__label">Dni</span>
        <div className="cluster">{WD_SHORT.map((d, i) => <Chip key={d} on={r.weekdays.includes(i)} onClick={() => setR({ ...r, weekdays: r.weekdays.includes(i) ? r.weekdays.filter((x) => x !== i) : [...r.weekdays, i].sort() })}>{d}</Chip>)}</div>
      </div>
      <div className="field-row">
        <Field label="Od"><input className="input" type="time" step={60} value={start} onChange={(ev) => setStart(ev.target.value)} /></Field>
        <Field label="Do"><input className="input" type="time" step={60} value={end} onChange={(ev) => setEnd(ev.target.value)} /></Field>
      </div>
      <div className="field-row">
        <Field label="Obowiązuje od" hint="Opcjonalnie"><input className="input" type="date" value={r.valid_from ?? ''} onChange={(ev) => setR({ ...r, valid_from: ev.target.value || null })} /></Field>
        <Field label="Do" hint="Opcjonalnie"><input className="input" type="date" value={r.valid_to ?? ''} onChange={(ev) => setR({ ...r, valid_to: ev.target.value || null })} /></Field>
      </div>
      <Chip on={!r.active} onClick={() => setR({ ...r, active: !r.active })}>{r.active ? 'Aktywny' : 'Wyłączony'}</Chip>
    </Sheet>
  );
}
