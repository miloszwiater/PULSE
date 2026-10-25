import { useMemo, useState } from 'react';
import { SESSION_TYPES, OUTCOMES, type Outcome, type SessionType, type SkillCategory } from '../../../shared/schema';
import { countsAsSession, sessionDate } from '../../../shared/domain/sessions';
import { recommendExercises } from '../../../shared/domain/training';
import { dayContext } from '../../../shared/domain/day';
import { CATEGORY_SHORT } from '../../../shared/catalog/exercises';
import { durationLabel, hhmm, parseHHMM } from '../../../shared/time';
import { useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { activeSession, logManualSession, startSession } from '../../data/actions';
import { navigate } from '../../app/router';
import { Button, Chip, Empty, Field, Row, Section, Sheet } from '../../ui/kit';
import { Icon, type IconName } from '../../ui/Icon';
import { NightScene } from '../../ui/NightScene';
import { useScene } from '../../ui/useScene';
import { Cover } from '../../ui/Cover';
import { dayLabel, OUTCOME_LABEL, STAGE_LABEL, TYPE_LABEL } from '../../ui/format';
import { toast } from '../../ui/toast';

const FLOW_TYPES: SessionType[] = SESSION_TYPES.filter((t) => t !== 'other' && t !== 'training');
type TypeTile = { type: SessionType; label: string; icon: IconName; category: SkillCategory | null };
export const MAIN_TYPES: TypeTile[] = [
  { type: 'create', label: 'Tworzę', icon: 'music', category: null },
  { type: 'write', label: 'Piszę do beatu', icon: 'pen', category: 'songwriting' },
  { type: 'record', label: 'Nagrywam', icon: 'mic', category: null },
  { type: 'inspiration', label: 'Pomysł', icon: 'bulb', category: null },
];
export const MORE_TYPES: TypeTile[] = [
  { type: 'flow', label: 'Flow', icon: 'wave', category: 'flow' },
  { type: 'production', label: 'Produkcja', icon: 'sliders', category: 'production' },
  { type: 'experiment', label: 'Eksperyment', icon: 'flask', category: null },
];

export function CreateScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const scene = useScene(clock.nowMin);
  const [manualOpen, setManualOpen] = useState(false);
  const running = activeSession();
  const ctx = useMemo(() => dayContext(snap, clock.today, clock), [snap, clock]);
  const recs = useMemo(() => recommendExercises(snap, clock.today, { limit: 2, maxMinutes: Math.max(45, ctx.remainingMinutes) }), [snap, clock.today, ctx.remainingMinutes]);
  const today = snap.events.filter((e) => e.date === clock.today && (e.kind === 'music' || e.kind === 'training') && e.status === 'planned').sort((a, b) => a.start_min - b.start_min);
  const projects = snap.projects.filter((p) => !p.archived && p.stage !== 'released').sort((a, b) => (b.last_worked_at ?? b.updated_at) - (a.last_worked_at ?? a.updated_at)).slice(0, 3);
  const recent = snap.sessions.filter(countsAsSession).sort((a, b) => b.started_at - a.started_at).slice(0, 5);

  const go = (fn: () => void) => { fn(); navigate('/sesja'); };

  return (
    <div className="create2">
      <section className="bandhero" aria-labelledby="flow-h">
        <NightScene {...scene} person={false} />
        <div className="bandhero__copy">
          <h1 id="flow-h" className="bandhero__title">Creative Flow</h1>
          <p className="bandhero__lead">Masz wenę? Przechwyć ją — jedno dotknięcie i czas już się liczy.</p>
        </div>
      </section>
      <div className="create2__body">
      {running ? (
        <Button variant="primary" size="lg" block icon="play" onClick={() => navigate('/sesja')}>Wróć do trwającej sesji</Button>
      ) : (
        <>
          <div className="typetiles" role="group" aria-label="Zacznij sesję wybranego rodzaju">
            {MAIN_TYPES.map((t) => (
              <button key={t.type} className="typetile" onClick={() => go(() => startSession({ type: t.type, category: t.category }))}>
                <span className="typetile__icon"><Icon name={t.icon} size={24} /></span>
                <span className="typetile__label">{t.label}</span>
              </button>
            ))}
          </div>
          <div className="cluster typemore" role="group" aria-label="Inne rodzaje">
            {MORE_TYPES.map((t) => <Chip key={t.type} icon={t.icon} onClick={() => go(() => startSession({ type: t.type, category: t.category }))}>{t.label}</Chip>)}
          </div>
        </>
      )}
      <div className="screen create" style={{ padding: 0 }}>

      {today.length > 0 && (
        <Section title="Zaplanowane na dziś">
          <div className="list">
            {today.map((e) => (
              <Row key={e.id} title={e.title} sub={<><span className="num">{hhmm(e.start_min)}–{hhmm(e.end_min)}</span>{e.category ? ` · ${CATEGORY_SHORT[e.category]}` : ''}{e.priority === 3 ? ' · opcjonalnie' : ''}</>}
                trailing={<Button size="sm" variant="secondary" icon="play" disabled={!!running} onClick={() => go(() => startSession({ event: e }))}>Start</Button>} />
            ))}
          </div>
        </Section>
      )}

      {recs.length > 0 && (
        <Section title="Trening do beatu" aside={<button className="btn btn--quiet" onClick={() => navigate('/rozwoj')}>Wszystkie</button>}>
          <div className="list">
            {recs.map((r) => (
              <Row key={r.exercise.id} leading={<Cover seed={r.exercise.id} tone={r.exercise.category} size={52} />} title={r.exercise.title}
                sub={`${CATEGORY_SHORT[r.exercise.category]} · ok. ${r.exercise.minutes} min${r.reasons[0] ? ` · ${r.reasons[0]}` : ''}`}
                onClick={() => navigate(`/rozwoj/obszar/${r.exercise.category}?ex=${r.exercise.id}`)} />
            ))}
          </div>
        </Section>
      )}

      <Section title="Projekty" aside={<button className="btn btn--quiet" onClick={() => navigate('/projekty')}>Wszystkie</button>}>
        {projects.length ? (
          <div className="list">
            {projects.map((p) => (
              <Row key={p.id} leading={<Cover seed={p.id} size={52} />} title={p.title} sub={`${STAGE_LABEL[p.stage]}${p.last_worked_at ? ` · ostatnio ${dayLabel(new Date(p.last_worked_at).toISOString().slice(0, 10), clock.today).toLowerCase()}` : ''}`}
                onClick={() => navigate(`/projekty/${p.id}`)} />
            ))}
          </div>
        ) : (
          <Empty icon="folder" title="Bez projektów" action={<Button size="sm" variant="secondary" icon="plus" onClick={() => navigate('/projekty?new=1')}>Dodaj utwór</Button>}>
            Projekt to lekka karta utworu: etap, notatki, link do pliku poza aplikacją. Bez wgrywania sesji z DAW.
          </Empty>
        )}
      </Section>

      <Section title="Ostatnie sesje" aside={<button className="btn btn--quiet" onClick={() => setManualOpen(true)}>Dodaj ręcznie</button>}>
        {recent.length ? (
          <div className="list">
            {recent.map((s) => (
              <Row key={s.id} title={s.title || TYPE_LABEL[s.type]}
                sub={`${dayLabel(sessionDate(s, tz), clock.today)} · ${durationLabel(s.active_seconds / 60)}${s.outcome !== 'none' ? ` · ${OUTCOME_LABEL[s.outcome]}` : ''}${s.source === 'manual' ? ' · wpis ręczny' : ''}`}
                trailing={null} />
            ))}
          </div>
        ) : (
          <p className="muted small">Pierwsza zapisana sesja pojawi się tutaj.</p>
        )}
      </Section>

      <ManualSessionSheet open={manualOpen} onClose={() => setManualOpen(false)} today={clock.today} />
      </div>
      </div>
    </div>
  );
}

