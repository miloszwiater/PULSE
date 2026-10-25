import { useMemo, useState } from 'react';
import { dayContext, nextFreeWindow } from '../../shared/domain/day';
import { weekStats, streak, dayIndex } from '../../shared/domain/metrics';
import { insights } from '../../shared/domain/insights';
import { detectConflicts, resolveConflicts } from '../../shared/domain/planner';
import { recommendExercises } from '../../shared/domain/training';
import { countsAsSession, sessionDate } from '../../shared/domain/sessions';
import { CATEGORY_SHORT } from '../../shared/catalog/exercises';
import { durationLabel, hhmm, weekDates } from '../../shared/time';
import type { Proposal } from '../../shared/schema';
import { useStore } from '../data/store';
import { useClock } from '../data/clock';
import { activeSession, startSession } from '../data/actions';
import { navigate } from '../app/router';
import { Button, IconButton } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { PulseLine, type PulseDay } from '../ui/PulseLine';
import { Wordmark } from '../ui/Wordmark';
import { longDate, plural } from '../ui/format';
import { CheckIn } from './CheckIn';
import { ProposalSheet } from './plan/ProposalSheet';
import { InsightView } from './InsightView';
import { SyncBadge } from './SyncBadge';

export function StartScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const ctx = useMemo(() => dayContext(snap, clock.today, clock), [snap, clock]);
  const week = useMemo(() => weekStats(snap, clock.today, clock.today), [snap, clock.today]);
  const st = useMemo(() => streak(snap, clock.today), [snap, clock.today]);
  const conflicts = useMemo(() => detectConflicts(snap, clock, 7), [snap, clock]);
  const topInsight = useMemo(() => insights(snap, clock.today)[0], [snap, clock.today]);
  const rec = useMemo(() => recommendExercises(snap, clock.today, { limit: 1, maxMinutes: Math.max(30, ctx.remainingMinutes || 60) })[0], [snap, clock.today, ctx.remainingMinutes]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const pending = snap.proposals.filter((p) => p.status === 'pending');

  const todays = snap.events
    .filter((e) => e.date === clock.today && (e.kind === 'music' || e.kind === 'training') && e.status === 'planned')
    .sort((a, b) => a.start_min - b.start_min);
  const next = todays.find((e) => e.end_min > clock.nowMin) ?? null;
  const doneToday = snap.sessions.filter((s) => countsAsSession(s) && sessionDate(s, tz) === clock.today);
  const doneMinutes = Math.round(doneToday.reduce((t, s) => t + s.active_seconds, 0) / 60);
  const win = nextFreeWindow(ctx);
  const day = dayIndex(snap, clock.today);
  const running = activeSession();

  const pulseDays: PulseDay[] = weekDates(clock.today).map((d) => {
    const mins = Math.round(snap.sessions.filter((s) => countsAsSession(s) && sessionDate(s, tz) === d).reduce((t, s) => t + s.active_seconds, 0) / 60);
    const planned = snap.events.filter((e) => e.date === d && (e.kind === 'music' || e.kind === 'training') && e.status === 'planned').reduce((t, e) => t + e.end_min - e.start_min, 0);
    const status = (snap.day_states.find((x) => x.date === d)?.status) ?? 'normal';
    const sick = snap.care.some((c) => c.signal === 'sick' && c.date <= d && (c.until ?? c.date) >= d);
    return { date: d, minutes: mins, planned, protectedDay: sick || status === 'off' || status === 'vacation' || status === 'sick' };
  });

  // Headline: answers "what matters today / when do I have time" in one sentence.
  let headline: string;
  let detail: string;
  if (ctx.mode === 'none') {
    headline = ctx.status === 'sick' ? 'Dziś odpoczywasz.' : ctx.status === 'off' || ctx.status === 'vacation' ? 'Dzień bez planu.' : 'Dziś bez sesji.';
    detail = ctx.reason;
  } else if (ctx.remainingMinutes >= 30 && win) {
    headline = `Masz dziś ${durationLabel(ctx.remainingMinutes)} na muzykę.`;
    detail = `Najlepsze okno: ${hhmm(win.start)}–${hhmm(win.end)}. ${ctx.reason}`;
  } else if (todays.length) {
    headline = 'Dzień ma już swój plan.';
    detail = ctx.reason;
  } else {
    headline = ctx.mode === 'light' ? 'Dziś najwyżej coś lekkiego.' : 'Dziś niewiele wolnego czasu.';
    detail = ctx.reason;
  }
  if (doneMinutes > 0) detail = `Dziś już ${durationLabel(doneMinutes)} pracy. ${detail}`;

  const openConflicts = () => setProposal(resolveConflicts(snap, clock, conflicts));

  return (
    <div className="screen start">
      <header className="start__top">
        <Wordmark size="sm" />
        <div className="cluster" style={{ gap: 0 }}>
          <SyncBadge />
          <IconButton icon="mentor" label="Mentor" onClick={() => navigate('/mentor')} />
          <IconButton icon="settings" label="Ustawienia" onClick={() => navigate('/ustawienia')} />
        </div>
      </header>

      <section className="today" aria-labelledby="today-h">
        <p className="today__date">{longDate(clock.today)}{day != null && day >= 1 ? <> · dzień <span className="num">{day}</span> z 365</> : null}</p>
        <h1 className="today__headline" id="today-h">{headline}</h1>
        <p className="today__detail">{detail}</p>
      </section>

      {conflicts.length > 0 && (
        <button className="alert-row" onClick={openConflicts}>
          <Icon name="info" size={20} />
          <span><strong>{conflicts.length} {plural(conflicts.length, 'konflikt', 'konflikty', 'konfliktów')} w planie.</strong> {conflicts[0].reason}</span>
          <Icon name="chevron" size={18} />
        </button>
      )}
      {pending.length > 0 && (
        <button className="alert-row alert-row--violet" onClick={() => setProposal(pending[0])}>
          <Icon name="sparkle" size={20} />
          <span><strong>Propozycja do decyzji:</strong> {pending[0].title}</span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      <section className="focus" aria-label="Najważniejsze teraz">
        {running ? (
          <div className="focus__block focus__block--live">
            <p className="focus__eyebrow">Trwa sesja</p>
            <p className="focus__title">{running.title || 'Sesja twórcza'}</p>
            <Button variant="primary" size="lg" icon="play" block onClick={() => navigate('/sesja')}>Wróć do sesji</Button>
          </div>
        ) : next ? (
          <div className="focus__block">
            <p className="focus__eyebrow"><span className="num">{hhmm(next.start_min)}–{hhmm(next.end_min)}</span>{next.category ? ` · ${CATEGORY_SHORT[next.category]}` : ''}{next.priority === 3 ? ' · opcjonalnie' : ''}</p>
            <p className="focus__title">{next.title}</p>
            {next.notes && <p className="focus__note">{next.notes.split('\n')[0]}</p>}
            <div className="focus__actions">
              <Button variant="primary" size="lg" icon="play" onClick={() => { startSession({ event: next }); navigate('/sesja'); }}>Rozpocznij sesję</Button>
              <Button variant="ghost" onClick={() => navigate(`/plan?d=${clock.today}`)}>W planie</Button>
            </div>
          </div>
        ) : rec && ctx.mode !== 'none' ? (
          <div className="focus__block">
            <p className="focus__eyebrow">Proponowane ćwiczenie · {CATEGORY_SHORT[rec.exercise.category]} · ok. {rec.exercise.minutes} min</p>
            <p className="focus__title">{rec.exercise.title}</p>
            <p className="focus__note">{rec.exercise.goal}</p>
            <div className="focus__actions">
              <Button variant="primary" size="lg" icon="play" onClick={() => { startSession({ exercise_id: rec.exercise.id }); navigate('/sesja'); }}>Rozpocznij sesję</Button>
              <Button variant="ghost" onClick={() => navigate(`/rozwoj/obszar/${rec.exercise.category}?ex=${rec.exercise.id}`)}>Szczegóły</Button>
            </div>
          </div>
        ) : null}

        <button className="flow-cta" onClick={() => { startSession({ type: 'create' }); navigate('/sesja'); }} disabled={!!running}>
          <span className="flow-cta__icon"><Icon name="wave" size={26} /></span>
          <span className="flow-cta__text">
            <span className="flow-cta__title">Creative Flow</span>
            <span className="flow-cta__sub">Masz wenę? Zacznij teraz, bez planu.</span>
          </span>
          <Icon name="play" size={20} fill="currentColor" />
        </button>
      </section>

      <section className="section">
        <div className="section__head"><h2 className="section__title">Jak się dziś czujesz?</h2><button className="btn btn--quiet" onClick={() => navigate('/care')}>Pulse Care</button></div>
        <CheckIn />
      </section>

      <section className="section week-summary">
        <div className="section__head">
          <h2 className="section__title">Rytm tygodnia</h2>
          <button className="btn btn--quiet" onClick={() => navigate('/rozwoj/statystyki')}>Statystyki</button>
        </div>
        <PulseLine days={pulseDays} today={clock.today} />
        <dl className="week-figs">
          <div><dt>Sesje</dt><dd className="num">{week.sessionCount}<span className="dim">/{week.adjustedTarget}</span></dd></div>
          <div><dt>Czas</dt><dd className="num">{durationLabel(week.minutes)}</dd></div>
          <div><dt>Regularność</dt><dd className="num">{st.current} <span className="dim small">{plural(st.current, 'tydzień', 'tygodnie', 'tygodni')}</span></dd></div>
        </dl>
        {week.adjustedTarget !== week.baseTarget && (
          <p className="dim xs">
            {week.preStartDays > 0
              ? `Pierwszy tydzień programu — cel proporcjonalny do pozostałych dni: ${week.adjustedTarget} z ${week.baseTarget}.`
              : `Cel skorygowany z ${week.baseTarget} do ${week.adjustedTarget} — ${week.protectedDays} ${plural(week.protectedDays, 'dzień chroniony', 'dni chronione', 'dni chronionych')} (wolne, choroba, urlop).`}
          </p>
        )}
      </section>

      <section className="section">
        <div className="section__head">
          <h2 className="section__title">Mentor</h2>
          <button className="btn btn--quiet" onClick={() => navigate('/mentor')}>Porozmawiaj</button>
        </div>
        {topInsight ? <InsightView insight={topInsight} /> : (
          <p className="muted small">Za mało danych na rzetelną obserwację. Pierwsze wnioski pojawią się po kilku zapisanych sesjach — mentor nie zgaduje.</p>
        )}
      </section>

      <ProposalSheet open={!!proposal} proposal={proposal} onClose={() => setProposal(null)} transient={!!proposal && !snap.proposals.some((p) => p.id === proposal.id)} />
    </div>
  );
}
