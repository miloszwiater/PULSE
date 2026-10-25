import { useState } from 'react';
import type { Proposal } from '../../../shared/schema';
import { generateMonthPlan } from '../../../shared/domain/planner';
import { hhmm, parseHHMM } from '../../../shared/time';
import { useProfile, useStore } from '../../data/store';
import { clockNow } from '../../data/clock';
import { patchProfile } from '../../data/actions';
import { Button, Chip, Field, Row, Sheet } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { RoutinesSheet } from './RoutinesSheet';

/**
 * Fresh start for planning (concept v3): work schedule, availability, the
 * rhythm of making music and optional learning. Nothing is generated from old
 * assumptions — the proposal is built from these answers and still needs approval.
 */
export function PlanSetupSheet({ open, onClose, onPlan }: { open: boolean; onClose: () => void; onPlan: (p: Proposal | null) => void }) {
  const p = useProfile();
  const routines = useStore((s) => s.snap.routines.filter((r) => r.active && r.kind === 'work').length);
  const [routinesOpen, setRoutinesOpen] = useState(false);
  if (!p) return null;
  return (
    <>
      <Sheet open={open && !routinesOpen} onClose={onClose} title="Ułóż nowy plan" tall
        footer={<Button variant="primary" block icon="sparkle" onClick={() => { onPlan(generateMonthPlan(useStore.getState().snap, clockNow()).proposal); onClose(); }}>Zobacz propozycję do końca miesiąca</Button>}>
        <p className="muted small">Plan ma tylko jedną aktywność twórczą: swobodną sesję w Creative Workflow — bez zadań, wersów i kategorii. Obok niej mieszczą się praca, regeneracja, czas prywatny i opcjonalna nauka. Wszystko, co zaproponuję, wymaga Twojej zgody.</p>

        <div className="stack">
          <span className="field__label">Praca i inne obowiązki</span>
          <div className="list">
            <Row leading={<Icon name="calendar" />} title="Stały grafik" sub={routines ? `Bloków pracy: ${routines}` : 'Nie dodano jeszcze grafiku pracy'} onClick={() => setRoutinesOpen(true)} />
          </div>
          <span className="field__hint">Zmiany w pojedyncze dni (np. dłuższa zmiana) dodasz w Planie albo napiszesz do Towarzysza.</span>
        </div>

        <div className="field-row">
          <Field label="Pobudka"><input className="input" type="time" defaultValue={hhmm(p.wake_min)} onBlur={(e) => { const v = parseHHMM(e.target.value); if (v != null) patchProfile({ wake_min: v }); }} /></Field>
          <Field label="Sen"><input className="input" type="time" defaultValue={hhmm(p.bed_min)} onBlur={(e) => { const v = parseHHMM(e.target.value); if (v != null) patchProfile({ bed_min: v }); }} /></Field>
        </div>

        <div className="stack">
          <span className="field__label">Ile razy w tygodniu chcesz tworzyć</span>
          <div className="cluster">{[1, 2, 3, 4, 5, 6, 7].map((n) => <Chip key={n} on={p.weekly_session_target === n} onClick={() => patchProfile({ weekly_session_target: n })}>{n}</Chip>)}</div>
          <span className="field__hint">To zachęta, nie wymóg. Choroba, urlop i dni wolne nigdy nie przerywają rytmu.</span>
        </div>

        <div className="stack">
          <span className="field__label">Typowa długość sesji</span>
          <div className="cluster">{[30, 45, 60, 90, 120, 180].map((n) => <Chip key={n} on={p.session_default_min === n} onClick={() => patchProfile({ session_default_min: n })}>{n >= 60 && n % 60 === 0 ? `${n / 60} h` : `${n} min`}</Chip>)}</div>
        </div>

        <div className="stack">
          <span className="field__label">Nauka w Music Academy (opcjonalnie)</span>
          <div className="cluster">{[0, 1, 2, 3].map((n) => <Chip key={n} on={p.learning_per_week === n} onClick={() => patchProfile({ learning_per_week: n })}>{n === 0 ? 'Bez nauki w planie' : `${n} w tygodniu`}</Chip>)}</div>
          <span className="field__hint">Bloki nauki pojawią się tylko wtedy, gdy masz rozpoczętą ścieżkę w Akademii.</span>
        </div>
      </Sheet>
      <RoutinesSheet open={open && routinesOpen} onClose={() => setRoutinesOpen(false)} />
    </>
  );
}
