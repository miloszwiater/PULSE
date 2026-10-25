import { useMemo } from 'react';
import { categoryStats, progressionAdvice, recommendExercises } from '../../../shared/domain/training';
import { CATEGORY_LABEL, CATEGORY_SHORT, LEVEL_LABEL } from '../../../shared/catalog/exercises';
import { rangeStats } from '../../../shared/domain/metrics';
import { addDays, durationLabel } from '../../../shared/time';
import { useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { navigate } from '../../app/router';
import { Row, ScreenHeader, Section } from '../../ui/kit';
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
  const recs = useMemo(() => recommendExercises(snap, clock.today, { limit: 3 }), [snap, clock.today]);
  const month = useMemo(() => rangeStats(snap, addDays(clock.today, -29), clock.today, clock.today), [snap, clock.today]);
  const reading = snap.books.filter((b) => b.status === 'reading');
  const maxMin = Math.max(1, ...stats.map((s) => month.byCategory[s.category] ?? 0));

  return (
    <div className="screen growth">
      <ScreenHeader title="Rozwój" sub="Umiejętności rosną od prób i ocen, nie od samego czasu." />

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

      <Section title="Polecane teraz">
        <div className="list">
          {recs.map((r) => (
            <Row key={r.exercise.id} title={r.exercise.title}
              sub={`${CATEGORY_SHORT[r.exercise.category]} · poziom ${r.exercise.level} · ${r.exercise.minutes} min${r.reasons.length ? ` · ${r.reasons.join(', ')}` : ''}`}
              onClick={() => navigate(`/rozwoj/obszar/${r.exercise.category}?ex=${r.exercise.id}`)} />
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