function ManualSessionSheet({ open, onClose, today }: { open: boolean; onClose: () => void; today: string }) {
  const [date, setDate] = useState(today);
  const [start, setStart] = useState('19:00');
  const [minutes, setMinutes] = useState(60);
  const [type, setType] = useState<SessionType>('create');
  const [outcome, setOutcome] = useState<Outcome>('none');
  const [note, setNote] = useState('');
  const valid = date <= today && minutes >= 5 && minutes <= 960 && parseHHMM(start) != null;
  return (
    <Sheet open={open} onClose={onClose} title="Sesja bez timera" tall
      footer={<Button variant="primary" block disabled={!valid} onClick={() => {
        logManualSession({ date, startMin: parseHHMM(start)!, minutes, type, outcome, note });
        toast(`Dodano sesję: ${durationLabel(minutes)}.`, 'ok');
        onClose();
      }}>Zapisz sesję</Button>}>
      <p className="muted small">Gdy zapomnisz włączyć timer. Wpis jest oznaczony jako ręczny w statystykach.</p>
      <div className="field-row">
        <Field label="Dzień"><input className="input" type="date" max={today} value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Start"><input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      </div>
      <Field label="Czas (min)"><input className="input" type="number" inputMode="numeric" min={5} max={960} value={minutes} onChange={(e) => setMinutes(Number(e.target.value) || 0)} /></Field>
      <div className="stack"><span className="field__label">Rodzaj</span>
        <div className="cluster">{FLOW_TYPES.map((t) => <Chip key={t} on={type === t} onClick={() => setType(t)}>{TYPE_LABEL[t]}</Chip>)}</div>
      </div>
      <div className="stack"><span className="field__label">Rezultat</span>
        <div className="cluster">{OUTCOMES.map((o) => <Chip key={o} on={outcome === o} onClick={() => setOutcome(o)}>{OUTCOME_LABEL[o]}</Chip>)}</div>
      </div>
      <Field label="Notatka"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
    </Sheet>
  );
}
