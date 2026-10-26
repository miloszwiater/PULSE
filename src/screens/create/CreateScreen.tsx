import { useMemo, useState } from 'react';
import type { Session, Workflow } from '../../../shared/schema';
import { activeSeconds, countsAsSession, isPaused, sessionDate } from '../../../shared/domain/sessions';
import { QUICK_LENGTHS, STARTER_WORKFLOWS, workflowsSorted } from '../../../shared/domain/workflow';
import { durationLabel, hhmm, parseHHMM, zoned } from '../../../shared/time';
import { useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { activeSession, logManualSession, removeWorkflow, saveWorkflow, startSession, updateSession } from '../../data/actions';
import { remove, commit } from '../../data/store';
import { navigate } from '../../app/router';
import { Button, Chip, Field, IconButton, Row, Sheet, Toggle } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { dayLabel, formatTimer } from '../../ui/format';
import { TimerDigits, Turntable } from '../../ui/Turntable';
import { sessionProgress } from './SessionScreen';
import { toast } from '../../ui/toast';

export const TONES = 8;
const lengthLabel = (m: number | null) => (m == null ? 'Bez limitu' : m >= 60 && m % 60 === 0 ? `${m / 60} h` : `${m} min`);

export function CreateScreen() {
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const tz = snap.profile?.timezone ?? 'Europe/Warsaw';
  const running = activeSession();
  const [minutes, setMinutes] = useState<number | null>(null);
  const [focus, setFocus] = useState(false);
  const [edit, setEdit] = useState<Partial<Workflow> | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [openSession, setOpenSession] = useState<Session | null>(null);
  const workflows = workflowsSorted(snap);
  const planned = snap.events.find((e) => e.date === clock.today && e.kind === 'music' && !e.lesson_key && e.status === 'planned' && e.end_min > clock.nowMin);

  const history = useMemo(() => {
    const list = snap.sessions.filter(countsAsSession).sort((a, b) => b.started_at - a.started_at).slice(0, 40);
    const groups = new Map<string, Session[]>();
    for (const s of list) {
      const d = sessionDate(s, tz);
      groups.set(d, [...(groups.get(d) ?? []), s]);
    }
    return [...groups.entries()].slice(0, 10);
  }, [snap.sessions, tz]);

  const go = (opts: Parameters<typeof startSession>[0]) => { startSession(opts); navigate('/sesja'); };

  // Time counts from the tap; the needle drop plays on the same deck before the session screen opens.
  const start = (opts: Parameters<typeof startSession>[0]) => {
    if (running) return;
    startSession(opts);
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) navigate('/sesja');
    else setTimeout(() => navigate('/sesja'), 650);
  };

  return (
    <div className="screen create">
      <header className="create__head">
        <h1 className="create__title">Twórz</h1>
        <p className="create__lead">Jedno dotknięcie i czas się liczy. Bez kategorii i bez formularzy — tworzysz, co chcesz.</p>
      </header>

      <section className="deck" aria-label={running ? 'Trwająca sesja' : 'Szybki start'}>
        <DeckTurntable session={running} onStart={() => start({ minutes, focus, event: planned ?? null })} startLabel={`Zacznij sesję: ${lengthLabel(minutes)}`} />
        {running ? (
          <>
            <Button variant="primary" size="lg" block icon="play" onClick={() => navigate('/sesja')}>Wróć do sesji</Button>
            <p className="deck__hint">Czas biegnie także przy zablokowanym telefonie.</p>
          </>
        ) : (
          <>
            <div className="keys" role="radiogroup" aria-label="Długość sesji">
              {QUICK_LENGTHS.map((m) => (
                <button key={String(m)} role="radio" aria-checked={minutes === m} className={`key${minutes === m ? ' is-on' : ''}`} onClick={() => setMinutes(m)}>
                  <span className="key__led" aria-hidden="true" />{lengthLabel(m)}
                </button>
              ))}
            </div>
            <Button variant="primary" size="lg" block icon="play" onClick={() => start({ minutes, focus, event: planned ?? null })}>
              {minutes == null ? 'Zacznij sesję' : `Zacznij — ${lengthLabel(minutes)}`}
            </Button>
            <div className="deck__opts">
              <Chip icon="focus" on={focus} onClick={() => setFocus(!focus)}>Tryb skupienia</Chip>
              {planned && <span className="deck__plan">Zaliczy też plan z {hhmm(planned.start_min)}</span>}
            </div>
            <p className="deck__hint">Długość to tylko zamiar — sesję można skończyć wcześniej albo ciągnąć dalej.</p>
          </>
        )}
      </section>

      <section className="block" aria-labelledby="wf-h">
        <div className="block__head">
          <h2 className="block__title" id="wf-h">Twoje workflow</h2>
          <button className="btn btn--quiet" onClick={() => setEdit({ name: '', minutes: 60, focus: false, tone: workflows.length % TONES, intention: '' })}><Icon name="plus" size={16} /> Nowe</button>
        </div>
        {workflows.length ? (
          <ul className="wf-list">
            {workflows.map((w) => (
              <li key={w.id} className="wf" style={{ '--tone': `var(--tone-${w.tone})` } as React.CSSProperties}>
                <button className="wf__main" onClick={() => setEdit(w)} aria-label={`Edytuj: ${w.name}`}>
                  <span className="wf__dot" aria-hidden="true" />
                  <span className="wf__text">
                    <span className="wf__name">{w.name}</span>
                    <span className="wf__meta">{lengthLabel(w.minutes)}{w.focus ? ', ze skupieniem' : ''}{w.intention ? ` — ${w.intention}` : ''}</span>
                  </span>
                </button>
                <IconButton icon="play" label={`Zacznij: ${w.name}`} className="wf__play" disabled={!!running} onClick={() => go({ workflow: w, title: w.name, event: planned ?? null })} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="starter">
            <p className="muted small">Workflow to zapisany sposób startu: nazwa, długość i czy włączać skupienie. Na przykład:</p>
            <div className="cluster">
              {STARTER_WORKFLOWS.map((w) => (
                <Chip key={w.name} icon="plus" onClick={() => { saveWorkflow(w); toast(`Dodano „${w.name}”.`, 'ok'); }}>{w.name}</Chip>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="block" aria-labelledby="hist-h">
        <div className="block__head">
          <h2 className="block__title" id="hist-h">Historia</h2>
          <button className="btn btn--quiet" onClick={() => setManualOpen(true)}><Icon name="plus" size={16} /> Dopisz sesję</button>
        </div>
        {history.length ? (
          <div className="hist">
            {history.map(([d, list]) => (
              <div key={d} className="hist__day">
                <p className="hist__date"><span>{dayLabel(d, clock.today)}</span><span className="num">{durationLabel(list.reduce((t, s) => t + s.active_seconds, 0) / 60)}</span></p>
                {list.map((s) => {
                  const wf = s.workflow_id ? snap.workflows.find((w) => w.id === s.workflow_id) : null;
                  return (
                    <button key={s.id} className="hist__row" onClick={() => setOpenSession(s)}>
                      <span className="hist__time num">{hhmm(zoned(s.started_at, tz).minutes)}</span>
                      <span className="hist__what">
                        <span>{s.title || wf?.name || (s.source === 'manual' ? 'Sesja dopisana' : 'Sesja')}</span>
                        {s.outcome_note && <span className="hist__note">{s.outcome_note}</span>}
                      </span>
                      <span className="hist__dur num">{durationLabel(s.active_seconds / 60)}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        ) : (
          <p className="muted small">Pierwsza sesja pojawi się tutaj — razem z czasem policzonym z zegara.</p>
        )}
      </section>

      <section className="block">
        <div className="list">
          <Row leading={<Icon name="folder" />} title="Projekty" sub="Albumy, EP-ki i kolekcje utworów — opcjonalnie" onClick={() => navigate('/projekty')} />
        </div>
      </section>

      <WorkflowSheet value={edit} onClose={() => setEdit(null)} />
      <ManualSheet open={manualOpen} onClose={() => setManualOpen(false)} today={clock.today} />
      <SessionSheet session={openSession} onClose={() => setOpenSession(null)} />
    </div>
  );
}

/** One deck for both states, so starting a session animates the same record instead of swapping it. */
function DeckTurntable({ session, onStart, startLabel }: { session: Session | undefined | null; onStart: () => void; startLabel: string }) {
  const clock = useClock(1000);
  if (!session) return <Turntable state="idle" progress={0} label="Creative Workflow" onToggle={onStart} toggleLabel={startLabel} />;
  const secs = activeSeconds(session, clock.nowMs);
  return (
    <Turntable state={isPaused(session) ? 'paused' : 'playing'} progress={sessionProgress(secs, session.target_minutes)} label={session.title || 'Creative Workflow'}
      onToggle={() => navigate('/sesja')} toggleLabel="Wróć do trwającej sesji">
      <TimerDigits text={formatTimer(secs)} className="deck__time" />
    </Turntable>
  );
}

function WorkflowSheet({ value, onClose }: { value: Partial<Workflow> | null; onClose: () => void }) {
  const [draft, setDraft] = useState<Partial<Workflow>>({});
  const [key, setKey] = useState<unknown>(null);
  if (value !== key) { setKey(value); setDraft(value ?? {}); }
  const existing = !!value?.id;
  const save = () => {
    if (!draft.name?.trim()) return;
    saveWorkflow({ ...draft, name: draft.name.trim() } as Workflow);
    toast(existing ? 'Zapisano workflow.' : `Dodano „${draft.name.trim()}”.`, 'ok');
    onClose();
  };
  return (
    <Sheet open={!!value} onClose={onClose} title={existing ? 'Workflow' : 'Nowe workflow'}
      footer={<>{existing && <Button variant="danger" icon="trash" aria-label="Usuń" onClick={() => { removeWorkflow(value as Workflow); onClose(); }} />}<Button variant="primary" disabled={!draft.name?.trim()} onClick={save}>Zapisz</Button></>}>
      <Field label="Nazwa">
        <input className="input" value={draft.name ?? ''} onChange={(e) => setDraft({ ...draft, name: e.target.value })} maxLength={60} placeholder="np. Wieczór w studiu" data-autofocus />
      </Field>
      <div className="stack">
        <span className="field__label">Preferowana długość</span>
        <div className="cluster">
          {QUICK_LENGTHS.map((m) => <Chip key={String(m)} on={(draft.minutes ?? null) === m} onClick={() => setDraft({ ...draft, minutes: m })}>{lengthLabel(m)}</Chip>)}
        </div>
      </div>
      <Toggle checked={!!draft.focus} onChange={(v) => setDraft({ ...draft, focus: v })} label="Zaczynaj w trybie skupienia" hint="Ekran nie gaśnie; jeśli ustawiono skrót iOS, PULSE go uruchomi." />
      <div className="stack">
        <span className="field__label">Kolor</span>
        <div className="tones" role="radiogroup" aria-label="Kolor">
          {Array.from({ length: TONES }, (_, i) => (
            <button key={i} role="radio" aria-checked={(draft.tone ?? 0) === i} aria-label={`Kolor ${i + 1}`} className={`tone${(draft.tone ?? 0) === i ? ' is-on' : ''}`} style={{ '--tone': `var(--tone-${i})` } as React.CSSProperties} onClick={() => setDraft({ ...draft, tone: i })} />
          ))}
        </div>
      </div>
      <Field label="Przypomnienie dla siebie" hint="Opcjonalne, widoczne w trakcie sesji. PULSE nic tu nie narzuca.">
        <input className="input" value={draft.intention ?? ''} onChange={(e) => setDraft({ ...draft, intention: e.target.value })} maxLength={300} placeholder="np. telefon w drugim pokoju" />
      </Field>
    </Sheet>
  );
}

function ManualSheet({ open, onClose, today }: { open: boolean; onClose: () => void; today: string }) {
  const [date, setDate] = useState(today);
  const [start, setStart] = useState('19:00');
  const [minutes, setMinutes] = useState(60);
  const [note, setNote] = useState('');
  const valid = parseHHMM(start) != null && minutes >= 5 && date <= today;
  return (
    <Sheet open={open} onClose={onClose} title="Dopisz sesję"
      footer={<Button variant="primary" disabled={!valid} onClick={() => {
        logManualSession({ date, startMin: parseHHMM(start)!, minutes, type: 'create', outcome: 'none', note });
        toast(`Dopisano ${durationLabel(minutes)}.`, 'ok');
        onClose();
      }}>Zapisz</Button>}>
      <p className="muted small">Dla sesji bez timera — np. gdy telefon został w drugim pokoju.</p>
      <div className="field-row">
        <Field label="Dzień"><input className="input" type="date" value={date} max={today} onChange={(e) => setDate(e.target.value)} /></Field>
        <Field label="Start"><input className="input" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
      </div>
      <div className="stack">
        <span className="field__label">Ile trwała</span>
        <div className="cluster">{[30, 45, 60, 90, 120, 180, 240].map((m) => <Chip key={m} on={minutes === m} onClick={() => setMinutes(m)}>{durationLabel(m)}</Chip>)}</div>
      </div>
      <Field label="Notatka (opcjonalnie)"><input className="input" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} /></Field>
    </Sheet>
  );
}

function SessionSheet({ session, onClose }: { session: Session | null; onClose: () => void }) {
  const [note, setNote] = useState('');
  const [key, setKey] = useState<string | null>(null);
  if ((session?.id ?? null) !== key) { setKey(session?.id ?? null); setNote(session?.outcome_note ?? ''); }
  if (!session) return null;
  return (
    <Sheet open onClose={onClose} title={durationLabel(session.active_seconds / 60)}
      footer={<>
        <Button variant="danger" icon="trash" aria-label="Usuń sesję" onClick={() => {
          const prev = { ...session };
          remove('sessions', session.id);
          toast('Usunięto sesję.', 'ok', { label: 'Cofnij', run: () => commit([{ entity: 'sessions', row: { ...prev, deleted_at: null, updated_at: Date.now() } }]) });
          onClose();
        }} />
        <Button variant="primary" onClick={() => { updateSession(session, { outcome_note: note }); onClose(); }}>Zapisz</Button>
      </>}>
      <p className="muted small">{session.source === 'manual' ? 'Sesja dopisana ręcznie.' : 'Czas policzony z zegara (bez pauz).'}{session.event_id ? ' Zaliczyła zaplanowany blok.' : ''}</p>
      <Field label="Notatka"><textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Co działo się w tej sesji — tylko dla Ciebie." /></Field>
    </Sheet>
  );
}
