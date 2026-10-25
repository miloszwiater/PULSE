import { useMemo } from 'react';
import { categoryStats, progressionAdvice, recommendExercises } from '../../../shared/domain/training';
import { CATEGORY_LABEL, CATEGORY_SHORT, LEVEL_LABEL } from '../../../shared/catalog/exercises';
import { rangeStats } from '../../../shared/domain/metrics';
import { addDays, durationLabel } from '../../../shared/time';
import { useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { navigate } from '../../app/router';
import { Button, Row, ScreenHeader, Section } from '../../ui/kit';
import { Cover } from '../../ui/Cover';
import { startSession } from '../../data/actions';
import { Icon } from '../../ui/Icon';
import { BOOK_STATUS_LABEL } from '../../../shared/domain/library';

export function LevelDots({ level }: { level: number }) {
  return (
    <span className="level-dots" aria-label={`Poziom ${level} z 4`}>
      {[1, 2, 3, 4].map((i) => <span key={i} className={i <= level ? 'is-on' : ''} />)}
    </span>
  );
}

export function GrowthScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const stats = useMemo(() => categoryStats(snap, clock.today), [snap, clock.today]);
  const recs = useMemo(() => recommendExercises(snap, clock.today, { limit: 5 }), [snap, clock.today]);
  const month = useMemo(() => rangeStats(snap, addDays(clock.today, -29), clock.today, clock.today), [snap, clock.today]);
  const reading = snap.books.filter((b) => b.status === 'reading');
  const maxMin = Math.max(1, ...stats.map((s) => month.byCategory[s.category] ?? 0));

  return (
    <div className="screen growth">
      <ScreenHeader title="Rozwój" sub="Umiejętności rosną od prób i ocen, nie od samego czasu." />

      {recs[0] && (
        <article className="feature" aria-label="Dzisiejsze ćwiczenie">
          <div className="feature__head"><span>Dzisiejsze ćwiczenie</span><button className="icon-btn" aria-label="Szczegóły ćwiczenia" onClick={() => navigate(`/rozwoj/obszar/${recs[0].exercise.category}?ex=${recs[0].exercise.id}`)}><Icon name="chevron" size={18} /></button></div>
          <div className="feature__main">
            <Cover seed={recs[0].exercise.id} tone={recs[0].exercise.category} size={76} radius={16} />
            <div className="feature__text">
              <p className="feature__title">{recs[0].exercise.title}</p>
              <p className="feature__meta"><span className="tag tag--violet">{CATEGORY_SHORT[recs[0].exercise.category]}</span> <span className="tag"><Icon name="clock" size={12} /> {recs[0].exercise.minutes} min</span></p>
            </div>
          </div>
          <ul className="feature__steps">
            {recs[0].exercise.steps.slice(0, 3).map((st, i) => <li key={i}><Icon name="check" size={14} /> <span>{st}</span></li>)}
          </ul>
          {recs[0].reasons[0] && <p className="dim xs">Dlaczego teraz: {recs[0].reasons.join(', ')}.</p>}
          <Button variant="primary" size="lg" block icon="play" onClick={() => { startSession({ exercise_id: recs[0].exercise.id }); navigate('/sesja'); }}>Rozpocznij ćwiczenie</Button>
        </article>
      )}

      <Section title="Pięć obszarów">
        <ul className="skills">
          {stats.map((s) => {
            const adv = progressionAdvice(snap, s.category);
            const mins = month.byCategory[s.category] ?? 0;
            return (
              <li key={s.category}>
                <button className="skill" onClick={() => navigate(`/rozwoj/obszar/${s.category}`)}>
                  <span className="skill__top">
                    <span className="skill__name">{CATEGORY_LABEL[s.category]}</span>
                    <LevelDots level={s.level} />
                  </span>
                  <span className="skill__bar" aria-hidden="true"><span style={{ width: `${(mins / maxMin) * 100}%` }} /></span>
                  <span className="skill__meta">
                    {LEVEL_LABEL[s.level]} · {mins ? `${durationLabel(mins)} w 30 dni` : 'brak pracy w 30 dni'}
                    {s.daysSince != null && s.daysSince > 0 ? ` · ${s.daysSince} dni temu` : s.daysSince === 0 ? ' · dziś' : ''}
                    {adv && <span className="skill__adv"> · {adv.kind === 'level_up' ? 'gotowe na wyższy poziom' : adv.kind === 'step_back' ? 'powrót do fundamentów' : 'zmień metodę'}</span>}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        <p className="dim xs">Pasek pokazuje czas sesji z przypisanym obszarem w ostatnich 30 dniach — to ilość pracy, nie miara jakości.</p>
      </Section>

      <Section title="Polecane ćwiczenia" aside={<button className="btn btn--quiet" onClick={() => navigate(`/rozwoj/obszar/${recs[0]?.exercise.category ?? 'songwriting'}`)}>Wszystkie</button>}>
        <div className="exlist">
          {recs.slice(1).map((r) => (
            <div key={r.exercise.id} className="exitem">
              <button className="exitem__main" onClick={() => navigate(`/rozwoj/obszar/${r.exercise.category}?ex=${r.exercise.id}`)}>
                <Cover seed={r.exercise.id} tone={r.exercise.category} size={56} />
                <span className="exitem__text">
                  <span className="exitem__title">{r.exercise.title}</span>
                  <span className="exitem__meta"><Icon name="clock" size={12} /> {r.exercise.minutes} min <span className="tag tag--violet">{CATEGORY_SHORT[r.exercise.category]}</span></span>
                </span>
              </button>
              <button className="playbtn" aria-label={`Zacznij: ${r.exercise.title}`} onClick={() => { startSession({ exercise_id: r.exercise.id }); navigate('/sesja'); }}><Icon name="play" size={16} fill="currentColor" /></button>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Warsztat poza beatem">
        <div className="list">
          <Row leading={<Icon name="book" />} title="Biblioteka" sub={reading.length ? `Czytam: ${reading.map((b) => b.title).join(', ')}` : `${snap.books.length ? `${snap.books.length} pozycji · ${BOOK_STATUS_LABEL.reading.toLowerCase()}: 0` : 'Książki i poezja dobrane do etapu'}`} onClick={() => navigate('/rozwoj/biblioteka')} />
          <Row leading={<Icon name="user" />} title="Styl artysty" sub="Inspiracje, techniki, własny charakter" onClick={() => navigate('/rozwoj/styl')} />
          <Row leading={<Icon name="chart" />} title="Statystyki i raporty" sub={`${month.sessionCount} sesji i ${durationLabel(month.minutes)} w 30 dni`} onClick={() => navigate('/rozwoj/statystyki')} />
        </div>
      </Section>
    </div>
  );
}
