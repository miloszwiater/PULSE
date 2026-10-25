import { useMemo, useState } from 'react';
import { SKILL_CATEGORIES, OUTCOMES } from '../../../shared/schema';
import { goalProgress, rangeStats, streak, weekStats } from '../../../shared/domain/metrics';
import { blocksFor, effectiveStatus } from '../../../shared/domain/day';
import { insights } from '../../../shared/domain/insights';
import { CATEGORY_LABEL } from '../../../shared/catalog/exercises';
import { addDays, daysBetween, durationLabel, monthStart, daysInMonth, weekStart, mergeIntervals } from '../../../shared/time';
import { useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { navigate } from '../../app/router';
import { Button, IconButton, ScreenHeader, Section, Segmented } from '../../ui/kit';
import { OUTCOME_LABEL, plural, shortDate } from '../../ui/format';

type Period = 'week' | 'month' | 'd30' | 'all';

export function StatsScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const [period, setPeriod] = useState<Period>('week');
  const [offset, setOffset] = useState(0);
  const start = snap.profile?.start_date ?? clock.today;
  const range = useMemo(() => {
    if (period === 'week') { const f = addDays(weekStart(clock.today), offset * 7); return { from: f, to: addDays(f, 6) }; }
    if (period === 'month') {
      const base = monthStart(clock.today);
      const [y, m] = base.split('-').map(Number);
      const d = new Date(Date.UTC(y, m - 1 + offset, 1)).toISOString().slice(0, 10);
      return { from: d, to: addDays(d, daysInMonth(d) - 1) };
    }
    if (period === 'd30') return { from: addDays(clock.today, -29), to: clock.today };
    return { from: start, to: clock.today };
  }, [period, offset, clock.today, start]);
  const r = useMemo(() => rangeStats(snap, range.from, range.to, clock.today), [snap, range, clock.today]);
  const st = useMemo(() => streak(snap, clock.today), [snap, clock.today]);
  const outcomes = useMemo(() => {
    const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
    const m: Record<string, number> = {};
    for (const s of snap.sessions) {
      if (s.status !== 'finished' || s.active_seconds < 600 || s.outcome === 'none') continue;
      const d = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date(s.started_at));
      if (d >= range.from && d <= range.to) m[s.outcome] = (m[s.outcome] ?? 0) + 1;
    }
    return m;
  }, [snap, range]);
  const maxCat = Math.max(1, ...SKILL_CATEGORIES.map((c) => r.byCategory[c] ?? 0));
  const catTotal = SKILL_CATEGORIES.reduce((t, c) => t + (r.byCategory[c] ?? 0), 0);
  const label = period === 'week' ? `${shortDate(range.from)} – ${shortDate(range.to)}` : period === 'month' ? new Date(range.from + 'T12:00:00Z').toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' }) : period === 'd30' ? 'Ostatnie 30 dni' : `Od startu (${daysBetween(start, clock.today) + 1} dni)`;

  return (
    <div className="screen stats">
      <ScreenHeader title="Statystyki" onBack />
      <Segmented label="Okres" value={period} onChange={(v) => { setPeriod(v); setOffset(0); }} options={[{ value: 'week', label: 'Tydzień' }, { value: 'month', label: 'Miesiąc' }, { value: 'd30', label: '30 dni' }, { value: 'all', label: 'Całość' }]} />
      {(period === 'week' || period === 'month') ? (
        <div className="datenav">
          <IconButton icon="back" label="Wcześniej" onClick={() => setOffset(offset - 1)} />
          <span className="datenav__title">{label}</span>
          <IconButton icon="chevron" label="Później" disabled={offset >= 0} onClick={() => setOffset(Math.min(0, offset + 1))} />
        </div>
      ) : <p className="muted small" style={{ margin: '12px 0' }}>{label}</p>}

      <dl className="figs">
        <div><dt>Realny czas twórczy</dt><dd className="num">{durationLabel(r.minutes)}</dd><span className="figs__note">suma sesji ≥ 10 min</span></div>
        <div><dt>Sesje</dt><dd className="num">{r.sessionCount}</dd><span className="figs__note">timer i wpisy ręczne</span></div>
        <div><dt>Realizacja planu</dt><dd className="num">{r.commitmentsTotal ? `${r.commitmentsFulfilled}/${r.commitmentsTotal}` : '—'}</dd><span className="figs__note">{r.commitmentsTotal ? `${Math.round((r.commitmentsFulfilled / r.commitmentsTotal) * 100)}% zaplanowanych bloków` : 'brak minionych zobowiązań'}</span></div>
        <div><dt>Regularność</dt><dd className="num">{st.current} {plural(st.current, 'tydz.', 'tyg.', 'tyg.')}</dd><span className="figs__note">najlepiej {st.best}, łącznie {st.keptTotal}</span></div>
      </dl>

      <Section title="Tygodnie">
        <div className="weeks-strip" role="list" aria-label="Ostatnie tygodnie">
          {[...st.history].reverse().slice(-16).map((h) => (
            <span key={h.weekStart} role="listitem" className={`weeks-strip__w is-${h.state}`} title={`${shortDate(h.weekStart)}: ${h.sessions}/${h.target}`} aria-label={`Tydzień od ${shortDate(h.weekStart)}: ${h.sessions} z ${h.target} — ${STATE_LABEL[h.state]}`}>
              <span className="num">{h.sessions}</span>
            </span>
          ))}
        </div>
        <div className="legend xs dim">
          <span><span className="wsl is-kept" /> utrzymany</span><span><span className="wsl is-missed" /> poniżej celu</span>
          <span><span className="wsl is-protected" /> chroniony</span><span><span className="wsl is-in_progress" /> w toku</span>
        </div>
      </Section>

      <Section title="Obszary">
        {catTotal === 0 ? <p className="muted small">Brak sesji z przypisanym obszarem w tym okresie.</p> : (
          <ul className="bars">
            {SKILL_CATEGORIES.map((c) => (
              <li key={c}>
                <span className="bars__label">{CATEGORY_LABEL[c]}</span>
                <span className="bars__track"><span style={{ width: `${((r.byCategory[c] ?? 0) / maxCat) * 100}%` }} /></span>
                <span className="bars__val num">{r.byCategory[c] ? durationLabel(r.byCategory[c]!) : '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Rezultaty">
        <div className="cluster">
          {OUTCOMES.filter((o) => outcomes[o]).map((o) => <span key={o} className="tag tag--violet">{OUTCOME_LABEL[o]}: {outcomes[o]}</span>)}
          <span className="tag">Przeczytane: {r.booksRead}</span>
          <span className="tag">Promocja: {r.promoDone}</span>
          <span className="tag">Ćwiczenia: {r.attempts}</span>
        </div>
        {!Object.keys(outcomes).length && <p className="muted small" style={{ marginTop: 8 }}>Brak deklarowanych rezultatów w tym okresie.</p>}
      </Section>

      {period === 'week' && <WeekReport weekOf={range.from} />}
      {period === 'month' && <MonthReport from={range.from} to={range.to} />}

      <Section title="Jak liczymy">
        <ul className="method">
          <li>Czas pochodzi wyłącznie z zapisanych sesji (timer albo wpis ręczny). Sesje krótsze niż 10 minut są zapisane, ale nie liczą się do regularności.</li>
          <li>Zadanie z planu pokryte spontaniczną sesją liczy się jako zrealizowane, ale jego czas nie jest dodawany drugi raz.</li>
          <li>Realizacja planu = zrobione lub pokryte ÷ minione zobowiązania. Usprawiedliwione i przeniesione nie wchodzą do mianownika.</li>
          <li>Tydzień jest utrzymany, gdy liczba sesji osiąga cel tygodnia skorygowany o dni chronione (wolne, choroba, urlop). Tydzień w całości chroniony nie przerywa serii.</li>
          <li>Godziny to ilość pracy, nie dowód poprawy jakości. Jakość oceniasz Ty — przez oceny ćwiczeń i rezultaty.</li>
        </ul>
      </Section>
    </div>
  );
}

const STATE_LABEL = { kept: 'utrzymany', missed: 'poniżej celu', protected: 'chroniony', in_progress: 'w toku' } as const;

function WeekReport({ weekOf }: { weekOf: string }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const w = useMemo(() => weekStats(snap, weekOf, clock.today), [snap, weekOf, clock.today]);
  const cats = Object.entries(w.byCategory).sort((a, b) => b[1] - a[1]);
  const care = snap.care.filter((c) => c.date >= weekOf && c.date <= addDays(weekOf, 6) && c.signal !== 'energized');
  const top = insights(snap, clock.today)[0];
  let change: string;
  if (w.state === 'missed') change = `Cel ${w.adjustedTarget} sesji nie został osiągnięty (${w.sessionCount}). Zamiast dokładać — zaplanuj sesje tylko na dni z realnym oknem albo obniż cel o jedną sesję.`;
  else if (w.state === 'kept' && w.sessionCount >= w.adjustedTarget + 2) change = 'Cel był wyraźnie przekroczony. Jeśli to nie kosztowało regeneracji, można rozważyć jedną sesję więcej — albo skierować nadwyżkę na domykanie utworu.';
  else if (top) change = `${top.title}: ${top.body}`;
  else change = 'Utrzymaj rytm. Jedna zmiana naraz: wybierz obszar, który najdłużej czeka, na pierwszą sesję tygodnia.';
  return (
    <Section title="Raport tygodnia" aside={<Button size="sm" variant="ghost" icon="mentor" onClick={() => navigate('/mentor?review=1')}>Przegląd mentora</Button>}>
      <div className="report">
        <div><h3>Wykonane</h3><p>{w.sessionCount} z {w.adjustedTarget} sesji, {durationLabel(w.minutes)}. Plan: {w.fulfilled} zrealizowane, {w.partial} częściowo, {w.skipped} pominięte{w.excused ? `, ${w.excused} usprawiedliwione` : ''}.</p></div>
        <div><h3>Rozwijane umiejętności</h3><p>{cats.length ? cats.map(([c, m]) => `${CATEGORY_LABEL[c as keyof typeof CATEGORY_LABEL]} (${durationLabel(m)})`).join(', ') : 'Brak sesji z przypisanym obszarem.'}</p></div>
        <div><h3>Przeszkody</h3><p>{[
          w.skipped ? `${w.skipped} ${plural(w.skipped, 'pominięte zadanie', 'pominięte zadania', 'pominiętych zadań')}` : '',
          w.protectedDays - w.preStartDays > 0 ? `${w.protectedDays - w.preStartDays} ${plural(w.protectedDays - w.preStartDays, 'dzień chroniony', 'dni chronione', 'dni chronionych')}` : '',
          care.length ? `sygnały zmęczenia: ${care.length}` : '',
        ].filter(Boolean).join(', ') || 'Nic nie zostało zgłoszone.'}</p></div>
        <div><h3>Zmiana na kolejny tydzień</h3><p>{change}</p></div>
      </div>
    </Section>
  );
}

function MonthReport({ from, to }: { from: string; to: string }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const data = useMemo(() => {
    let workMin = 0;
    let protectedDays = 0;
    let restBlocks = 0;
    for (let d = from; d <= to && d <= clock.today; d = addDays(d, 1)) {
      const b = blocksFor(snap, d).filter((x) => x.kind === 'work' || x.kind === 'commute');
      workMin += mergeIntervals(b.map((x) => ({ start: Math.max(0, x.start), end: Math.min(1440, x.end) }))).reduce((t, i) => t + i.end - i.start, 0);
      const s = effectiveStatus(snap, d).status;
      if (s === 'sick' || s === 'vacation' || s === 'off') protectedDays++;
      restBlocks += snap.events.filter((e) => e.date === d && e.kind === 'rest').length;
    }
    return { workMin, protectedDays, restBlocks };
  }, [snap, from, to, clock.today]);
  const r = rangeStats(snap, from, to, clock.today);
  const goals = snap.goals.filter((g) => g.status === 'active');
  return (
    <Section title="Raport miesiąca">
      <div className="report">
        <div><h3>Twórczość</h3><p>{durationLabel(r.minutes)} w {r.sessionCount} sesjach. Dema: {r.demos}, ukończone utwory: {r.finishedTracks}.</p></div>
        <div><h3>Praca</h3><p>{durationLabel(data.workMin)} pracy i dojazdów według grafiku.</p></div>
        <div><h3>Regeneracja</h3><p>{data.protectedDays} {plural(data.protectedDays, 'dzień chroniony', 'dni chronione', 'dni chronionych')}{data.restBlocks ? `, ${data.restBlocks} zaplanowanych bloków odpoczynku` : ''}. Odpoczynek nie jest porażką — chroni roczny rytm.</p></div>
        <div><h3>Cele</h3><p>{goals.length ? goals.slice(0, 5).map((g) => { const p = goalProgress(snap, g, clock.today); return `${g.title}: ${p.value}/${p.target}`; }).join(' · ') : 'Brak aktywnych celów.'}</p></div>
      </div>
    </Section>
  );
}
