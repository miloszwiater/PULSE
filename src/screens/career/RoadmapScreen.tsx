import { useMemo, useState } from 'react';
import { milestoneSchema, type Milestone } from '../../../shared/schema';
import { roadmapView } from '../../../shared/domain/roadmap';
import { newId } from '../../../shared/domain/snapshot';
import { useStore, remove } from '../../data/store';
import { useClock } from '../../data/clock';
import { putRow } from '../../data/actions';
import { navigate } from '../../app/router';
import { Button, Field, ScreenHeader, Section, Sheet } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { toast } from '../../ui/toast';

export function RoadmapScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const rm = useMemo(() => roadmapView(snap, clock.today), [snap, clock.today]);
  const [addPhase, setAddPhase] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');

  const toggle = (m: Milestone, status: Milestone['status']) => {
    putRow('milestones', { ...m, status, done_at: status === 'done' ? Date.now() : null });
    if (status === 'done') toast('Kamień milowy osiągnięty.', 'ok');
  };

  return (
    <div className="screen">
      <ScreenHeader title="Roadmapa 365" onBack sub={rm.day ? `Dzień ${rm.day} z 365. Fazy przesuwają się według realnych postępów — samo upłynięcie czasu niczego nie zalicza.` : undefined} />
      {rm.phases.map((p) => (
        <Section key={p.n} title={<>Faza {p.n} · {p.title} <span className="dim">· mies. {p.months}</span></>}
          aside={p.n === rm.actualPhase ? <span className="tag tag--violet">Teraz</span> : p.done === p.total && p.total ? <span className="tag tag--ok">Zamknięta</span> : undefined}>
          <p className="muted small" style={{ marginBottom: 8 }}>{p.focus}</p>
          <ul className="milestones">
            {p.milestones.map((m) => {
              const ev = m.evidence;
              return (
                <li key={m.id} className={`milestone is-${m.status}`}>
                  <button className="milestone__check" aria-label={m.status === 'done' ? 'Oznacz jako otwarty' : 'Oznacz jako osiągnięty'} aria-pressed={m.status === 'done'}
                    onClick={() => toggle(m, m.status === 'done' ? 'open' : 'done')}>
                    {m.status === 'done' && <Icon name="check" size={16} />}
                  </button>
                  <div className="milestone__body">
                    <p className="milestone__title">{m.title}</p>
                    <p className="milestone__desc">{m.description}</p>
                    {ev && (
                      <p className={`milestone__ev${ev.met ? ' is-met' : ''}`}>
                        {ev.met ? 'Dane potwierdzają: ' : 'Z danych: '}{ev.detail}
                        {ev.met && m.status !== 'done' && <button className="btn btn--quiet" onClick={() => toggle(m, 'done')}>Zalicz</button>}
                      </p>
                    )}
                    {m.status !== 'done' && (
                      <span className="cluster" style={{ gap: 0 }}>
                        <button className="btn btn--quiet" onClick={() => navigate(`/plan?add=${encodeURIComponent(`Krok: ${m.title}`)}&kind=${m.phase === 3 || m.phase === 4 ? 'promo' : 'music'}&notes=${encodeURIComponent(m.description)}`)}>Zaplanuj krok</button>
                        {!m.template_key && <button className="btn btn--quiet" onClick={() => remove('milestones', m.id)}>Usuń</button>}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
          <button className="btn btn--quiet" onClick={() => { setAddPhase(p.n); setTitle(''); setDesc(''); }}><Icon name="plus" size={16} /> <span>Własny kamień milowy</span></button>
        </Section>
      ))}
      <Sheet open={addPhase != null} onClose={() => setAddPhase(null)} title={`Kamień milowy — faza ${addPhase}`}
        footer={<Button variant="primary" block disabled={!title.trim()} onClick={() => {
          putRow('milestones', milestoneSchema.parse({ id: newId('ms'), updated_at: Date.now(), phase: addPhase, title: title.trim(), description: desc.trim(), order: 100 + snap.milestones.length }));
          setAddPhase(null);
        }}>Dodaj</Button>}>
        <p className="muted small">Może być pozamuzyczny — finansowy, organizacyjny, sprzętowy.</p>
        <Field label="Co ma być faktem"><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} placeholder="Np. odłożone 1500 zł na mikrofon" /></Field>
        <Field label="Szczegóły"><textarea className="textarea" value={desc} onChange={(e) => setDesc(e.target.value)} maxLength={2000} /></Field>
      </Sheet>
    </div>
  );
}
