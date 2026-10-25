import { useState } from 'react';
import type { CareSignal, Proposal } from '../../shared/schema';
import { detectConflicts, resolveConflicts } from '../../shared/domain/planner';
import { effectiveStatus } from '../../shared/domain/day';
import { checkIn } from '../data/actions';
import { useStore } from '../data/store';
import { clockNow, useClock } from '../data/clock';
import { Button, Chip, Field, Sheet } from '../ui/kit';
import { Icon, type IconName } from '../ui/Icon';
import { ProposalSheet } from './plan/ProposalSheet';

export const SIGNALS: { value: CareSignal; label: string; icon: IconName; tone: 'ok' | 'blue' | 'danger' | 'warn' }[] = [
  { value: 'energized', label: 'Mam energię', icon: 'bolt', tone: 'ok' },
  { value: 'low', label: 'Brak energii', icon: 'moon', tone: 'blue' },
  { value: 'sick', label: 'Choroba', icon: 'thermo', tone: 'danger' },
  { value: 'overloaded', label: 'Przeciążenie', icon: 'weight', tone: 'warn' },
];

const RESPONSE: Record<CareSignal, string> = {
  energized: 'Zapisane. Jeśli jest dziś wolne okno, to dobry dzień na dłuższą sesję.',
  low: 'Najpierw woda, jedzenie i chwila bez ekranu. Muzyka dziś tylko jeśli sama przyjdzie — coś lekkiego albo nic.',
  sick: 'Odpoczynek jest teraz najważniejszy. Rytm tygodnia zmniejsza się sam, a choroba nie przerywa serii. Przy niepokojących objawach — lekarz.',
  overloaded: 'Zdejmuję presję: dziś najwyżej 30 minut, jeśli w ogóle. Zaplanowane rzeczy można przesunąć bez nadrabiania.',
};

/** Quick energy check-in. Reacts by checking the plan and offering adjustments (never forced). */
export function CheckIn({ compact, tiles }: { compact?: boolean; tiles?: boolean }) {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const today = effectiveStatus(snap, clock.today);
  const todaySignal = snap.care.filter((c) => c.date === clock.today).sort((a, b) => b.at - a.at)[0]?.signal;
  const current: CareSignal | undefined = today.status === 'sick' ? 'sick' : todaySignal;
  const [sickOpen, setSickOpen] = useState(false);
  const [days, setDays] = useState(2);
  const [note, setNote] = useState('');
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const after = (signal: CareSignal) => {
    setMessage(RESPONSE[signal]);
    const s = useStore.getState().snap;
    const conflicts = detectConflicts(s, clockNow(), 7);
    if (conflicts.length) setProposal(resolveConflicts(s, clockNow(), conflicts));
  };

  const pick = (signal: CareSignal) => {
    if (signal === 'sick') { setSickOpen(true); return; }
    checkIn(signal);
    after(signal);
  };

  return (
    <div className={`checkin${compact ? ' checkin--compact' : ''}`}>
      {tiles ? (
        <div className="sigtiles" role="group" aria-label="Jak się dziś czujesz?">
          {SIGNALS.map((s) => (
            <button key={s.value} className={`sigtile sigtile--${s.tone}${current === s.value ? ' is-on' : ''}`} aria-pressed={current === s.value} onClick={() => pick(s.value)}>
              <Icon name={s.icon} size={20} /><span>{s.label}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="checkin__chips" role="group" aria-label="Jak się dziś czujesz?">
          {SIGNALS.map((s) => (
            <Chip key={s.value} icon={s.icon} tone={s.tone} on={current === s.value} onClick={() => pick(s.value)}>{s.label}</Chip>
          ))}
        </div>
      )}
      {message && <p className="checkin__msg" role="status">{message}</p>}

      <Sheet open={sickOpen} onClose={() => setSickOpen(false)} title="Zgłoś chorobę"
        footer={<Button variant="primary" block onClick={() => { checkIn('sick', { days, note }); setSickOpen(false); after('sick'); }}>Zapisz</Button>}>
        <p className="muted small">PULSE nie diagnozuje i nie zastępuje lekarza. Ten wpis tylko dostosowuje plan i metryki.</p>
        <div className="stack">
          <span className="field__label">Na ile dni odpuścić plan?</span>
          <div className="cluster">{[1, 2, 3, 5, 7].map((n) => <Chip key={n} on={days === n} onClick={() => setDays(n)}>{n === 1 ? 'Dziś' : `${n} dni`}</Chip>)}</div>
        </div>
        <Field label="Notatka" hint="Opcjonalna, widoczna tylko dla Ciebie i Towarzysza.">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} />
        </Field>
      </Sheet>
      <ProposalSheet open={!!proposal} proposal={proposal} onClose={() => setProposal(null)} transient />
    </div>
  );
}
