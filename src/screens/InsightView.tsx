import { useState } from 'react';
import type { Insight } from '../../shared/domain/insights';
import { EXERCISE_BY_ID, CATEGORY_LABEL } from '../../shared/catalog/exercises';
import { skillLevelSchema } from '../../shared/schema';
import { patchProfile, putRow, startSession } from '../data/actions';
import { navigate } from '../app/router';
import { Button } from '../ui/kit';
import { toast } from '../ui/toast';

export function InsightView({ insight, compact }: { insight: Insight; compact?: boolean }) {
  const [showEvidence, setShowEvidence] = useState(false);
  const a = insight.action;
  return (
    <article className={`insight${compact ? ' insight--compact' : ''}`}>
      <p className="insight__kind">
        <span className={`tag ${insight.kind === 'observation' ? 'tag--blue' : 'tag--violet'}`}>{insight.kind === 'observation' ? 'Z danych' : 'Hipoteza'}</span>
      </p>
      <h3 className="insight__title">{insight.title}</h3>
      <p className="insight__body">{insight.body}</p>
      <div className="insight__actions">
        {a?.type === 'exercise' && EXERCISE_BY_ID[a.exercise_id] && (
          <>
            <Button size="sm" variant="secondary" icon="play" onClick={() => { startSession({ exercise_id: a.exercise_id }); navigate('/sesja'); }}>Zacznij: {EXERCISE_BY_ID[a.exercise_id].title}</Button>
          </>
        )}
        {a?.type === 'profile_patch' && (
          <Button size="sm" variant="secondary" onClick={() => { patchProfile(a.patch); toast(`${a.label} — zapisano.`, 'ok'); }}>{a.label}</Button>
        )}
        {a?.type === 'level' && (
          <Button size="sm" variant="secondary" onClick={() => {
            putRow('skill_levels', skillLevelSchema.parse({ id: a.category, updated_at: Date.now(), category: a.category, level: a.level, reason: insight.body }));
            toast(`${CATEGORY_LABEL[a.category]}: poziom ${a.level}.`, 'ok');
          }}>Ustaw poziom {a.level}</Button>
        )}
        {a?.type === 'plan_week' && <Button size="sm" variant="secondary" onClick={() => navigate('/plan?gen=1')}>Zaplanuj tydzień</Button>}
        <button className="btn btn--quiet" aria-expanded={showEvidence} onClick={() => setShowEvidence(!showEvidence)}>{showEvidence ? 'Ukryj dowody' : 'Na jakiej podstawie?'}</button>
      </div>
      {showEvidence && (
        <ul className="insight__evidence">
          {insight.evidence.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </article>
  );
}
