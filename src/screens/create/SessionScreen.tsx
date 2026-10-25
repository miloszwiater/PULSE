import { useEffect, useRef, useState } from 'react';
import { activeSeconds, isPaused } from '../../../shared/domain/sessions';
import { projectSchema, type Session } from '../../../shared/schema';
import { newId } from '../../../shared/domain/snapshot';
import { durationLabel } from '../../../shared/time';
import { useShallow } from 'zustand/react/shallow';
import { useStore } from '../../data/store';
import { useClock } from '../../data/clock';
import { discardSession, finishQuick, pause, putRow, resume, updateSession } from '../../data/actions';
import { back, navigate } from '../../app/router';
import { Button, Confirm, Empty, Field, IconButton, Sheet } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { formatTimer } from '../../ui/format';
import { SessionDisc } from '../../ui/Rhythm';
import { toast } from '../../ui/toast';
import { shortcutUrl } from '../FocusScreen';

type WakeLockSentinelLike = { release: () => Promise<void> };

export function SessionScreen() {
  const session = useStore((s) => Object.values(s.rows.sessions).find((x) => x.deleted_at == null && (x.status === 'running' || x.status === 'paused')));
  const [doneId, setDoneId] = useState<string | null>(null);
  const done = useStore((s) => (doneId ? s.rows.sessions[doneId] : undefined));
  if (done) return <Finished session={done} />;
  if (!session) {
    return (
      <div className="screen screen--bare">
        <Empty icon="disc" title="Nie ma aktywnej sesji" action={<Button variant="primary" onClick={() => navigate('/tworz', { replace: true })}>Przejdź do Twórz</Button>}>
          Sesja mogła zostać zakończona na innym urządzeniu.
        </Empty>
      </div>
    );
  }
  return <LiveSession session={session} onFinished={setDoneId} />;
}

