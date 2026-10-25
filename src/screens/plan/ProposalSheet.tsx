import type { Proposal } from '../../../shared/schema';
import type { DayNote } from '../../../shared/domain/planner';
import { applyProposal, rejectProposal } from '../../data/actions';
import { commit } from '../../data/store';
import { Button, Sheet } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { dayLabel } from '../../ui/format';
import { useClock } from '../../data/clock';

/**
 * Preview of a set of plan changes. Nothing changes until "Zastosuj".
 * Transient proposals (planner/conflicts) are stored only when decided,
 * so the history keeps a record of what was accepted or rejected.
 */
export function ProposalSheet({ proposal, notes, open, onClose, transient }: { proposal: Proposal | null; notes?: DayNote[]; open: boolean; onClose: () => void; transient?: boolean }) {
  const clock = useClock();
  if (!proposal) {
    return (
      <Sheet open={open} onClose={onClose} title="Plan tygodnia" footer={<Button variant="primary" onClick={onClose}>Rozumiem</Button>}>
        <p className="muted">Nie dokładam nic nowego — tydzień jest już pokryty albo nie ma w nim realnego miejsca.</p>
        {notes && <NoteList notes={notes} today={clock.today} />}
      </Sheet>
    );
  }
  const accept = () => {
    if (transient) commit([{ entity: 'proposals', row: proposal }]);
    applyProposal(proposal);
    onClose();
  };
  const reject = () => {
    if (transient) commit([{ entity: 'proposals', row: proposal }]);
    rejectProposal(proposal);
    onClose();
  };
  return (
    <Sheet open={open} onClose={onClose} title={proposal.title} tall={proposal.changes.length > 5}
      footer={<><Button variant="ghost" onClick={reject}>Odrzuć</Button><Button variant="primary" icon="check" onClick={accept}>Zastosuj</Button></>}>
      {proposal.rationale && <p className="muted small" style={{ whiteSpace: 'pre-line' }}>{proposal.rationale}</p>}
      <ul className="changes">
        {proposal.changes.map((c, i) => (
          <li key={i} className="changes__item">
            <Icon name={c.before == null ? 'plus' : 'edit'} size={16} />
            <span>{c.label}</span>
          </li>
        ))}
      </ul>
      {notes && notes.length > 0 && <NoteList notes={notes} today={clock.today} />}
      <p className="dim xs">Po zastosowaniu każdą zmianę można cofnąć w Planie → Historia zmian.</p>
    </Sheet>
  );
}

function NoteList({ notes, today }: { notes: DayNote[]; today: string }) {
  return (
    <div className="stack">
      <span className="field__label">Jak policzony jest każdy dzień</span>
      <ul className="daynotes">
        {notes.map((n) => (
          <li key={n.date} className={n.planned ? 'is-planned' : ''}>
            <span className="daynotes__day">{dayLabel(n.date, today)}</span>
            <span className="daynotes__text">{n.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
