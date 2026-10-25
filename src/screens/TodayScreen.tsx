import { useMemo, useState } from 'react';
import { dayContext, nextFreeWindow } from '../../shared/domain/day';
import { weekStats } from '../../shared/domain/metrics';
import { insights } from '../../shared/domain/insights';
import { detectConflicts, resolveConflicts } from '../../shared/domain/planner';
import { activity, returnState } from '../../shared/domain/workflow';
import { addDays, durationLabel, hhmm, weekStart } from '../../shared/time';
import type { Proposal } from '../../shared/schema';
import { useStore } from '../data/store';
import { useClock } from '../data/clock';
import { activeSession, startSession } from '../data/actions';
import { navigate } from '../app/router';
import { Button, IconButton } from '../ui/kit';
import { NightScene } from '../ui/NightScene';
import { useScene } from '../ui/useScene';
import { Icon } from '../ui/Icon';
import { RhythmRing } from '../ui/Rhythm';
import { Wordmark } from '../ui/Wordmark';
import { longDate, plural } from '../ui/format';
import { CheckIn } from './CheckIn';
import { ProposalSheet } from './plan/ProposalSheet';
import { InsightView } from './InsightView';
import { SyncBadge } from './SyncBadge';

const PROMPTS = ['Nie mam dziś energii', 'Jutro pracuję dłużej', 'Mam wenę, chcę tworzyć', 'Pomóż mi wrócić do muzyki'];

let ringPlayed = false;