function LiveSession({ session, onFinished }: { session: Session; onFinished: (id: string) => void }) {
  const clock = useClock(1000);
  const profile = useStore((s) => s.snap.profile);
  const workflow = useStore((s) => (session.workflow_id ? s.rows.workflows[session.workflow_id] : undefined));
  const project = useStore((s) => (session.project_id ? s.rows.projects[session.project_id] : undefined));
  const lesson = useStore((s) => (session.event_id ? s.rows.events[session.event_id]?.lesson_key : null));
  const paused = isPaused(session);
  const secs = activeSeconds(session, clock.nowMs);
  const focus = session.focus_mode;
  const [projOpen, setProjOpen] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [note, setNote] = useState(session.outcome_note);
  const lock = useRef<WakeLockSentinelLike | null>(null);
  const [lockState, setLockState] = useState<'on' | 'unsupported' | 'off'>('off');

  // Keep the screen awake in focus mode where the platform allows it.
  useEffect(() => {
    let cancelled = false;
    const nav = navigator as Navigator & { wakeLock?: { request: (t: 'screen') => Promise<WakeLockSentinelLike> } };
    if (!focus) { setLockState('off'); return; }
    if (!nav.wakeLock) { setLockState('unsupported'); return; }
    const acquire = async () => {
      if (document.visibilityState !== 'visible') return;
      try { const l = await nav.wakeLock!.request('screen'); if (cancelled) void l.release(); else { lock.current = l; setLockState('on'); } } catch { setLockState('unsupported'); }
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

  const minutes = Math.floor(secs / 60);
  const target = session.target_minutes;
  const title = session.title || workflow?.name || 'Sesja';
  const shortcut = profile?.focus_shortcut?.trim();

  const finishNow = () => {
    if (note !== session.outcome_note) updateSession(session, { outcome_note: note });
    const cur = useStore.getState().rows.sessions[session.id];
    const { session: saved } = finishQuick(cur);
    onFinished(saved.id);
  };

  return (
    <div className={`session3${focus ? ' is-focus' : ''}${paused ? ' is-paused' : ''}`} style={workflow ? ({ '--tone': `var(--tone-${workflow.tone})` } as React.CSSProperties) : undefined}>
      <header className="session3__top">
        <IconButton icon="back" label="Zminimalizuj sesję" onClick={() => back('/tworz')} />
        <div className="session3__heading">
          <p className="session3__title">{title}</p>
          <p className="session3__state">{paused ? 'Pauza — czas stoi' : focus ? 'Skupienie' : 'Czas biegnie'}</p>
        </div>
        <IconButton icon="focus" label={focus ? 'Wyłącz tryb skupienia' : 'Tryb skupienia'} className={focus ? 'is-active' : ''} aria-pressed={focus} onClick={() => updateSession(session, { focus_mode: !focus })} />
      </header>

      <section className="session3__stage" aria-label="Czas sesji">
        <SessionDisc seconds={secs} targetMinutes={target} paused={paused}>
          <span className="session3__time num" aria-label={`Czas sesji: ${minutes} minut`}>{formatTimer(secs)}</span>
          <span className="session3__target">{target ? (secs >= target * 60 ? `Zamiar ${durationLabel(target)} za Tobą` : `z ${durationLabel(target)}`) : 'bez limitu'}</span>
        </SessionDisc>
        {workflow?.intention && <p className="session3__intention">{workflow.intention}</p>}
      </section>

      <div className="session3__controls">
        <button className="ctl3" onClick={() => { updateSession(session, { started_at: Math.min(session.started_at + 600000, Date.now()) }); toast('Odjęto 10 minut.', 'info'); }} disabled={secs < 600} aria-label="Odejmij 10 minut">
          <span className="num">−10</span>
        </button>
        <button className="ctl3 ctl3--main" onClick={() => (paused ? resume(session) : pause(session))} aria-label={paused ? 'Wznów' : 'Pauza'}>
          <Icon name={paused ? 'play' : 'pause'} size={30} strokeWidth={2.4} fill={paused ? 'currentColor' : 'none'} />
        </button>
        <button className="ctl3 ctl3--done" onClick={finishNow} aria-label="Zakończ">
          <Icon name="check" size={26} strokeWidth={2.4} />
        </button>
      </div>
      <p className="session3__fine">Czas liczony z zegara — także przy zablokowanym telefonie. „Zakończ” zapisuje od razu.</p>

      {focus && (
        <section className="session3__focus" aria-label="Tryb skupienia">
          <p>{lockState === 'on' ? 'Ekran nie zgaśnie, dopóki PULSE jest na wierzchu.' : lockState === 'unsupported' ? 'Ta przeglądarka nie pozwala trzymać ekranu włączonego.' : ''}</p>
          {shortcut ? (
            <a className="btn btn--secondary btn--sm" href={shortcutUrl(shortcut, target ?? 60)}>Uruchom skrót „{shortcut}”</a>
          ) : (
            <button className="btn btn--quiet" onClick={() => navigate('/skupienie')}>Jak wyciszyć inne aplikacje na iPhonie</button>
          )}
        </section>
      )}

      {!focus && (
        <div className="session3__extras">
          {lesson && <button className="row row--action" onClick={() => navigate(`/nauka/${lesson.split('-')[0]}/${lesson}`)}><span className="row__main"><span className="row__title">Otwórz lekcję</span></span><Icon name="chevron" size={18} /></button>}
          <div className="spread">
            <span className="muted small">{project ? <>Projekt: <strong className="text">{project.title}</strong></> : 'Bez projektu — to w porządku.'}</span>
            <button className="btn btn--quiet" onClick={() => setProjOpen(true)}>{project ? 'Zmień' : 'Powiąż'}</button>
          </div>
          <label className="field">
            <span className="field__label">Notatka (opcjonalnie)</span>
            <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Zapisuje się sama." />
          </label>
          <button className="btn btn--ghost" onClick={() => setDiscardOpen(true)}><Icon name="trash" size={18} /> <span>Odrzuć — timer włączony przez pomyłkę</span></button>
        </div>
      )}

      <ProjectPicker open={projOpen} session={session} onClose={() => setProjOpen(false)} />
      <Confirm open={discardOpen} onClose={() => setDiscardOpen(false)} danger title="Odrzucić sesję?" confirmLabel="Odrzuć"
        text="Sesja nie zostanie wliczona do rytmu. Użyj tego, gdy timer został włączony przez pomyłkę."
        onConfirm={() => { discardSession(session); navigate('/tworz', { replace: true }); }} />
    </div>
  );
}

function Finished({ session }: { session: Session }) {
  const [note, setNote] = useState(session.outcome_note);
  const covered = useStore(useShallow((s) => Object.values(s.rows.events).filter((e) => e.session_id === session.id && e.deleted_at == null)));
  const mins = session.active_seconds / 60;
  const done = () => {
    if (note !== session.outcome_note) updateSession(session, { outcome_note: note });
    navigate('/tworz', { replace: true });
  };
  return (
    <div className="screen screen--bare finished">
      <div className="finished__mark" aria-hidden="true"><Icon name="check" size={34} strokeWidth={2.4} /></div>
      <h1 className="finished__time num">{durationLabel(mins)}</h1>
      <p className="finished__lead">{mins >= 10 ? 'Zapisane. To się liczy do rytmu tygodnia.' : 'Zapisane. Krótsze niż 10 minut — zostaje w historii, ale nie liczy się do rytmu.'}</p>
      {covered.length > 0 && <p className="finished__plan">Zaliczony plan: {covered.map((e) => e.title).join(', ')}.</p>}
      <Field label="Notatka (opcjonalnie)">
        <textarea className="textarea" value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} placeholder="Jeśli chcesz coś zapamiętać z tej sesji." />
      </Field>
      <Button variant="primary" size="lg" block onClick={done}>Gotowe</Button>
    </div>
  );
}

function ProjectPicker({ open, session, onClose }: { open: boolean; session: Session; onClose: () => void }) {
  const projects = useStore(useShallow((s) => Object.values(s.rows.projects).filter((p) => p.deleted_at == null && !p.archived)));
  const [name, setName] = useState('');
  return (
    <Sheet open={open} onClose={onClose} title="Powiąż z projektem">
      <div className="list">
        <button className="row row--action" onClick={() => { updateSession(session, { project_id: null }); onClose(); }}>
          <span className="row__main"><span className="row__title">Bez projektu</span></span>
          {!session.project_id && <Icon name="check" size={18} />}
        </button>
        {projects.map((p) => (
          <button key={p.id} className="row row--action" onClick={() => { updateSession(session, { project_id: p.id }); onClose(); }}>
            <span className="row__main"><span className="row__title">{p.title}</span></span>
            {session.project_id === p.id && <Icon name="check" size={18} />}
          </button>
        ))}
      </div>
      <form className="inline-add" onSubmit={(e) => {
        e.preventDefault();
        const t = name.trim();
        if (!t) return;
        const p = projectSchema.parse({ id: newId('pj'), updated_at: Date.now(), title: t });
        putRow('projects', p);
        updateSession(session, { project_id: p.id });
        setName('');
        onClose();
      }}>
        <input className="input" placeholder="Nowy projekt" value={name} onChange={(e) => setName(e.target.value)} maxLength={160} />
        <Button variant="secondary" icon="plus" aria-label="Utwórz projekt" disabled={!name.trim()} />
      </form>
    </Sheet>
  );
}
