import { useEffect, useMemo, useState } from 'react';
import { COMMITMENT_KINDS, DAY_STATUSES, type DayStatus, type EventKind, type PEvent, type Proposal } from '../../../shared/schema';
import { dayContext, type Block } from '../../../shared/domain/day';
import { detectConflicts, generateWeekPlan, resolveConflicts, type DayNote } from '../../../shared/domain/planner';
import { countsAsSession, sessionDate } from '../../../shared/domain/sessions';
import { weekStats } from '../../../shared/domain/metrics';
import { addDays, addMonths, daysInMonth, durationLabel, hhmm, monthStart, parseDate, weekDates, weekStart, weekday } from '../../../shared/time';
import { useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { setDayStatus } from '../../data/actions';
import { navigate, useQuery } from '../../app/router';
import { Button, Chip, IconButton, ScreenHeader, Segmented, Sheet } from '../../ui/kit';
import { Icon, type IconName } from '../../ui/Icon';
import { dayLabel, KIND_LABEL, longDate, MONTHS, plural, STATUS_LABEL, WD_SHORT } from '../../ui/format';
import { EventSheet, RoutineBlockSheet, useConflictFollowUp, type EventDraft } from './EventSheet';
import { ProposalSheet } from './ProposalSheet';
import { RoutinesSheet } from './RoutinesSheet';
import { HistorySheet } from './HistorySheet';

type View = 'day' | 'week' | 'month';

export const DAY_STATUS_LABEL: Record<DayStatus, string> = {
  normal: 'Zwykły dzień', off: 'Wolne od planu', sick: 'Choroba', vacation: 'Urlop', overloaded: 'Przeciążenie',
};

export function PlanScreen() {
  const clock = useClock();
  const q = useQuery();
  const snap = useStore((s) => s.snap);
  const [view, setView] = useState<View>((q.get('v') as View) || 'day');
  const [date, setDate] = useState(q.get('d') || clock.today);
  const [draft, setDraft] = useState<EventDraft | null>(null);
  const [routineBlock, setRoutineBlock] = useState<Block | null>(null);
  const [plan, setPlan] = useState<{ proposal: Proposal | null; notes: DayNote[] } | null>(null);
  const [routinesOpen, setRoutinesOpen] = useState(q.get('grafik') === '1');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [statusOpen, setStatusOpen] = useState(false);
  const follow = useConflictFollowUp();
  const conflicts = useMemo(() => detectConflicts(snap, clock, 14), [snap, clock]);

  useEffect(() => {
    if (q.get('gen') === '1') setPlan(generateWeekPlan(snap, clock));
    // Deep link from Roadmap/Kariera: add a concrete step to the plan.
    if (q.get('add')) setDraft({ date: clock.today, start_min: 1080, end_min: 1140, kind: (q.get('kind') as EventKind) || 'other', title: q.get('add') ?? '', notes: q.get('notes') ?? '' });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const shift = (n: number) => setDate(view === 'day' ? addDays(date, n) : view === 'week' ? addDays(date, 7 * n) : addMonths(date, n));
  const title = view === 'month' ? `${MONTHS[parseDate(date).m - 1]} ${parseDate(date).y}` : view === 'week' ? `Tydzień ${dayLabel(weekStart(date), clock.today).toLowerCase()}` : dayLabel(date, clock.today);
  const pendingCount = snap.proposals.filter((p) => p.status === 'pending').length;

  return (
    <div className="screen plan">
      <ScreenHeader title="Plan" actions={
        <>
          <IconButton icon="undo" label="Historia zmian" onClick={() => setHistoryOpen(true)} />
          <IconButton icon="calendar" label="Stały grafik" onClick={() => setRoutinesOpen(true)} />
          <IconButton icon="plus" label="Dodaj do planu" onClick={() => setDraft({ date: view === 'day' ? date : date < clock.today ? clock.today : date, start_min: 1080, end_min: 1170 })} />
        </>
      } />
      <Segmented label="Widok planu" value={view} onChange={setView} options={[{ value: 'day', label: 'Dzień' }, { value: 'week', label: 'Tydzień' }, { value: 'month', label: 'Miesiąc' }]} />

      <div className="datenav">
        <IconButton icon="back" label="Wcześniej" onClick={() => shift(-1)} />
        <button className="datenav__title" onClick={() => setDate(clock.today)} aria-label={`${title}. Wróć do dziś`}>{title}</button>
        <IconButton icon="chevron" label="Później" onClick={() => shift(1)} />
      </div>

      {conflicts.length > 0 && (
        <button className="alert-row" onClick={() => follow.setProposal(resolveConflicts(snap, clock, conflicts))}>
          <Icon name="info" size={20} />
          <span><strong>{conflicts.length} {plural(conflicts.length, 'konflikt', 'konflikty', 'konfliktów')}.</strong> {conflicts[0].event.title}, {dayLabel(conflicts[0].event.date, clock.today).toLowerCase()}: {conflicts[0].reason}</span>
          <Icon name="chevron" size={18} />
        </button>
      )}
      {pendingCount > 0 && (
        <button className="alert-row alert-row--violet" onClick={() => follow.setProposal(snap.proposals.find((p) => p.status === 'pending')!)}>
          <Icon name="sparkle" size={20} />
          <span><strong>{pendingCount} {plural(pendingCount, 'propozycja', 'propozycje', 'propozycji')} mentora</strong> czeka na decyzję.</span>
          <Icon name="chevron" size={18} />
        </button>
      )}

      {view === 'day' && <WeekStrip date={date} onPick={setDate} />}
      {view === 'day' && <DayView date={date} onSlot={(start) => setDraft({ date, start_min: start, end_min: start + 90 })} onEvent={(e) => setDraft({ id: e.id, date: e.date, start_min: e.start_min, end_min: e.end_min })} onRoutine={setRoutineBlock} onStatus={() => setStatusOpen(true)} />}
      {view === 'week' && <WeekView date={date} onDay={(d) => { setDate(d); setView('day'); }} />}
      {view === 'month' && <MonthView date={date} onDay={(d) => { setDate(d); setView('day'); }} />}

      <div className="plan__gen">
        <Button variant="secondary" icon="sparkle" block onClick={() => setPlan(generateWeekPlan(snap, clock, view === 'day' && date > clock.today ? date : clock.today))}>Zaplanuj resztę tygodnia</Button>
        <p className="dim xs">Planer uwzględnia pracę, dojazdy, regenerację po zmianie, dni wolne i samopoczucie. Pokazuje propozycję — nic nie zmienia bez Twojej zgody.</p>
      </div>

      <EventSheet draft={draft} onClose={() => setDraft(null)} onSaved={(blocking) => blocking && follow.check()} />
      <RoutineBlockSheet block={routineBlock} date={date} onClose={() => setRoutineBlock(null)} onChanged={follow.check} />
      {plan && <ProposalSheet open proposal={plan.proposal} notes={plan.notes} onClose={() => setPlan(null)} transient />}
      <ProposalSheet open={!!follow.proposal} proposal={follow.proposal} onClose={() => follow.setProposal(null)} transient={!!follow.proposal && !snap.proposals.some((p) => p.id === follow.proposal!.id)} />
      <RoutinesSheet open={routinesOpen} onClose={() => { setRoutinesOpen(false); follow.check(); if (q.get('grafik')) navigate('/plan', { replace: true }); }} />
      <HistorySheet open={historyOpen} onClose={() => setHistoryOpen(false)} />
      <Sheet open={statusOpen} onClose={() => setStatusOpen(false)} title={`Status: ${longDate(date)}`}>
        <p className="muted small">Status dnia zmienia plan i metryki: wolne, choroba i urlop obniżają cel tygodnia zamiast liczyć się jako porażka.</p>
        <div className="cluster">
          {DAY_STATUSES.map((s) => (
            <Chip key={s} on={(snap.day_states.find((d) => d.date === date)?.status ?? 'normal') === s} onClick={() => { setDayStatus(date, s); setStatusOpen(false); follow.check(); }}>{DAY_STATUS_LABEL[s]}</Chip>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

const PPM = 0.8; // px per minute

export const KIND_ICON: Record<string, IconName> = {
  work: 'clock', commute: 'route', music: 'music', training: 'target', reading: 'book', promo: 'megaphone',
  private: 'user', relationship: 'heart', sport: 'bolt', rest: 'moon', other: 'more',
};

function WeekStrip({ date, onPick }: { date: string; onPick: (d: string) => void }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  return (
    <div className="weekstrip" role="tablist" aria-label="Dni tygodnia">
      {weekDates(date).map((d) => {
        const dev = snap.events.some((e) => e.date === d && COMMITMENT_KINDS.includes(e.kind) && !['cancelled', 'moved'].includes(e.status));
        return (
          <button key={d} role="tab" aria-selected={d === date} className={`weekstrip__d${d === date ? ' is-on' : ''}${d === clock.today ? ' is-today' : ''}`} onClick={() => onPick(d)}>
            <span className="weekstrip__wd">{WD_SHORT[weekday(d)]}</span>
            <span className="weekstrip__n num">{parseDate(d).d}</span>
            <span className={`weekstrip__dot${dev ? ' is-on' : ''}`} />
          </button>
        );
      })}
    </div>
  );
}

function laneLayout<T extends { start: number; end: number }>(items: T[]): (T & { lane: number; lanes: number })[] {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: (T & { lane: number; lanes: number })[] = [];
  let cluster: (T & { lane: number; lanes: number })[] = [];
  let clusterEnd = -1;
  const flush = () => { const n = Math.max(1, ...cluster.map((c) => c.lane + 1)); cluster.forEach((c) => (c.lanes = n)); out.push(...cluster); cluster = []; };
  for (const it of sorted) {
    if (it.start >= clusterEnd && cluster.length) flush();
    const used = new Set(cluster.filter((c) => c.end > it.start).map((c) => c.lane));
    let lane = 0;
    while (used.has(lane)) lane++;
    cluster.push({ ...it, lane, lanes: 1 });
    clusterEnd = Math.max(clusterEnd, it.end);
  }
  flush();
  return out;
}

function DayView({ date, onSlot, onEvent, onRoutine, onStatus }: { date: string; onSlot: (min: number) => void; onEvent: (e: PEvent) => void; onRoutine: (b: Block) => void; onStatus: () => void }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const ctx = useMemo(() => dayContext(snap, date, clock), [snap, date, clock]);
  const wake = snap.profile?.wake_min ?? 420;
  const bed = snap.profile?.bed_min ?? 1380;
  const events = snap.events.filter((e) => e.date === date && !['cancelled', 'moved'].includes(e.status));
  const devEvents = events.filter((e) => COMMITMENT_KINDS.includes(e.kind) || e.kind === 'rest');
  const routineBlocks = ctx.blocks.filter((b) => b.routine_id);
  const lifeEvents = events.filter((e) => !COMMITMENT_KINDS.includes(e.kind) && e.kind !== 'rest');
  const sessions = snap.sessions.filter((s) => countsAsSession(s) && sessionDate(s, tz) === date);
  const allStarts = [wake - 30, ...ctx.blocks.map((b) => b.start), ...events.map((e) => e.start_min)];
  const from = Math.max(0, Math.floor(Math.min(...allStarts) / 60) * 60);
  const to = Math.min(1440 + 360, Math.ceil(Math.max(bed + 30, ...ctx.blocks.map((b) => b.end), ...events.map((e) => e.end_min)) / 60) * 60);
  const hours: number[] = [];
  for (let m = from; m <= to; m += 60) hours.push(m);
  type Item = { start: number; end: number; key: string; kind: string; title: string; sub: string; status?: string; onClick: () => void; variant: 'life' | 'dev' | 'routine' };
  const items: Item[] = [
    ...routineBlocks.map((b) => ({ start: b.start, end: b.end, key: `r${b.routine_id}${b.start}`, kind: b.kind, title: b.title, sub: `${hhmm(b.start)}–${hhmm(b.end)} · stały grafik`, onClick: () => onRoutine(b), variant: 'routine' as const })),
    ...lifeEvents.map((e) => ({ start: e.start_min, end: e.end_min, key: e.id, kind: e.kind, title: e.title, sub: `${hhmm(e.start_min)}–${hhmm(e.end_min)} · ${KIND_LABEL[e.kind]}`, onClick: () => onEvent(e), variant: 'life' as const })),
    ...devEvents.map((e) => ({ start: e.start_min, end: e.end_min, key: e.id, kind: e.kind, title: e.title, sub: `${hhmm(e.start_min)}–${hhmm(e.end_min)}${e.status !== 'planned' ? ` · ${STATUS_LABEL[e.status]}` : e.priority === 3 ? ' · opcjonalnie' : ''}`, status: e.status, onClick: () => onEvent(e), variant: 'dev' as const })),
  ];
  const laid = laneLayout(items);
  const status = snap.day_states.find((d) => d.date === date)?.status ?? 'normal';
  const showNow = date === clock.today && clock.nowMin >= from && clock.nowMin <= to;

  return (
    <div className="dayview">
      <div className="dayview__meta">
        <button className={`daystatus daystatus--${ctx.status}`} onClick={onStatus}>
          <span className="daystatus__dot" />{ctx.status === 'low' ? 'Mało energii' : DAY_STATUS_LABEL[ctx.status as DayStatus] ?? 'Zwykły dzień'}
          {ctx.statusSource === 'care' && status === 'normal' ? <span className="dim"> · z Pulse Care</span> : null}
          <Icon name="chevron" size={14} style={{ transform: 'rotate(90deg)' }} />
        </button>
        <p className="dayview__cap">
          {ctx.mode === 'none' ? ctx.reason : <><strong className="num">{durationLabel(ctx.remainingMinutes)}</strong> realnie na rozwój{ctx.committedMinutes ? ` (zaplanowane ${durationLabel(ctx.committedMinutes)})` : ''}. {ctx.reason}</>}
        </p>
        {sessions.length > 0 && <p className="dayview__done small"><Icon name="check" size={14} /> Zrobione: {sessions.map((s) => durationLabel(s.active_seconds / 60)).join(' + ')}</p>}
      </div>

      <div className="timeline" style={{ height: (to - from) * PPM }}>
        {hours.map((h) => (
          <button key={h} className="timeline__hour" style={{ top: (h - from) * PPM }} onClick={() => onSlot(h % 1440)} aria-label={`Dodaj o ${hhmm(h)}`}>
            <span className="timeline__label num">{hhmm(h)}</span>
          </button>
        ))}
        {ctx.windows.map((w) => (
          <div key={w.start} className="timeline__window" style={{ top: (w.start - from) * PPM, height: (w.end - w.start) * PPM }} aria-hidden="true" />
        ))}
        {laid.map((it) => {
          const h = Math.max(26, (it.end - it.start) * PPM - 2);
          return (
            <button key={it.key} className={`tblock tblock--${it.variant}${it.status && it.status !== 'planned' ? ` is-${it.status}` : ''}`}
              style={{ top: (it.start - from) * PPM + 1, height: h, left: `calc(52px + (100% - 56px) * ${it.lane / it.lanes})`, width: `calc((100% - 56px) / ${it.lanes} - 4px)`, '--k': `var(--k-${it.kind})` } as React.CSSProperties}
              onClick={it.onClick}>
              {h > 44 && <span className="tblock__icon"><Icon name={KIND_ICON[it.kind] ?? 'more'} size={16} /></span>}
              <span className="tblock__text">
                <span className="tblock__title">{it.title}</span>
                {h > 40 && <span className="tblock__sub num">{it.sub}</span>}
              </span>
            </button>
          );
        })}
        {showNow && <div className="timeline__now" style={{ top: (clock.nowMin - from) * PPM }} aria-hidden="true" />}
      </div>
      <p className="dim xs timeline__legend"><span className="legend-swatch" /> Prześwitujące pasy to realne wolne okna — po regeneracji i z buforem.</p>
    </div>
  );
}

function WeekView({ date, onDay }: { date: string; onDay: (d: string) => void }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const stats = useMemo(() => weekStats(snap, date, clock.today), [snap, date, clock.today]);
  const days = weekDates(date);
  const from = 360;
  const span = 1080; // 06:00–24:00
  return (
    <div className="weekview">
      <div className="weekview__sum">
        <span><strong className="num">{stats.sessionCount}/{stats.adjustedTarget}</strong> sesji</span>
        <span><strong className="num">{durationLabel(stats.minutes)}</strong></span>
        <span>{stats.planRate == null ? 'plan: —' : <>plan <strong className="num">{Math.round(stats.planRate * 100)}%</strong></>}</span>
      </div>
      <ul className="weekrows">
        {days.map((d) => {
          const ctx = dayContext(snap, d, d === clock.today ? clock : undefined);
          const evs = snap.events.filter((e) => e.date === d && COMMITMENT_KINDS.includes(e.kind) && !['cancelled', 'moved'].includes(e.status));
          const mins = Math.round(snap.sessions.filter((s) => countsAsSession(s) && sessionDate(s, tz) === d).reduce((t, s) => t + s.active_seconds, 0) / 60);
          const strip = [
            ...ctx.blocks.map((b) => ({ s: b.start, e: b.end, k: b.kind, st: 'planned' })),
            ...evs.map((e) => ({ s: e.start_min, e: e.end_min, k: e.kind, st: e.status })),
          ];
          const load = ctx.workMinutes / 60;
          return (
            <li key={d}>
              <button className={`weekrow${d === clock.today ? ' is-today' : ''}${d < clock.today ? ' is-past' : ''}`} onClick={() => onDay(d)}>
                <span className="weekrow__day">
                  <span className="weekrow__wd">{WD_SHORT[weekday(d)]}</span>
                  <span className="weekrow__dn num">{parseDate(d).d}</span>
                </span>
                <span className="weekrow__main">
                  <span className="strip" aria-hidden="true">
                    {strip.map((b, i) => (
                      <span key={i} className={`strip__b${b.st !== 'planned' ? ` is-${b.st}` : ''}`} style={{ left: `${Math.max(0, (b.s - from) / span) * 100}%`, width: `${Math.max(0.8, (Math.min(b.e, from + span) - Math.max(b.s, from)) / span * 100)}%`, '--k': `var(--k-${b.k})` } as React.CSSProperties} />
                    ))}
                  </span>
                  <span className="weekrow__info">
                    {ctx.status !== 'normal' ? (ctx.status === 'low' ? 'Mało energii' : DAY_STATUS_LABEL[ctx.status as DayStatus]) : load > 0 ? `Praca ${Math.round(load * 10) / 10} h` : 'Bez pracy'}
                    {evs.length > 0 && ` · ${evs.length} ${plural(evs.length, 'blok', 'bloki', 'bloków')} rozwoju`}
                    {mins > 0 && <span className="weekrow__done"> · zrobione {durationLabel(mins)}</span>}
                  </span>
                </span>
                <span className={`loadmark loadmark--${ctx.mode}`} title={ctx.reason} aria-label={`Możliwości: ${ctx.reason}`} />
              </button>
            </li>
          );
        })}
      </ul>
      <div className="legend xs dim">
        <span><span className="loadmark loadmark--long" /> dzień na dłuższe tworzenie</span>
        <span><span className="loadmark loadmark--normal" /> jedna sesja</span>
        <span><span className="loadmark loadmark--light" /> najwyżej lekko</span>
        <span><span className="loadmark loadmark--none" /> bez planu</span>
      </div>
    </div>
  );
}

function MonthView({ date, onDay }: { date: string; onDay: (d: string) => void }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const first = monthStart(date);
  const n = daysInMonth(date);
  const lead = weekday(first);
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: n }, (_, i) => addDays(first, i))];
  while (cells.length % 7) cells.push(null);
  const minutesBy = new Map<string, number>();
  for (const s of snap.sessions) {
    if (!countsAsSession(s)) continue;
    const d = sessionDate(s, tz);
    if (d.slice(0, 7) === first.slice(0, 7)) minutesBy.set(d, (minutesBy.get(d) ?? 0) + s.active_seconds / 60);
  }
  const total = [...minutesBy.values()].reduce((a, b) => a + b, 0);
  const plannedBy = new Map<string, number>();
  for (const e of snap.events) if (e.date.slice(0, 7) === first.slice(0, 7) && (e.kind === 'music' || e.kind === 'training') && e.status === 'planned') plannedBy.set(e.date, (plannedBy.get(e.date) ?? 0) + 1);
  const goals = snap.goals.filter((g) => g.status === 'active' && (g.period === 'month' || (g.due_date && g.due_date.slice(0, 7) === first.slice(0, 7))));
  return (
    <div className="monthview">
      <div className="monthgrid" role="grid" aria-label="Miesiąc">
        {WD_SHORT.map((w) => <span key={w} className="monthgrid__wd" role="columnheader">{w}</span>)}
        {cells.map((d, i) => {
          if (!d) return <span key={i} className="monthgrid__cell is-empty" />;
          const ctx = dayContext(snap, d);
          const m = Math.round(minutesBy.get(d) ?? 0);
          const lvl = m === 0 ? 0 : m < 45 ? 1 : m < 120 ? 2 : 3;
          return (
            <button key={d} role="gridcell" className={`monthgrid__cell lvl-${lvl}${d === clock.today ? ' is-today' : ''} st-${ctx.status}`} onClick={() => onDay(d)}
              aria-label={`${longDate(d)}${m ? `, ${m} min pracy` : ''}${plannedBy.get(d) ? `, zaplanowane: ${plannedBy.get(d)}` : ''}`}>
              <span className="num">{parseDate(d).d}</span>
              {plannedBy.get(d) && d >= clock.today ? <span className="monthgrid__planned" /> : null}
              {ctx.status === 'sick' || ctx.status === 'vacation' || ctx.status === 'off' ? <span className="monthgrid__st" /> : null}
            </button>
          );
        })}
      </div>
      <div className="legend xs dim">
        <span><span className="mlegend lvl-1" /> do 45 min</span>
        <span><span className="mlegend lvl-2" /> do 2 h</span>
        <span><span className="mlegend lvl-3" /> ponad 2 h</span>
        <span><span className="mlegend mlegend--planned" /> zaplanowane</span>
      </div>
      <p className="small" style={{ marginTop: 16 }}>W tym miesiącu: <strong className="num">{durationLabel(total)}</strong> realnej pracy w <strong className="num">{minutesBy.size}</strong> {plural(minutesBy.size, 'dniu', 'dniach', 'dniach')}.</p>
      {goals.length > 0 && (
        <div className="stack" style={{ marginTop: 16 }}>
          <span className="field__label">Cele z terminem w tym miesiącu</span>
          {goals.map((g) => <button key={g.id} className="row row--action" onClick={() => navigate('/kariera/cele')}><span className="row__main"><span className="row__title">{g.title}</span></span></button>)}
        </div>
      )}
    </div>
  );
}
