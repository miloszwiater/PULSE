import { useState } from 'react';
import { GOAL_AREAS, goalSchema, type Goal } from '../../../shared/schema';
import { goalProgress } from '../../../shared/domain/metrics';
import { newId } from '../../../shared/domain/snapshot';
import { useStore, remove } from '../../data/store';
import { useClock } from '../../data/clock';
import { putRow } from '../../data/actions';
import { Button, Chip, Empty, Field, Meter, ScreenHeader, Section, Sheet } from '../../ui/kit';
import { shortDate } from '../../ui/format';

const AREA: Record<(typeof GOAL_AREAS)[number], string> = {
  music: 'Muzyka', skill: 'Warsztat', release: 'Wydania', promo: 'Promocja', reading: 'Lektury', finance: 'Finanse', life: 'Życie', other: 'Inne',
};
const METRIC: Record<Goal['metric'], string> = {
  manual: 'Ręcznie', sessions: 'Liczba sesji', minutes: 'Minuty pracy', demos: 'Projekty na etapie demo+', finished_tracks: 'Gotowe utwory', books: 'Przeczytane książki', promo_tasks: 'Działania promocyjne',
};

export function GoalsScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const [edit, setEdit] = useState<Goal | null>(null);
  const active = snap.goals.filter((g) => g.status === 'active');
  const other = snap.goals.filter((g) => g.status !== 'active');
  const blank = () => goalSchema.parse({ id: newId('gl'), updated_at: Date.now(), title: '', area: 'music', metric: 'sessions', target: 12, start_date: clock.today, due_date: null });
  return (
    <div className="screen">
      <ScreenHeader title="Cele" onBack actions={<Button size="sm" variant="secondary" icon="plus" onClick={() => setEdit(blank())}>Nowy</Button>}
        sub="Cel z miarą liczy się sam z Twoich zapisów. Cel ręczny aktualizujesz samodzielnie — bez udawania automatyki." />
      {active.length ? (
        <div className="list">
          {active.map((g) => {
            const p = goalProgress(snap, g, clock.today);
            return (
              <button key={g.id} className="row row--action goal-row" onClick={() => setEdit(g)}>
                <span className="row__main">
                  <span className="row__title">{g.title}</span>
                  <Meter value={p.value} max={p.target} label={g.title} tone={p.ratio >= 1 ? 'ok' : 'violet'} />
                  <span className="row__sub num">{AREA[g.area]} · {p.value}/{p.target} · {METRIC[g.metric].toLowerCase()}{g.due_date ? ` · do ${shortDate(g.due_date)}` : ''}</span>
                </span>
              </button>
            );
          })}
        </div>
      ) : <Empty icon="target" title="Brak aktywnych celów" action={<Button variant="secondary" icon="plus" onClick={() => setEdit(blank())}>Dodaj cel</Button>}>Np. „12 sesji w listopadzie”, „3 dema do końca kwartału”, „odłożyć na mikrofon”.</Empty>}
      {other.length > 0 && (
        <Section title="Zamknięte i wstrzymane">
          <div className="list">{other.map((g) => <button key={g.id} className="row row--action" onClick={() => setEdit(g)}><span className="row__main"><span className="row__title">{g.title}</span><span className="row__sub">{g.status === 'done' ? 'Osiągnięty' : g.status === 'paused' ? 'Wstrzymany' : 'Porzucony'}</span></span></button>)}</div>
        </Section>
      )}
      {edit && <GoalSheet goal={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function GoalSheet({ goal, onClose }: { goal: Goal; onClose: () => void }) {
  const exists = useStore((s) => !!s.rows.goals[goal.id]);
  const [g, setG] = useState(goal);
  const set = <K extends keyof Goal>(k: K, v: Goal[K]) => setG({ ...g, [k]: v });
  return (
    <Sheet open onClose={onClose} title={exists ? 'Cel' : 'Nowy cel'} tall
      footer={<>
        {exists && <Button variant="danger" icon="trash" aria-label="Usuń" onClick={() => { remove('goals', g.id); onClose(); }} />}
        <Button variant="primary" disabled={!g.title.trim() || g.target <= 0} onClick={() => { putRow('goals', { ...g, title: g.title.trim() }); onClose(); }}>Zapisz</Button>
      </>}>
      <Field label="Cel"><input className="input" value={g.title} onChange={(e) => set('title', e.target.value)} maxLength={200} placeholder="Np. 3 dema do końca grudnia" /></Field>
      <div className="stack"><span className="field__label">Obszar</span>
        <div className="cluster">{GOAL_AREAS.map((a) => <Chip key={a} on={g.area === a} onClick={() => set('area', a)}>{AREA[a]}</Chip>)}</div>
      </div>
      <Field label="Jak mierzyć" hint={g.metric === 'demos' || g.metric === 'finished_tracks' ? 'Liczone z etapów projektów (stan obecny), żeby poprawki nie liczyły się podwójnie.' : g.metric === 'manual' ? 'Postęp wpisujesz ręcznie.' : 'Liczone automatycznie od daty startu do terminu.'}>
        <select className="select" value={g.metric} onChange={(e) => set('metric', e.target.value as Goal['metric'])}>
          {Object.entries(METRIC).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Field>
      <div className="field-row">
        <Field label="Wartość docelowa"><input className="input" type="number" inputMode="numeric" min={1} value={g.target} onChange={(e) => set('target', Number(e.target.value) || 0)} /></Field>
        {g.metric === 'manual' && <Field label="Postęp"><input className="input" type="number" inputMode="numeric" min={0} value={g.manual_progress} onChange={(e) => set('manual_progress', Number(e.target.value) || 0)} /></Field>}
      </div>
      <div className="field-row">
        <Field label="Od"><input className="input" type="date" value={g.start_date ?? ''} onChange={(e) => set('start_date', e.target.value || null)} /></Field>
        <Field label="Termin"><input className="input" type="date" value={g.due_date ?? ''} onChange={(e) => set('due_date', e.target.value || null)} /></Field>
      </div>
      <div className="stack"><span className="field__label">Status</span>
        <div className="cluster">{(['active', 'done', 'paused', 'dropped'] as const).map((s) => <Chip key={s} on={g.status === s} onClick={() => set('status', s)}>{s === 'active' ? 'Aktywny' : s === 'done' ? 'Osiągnięty' : s === 'paused' ? 'Wstrzymany' : 'Porzucony'}</Chip>)}</div>
      </div>
      <Field label="Notatki"><textarea className="textarea" value={g.notes} onChange={(e) => set('notes', e.target.value)} maxLength={2000} /></Field>
    </Sheet>
  );
}
