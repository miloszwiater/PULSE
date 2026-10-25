import { useMemo, useState } from 'react';
import { dayContext, nextFreeWindow } from '../../shared/domain/day';
import { weekStats, streak, dayIndex } from '../../shared/domain/metrics';
import { insights } from '../../shared/domain/insights';
import { detectConflicts, resolveConflicts } from '../../shared/domain/planner';
import { recommendExercises } from '../../shared/domain/training';
import { countsAsSession, sessionDate } from '../../shared/domain/sessions';
import { CATEGORY_SHORT, EXERCISE_BY_ID } from '../../shared/catalog/exercises';
import { durationLabel, hhmm, weekDates } from '../../shared/time';
import type { Proposal } from '../../shared/schema';
import { useStore } from '../data/store';
import { useClock } from '../data/clock';
import { activeSession, startSession } from '../data/actions';
import { navigate } from '../app/router';
import { Button, IconButton, Sheet } from '../ui/kit';
import { NightScene } from '../ui/NightScene';
import { useScene } from '../ui/useScene';
import { Icon } from '../ui/Icon';
import { PulseLine, type PulseDay } from '../ui/PulseLine';
import { Wordmark } from '../ui/Wordmark';
import { plural } from '../ui/format';
import { CheckIn } from './CheckIn';
import { ProposalSheet } from './plan/ProposalSheet';
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
  const [energyOpen, setEnergyOpen] = useState(false);
  const scene = useScene(clock.nowMin);
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
  if (doneMinutes > 0) detail = `Dziś już ${durationLabel(doneMinutes)} tworzenia. ${detail}`;

  const openConflicts = () => setProposal(resolveConflicts(snap, clock, conflicts));

  const commitmentsToday = snap.events.filter((e) => e.date === clock.today && ['music', 'training', 'reading', 'promo'].includes(e.kind) && !['cancelled', 'moved'].includes(e.status));
  const doneToday2 = commitmentsToday.filter((e) => ['done', 'covered', 'partial'].includes(e.status)).length;
  const signal = snap.care.filter((c) => c.date === clock.today).sort((a, b) => b.at - a.at)[0]?.signal;
  const sick = ctx.status === 'sick';
  const energyLabel = sick ? 'Choroba' : signal === 'energized' ? 'Dobra' : signal === 'low' ? 'Niska' : signal === 'overloaded' ? 'Przeciążenie' : 'Zgłoś';
  const vision = (snap.profile?.vision || '').split(/(?<=[.!?])\s/)[0]?.slice(0, 120);
  const priority = next ?? null;

  return (
    <div className="start2">
      <section className="hero" aria-labelledby="today-h">
        <NightScene {...scene} />
        <header className="hero__top">
          <Wordmark size="md" />
          <div className="hero__actions">
            <SyncBadge />
            <span className="hero__date">{shortWeekday(clock.today)}</span>
            <IconButton icon="user" label="Profil" onClick={() => navigate('/profil')} />
          </div>
        </header>
        <div className="hero__copy">
          {vision ? <p className="hero__vision">„{vision.replace(/[.!?]$/, '')}”</p> : null}
          <h1 className="hero__headline" id="today-h">{headline}</h1>
          <p className="hero__detail">{detail}{day != null && day >= 1 ? ` Dzień ${day} z 365.` : ''}</p>
        </div>
      </section>

      <div className="start2__body">
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

        <article className="prio" aria-label="Dzisiejszy priorytet">
          {running ? (
            <>
              <div className="prio__head"><span>Trwa sesja</span><span className="prio__live"><span /> na żywo</span></div>
              <div className="prio__main">
                <span className="prio__icon"><Icon name="wave" size={24} /></span>
                <div className="prio__text">
                  <p className="prio__title">{running.title || 'Sesja twórcza'}</p>
                </div>
              </div>
              <Button variant="primary" size="lg" icon="play" block onClick={() => navigate('/sesja')}>Wróć do sesji</Button>
            </>
          ) : priority ? (
            <>
              <div className="prio__head"><span>Dzisiejszy priorytet</span>{ctx.remainingMinutes > 0 && <span className="prio__cap">{durationLabel(ctx.remainingMinutes)} wolne</span>}</div>
              <button className="prio__main" onClick={() => navigate(`/plan?d=${clock.today}`)}>
                <span className="prio__icon"><Icon name={priority.kind === 'training' ? 'target' : 'wave'} size={24} /></span>
                <span className="prio__text">
                  <span className="prio__time num">{hhmm(priority.start_min)} – {hhmm(priority.end_min)}</span>
                  <span className="prio__title">{priority.title}</span>
                  <span className="prio__chips">
                    {priority.category && <span className="tag tag--violet">{CATEGORY_SHORT[priority.category]}</span>}
                    {priority.priority === 3 && <span className="tag">opcjonalnie</span>}
                    {priority.exercise_id && EXERCISE_BY_ID[priority.exercise_id] && <span className="tag">{EXERCISE_BY_ID[priority.exercise_id].minutes} min ćwiczenia</span>}
                  </span>
                </span>
                <Icon name="chevron" size={18} />
              </button>
              <Button variant="primary" size="lg" icon="play" block onClick={() => { startSession({ event: priority }); navigate('/sesja'); }}>Rozpocznij sesję</Button>
            </>
          ) : rec && ctx.mode !== 'none' ? (
            <>
              <div className="prio__head"><span>Propozycja na dziś</span>{ctx.remainingMinutes > 0 && <span className="prio__cap">{durationLabel(ctx.remainingMinutes)} wolne</span>}</div>
              <button className="prio__main" onClick={() => navigate(`/rozwoj/obszar/${rec.exercise.category}?ex=${rec.exercise.id}`)}>
                <span className="prio__icon"><Icon name="target" size={24} /></span>
                <span className="prio__text">
                  <span className="prio__time">{win ? <span className="num">okno {hhmm(win.start)} – {hhmm(win.end)}</span> : 'bez planu'}</span>
                  <span className="prio__title">{rec.exercise.title}</span>
                  <span className="prio__chips"><span className="tag tag--violet">{CATEGORY_SHORT[rec.exercise.category]}</span><span className="tag">ok. {rec.exercise.minutes} min</span></span>
                </span>
                <Icon name="chevron" size={18} />
              </button>
              <Button variant="primary" size="lg" icon="play" block onClick={() => { startSession({ exercise_id: rec.exercise.id }); navigate('/sesja'); }}>Rozpocznij sesję</Button>
            </>
          ) : (
            <>
              <div className="prio__head"><span>Dziś</span></div>
              <p className="prio__rest">{ctx.reason} Gdy jednak przyjdzie wena — Creative Flow jest zawsze pod ręką.</p>
            </>
          )}
          {!running && (
            <button className="prio__flow" onClick={() => { startSession({ type: 'create' }); navigate('/sesja'); }}>
              <Icon name="wave" size={20} />
              <span><strong>Creative Flow</strong> — zacznij bez planu</span>
              <Icon name="play" size={16} fill="currentColor" />
            </button>
          )}
        </article>

        <div className="tiles2">
          <button className="tile2" onClick={() => navigate(`/plan?d=${clock.today}`)}>
            <span className="tile2__icon"><Icon name="plan" size={20} /></span>
            <span className="tile2__label">Plan dnia</span>
            <span className="tile2__value num">{doneToday2}<span className="dim">/{commitmentsToday.length}</span></span>
            <Ring value={doneToday2} max={Math.max(1, commitmentsToday.length)} />
          </button>
          <button className={`tile2 tile2--energy is-${sick ? 'sick' : signal ?? 'none'}`} onClick={() => setEnergyOpen(true)}>
            <span className="tile2__icon"><Icon name={sick ? 'thermo' : signal === 'low' ? 'moon' : signal === 'overloaded' ? 'weight' : 'bolt'} size={20} /></span>
            <span className="tile2__label">Energia</span>
            <span className="tile2__value">{energyLabel}</span>
          </button>
        </div>

        <button className="tip" onClick={() => navigate('/mentor')}>
          <span className="tip__icon"><Icon name="sparkle" size={20} /></span>
          <span className="tip__text">
            {topInsight ? <><strong>{topInsight.title}.</strong> {topInsight.body}</> : <>Mentor: za mało danych na rzetelną obserwację. Wnioski pojawią się po kilku sesjach — bez zgadywania.</>}
          </span>
          <Icon name="chevron" size={18} />
        </button>

        <section className="weekcard" aria-labelledby="wk-h">
          <div className="weekcard__head">
            <h2 id="wk-h">Rytm tygodnia</h2>
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
      </div>

      <Sheet open={energyOpen} onClose={() => setEnergyOpen(false)} title="Jak się dziś czujesz?">
        <p className="muted small">Plan dopasuje się do Ciebie. Raportowanie jest dobrowolne.</p>
        <CheckIn tiles />
        <button className="btn btn--quiet" onClick={() => { setEnergyOpen(false); navigate('/care'); }}>Pulse Care — historia i szczegóły</button>
      </Sheet>
      <ProposalSheet open={!!proposal} proposal={proposal} onClose={() => setProposal(null)} transient={!!proposal && !snap.proposals.some((p) => p.id === proposal.id)} />
    </div>
  );
}

function Ring({ value, max }: { value: number; max: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg className="ring" viewBox="0 0 36 36" aria-hidden="true">
      <circle cx="18" cy="18" r={r} className="ring__track" />
      <circle cx="18" cy="18" r={r} className="ring__val" strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(1, value / max))} />
    </svg>
  );
}

function shortWeekday(d: string) {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, day)).toLocaleDateString('pl-PL', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
