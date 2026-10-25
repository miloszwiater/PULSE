import { useMemo, useState } from 'react';
import { OUTCOMES, PROJECT_STAGES, type Outcome, type ProjectStage, type Session } from '../../../shared/schema';
import { activeSeconds, coverageCandidates, MIN_COUNTED_SECONDS } from '../../../shared/domain/sessions';
import { weekStats } from '../../../shared/domain/metrics';
import { EXERCISE_BY_ID } from '../../../shared/catalog/exercises';
import { durationLabel, hhmm } from '../../../shared/time';
import { finish } from '../../data/actions';
import { useStore } from '../../data/store';
import { clockNow, tzOf } from '../../data/clock';
import { navigate } from '../../app/router';
import { Button, Chip, Field, Sheet } from '../../ui/kit';
import { toast } from '../../ui/toast';
import { dayLabel, OUTCOME_LABEL, STAGE_LABEL } from '../../ui/format';

export function FinishSheet({ open, session, onClose }: { open: boolean; session: Session; onClose: () => void }) {
  const events = useStore((s) => s.snap.events);
  const projects = useStore((s) => s.rows.projects);
  const [outcome, setOutcome] = useState<Outcome>(session.exercise_id ? 'exercise' : 'none');
  const [note, setNote] = useState(session.outcome_note);
  const [energy, setEnergy] = useState<number | null>(null);
  const [completed, setCompleted] = useState(true);
  const [difficulty, setDifficulty] = useState<'easy' | 'right' | 'hard'>('right');
  const [feedback, setFeedback] = useState('');
  const [fixMinutes, setFixMinutes] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const project = session.project_id ? projects[session.project_id] : undefined;
  const [stage, setStage] = useState<ProjectStage | null>(project?.stage ?? null);

  const nowMs = Date.now();
  const measured = activeSeconds(session, nowMs);
  const corrected = fixMinutes.trim() ? Math.max(0, Math.round(Number(fixMinutes) * 60)) : null;
  const finalSecs = corrected != null && corrected < measured ? corrected : measured;
  const preview: Session = { ...session, active_seconds: finalSecs };
  const candidates = useMemo(() => coverageCandidates(preview, events, tzOf()), [events, preview.active_seconds, session.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [cover, setCover] = useState<string[] | null>(null);
  const coverIds = cover ?? candidates.filter((c) => c.suggested).map((c) => c.event.id);
  const ex = session.exercise_id ? EXERCISE_BY_ID[session.exercise_id] : null;
  const today = clockNow().today;

  const save = () => {
    if (saving) return;
    setSaving(true);
    // End time that yields the corrected active time: start + pauses + corrected.
    let endAt: number | undefined;
    if (corrected != null && corrected < measured) {
      const pausedMs = session.pauses.reduce((t, [a, b]) => t + ((b ?? nowMs) - a), 0);
      endAt = session.started_at + pausedMs + corrected * 1000;
    }
    const done = finish(session, {
      outcome, note, energy, coverIds,
      attempt: ex ? { completed, difficulty, feedback } : null,
      projectStage: stage, endAt,
    });
    const w = weekStats(useStore.getState().snap, clockNow().today, clockNow().today);
    const counted = done.active_seconds >= MIN_COUNTED_SECONDS;
    toast(counted
      ? `Zapisano ${durationLabel(done.active_seconds / 60)}${outcome !== 'none' ? ` · ${OUTCOME_LABEL[outcome]}` : ''}. Tydzień: ${w.sessionCount}/${w.adjustedTarget} sesji.`
      : 'Zapisano. Sesje krótsze niż 10 minut nie liczą się do regularności.', 'ok');
    onClose();
    navigate('/tworz', { replace: true });
  };

  return (
    <Sheet open={open} onClose={onClose} title="Zakończ sesję" tall
      footer={<><Button variant="ghost" onClick={onClose}>Wróć do sesji</Button><Button variant="primary" icon="check" onClick={save} disabled={saving}>Zapisz sesję</Button></>}>
      <div className="finish__time">
        <span className="finish__dur display num">{durationLabel(finalSecs / 60)}</span>
        <span className="dim small">realnego czasu{session.pauses.length ? `, bez ${session.pauses.length} ${session.pauses.length === 1 ? 'pauzy' : 'pauz'}` : ''}</span>
      </div>
      <Field label="Timer działał za długo?" hint="Wpisz faktyczną liczbę minut — tylko w dół.">
        <input className="input" type="number" inputMode="numeric" min={0} max={Math.floor(measured / 60)} placeholder={String(Math.floor(measured / 60))} value={fixMinutes} onChange={(e) => setFixMinutes(e.target.value)} />
      </Field>

      <div className="stack">
        <span className="field__label">Co powstało?</span>
        <div className="cluster">
          {OUTCOMES.map((o) => <Chip key={o} on={outcome === o} onClick={() => setOutcome(o)}>{OUTCOME_LABEL[o]}</Chip>)}
        </div>
      </div>

      {ex && (
        <div className="stack finish__exercise">
          <span className="field__label">Ćwiczenie: {ex.title}</span>
          <p className="dim xs">Ukończone, gdy: {ex.done_when}</p>
          <div className="cluster">
            <Chip on={completed} tone="ok" onClick={() => setCompleted(true)}>Ukończone</Chip>
            <Chip on={!completed} onClick={() => setCompleted(false)}>Nieukończone</Chip>
          </div>
          <div className="segmented" role="radiogroup" aria-label="Trudność">
            {(['easy', 'right', 'hard'] as const).map((d) => (
              <button key={d} role="radio" aria-checked={difficulty === d} className={`segmented__opt${difficulty === d ? ' is-on' : ''}`} onClick={() => setDifficulty(d)}>
                {d === 'easy' ? 'Za łatwe' : d === 'right' ? 'W sam raz' : 'Za trudne'}
              </button>
            ))}
          </div>
          <input className="input" placeholder="Co sprawiło trudność? (opcjonalnie)" value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={500} />
        </div>
      )}

      {project && (
        <Field label={`Etap projektu „${project.title}”`}>
          <select className="select" value={stage ?? project.stage} onChange={(e) => setStage(e.target.value as ProjectStage)}>
            {PROJECT_STAGES.map((s) => <option key={s} value={s}>{STAGE_LABEL[s]}</option>)}
          </select>
        </Field>
      )}

      <Field label="Notatka">
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Jedno zdanie wystarczy." />
      </Field>

      <div className="stack">
        <span className="field__label">Energia po sesji</span>
        <div className="cluster">
          {[1, 2, 3, 4, 5].map((n) => <Chip key={n} on={energy === n} onClick={() => setEnergy(energy === n ? null : n)}>{n}</Chip>)}
        </div>
        <span className="field__hint">1 — wyczerpanie, 5 — pełnia sił. Opcjonalnie.</span>
      </div>

      {candidates.length > 0 && (
        <div className="stack">
          <span className="field__label">Ta sesja realizuje też plan?</span>
          <p className="dim xs">Zaznaczone zadania zostaną oznaczone jako pokryte tą sesją — bez dublowania czasu i bez konieczności powtarzania pracy.</p>
          <div className="list">
            {candidates.map((c) => {
              const on = coverIds.includes(c.event.id);
              return (
                <label key={c.event.id} className="row check-row">
                  <input type="checkbox" checked={on} onChange={() => setCover(on ? coverIds.filter((x) => x !== c.event.id) : [...coverIds, c.event.id])} />
                  <span className="row__main">
                    <span className="row__title">{c.event.title}</span>
                    <span className="row__sub">{dayLabel(c.event.date, today)} {hhmm(c.event.start_min)} · {c.reason}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </Sheet>
  );
}
