import { useState } from 'react';
import { useStore, remove, commit, type Write } from '../data/store';
import { useClock } from '../data/clock';
import { Confirm, ScreenHeader, Section } from '../ui/kit';
import { dayLabel } from '../ui/format';
import { CheckIn, SIGNALS } from './CheckIn';
import { checkIn } from '../data/actions';
import { effectiveStatus } from '../../shared/domain/day';
import { addDays } from '../../shared/time';

export function CareScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const [clearOpen, setClearOpen] = useState(false);
  const history = [...snap.care].sort((a, b) => b.at - a.at).slice(0, 30);
  const next7 = Array.from({ length: 7 }, (_, i) => addDays(clock.today, i)).map((d) => ({ d, s: effectiveStatus(snap, d).status }));
  const sickAhead = next7.filter((x) => x.s === 'sick');
  return (
    <div className="screen">
      <ScreenHeader title="Pulse Care" onBack sub="Energia i dobrostan. Odpoczynek, choroba i ciężka praca nie są porażką — plan i metryki się do nich dostosowują." />
      <Section title="Jak się dziś czujesz?">
        <CheckIn />
      </Section>
      {sickAhead.length > 0 && (
        <Section title="Okres regeneracji">
          <p className="muted small">Plan jest odciążony: {sickAhead.map((x) => dayLabel(x.d, clock.today).toLowerCase()).join(', ')}. Cel tygodnia obniża się proporcjonalnie.</p>
          <button className="btn btn--quiet" onClick={() => {
            const active = snap.care.filter((c) => c.signal === 'sick' && (c.until ?? c.date) >= clock.today);
            const writes: Write[] = active.map((c) => ({ entity: 'care', row: { ...c, until: addDays(clock.today, -1) < c.date ? c.date : addDays(clock.today, -1) } }));
            commit(writes);
            checkIn('energized', { note: 'Koniec choroby' });
          }}>Czuję się już dobrze — zakończ od dziś</button>
        </Section>
      )}
      <Section title="Historia">
        {history.length ? (
          <ul className="care-list">
            {history.map((c) => {
              const s = SIGNALS.find((x) => x.value === c.signal)!;
              return (
                <li key={c.id}>
                  <span className={`tag tag--${s.tone === 'blue' ? 'blue' : s.tone === 'ok' ? 'ok' : s.tone === 'danger' ? 'danger' : 'warn'}`}>{s.label}</span>
                  <span className="small">{dayLabel(c.date, clock.today)}{c.until && c.until !== c.date ? ` – ${dayLabel(c.until, clock.today).toLowerCase()}` : ''}</span>
                  {c.note && <span className="dim small">{c.note}</span>}
                  <button className="btn btn--quiet" onClick={() => remove('care', c.id)} aria-label="Usuń wpis">Usuń</button>
                </li>
              );
            })}
          </ul>
        ) : <p className="muted small">Bez wpisów. Raportowanie jest dobrowolne.</p>}
      </Section>
      <Section title="Prywatność">
        <p className="muted small">Wpisy o samopoczuciu służą tylko do dostosowania planu i są widoczne dla mentora AI, gdy z nim rozmawiasz. PULSE nie diagnozuje i nie zastępuje lekarza.</p>
        {history.length > 0 && <button className="btn btn--quiet" onClick={() => setClearOpen(true)}>Wyczyść historię samopoczucia</button>}
      </Section>
      <Confirm open={clearOpen} onClose={() => setClearOpen(false)} danger title="Wyczyścić historię?" confirmLabel="Wyczyść"
        text="Usunięte zostaną wszystkie wpisy Pulse Care. Plan przestanie uwzględniać zgłoszoną chorobę."
        onConfirm={() => commit(snap.care.map((c) => ({ entity: 'care' as const, deleteId: c.id })))} />
    </div>
  );
}
