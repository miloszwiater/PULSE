import { useEffect, useRef, useState } from 'react';
import { activeSeconds, isPaused } from '../../../shared/domain/sessions';
import { EXERCISE_BY_ID, CATEGORY_SHORT } from '../../../shared/catalog/exercises';
import { SESSION_TYPES, projectSchema, type Session, type SessionType } from '../../../shared/schema';
import { newId } from '../../../shared/domain/snapshot';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { discardSession, pause, putRow, resume, updateSession } from '../../data/actions';
import { back, navigate } from '../../app/router';
import { Button, Chip, Confirm, Empty, IconButton, Sheet } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { formatTimer, TYPE_LABEL } from '../../ui/format';
import { NightScene } from '../../ui/NightScene';
import { useScene } from '../../ui/useScene';
import { LiveWave } from '../../ui/LiveWave';
import { MAIN_TYPES } from './CreateScreen';
import { toast } from '../../ui/toast';
import { FinishSheet } from './FinishSheet';

type WakeLockSentinelLike = { release: () => Promise<void> };

export function SessionScreen() {
  const session = useStore((s) => Object.values(s.rows.sessions).find((x) => x.deleted_at == null && (x.status === 'running' || x.status === 'paused')));
  const [finishOpen, setFinishOpen] = useState(false);
  if (!session && !finishOpen) {
    return (
      <div className="screen screen--bare">
        <Empty icon="wave" title="Nie ma aktywnej sesji" action={<Button variant="primary" onClick={() => navigate('/tworz', { replace: true })}>Przejdź do Twórz</Button>}>
          Sesja mogła zostać zakończona na innym urządzeniu.
        </Empty>
      </div>
    );
  }
  return session ? <LiveSession session={session} finishOpen={finishOpen} setFinishOpen={setFinishOpen} /> : null;
}

