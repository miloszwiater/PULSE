import { useState } from 'react';
import type { Insight } from '../../shared/domain/insights';
import { LESSON_BY_KEY } from '../../shared/catalog/academy';
import { patchProfile, startSession } from '../data/actions';
import { navigate } from '../app/router';
import { Button } from '../ui/kit';
import { toast } from '../ui/toast';

export function InsightView({ insight, compact }: { insight: Insight; compact?: boolean }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const a = insight.action;
  const lesson = a?.type === 'lesson' ? LESSON_BY_KEY[a.lesson_key] : null;
  return (
    <article className={`insight${compact ? ' insight--compact' : ''}`}>
      <p className="insight__kind">{insight.kind === 'observation' ? 'Z Twoich zapisów' : 'Hipoteza do sprawdzenia'}</p>
      <h3 className="insight__title">{insight.title}</h3>
      <p className="insight__body">{insight.body}</p>
      <div className="insight__actions">
        {a?.type === 'start' && <Button size="sm" variant="secondary" icon="play" onClick={() => { startSession({ minutes: a.minutes }); navigate('/sesja'); }}>Zacznij {a.minutes ? `${a.minutes} min` : 'sesję'}</Button>}
        {a?.type === 'return' && <Button size="sm" variant="secondary" onClick={() => navigate(`/towarzysz?q=${encodeURIComponent('Pomóż mi wrócić do muzyki')}`)}>Ułóż plan powrotu</Button>}
        {a?.type === 'plan_week' && <Button size="sm" variant="secondary" onClick={() => navigate('/plan?gen=1')}>Zaplanuj tydzień</Button>}
        {lesson && <Button size="sm" variant="secondary" onClick={() => navigate(`/nauka/${lesson.path}/${lesson.key}`)}>Otwórz lekcję</Button>}
        {a?.type === 'profile_patch' && (
          <Button size="sm" variant="secondary" onClick={() => { patchProfile(a.patch); toast(`${a.label} — zapisano.`, 'ok'); }}>{a.label}</Button>
        )}
        <button className="btn btn--quiet" aria-expanded={showEvidence} onClick={() => setShowEvidence(!showEvidence)}>{showEvidence ? 'Ukryj dane' : 'Na jakiej podstawie?'}</button>
      </div>
      {showEvidence && (
        <ul className="insight__evidence">
          {insight.evidence.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </article>
  );
}
