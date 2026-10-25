import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../data/store';
import { revertProposal } from '../../data/actions';
import { Button, Sheet } from '../../ui/kit';

const STATUS = { pending: 'Czeka', applied: 'Zastosowana', rejected: 'Odrzucona', reverted: 'Cofnięta' } as const;
const SOURCE = { planner: 'Planer', mentor: 'Mentor', conflict: 'Konflikt' } as const;

export function HistorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const proposals = useStore(useShallow((s) => s.snap.proposals));
  const list = [...proposals].sort((a, b) => (b.decided_at ?? b.updated_at) - (a.decided_at ?? a.updated_at)).slice(0, 40);
  return (
    <Sheet open={open} onClose={onClose} title="Historia zmian planu" tall>
      {list.length === 0 && <p className="muted small">Tu pojawią się propozycje planera i mentora — zastosowane, odrzucone i cofnięte.</p>}
      <div className="list">
        {list.map((p) => (
          <div key={p.id} className="row history-row">
            <span className="row__main">
              <span className="row__title">{p.title}</span>
              <span className="row__sub">{SOURCE[p.source]} · {STATUS[p.status]} · {p.changes.length} zmian{p.decided_at ? ` · ${new Date(p.decided_at).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : ''}</span>
            </span>
            {p.status === 'applied' && <Button size="sm" variant="secondary" icon="undo" onClick={() => revertProposal(p)}>Cofnij</Button>}
          </div>
        ))}
      </div>
    </Sheet>
  );
}
