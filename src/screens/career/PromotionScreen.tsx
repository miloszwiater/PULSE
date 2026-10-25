import { useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { promoTaskSchema, type PromoTask } from '../../../shared/schema';
import { PROMO_LESSONS, PROMO_MODULES, PROMO_BY_KEY, STAGE_LABEL as ARTIST_STAGE, type PromoLesson } from '../../../shared/catalog/career';
import { artistStage, STAGE_ORDER } from '../../../shared/domain/roadmap';
import { newId } from '../../../shared/domain/snapshot';
import { addDays } from '../../../shared/time';
import { commit, remove, useStore, type Write } from '../../data/store';
import { useClock } from '../../data/clock';
import { putRow } from '../../data/actions';
import { useQuery } from '../../app/router';
import { Button, Chip, Field, ScreenHeader, Section, Segmented, Sheet } from '../../ui/kit';
import { Icon } from '../../ui/Icon';
import { shortDate } from '../../ui/format';
import { toast } from '../../ui/toast';

/** Release plan relative to the release date. Tasks only — nothing is ever published by PULSE. */
const RELEASE_PLAN: { offset: number; title: string; lesson?: string; channel: string }[] = [
  { offset: -35, title: 'Lista gotowości: master, okładka, metadane, prawa', lesson: 'm3-readiness', channel: 'Wydanie' },
  { offset: -30, title: 'Wybór dystrybutora i wysłanie utworu', lesson: 'm3-distribution', channel: 'Wydanie' },
  { offset: -24, title: 'Zgłoszenie do redakcji playlist (Spotify for Artists)', lesson: 'm3-pitch', channel: 'Spotify' },
  { offset: -21, title: 'Plan 4 tygodni kampanii', lesson: 'm1-campaign', channel: 'Strategia' },
  { offset: -14, title: 'Przygotuj 3 materiały: fragment, kulisy, okładka', channel: 'TikTok / Reels' },
  { offset: -7, title: 'Zapowiedź premiery (do akceptacji przed publikacją)', channel: 'Instagram' },
  { offset: 0, title: 'Dzień premiery: link, relacja, odpowiedzi na komentarze', channel: 'Wydanie' },
  { offset: 7, title: 'Pierwsze wnioski: zapisy, udostępnienia, dokończenia', lesson: 'm5-metrics', channel: 'Analiza' },
  { offset: 14, title: 'Druga fala treści po premierze', lesson: 'm3-after', channel: 'Wydanie' },
];

export function PromotionScreen() {
  const q = useQuery();
  const clock = useClock();
  const snap = useStore((s) => s.snap);
  const stage = artistStage(snap);
  const stageIdx = STAGE_ORDER.indexOf(stage);
  const [tab, setTab] = useState<'program' | 'tasks'>(q.get('release') ? 'tasks' : 'program');
  const [lesson, setLesson] = useState<PromoLesson | null>(null);
  const [task, setTask] = useState<PromoTask | null>(null);
  const [releaseFor, setReleaseFor] = useState<string | null>(q.get('release'));
  const tasks = snap.promo_tasks;
  const doneKeys = new Set(tasks.filter((t) => t.status === 'done').map((t) => t.lesson_key));
  const open = tasks.filter((t) => t.status === 'todo' || t.status === 'doing').sort((a, b) => (a.due_date ?? '9').localeCompare(b.due_date ?? '9'));
  const closed = tasks.filter((t) => t.status === 'done' || t.status === 'skipped').sort((a, b) => (b.done_at ?? b.updated_at) - (a.done_at ?? a.updated_at));
  const releaseProjects = snap.projects.filter((p) => p.release_date && !p.archived);
  const available = PROMO_LESSONS.filter((l) => STAGE_ORDER.indexOf(l.min_stage) <= stageIdx);
  const doneAvailable = available.filter((l) => doneKeys.has(l.key)).length;

  return (
    <div className="screen">
      <ScreenHeader title="Promotion Academy" onBack sub="Promocja rośnie razem z katalogiem — bez wymogu codziennego publikowania." />
      <div className="stagecard">
        <div className="stagecard__text">
          <p className="stagecard__k">Aktualny etap</p>
          <p className="stagecard__t">{ARTIST_STAGE[stage]}</p>
          <p className="dim xs">{available.length ? `${doneAvailable} z ${available.length} lekcji na tym etapie zamienione w wykonane zadania.` : 'Brak lekcji na tym etapie.'}</p>
        </div>
        <BigRing pct={available.length ? Math.round((doneAvailable / available.length) * 100) : 0} />
      </div>
      <Segmented label="Widok" value={tab} onChange={setTab} options={[{ value: 'program', label: 'Program' }, { value: 'tasks', label: `Zadania${open.length ? ` ${open.length}` : ''}` }]} />

      {tab === 'program' && PROMO_MODULES.map((m) => (
        <Section key={m.n} title={`${m.n}. ${m.title}`}>
          <div className="list">
            {PROMO_LESSONS.filter((l) => l.module === m.n).map((l) => {
              const later = STAGE_ORDER.indexOf(l.min_stage) > stageIdx;
              return (
                <button key={l.key} className={`row row--action${later ? ' is-later' : ''}`} onClick={() => setLesson(l)}>
                  <span className={`lead-tile${doneKeys.has(l.key) ? ' is-done' : ''}`}>{doneKeys.has(l.key) ? <Icon name="check" size={18} /> : <Icon name="megaphone" size={18} />}</span>
                  <span className="row__main">
                    <span className="row__title">{l.title}</span>
                    <span className="row__sub">{l.channel}{later ? ' · na później, gdy będzie gotowy materiał' : ''}</span>
                  </span>
                  <span className="row__trail"><Icon name="chevron" size={18} /></span>
                </button>
              );
            })}
          </div>
        </Section>
      ))}

      {tab === 'tasks' && (
        <>
          <Section title="Plan premiery">
            {releaseProjects.length ? (
              <div className="cluster">{releaseProjects.map((p) => <Chip key={p.id} onClick={() => setReleaseFor(p.id)}>{p.title} · {shortDate(p.release_date!)}</Chip>)}</div>
            ) : <p className="muted small">Ustaw datę premiery w karcie projektu (Twórz → Projekty), żeby wygenerować zadania wydania.</p>}
          </Section>
          <Section title="Do zrobienia">
            {open.length ? (
              <div className="list">
                {open.map((t) => (
                  <button key={t.id} className="row row--action" onClick={() => setTask(t)}>
                    <span className="row__lead"><span className={`task-dot is-${t.status}`} /></span>
                    <span className="row__main">
                      <span className="row__title">{t.title}</span>
                      <span className="row__sub">{t.channel}{t.due_date ? ` · ${t.due_date < clock.today ? 'termin minął ' : 'do '}${shortDate(t.due_date)}` : ''}</span>
                    </span>
                  </button>
                ))}
              </div>
            ) : <p className="muted small">Brak otwartych zadań. Dodaj je z lekcji programu.</p>}
          </Section>
          {closed.length > 0 && (
            <Section title="Zrobione">
              <div className="list">{closed.slice(0, 15).map((t) => <button key={t.id} className="row row--action" onClick={() => setTask(t)}><span className="row__main"><span className="row__title">{t.title}</span><span className="row__sub">{t.status === 'done' ? 'Wykonane' : 'Pominięte'}{t.result ? ` · ${t.result}` : ''}</span></span></button>)}</div>
            </Section>
          )}
        </>
      )}

      {lesson && <LessonSheet lesson={lesson} stageOk={STAGE_ORDER.indexOf(lesson.min_stage) <= stageIdx} onClose={() => setLesson(null)} />}
      {task && <TaskSheet task={task} onClose={() => setTask(null)} />}
      {releaseFor && <ReleasePlanSheet projectId={releaseFor} onClose={() => setReleaseFor(null)} />}
    </div>
  );
}

function LessonSheet({ lesson, stageOk, onClose }: { lesson: PromoLesson; stageOk: boolean; onClose: () => void }) {
  const [due, setDue] = useState('');
  const existing = useStore((s) => s.snap.promo_tasks.find((t) => t.lesson_key === lesson.key && t.status !== 'skipped'));
  return (
    <Sheet open onClose={onClose} title={lesson.title}
      footer={existing ? <Button variant="ghost" block onClick={onClose}>Zadanie już jest na liście</Button> : (
        <Button variant="primary" block icon="plus" onClick={() => {
          putRow('promo_tasks', promoTaskSchema.parse({ id: newId('pt'), updated_at: Date.now(), lesson_key: lesson.key, title: lesson.task.split('.')[0], channel: lesson.channel, due_date: due || null, notes: lesson.task }));
          toast('Dodano zadanie promocyjne.', 'ok');
          onClose();
        }}>Dodaj jako zadanie</Button>
      )}>
      <p className="muted small">{lesson.channel}</p>
      <div className="stack"><span className="field__label">Idea</span><p>{lesson.idea}</p></div>
      <div className="stack"><span className="field__label">Zadanie praktyczne</span><p className="small">{lesson.task}</p></div>
      {!stageOk && <div className="callout callout--warn"><Icon name="info" size={18} /><span>To zadanie ma największy sens na późniejszym etapie. Możesz je zaplanować, ale nie jest teraz priorytetem.</span></div>}
      {!existing && <Field label="Termin (opcjonalnie)"><input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>}
    </Sheet>
  );
}

function TaskSheet({ task, onClose }: { task: PromoTask; onClose: () => void }) {
  const [t, setT] = useState(task);
  const lesson = t.lesson_key ? PROMO_BY_KEY[t.lesson_key] : null;
  const save = (patch: Partial<PromoTask> = {}) => { const next = { ...t, ...patch }; putRow('promo_tasks', next); onClose(); };
  return (
    <Sheet open onClose={onClose} title={t.title} tall
      footer={<>
        <Button variant="danger" icon="trash" aria-label="Usuń" onClick={() => { remove('promo_tasks', t.id); onClose(); }} />
        <Button variant="secondary" onClick={() => save()}>Zapisz</Button>
        {t.status !== 'done' && <Button variant="primary" icon="check" onClick={() => { save({ status: 'done', done_at: Date.now() }); toast('Wykonane.', 'ok'); }}>Zrobione</Button>}
      </>}>
      {lesson && <p className="muted small">{lesson.idea}</p>}
      <div className="cluster">{(['todo', 'doing', 'done', 'skipped'] as const).map((s) => <Chip key={s} on={t.status === s} onClick={() => setT({ ...t, status: s, done_at: s === 'done' ? Date.now() : null })}>{s === 'todo' ? 'Do zrobienia' : s === 'doing' ? 'W toku' : s === 'done' ? 'Zrobione' : 'Pomiń'}</Chip>)}</div>
      <Field label="Termin"><input className="input" type="date" value={t.due_date ?? ''} onChange={(e) => setT({ ...t, due_date: e.target.value || null })} /></Field>
      <Field label="Notatki"><textarea className="textarea" value={t.notes} onChange={(e) => setT({ ...t, notes: e.target.value })} maxLength={4000} /></Field>
      <Field label="Wynik i wnioski" hint="Np. liczby po 7 dniach i jedna zmiana na następny raz."><textarea className="textarea" value={t.result} onChange={(e) => setT({ ...t, result: e.target.value })} maxLength={2000} /></Field>
      <p className="dim xs">PULSE niczego nie publikuje za Ciebie. Zadania to plan pracy — publikacja zawsze wymaga Twojej decyzji poza aplikacją.</p>
    </Sheet>
  );
}

function ReleasePlanSheet({ projectId, onClose }: { projectId: string; onClose: () => void }) {
  const clock = useClock();
  const project = useStore((s) => s.rows.projects[projectId]);
  const existing = useStore(useShallow((s) => s.snap.promo_tasks.filter((t) => t.project_id === projectId)));
  const items = useMemo(() => project?.release_date ? RELEASE_PLAN.map((r) => ({ ...r, date: addDays(project.release_date!, r.offset) })) : [], [project]);
  if (!project?.release_date) return null;
  const tooLate = items.filter((i) => i.date < clock.today && i.offset < 0);
  return (
    <Sheet open onClose={onClose} title={`Premiera: ${project.title}`} tall
      footer={<Button variant="primary" block disabled={existing.length > 0} onClick={() => {
        const now = Date.now();
        const writes: Write[] = items.map((i) => ({ entity: 'promo_tasks', row: promoTaskSchema.parse({
          id: newId('pt'), updated_at: now, lesson_key: i.lesson ?? null, title: i.title, channel: i.channel,
          due_date: i.date < clock.today ? clock.today : i.date, project_id: projectId,
        }) }));
        commit(writes);
        toast(`Dodano ${writes.length} zadań planu premiery.`, 'ok');
        onClose();
      }}>{existing.length ? 'Plan premiery już istnieje' : 'Dodaj zadania'}</Button>}>
      <p className="muted small">Premiera {shortDate(project.release_date)}. Zadania rozłożone od 5 tygodni przed do 2 tygodni po. Publikacje zawsze wymagają Twojej akceptacji — PULSE nic nie wysyła.</p>
      {tooLate.length > 0 && <div className="callout callout--warn"><Icon name="info" size={18} /><span>{tooLate.length} zadań ma termin w przeszłości — dostaną dzisiejszą datę. Zgłoszenie do playlist wymaga zwykle kilku tygodni wyprzedzenia; rozważ przesunięcie premiery.</span></div>}
      <ul className="changes">{items.map((i) => <li key={i.title} className="changes__item"><Icon name="calendar" size={16} /><span><strong className="num">{shortDate(i.date)}</strong> · {i.title}</span></li>)}</ul>
    </Sheet>
  );
}

function BigRing({ pct }: { pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="bigring" role="img" aria-label={`${pct}%`}>
      <svg viewBox="0 0 72 72"><circle cx="36" cy="36" r={r} className="ring__track" /><circle cx="36" cy="36" r={r} className="ring__val" strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)} /></svg>
      <span className="num">{pct}%</span>
    </div>
  );
}