function LiveSession({ session, finishOpen, setFinishOpen }: { session: Session; finishOpen: boolean; setFinishOpen: (v: boolean) => void }) {
  const clock = useClock(1000);
  const projects = useStore(useShallow((s) => Object.values(s.rows.projects).filter((p) => p.deleted_at == null && !p.archived)));
  const paused = isPaused(session);
  const secs = activeSeconds(session, clock.nowMs);
  const ex = session.exercise_id ? EXERCISE_BY_ID[session.exercise_id] : null;
  const [focus, setFocus] = useState(session.focus_mode);
  const [typeOpen, setTypeOpen] = useState(false);
  const [projOpen, setProjOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [note, setNote] = useState(session.outcome_note);
  const [checked, setChecked] = useState<number[]>([]);
  const [newProject, setNewProject] = useState('');
  const lock = useRef<WakeLockSentinelLike | null>(null);
  const scene = useScene(clock.nowMin);
  const project = projects.find((p) => p.id === session.project_id);

  // Keep the screen awake in focus mode where the platform allows it.
  useEffect(() => {
    let cancelled = false;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } };
    const acquire = async () => {
      if (!focus || !nav.wakeLock || document.visibilityState !== 'visible') return;
      try { const l = await nav.wakeLock.request('screen'); if (cancelled) void l.release(); else lock.current = l; } catch { /* not allowed */ }
    };
    void acquire();
    const vis = () => void acquire();
    document.addEventListener('visibilitychange', vis);
    return () => { cancelled = true; document.removeEventListener('visibilitychange', vis); void lock.current?.release().catch(() => undefined); lock.current = null; };
  }, [focus]);

  // Debounced note autosave so nothing is lost if the app is closed mid-session.
  useEffect(() => {
    if (note === session.outcome_note) return;
    const t = setTimeout(() => updateSession(session, { outcome_note: note }), 800);
    return () => clearTimeout(t);
  }, [note, session]);

  const toggleFocus = () => { setFocus(!focus); updateSession(session, { focus_mode: !focus }); };
  const minutes = Math.floor(secs / 60);

  return (
    <div className={`session${focus ? ' session--focus' : ''}${paused ? ' is-paused' : ''}`}>
      <div className="session__bg"><NightScene {...scene} /></div>
      <header className="session__top">
        <IconButton icon="back" label="Zminimalizuj sesję" onClick={() => back('/tworz')} />
        <div className="session__heading">
          <p className="session__kicker">Creative Flow</p>
          <button className="session__type" onClick={() => setTypeOpen(true)}>
            {session.title || TYPE_LABEL[session.type]}{session.category ? ` · ${CATEGORY_SHORT[session.category]}` : ''}
            <Icon name="chevron" size={14} style={{ transform: 'rotate(90deg)' }} />
          </button>
        </div>
        <IconButton icon="focus" label={focus ? 'Wyłącz tryb skupienia' : 'Tryb skupienia'} className={focus ? 'is-active' : ''} onClick={toggleFocus} aria-pressed={focus} />
      </header>

      {!focus && (
        <div className="typetiles typetiles--compact" role="group" aria-label="Rodzaj sesji">
          {MAIN_TYPES.map((t) => (
            <button key={t.type} className={`typetile${session.type === t.type ? ' is-on' : ''}`} aria-pressed={session.type === t.type}
              onClick={() => updateSession(session, { type: t.type, category: t.category ?? session.category })}>
              <span className="typetile__icon"><Icon name={t.icon} size={22} /></span>
              <span className="typetile__label">{t.label}</span>
            </button>
          ))}
        </div>
      )}

      <section className="timer-card" aria-label="Czas sesji">
        <div className="timer-card__head"><span>Czas sesji</span><span className={`timer-card__state${paused ? ' is-paused' : ''}`}>{paused ? 'pauza' : 'nagrywa czas'}</span></div>
        <p className="session__time num" aria-label={`Czas sesji: ${minutes} minut`}>{formatTimer(secs)}</p>
        <LiveWave active={!paused} />
        <div className="timer-card__controls">
          <button className="ctl" onClick={() => { updateSession(session, { started_at: Math.min(session.started_at + 600000, Date.now()) }); toast('Odjęto 10 minut — np. gdy timer ruszył za wcześnie.', 'info'); }} disabled={secs < 600} aria-label="Odejmij 10 minut">
            <span className="num">−10</span><span className="ctl__unit">min</span>
          </button>
          <button className="ctl ctl--main" onClick={() => (paused ? resume(session) : pause(session))} aria-label={paused ? 'Wznów' : 'Pauza'}>
            <Icon name={paused ? 'play' : 'pause'} size={30} strokeWidth={2.4} fill={paused ? 'currentColor' : 'none'} />
          </button>
          <button className="ctl ctl--done" onClick={() => setFinishOpen(true)} aria-label="Zakończ">
            <Icon name="check" size={26} strokeWidth={2.4} />
          </button>
        </div>
        <p className="session__state">{paused ? 'Pauza — czas nie biegnie.' : 'Czas liczony z zegara — także przy zablokowanym telefonie.'}</p>
      </section>

      {focus ? (
        <p className="session__focusnote">
          Tryb skupienia trzyma ekran włączony, jeśli system na to pozwala. PULSE jako aplikacja webowa nie może blokować innych aplikacji — do wyciszenia powiadomień użyj trybu Skupienie w iOS.
        </p>
      ) : (
        <div className="session__extras">
          {ex && (
            <section className="session__exercise">
              <h2 className="session__h">Cel tej sesji</h2>
              <p className="small"><strong>{ex.title}</strong></p>
              <p className="muted small">{ex.goal}</p>
              <ol className="checklist">
                {ex.steps.map((s, i) => (
                  <li key={i}>
                    <label className={checked.includes(i) ? 'is-done' : ''}>
                      <input type="checkbox" checked={checked.includes(i)} onChange={() => setChecked(checked.includes(i) ? checked.filter((x) => x !== i) : [...checked, i])} />
                      <span>{s}</span>
                    </label>
                  </li>
                ))}
              </ol>
              <p className="small"><span className="dim">Ukończone, gdy: </span>{ex.done_when}</p>
            </section>
          )}
          <section className="stack">
            <div className="spread">
              <h2 className="session__h">Projekt</h2>
              <button className="btn btn--quiet" onClick={() => setProjOpen(true)}>{project ? 'Zmień' : 'Powiąż'}</button>
            </div>
            <p className="muted small">{project ? project.title : 'Bez projektu — to też jest w porządku.'}</p>
          </section>
          <label className="field">
            <span className="field__label">Notatka z sesji</span>
            <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Co działa, co sprawdzić następnym razem. Zapisuje się samo." />
          </label>
          <button className="btn btn--ghost" onClick={() => setDiscardOpen(true)}><Icon name="trash" size={18} /> <span>Odrzuć tę sesję</span></button>
        </div>
      )}

      <Sheet open={typeOpen} onClose={() => setTypeOpen(false)} title="Rodzaj sesji">
        <div className="cluster">
          {SESSION_TYPES.filter((t) => t !== 'other').map((t: SessionType) => (
            <Chip key={t} on={session.type === t} onClick={() => { updateSession(session, { type: t, category: t === 'write' ? 'songwriting' : t === 'flow' ? 'flow' : t === 'production' ? 'production' : session.category }); setTypeOpen(false); }}>{TYPE_LABEL[t]}</Chip>
          ))}
        </div>
      </Sheet>

      <Sheet open={projOpen} onClose={() => setProjOpen(false)} title="Powiąż z projektem">
        <div className="list">
          <button className="row row--action" onClick={() => { updateSession(session, { project_id: null }); setProjOpen(false); }}>
            <span className="row__main"><span className="row__title">Bez projektu</span></span>
            {!session.project_id && <Icon name="check" size={18} />}
          </button>
          {projects.map((p) => (
            <button key={p.id} className="row row--action" onClick={() => { updateSession(session, { project_id: p.id }); setProjOpen(false); }}>
              <span className="row__main"><span className="row__title">{p.title}</span></span>
              {session.project_id === p.id && <Icon name="check" size={18} />}
            </button>
          ))}
        </div>
        <form className="inline-add" onSubmit={(e) => {
          e.preventDefault();
          const t = newProject.trim();
          if (!t) return;
          const p = projectSchema.parse({ id: newId('pj'), updated_at: Date.now(), title: t, stage: 'idea' });
          putRow('projects', p);
          updateSession(session, { project_id: p.id });
          setNewProject('');
          setProjOpen(false);
        }}>
          <input className="input" placeholder="Nowy projekt — robocza nazwa" value={newProject} onChange={(e) => setNewProject(e.target.value)} maxLength={160} />
          <Button variant="secondary" icon="plus" aria-label="Utwórz projekt" disabled={!newProject.trim()} />
        </form>
      </Sheet>

      <Confirm open={discardOpen} onClose={() => setDiscardOpen(false)} danger title="Odrzucić sesję?" confirmLabel="Odrzuć"
        text="Sesja nie zostanie wliczona do statystyk. Użyj tego, gdy timer został włączony przez pomyłkę."
        onConfirm={() => { discardSession(session); navigate('/tworz', { replace: true }); }} />

      <FinishSheet open={finishOpen} session={session} onClose={() => setFinishOpen(false)} />
    </div>
  );
}