export function TodayScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const ctx = useMemo(() => dayContext(snap, clock.today, clock), [snap, clock]);
  const week = useMemo(() => weekStats(snap, clock.today, clock.today), [snap, clock.today]);
  const from = addDays(weekStart(clock.today), -21);
  const days = useMemo(() => activity(snap, from, addDays(weekStart(clock.today), 6)), [snap, from, clock.today]);
  const planned = useMemo(() => new Set(snap.events.filter((e) => e.kind === 'music' && e.status === 'planned' && e.date >= clock.today).map((e) => e.date)), [snap.events, clock.today]);
  const conflicts = useMemo(() => detectConflicts(snap, clock, 7), [snap, clock]);
  const top = useMemo(() => insights(snap, clock.today)[0], [snap, clock.today]);
  const ret = useMemo(() => returnState(snap, clock.today), [snap, clock.today]);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [message, setMessage] = useState('');
  const scene = useScene(clock.nowMin);
  const pending = snap.proposals.filter((p) => p.status === 'pending');
  const running = activeSession();
  const animate = !ringPlayed;
  ringPlayed = true;

  const todays = snap.events.filter((e) => e.date === clock.today && (e.kind === 'music' || e.kind === 'training') && e.status === 'planned' && e.end_min > clock.nowMin)
    .sort((a, b) => a.start_min - b.start_min);
  const next = todays[0] ?? null;
  const win = nextFreeWindow(ctx);
  const doneToday = days.find((d) => d.date === clock.today)?.minutes ?? 0;

  let headline: string;
  let detail: string;
  if (ctx.status === 'sick') { headline = 'Dziś zdrowie jest pierwsze.'; detail = 'Plan muzyki czeka. Te dni nie przerywają rytmu.'; }
  else if (ctx.status === 'off' || ctx.status === 'vacation') { headline = 'Dzień bez planu.'; detail = 'Nic nie jest zaplanowane. Jeśli przyjdzie ochota — Twórz jest pod ręką.'; }
  else if (ret.active) { headline = 'Wracamy bez nadrabiania.'; detail = `${ret.gapDays} dni bez muzyki. Wystarczy 20 minut na czymkolwiek, co już jest zaczęte.`; }
  else if (doneToday > 0) { headline = `Dziś już ${durationLabel(doneToday)} muzyki.`; detail = ctx.remainingMinutes >= 30 && win ? `Jeśli chcesz więcej, wolne jest ${hhmm(win.start)}–${hhmm(win.end)}.` : 'Reszta dnia może być odpoczynkiem.'; }
  else if (ctx.mode === 'none') { headline = 'Dziś bez muzyki.'; detail = ctx.reason; }
  else if (win && ctx.remainingMinutes >= 30) { headline = `Masz dziś ${durationLabel(ctx.remainingMinutes)} na muzykę.`; detail = `Najdłuższe okno: ${hhmm(win.start)}–${hhmm(win.end)}. ${ctx.reason}`; }
  else { headline = ctx.mode === 'light' ? 'Dziś najwyżej coś lekkiego.' : 'Dziś mało wolnego czasu.'; detail = ctx.reason; }

  const ask = (text: string) => navigate(`/towarzysz?q=${encodeURIComponent(text)}`);

  return (
    <div className="today">
      <section className="today__hero" aria-labelledby="today-h">
        <div className="today__scene" aria-hidden="true"><NightScene {...scene} /></div>
        <header className="today__top">
          <Wordmark size="md" />
          <div className="today__actions">
            <SyncBadge />
            <IconButton icon="chat" label="Towarzysz" onClick={() => navigate('/towarzysz')} />
          </div>
        </header>
        <p className="today__date">{longDate(clock.today)}</p>
        <h1 className="today__headline" id="today-h">{headline}</h1>
        <p className="today__detail">{detail}</p>
      </section>

      <div className="today__ring">
        <RhythmRing days={days} planned={planned} today={clock.today} animate={animate}>
          <span className="rr__count num">{week.sessionCount}<span className="rr__of">/{week.adjustedTarget}</span></span>
          <span className="rr__caption">{plural(week.sessionCount, 'sesja', 'sesje', 'sesji')} w tym tygodniu</span>
          <span className="rr__minutes num">{durationLabel(week.minutes)}</span>
        </RhythmRing>
        <p className="today__ring-legend">Pierścień to cztery tygodnie — na zewnątrz ten, od poniedziałku u góry.</p>
      </div>

      <div className="today__body">
        {(conflicts.length > 0 || pending.length > 0) && (
          <div className="notice-list">
            {conflicts.length > 0 && (
              <button className="notice" onClick={() => setProposal(resolveConflicts(snap, clock, conflicts))}>
                <Icon name="info" size={20} />
                <span><strong>{conflicts.length} {plural(conflicts.length, 'blok nie pasuje', 'bloki nie pasują', 'bloków nie pasuje')} do grafiku.</strong> {conflicts[0].reason}</span>
                <Icon name="chevron" size={18} />
              </button>
            )}
            {pending.length > 0 && (
              <button className="notice notice--violet" onClick={() => setProposal(pending[0])}>
                <Icon name="sparkle" size={20} />
                <span><strong>Do decyzji:</strong> {pending[0].title}</span>
                <Icon name="chevron" size={18} />
              </button>
            )}
          </div>
        )}

        <section className="now" aria-label="Teraz">
          {running ? (
            <Button variant="primary" size="lg" icon="play" block onClick={() => navigate('/sesja')}>Wróć do trwającej sesji</Button>
          ) : next ? (
            <>
              <button className="now__plan" onClick={() => navigate(`/plan?d=${clock.today}`)}>
                <span className="now__time num">{hhmm(next.start_min)}</span>
                <span className="now__what">
                  <span className="now__title">{next.title}</span>
                  <span className="now__sub">{durationLabel(next.end_min - next.start_min)}{next.priority === 3 ? ' · opcjonalnie' : ''}</span>
                </span>
                <Icon name="chevron" size={18} />
              </button>
              <Button variant="primary" size="lg" icon="play" block onClick={() => { startSession({ event: next }); navigate('/sesja'); }}>
                {next.lesson_key ? 'Zacznij naukę' : 'Zacznij teraz'}
              </Button>
            </>
          ) : (
            <Button variant="primary" size="lg" icon="play" block onClick={() => { startSession({ minutes: ret.active ? 20 : null }); navigate('/sesja'); }}>
              {ret.active ? 'Zacznij 20 minut' : 'Zacznij sesję'}
            </Button>
          )}
          {!running && <button className="now__more" onClick={() => navigate('/tworz')}>Wybierz długość albo swój workflow</button>}
        </section>

        <section className="talk" aria-labelledby="talk-h">
          <h2 className="talk__h" id="talk-h">Coś się zmieniło?</h2>
          <form className="talk__field" onSubmit={(e) => { e.preventDefault(); if (message.trim()) ask(message.trim()); }}>
            <input className="input" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Napisz zwyczajnie, np. „jutro pracuję 12 h”" maxLength={600} aria-label="Wiadomość do Towarzysza" enterKeyHint="send" />
            <IconButton icon="send" label="Wyślij" type="submit" disabled={!message.trim()} />
          </form>
          <div className="talk__prompts">
            {PROMPTS.map((p) => <button key={p} className="prompt" onClick={() => ask(p)}>{p}</button>)}
          </div>
        </section>

        <section className="today__energy" aria-labelledby="energy-h">
          <h2 className="section__title" id="energy-h">Jak się dziś czujesz?</h2>
          <CheckIn />
        </section>

        {top && (
          <section aria-label="Obserwacja">
            <InsightView insight={top} compact />
          </section>
        )}
      </div>

      <ProposalSheet open={!!proposal} proposal={proposal} onClose={() => setProposal(null)} transient={!!proposal && !snap.proposals.some((p) => p.id === proposal.id)} />
    </div>
  );
}
