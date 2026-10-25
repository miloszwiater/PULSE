import { useMemo, useState } from 'react';
import { streak, weekStats } from '../../../shared/domain/metrics';
import { allProgress } from '../../../shared/domain/academy';
import { activity, breaks, spontaneousShare } from '../../../shared/domain/workflow';
import { misses } from '../../../shared/domain/insights';
import { addDays, durationLabel, weekStart } from '../../../shared/time';
import { useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { navigate } from '../../app/router';
import { Row, ScreenHeader, Segmented } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { WD_SHORT, plural, shortDate } from '../../ui/format';

export function YouScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const p = snap.profile;
  const week = useMemo(() => weekStats(snap, clock.today, clock.today), [snap, clock.today]);
  const st = useMemo(() => streak(snap, clock.today), [snap, clock.today]);
  const name = p?.artist_name || p?.display_name || 'Ty';
  return (
    <div className="screen you">
      <header className="you__head">
        <span className="you__mono" aria-hidden="true">{name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h1 className="you__name">{name}</h1>
          <p className="you__style">{p?.music_style || p?.genres.join(', ') || 'Opisz swoją muzykę w profilu'}</p>
        </div>
      </header>

      <button className="you__rhythm" onClick={() => navigate('/ty/rytm')}>
        <span className="you__fig"><span className="num">{week.sessionCount}/{week.adjustedTarget}</span><span>sesji w tym tygodniu</span></span>
        <span className="you__fig"><span className="num">{durationLabel(week.minutes)}</span><span>muzyki w tym tygodniu</span></span>
        <span className="you__fig"><span className="num">{st.current}</span><span>{plural(st.current, 'tydzień', 'tygodnie', 'tygodni')} rytmu z rzędu</span></span>
        <Icon name="chevron" size={18} />
      </button>

      <div className="list">
        <Row leading={<Icon name="chart" />} title="Rytm i historia" sub="Regularność, przerwy i powroty, realizacja planu" onClick={() => navigate('/ty/rytm')} />
        <Row leading={<Icon name="folder" />} title="Projekty" sub="Albumy, EP-ki, teksty" onClick={() => navigate('/projekty')} />
        <Row leading={<Icon name="focus" />} title="Skupienie" sub="Rozpraszacze, skrót iOS, bloki dnia" onClick={() => navigate('/skupienie')} />
        <Row leading={<Icon name="heart" />} title="Samopoczucie" sub="Energia, choroba, historia" onClick={() => navigate('/care')} />
        <Row leading={<Icon name="chat" />} title="Towarzysz" sub="Napisz, co się zmieniło — plan się dopasuje" onClick={() => navigate('/towarzysz')} />
        <Row leading={<Icon name="user" />} title="Profil i muzyka" sub="Styl, inspiracje, rytm docelowy, tło" onClick={() => navigate('/profil')} />
        <Row leading={<Icon name="settings" />} title="Ustawienia" sub="Powiadomienia, dane, konto" onClick={() => navigate('/ustawienia')} />
      </div>
    </div>
  );
}

type Range = 12 | 26;

export function RhythmScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const [weeks, setWeeks] = useState<Range>(12);
  const end = addDays(weekStart(clock.today), 6);
  const from = addDays(weekStart(clock.today), -7 * (weeks - 1));
  const days = useMemo(() => activity(snap, from, end), [snap, from, end]);
  const st = useMemo(() => streak(snap, clock.today, weeks), [snap, clock.today, weeks]);
  const br = useMemo(() => breaks(snap, clock.today).slice(0, 6), [snap, clock.today]);
  const sp = useMemo(() => spontaneousShare(snap, clock.today), [snap, clock.today]);
  const ms = useMemo(() => misses(snap, clock.today), [snap, clock.today]);
  const learning = useMemo(() => allProgress(snap).filter((p) => p.state !== 'new'), [snap]);
  const booksDone = snap.books.filter((b) => b.status === 'read');
  const start = snap.profile?.start_date ?? clock.today;
  const weeksStats = useMemo(() => Array.from({ length: Math.min(weeks, 8) }, (_, i) => addDays(weekStart(clock.today), -7 * i))
    .filter((ws) => addDays(ws, 6) >= start)
    .map((ws) => weekStats(snap, ws, clock.today)), [snap, clock.today, weeks, start]);
  const total = days.reduce((t, d) => t + d.minutes, 0);
  const activeDays = days.filter((d) => d.minutes > 0).length;
  const max = Math.max(60, ...days.map((d) => d.minutes));
  const cols = Array.from({ length: weeks }, (_, w) => days.slice(w * 7, w * 7 + 7));
  const plannedDone = weeksStats.reduce((t, w) => t + w.fulfilled + w.partial * 0.5, 0);
  const plannedAll = weeksStats.reduce((t, w) => t + w.fulfilled + w.partial + w.skipped + w.commitments.filter((e) => e.status === 'planned' && e.date < clock.today).length, 0);

  return (
    <div className="screen rhythm">
      <ScreenHeader title="Rytm" onBack />
      <Segmented label="Zakres" value={String(weeks) as '12' | '26'} onChange={(v) => setWeeks(Number(v) as Range)} options={[{ value: '12', label: '12 tygodni' }, { value: '26', label: 'Pół roku' }]} />

      <section className="block" aria-labelledby="heat-h">
        <h2 className="block__title" id="heat-h">{activeDays} {plural(activeDays, 'dzień', 'dni', 'dni')} z muzyką · {durationLabel(total)}</h2>
        <div className="heat" role="img" aria-label={`Mapa dni z muzyką z ostatnich ${weeks} tygodni`}>
          <div className="heat__wd" aria-hidden="true">{WD_SHORT.map((d, i) => <span key={d}>{i % 2 === 0 ? d : ''}</span>)}</div>
          <div className="heat__grid" style={{ gridTemplateColumns: `repeat(${weeks}, 1fr)` }}>
            {cols.map((col, w) => (
              <div key={w} className="heat__col">
                {col.map((d) => (
                  <span key={d.date} title={`${d.date}: ${d.minutes} min`}
                    className={`heat__cell${d.minutes ? ' is-on' : ''}${d.protected && d.date >= start ? ' is-protected' : ''}${d.date > clock.today || d.date < start ? ' is-future' : ''}${d.date === clock.today ? ' is-today' : ''}`}
                    style={d.minutes ? ({ '--k': (0.25 + 0.75 * Math.min(1, d.minutes / max)).toFixed(2) } as React.CSSProperties) : undefined} />
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="heat__legend"><span className="lg lg--on" /> muzyka <span className="lg lg--prot" /> choroba / urlop / wolne <span className="lg" /> bez muzyki</p>
      </section>

      <section className="figs3">
        <div><span className="num">{st.current}</span><span>{plural(st.current, 'tydzień', 'tygodnie', 'tygodni')} rytmu z rzędu</span></div>
        <div><span className="num">{st.best}</span><span>najdłuższa seria</span></div>
        <div><span className="num">{plannedAll ? `${Math.round((plannedDone / plannedAll) * 100)}%` : '—'}</span><span>planu zrealizowane (8 tyg.)</span></div>
        <div><span className="num">{sp.spontaneous}</span><span>spontanicznych sesji (28 dni)</span></div>
      </section>
      <p className="dim xs">Tydzień „w rytmie” = tyle sesji, ile wynosi rytm docelowy, pomniejszony o dni choroby, urlopu i wolne. Takie dni nigdy nie przerywają serii. Sesje krótsze niż 10 minut zostają w historii, ale się nie liczą.</p>

      <section className="block" aria-labelledby="weeks-h">
        <h2 className="block__title" id="weeks-h">Tygodnie</h2>
        <ul className="weeks">
          {weeksStats.map((w) => (
            <li key={w.weekStart} className={`week week--${w.state}`}>
              <span className="week__date">{shortDate(w.weekStart)}</span>
              <span className="week__bar" aria-hidden="true">{Array.from({ length: Math.max(w.adjustedTarget, w.sessionCount) }, (_, i) => <span key={i} className={i < w.sessionCount ? 'is-on' : ''} />)}</span>
              <span className="week__val num">{w.sessionCount}/{w.adjustedTarget}</span>
              <span className="week__state">{w.state === 'kept' ? 'w rytmie' : w.state === 'protected' ? 'chroniony' : w.state === 'in_progress' ? 'trwa' : 'poza rytmem'}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="block" aria-labelledby="br-h">
        <h2 className="block__title" id="br-h">Przerwy i powroty</h2>
        {br.length ? (
          <ul className="breaks">
            {br.map((b) => (
              <li key={b.from}>
                <span className="breaks__span">{shortDate(b.from)} – {shortDate(b.to)}</span>
                <span className="breaks__what">{b.days} dni{b.protectedDays ? `, w tym ${b.protectedDays} chronionych` : ''}</span>
                <span className="breaks__back">{b.returnedOn ? `powrót ${shortDate(b.returnedOn)}` : 'trwa — bez nadrabiania'}</span>
              </li>
            ))}
          </ul>
        ) : <p className="muted small">Brak przerw dłuższych niż tydzień.</p>}
      </section>

      {ms.length > 0 && (
        <section className="block" aria-labelledby="ms-h">
          <h2 className="block__title" id="ms-h">Pominięte bloki (28 dni)</h2>
          <p className="muted small">{ms.filter((m) => m.reason !== 'capacity').length} w ciężkie dni lub przy gorszym samopoczuciu, {ms.filter((m) => m.reason === 'capacity').length} w dni z wolnym czasem. To informacja, nie ocena.</p>
        </section>
      )}

      <section className="block" aria-labelledby="ln-h">
        <h2 className="block__title" id="ln-h">Nauka</h2>
        {learning.length || booksDone.length ? (
          <div className="list">
            {learning.map((p) => <Row key={p.path.key} title={p.path.title} sub={p.state === 'paused' ? 'wstrzymana' : p.state === 'done' ? 'ukończona' : 'w toku'} trailing={<span className="num">{p.done}/{p.total}</span>} onClick={() => navigate(`/nauka/${p.path.key}`)} />)}
            {booksDone.length > 0 && <Row title="Ukończone książki" sub={booksDone.slice(0, 3).map((b) => b.title).join(', ')} trailing={<span className="num">{booksDone.length}</span>} onClick={() => navigate('/nauka/ksiazki')} />}
          </div>
        ) : <p className="muted small">Nauka jest opcjonalna — tu pojawi się postęp ścieżek i przeczytane książki.</p>}
      </section>
    </div>
  );
}
