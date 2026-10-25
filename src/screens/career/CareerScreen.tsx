import { useMemo } from 'react';
import { roadmapView, artistStage } from '../../../shared/domain/roadmap';
import { goalProgress } from '../../../shared/domain/metrics';
import { STAGE_LABEL as ARTIST_STAGE } from '../../../shared/catalog/career';
import { useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { navigate } from '../../app/router';
import { Meter, Row, ScreenHeader, Section } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { shortDate, STAGE_LABEL } from '../../ui/format';

export function CareerScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const rm = useMemo(() => roadmapView(snap, clock.today), [snap, clock.today]);
  const stage = artistStage(snap);
  const phase = rm.phases[rm.actualPhase - 1];
  const goals = snap.goals.filter((g) => g.status === 'active').slice(0, 4);
  const releases = snap.projects.filter((p) => p.release_date && p.release_date >= clock.today).sort((a, b) => a.release_date!.localeCompare(b.release_date!));
  const promoOpen = snap.promo_tasks.filter((t) => t.status === 'todo' || t.status === 'doing').sort((a, b) => (a.due_date ?? '9').localeCompare(b.due_date ?? '9'));

  return (
    <div className="screen career">
      <ScreenHeader title="Kariera" sub={ARTIST_STAGE[stage]} />

      <button className="roadmap-hero" onClick={() => navigate('/kariera/roadmapa')}>
        <span className="roadmap-hero__day">
          <span className="display num">{rm.day ?? '—'}</span>
          <span className="dim small">/ 365</span>
        </span>
        <span className="roadmap-hero__phases" aria-hidden="true">
          {rm.phases.map((p) => (
            <span key={p.n} className={`roadmap-hero__ph${p.n === rm.actualPhase ? ' is-current' : ''}${p.done === p.total && p.total ? ' is-done' : ''}`}>
              <span style={{ width: `${p.total ? (p.done / p.total) * 100 : 0}%` }} />
            </span>
          ))}
        </span>
        <span className="roadmap-hero__text">
          <strong>Faza {rm.actualPhase}: {phase.title}</strong> — {phase.done}/{phase.total} kamieni milowych.
          {rm.calendarPhase && rm.calendarPhase !== rm.actualPhase ? ` Kalendarzowo to faza ${rm.calendarPhase} — liczy się realny postęp.` : ''}
        </span>
        <Icon name="chevron" size={18} />
      </button>

      <Section title="Cele" aside={<button className="btn btn--quiet" onClick={() => navigate('/kariera/cele')}>Wszystkie</button>}>
        {goals.length ? (
          <div className="list">
            {goals.map((g) => {
              const p = goalProgress(snap, g, clock.today);
              return (
                <button key={g.id} className="row row--action goal-row" onClick={() => navigate('/kariera/cele')}>
                  <span className="row__main">
                    <span className="row__title">{g.title}</span>
                    <Meter value={p.value} max={p.target} label={g.title} tone={p.ratio >= 1 ? 'ok' : 'violet'} />
                    <span className="row__sub num">{p.value}/{p.target}{g.due_date ? ` · do ${shortDate(g.due_date)}` : ''}{p.auto ? ' · liczone z danych' : ''}</span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : <p className="muted small">Dodaj cele — także pozamuzyczne, np. finansowe. Część liczy się automatycznie z sesji i projektów.</p>}
      </Section>

      <Section title="Promotion Academy" aside={<button className="btn btn--quiet" onClick={() => navigate('/kariera/promocja')}>Otwórz</button>}>
        {promoOpen.length ? (
          <div className="list">
            {promoOpen.slice(0, 3).map((t) => (
              <Row key={t.id} leading={<Icon name="megaphone" size={20} />} title={t.title} sub={`${t.channel || 'Promocja'}${t.due_date ? ` · do ${shortDate(t.due_date)}` : ''}`} onClick={() => navigate('/kariera/promocja')} />
            ))}
          </div>
        ) : <p className="muted small">Program nauki promocji dopasowany do etapu: {ARTIST_STAGE[stage].toLowerCase()}.</p>}
      </Section>

      <Section title="Nadchodzące premiery">
        {releases.length ? (
          <div className="list">
            {releases.map((p) => <Row key={p.id} leading={<Icon name="target" size={20} />} title={p.title} sub={`${shortDate(p.release_date!)} · ${STAGE_LABEL[p.stage]}`} onClick={() => navigate(`/kariera/promocja?release=${p.id}`)} />)}
          </div>
        ) : <p className="muted small">Ustaw datę premiery w karcie projektu, żeby przygotować plan wydania z konkretnymi zadaniami.</p>}
      </Section>
    </div>
  );
}
