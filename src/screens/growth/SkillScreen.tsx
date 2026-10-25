import { useMemo, useState } from 'react';
import { SKILL_CATEGORIES, eventSchema, skillLevelSchema, type SkillCategory } from '../../../shared/schema';
import { CATEGORY_LABEL, EXERCISES, EXERCISE_BY_ID, LEVEL_LABEL, type Exercise } from '../../../shared/catalog/exercises';
import { levelOf, progressionAdvice, DIFF_LABEL } from '../../../shared/domain/training';
import { dayContext } from '../../../shared/domain/day';
import { newId } from '../../../shared/domain/snapshot';
import { addDays, hhmm } from '../../../shared/time';
import { useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { putRow, startSession } from '../../data/actions';
import { navigate, useQuery } from '../../app/router';
import { Button, Chip, Empty, ScreenHeader, Section, Sheet } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { dayLabel } from '../../ui/format';
import { toast } from '../../ui/toast';
import { LevelDots } from './GrowthScreen';

export function SkillScreen({ category }: { category: string }) {
  const q = useQuery();
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const [openEx, setOpenEx] = useState<string | null>(q.get('ex'));
  if (!SKILL_CATEGORIES.includes(category as SkillCategory)) return <div className="screen"><ScreenHeader title="Rozwój" onBack /><Empty title="Nie ma takiego obszaru" /></div>;
  const cat = category as SkillCategory;
  const level = levelOf(snap, cat);
  const adv = progressionAdvice(snap, cat);
  const attempts = snap.attempts.filter((a) => a.category === cat).sort((a, b) => b.date.localeCompare(a.date));
  const doneIds = new Set(attempts.filter((a) => a.completed).map((a) => a.exercise_id));

  const setLevel = (l: number, reason: string) => {
    putRow('skill_levels', skillLevelSchema.parse({ id: cat, updated_at: Date.now(), category: cat, level: l, reason }));
    toast(`Poziom: ${LEVEL_LABEL[l]}.`, 'ok');
  };

  return (
    <div className="screen">
      <ScreenHeader title={CATEGORY_LABEL[cat]} onBack sub={<span className="cluster" style={{ gap: 8 }}><LevelDots level={level} /> {LEVEL_LABEL[level]}</span>} />

      {adv && (
        <div className="callout callout--violet" style={{ marginBottom: 24 }}>
          <Icon name="sparkle" size={18} />
          <div className="stack" style={{ gap: 8 }}>
            <span><strong>{adv.kind === 'level_up' ? 'Czas na wyższy poziom.' : adv.kind === 'step_back' ? 'Warto wrócić do fundamentów.' : 'Zmień metodę.'}</strong> {adv.reason}</span>
            <ul className="insight__evidence">{adv.evidence.map((e, i) => <li key={i}>{e}</li>)}</ul>
            <div className="cluster">
              {adv.kind !== 'switch_method' && <Button size="sm" variant="secondary" onClick={() => setLevel(adv.toLevel, adv.reason)}>Ustaw poziom {adv.toLevel}</Button>}
              {adv.alternative && <Button size="sm" variant="secondary" onClick={() => setOpenEx(adv.alternative!.id)}>Zobacz: {adv.alternative.title}</Button>}
            </div>
          </div>
        </div>
      )}

      {[1, 2, 3, 4].map((l) => {
        const list = EXERCISES.filter((e) => e.category === cat && e.level === l);
        if (!list.length) return null;
        return (
          <Section key={l} title={<>Poziom {l} · {LEVEL_LABEL[l]}{l === level ? ' — Twój' : ''}</>}>
            <div className="list">
              {list.map((e) => (
                <button key={e.id} className={`row row--action ex-row${l > level ? ' is-ahead' : ''}`} onClick={() => setOpenEx(e.id)}>
                  <span className="row__lead">{doneIds.has(e.id) ? <Icon name="check" size={18} style={{ color: 'var(--ok)' }} /> : <span className="ex-row__dot" />}</span>
                  <span className="row__main">
                    <span className="row__title">{e.title}</span>
                    <span className="row__sub">{e.minutes} min · {e.output}</span>
                  </span>
                  <span className="row__trail"><Icon name="chevron" size={18} /></span>
                </button>
              ))}
            </div>
          </Section>
        );
      })}

      <Section title="Historia prób">
        {attempts.length ? (
          <div className="list">
            {attempts.slice(0, 12).map((a) => (
              <div key={a.id} className="row">
                <span className="row__main">
                  <span className="row__title">{EXERCISE_BY_ID[a.exercise_id]?.title ?? a.exercise_id}</span>
                  <span className="row__sub">{dayLabel(a.date, clock.today)} · {a.completed ? 'ukończone' : 'nieukończone'} · {DIFF_LABEL[a.difficulty]}{a.feedback ? ` — ${a.feedback}` : ''}</span>
                </span>
              </div>
            ))}
          </div>
        ) : <p className="muted small">Po każdym ćwiczeniu oceniasz trudność — z tych ocen wynika progresja.</p>}
      </Section>

      <Section title="Poziom ręcznie">
        <p className="dim xs" style={{ marginBottom: 8 }}>Jeśli samoocena się zmieniła. Normalnie poziom wynika z ocen prób.</p>
        <div className="cluster">{[1, 2, 3, 4].map((l) => <Chip key={l} on={level === l} onClick={() => setLevel(l, 'Zmiana ręczna')}>{l} · {LEVEL_LABEL[l]}</Chip>)}</div>
      </Section>

      <ExerciseSheet exercise={openEx ? EXERCISE_BY_ID[openEx] ?? null : null} onClose={() => setOpenEx(null)} />
    </div>
  );
}

export function ExerciseSheet({ exercise, onClose }: { exercise: Exercise | null; onClose: () => void }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const [planOpen, setPlanOpen] = useState(false);
  const slots = useMemo(() => {
    if (!exercise || !planOpen) return [];
    const out: { date: string; start: number; mode: string }[] = [];
    for (let i = 0; i < 10 && out.length < 4; i++) {
      const d = addDays(clock.today, i);
      const ctx = dayContext(snap, d, i === 0 ? clock : undefined);
      if (ctx.mode === 'none' || ctx.remainingMinutes < Math.min(exercise.minutes, 30)) continue;
      const w = ctx.windows.find((x) => x.end - x.start >= Math.min(exercise.minutes, ctx.maxMinutes));
      if (w) out.push({ date: d, start: Math.ceil(w.start / 15) * 15, mode: ctx.mode });
    }
    return out;
  }, [exercise, planOpen, snap, clock]);
  if (!exercise) return null;
  const running = Object.values(useStore.getState().rows.sessions).some((s) => s.status === 'running' || s.status === 'paused');
  const plan = (date: string, start: number, mode: string) => {
    const minutes = mode === 'light' ? Math.min(30, exercise.minutes) : exercise.minutes;
    putRow('events', eventSchema.parse({
      id: newId('ev'), updated_at: Date.now(), kind: 'training', title: exercise.title, date, start_min: start, end_min: start + minutes,
      exercise_id: exercise.id, category: exercise.category, source: 'user',
    }));
    toast(`Zaplanowano: ${dayLabel(date, clock.today).toLowerCase()}, ${hhmm(start)}.`, 'ok');
    setPlanOpen(false);
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={exercise.title} tall
      footer={<>
        <Button variant="secondary" icon="calendar" onClick={() => setPlanOpen(!planOpen)}>Zaplanuj</Button>
        <Button variant="primary" icon="play" disabled={running} onClick={() => { startSession({ exercise_id: exercise.id }); onClose(); navigate('/sesja'); }}>Zacznij teraz</Button>
      </>}>
      <p className="muted small">{CATEGORY_LABEL[exercise.category]} · poziom {exercise.level} · ok. {exercise.minutes} min{exercise.needs_beat ? ' · przy beacie, w DAW' : ''}</p>
      {planOpen && (
        <div className="stack">
          <span className="field__label">Najbliższe realne okna</span>
          {slots.length ? (
            <div className="cluster">{slots.map((s) => <Chip key={s.date} onClick={() => plan(s.date, s.start, s.mode)}>{dayLabel(s.date, clock.today)} {hhmm(s.start)}{s.mode === 'light' ? ' (30 min)' : ''}</Chip>)}</div>
          ) : <p className="muted small">W najbliższych 10 dniach nie ma okna, które pomieści to ćwiczenie bez naruszania regeneracji.</p>}
        </div>
      )}
      <div className="stack">
        <span className="field__label">Cel</span>
        <p>{exercise.goal}</p>
      </div>
      <div className="stack">
        <span className="field__label">Metoda</span>
        <ol className="steps">{exercise.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
      </div>
      <div className="field-row ex-facts">
        <div className="stack"><span className="field__label">Ukończone, gdy</span><p className="small">{exercise.done_when}</p></div>
        <div className="stack"><span className="field__label">Rezultat</span><p className="small">{exercise.output}</p></div>
      </div>
      <p className="dim xs">Po sesji ocenisz trudność. Dwa razy „za łatwe” — wyższy poziom. Problem wraca — zmiana metody albo powrót do fundamentów.</p>
    </Sheet>
  );
}
