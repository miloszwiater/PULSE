import { useState } from 'react';
import { profileSchema, routineSchema } from '../../shared/schema';
import { newId } from '../../shared/domain/snapshot';
import { parseHHMM } from '../../shared/time';
import { commit, useStore, type Write } from '../data/store';
import { clockNow } from '../data/clock';
import { Button, Chip, Field, Toggle } from '../ui/kit';
import { Wordmark } from '../ui/Wordmark';
import { WD_SHORT } from '../ui/format';

const GENRES = ['Emocjonalny rap', 'Melodyjny rap', 'Alternatywny rap', 'Rap-rock', 'Emo rap', 'Pop-punk', 'Trap', 'R&B'];
const INSPIRATIONS = ['Opał', 'Gibbs', 'Machine Gun Kelly', 'Linkin Park'];

const STEPS = ['Ty', 'Muzyka', 'Praca', 'Rytm', 'Start'] as const;

export function Onboarding() {
  const user = useStore((s) => s.user);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name ?? '');
  const [artist, setArtist] = useState('');
  const [genres, setGenres] = useState<string[]>(['Emocjonalny rap', 'Melodyjny rap', 'Rap-rock']);
  const [style, setStyle] = useState('');
  const [inspirations, setInspirations] = useState<string[]>(INSPIRATIONS);
  const [newInsp, setNewInsp] = useState('');
  const [worksFixed, setWorksFixed] = useState(true);
  const [workDays, setWorkDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [workStart, setWorkStart] = useState('08:00');
  const [workEnd, setWorkEnd] = useState('16:00');
  const [commute, setCommute] = useState(30);
  const [wake, setWake] = useState('07:00');
  const [bed, setBed] = useState('23:30');
  const [target, setTarget] = useState(4);
  const [sessionLen, setSessionLen] = useState(90);
  const [learning, setLearning] = useState(1);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const finish = () => {
    const now = Date.now();
    const c = clockNow();
    const ws = parseHHMM(workStart) ?? 480;
    let we = parseHHMM(workEnd) ?? 960;
    if (we <= ws) we += 1440;
    const writes: Write[] = [
      { entity: 'profile', row: profileSchema.parse({
        id: 'me', updated_at: now, display_name: name.trim(), artist_name: artist.trim(), genres, inspirations,
        music_style: style.trim(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw',
        wake_min: parseHHMM(wake) ?? 420, bed_min: parseHHMM(bed) ?? 1410, weekly_session_target: target,
        weekly_minutes_target: target * sessionLen, session_default_min: sessionLen, learning_per_week: learning,
        start_date: c.today, onboarding_done: true,
      }) },
    ];
    if (worksFixed && workDays.length) {
      writes.push({ entity: 'routines', row: routineSchema.parse({ id: newId('rt'), updated_at: now, kind: 'work', title: 'Praca', weekdays: workDays, start_min: ws, end_min: we }) });
      if (commute > 0) {
        writes.push({ entity: 'routines', row: routineSchema.parse({ id: newId('rt'), updated_at: now, kind: 'commute', title: 'Dojazd do pracy', weekdays: workDays, start_min: Math.max(0, ws - commute), end_min: ws }) });
        writes.push({ entity: 'routines', row: routineSchema.parse({ id: newId('rt'), updated_at: now, kind: 'commute', title: 'Powrót z pracy', weekdays: workDays, start_min: we, end_min: we + commute }) });
      }
    }
    commit(writes);
  };

  const next = () => (step < STEPS.length - 1 ? setStep(step + 1) : finish());

  return (
    <div className="onb">
      <header className="onb__head">
        <Wordmark size="sm" />
        <ol className="onb__steps" aria-label={`Krok ${step + 1} z ${STEPS.length}`}>
          {STEPS.map((s, i) => <li key={s} className={i <= step ? 'is-done' : ''} aria-current={i === step ? 'step' : undefined}><span className="visually-hidden">{s}</span></li>)}
        </ol>
      </header>

      <div className="onb__body" key={step}>
        {step === 0 && (
          <>
            <h1 className="onb__title">Muzyka jako stały rytm, nie zryw.</h1>
            <p className="onb__lead">PULSE nie mówi, co tworzyć. Pomaga znaleźć na to czas obok pracy, wrócić po przerwie i — jeśli chcesz — uczyć się. Kilka pytań; wszystko zmienisz później.</p>
            <Field label="Jak się do Ciebie zwracać?"><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="given-name" /></Field>
            <Field label="Pseudonim artystyczny" hint="Opcjonalnie."><input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={80} /></Field>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="onb__title">Twoja muzyka</h1>
            <p className="onb__lead">Kontekst dla Akademii i Towarzysza. PULSE nie ocenia i nie podpowiada, jak ma brzmieć Twoja muzyka.</p>
            <Field label="Opisz ją jednym zdaniem" hint="Opcjonalnie.">
              <input className="input" value={style} onChange={(e) => setStyle(e.target.value)} maxLength={300} placeholder="np. melodyjny, emocjonalny rap z gitarami" />
            </Field>
            <div className="stack">
              <span className="field__label">Kierunek</span>
              <div className="cluster">{GENRES.map((g) => <Chip key={g} on={genres.includes(g)} onClick={() => setGenres(toggle(genres, g))}>{g}</Chip>)}</div>
            </div>
            <div className="stack">
              <span className="field__label">Punkty odniesienia</span>
              <div className="cluster">{inspirations.map((g) => <Chip key={g} on onClick={() => setInspirations(toggle(inspirations, g))}>{g}</Chip>)}</div>
              <form className="inline-add" onSubmit={(e) => { e.preventDefault(); const v = newInsp.trim(); if (v && !inspirations.includes(v)) setInspirations([...inspirations, v]); setNewInsp(''); }}>
                <input className="input" placeholder="Dodaj artystę lub utwór" value={newInsp} onChange={(e) => setNewInsp(e.target.value)} maxLength={80} />
                <Button variant="secondary" icon="plus" aria-label="Dodaj" disabled={!newInsp.trim()} />
              </form>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <h1 className="onb__title">Praca i dojazdy</h1>
            <p className="onb__lead">Plan muzyki układa się wokół pracy, a nie odwrotnie. Po zmianie zostawiam godzinę na regenerację.</p>
            <Toggle checked={worksFixed} onChange={setWorksFixed} label="Pracuję w stałych godzinach" hint="Zmienny grafik dodasz w Planie jako pojedyncze zmiany." />
            {worksFixed && (
              <>
                <div className="stack">
                  <span className="field__label">Dni pracy</span>
                  <div className="cluster">{WD_SHORT.map((d, i) => <Chip key={d} on={workDays.includes(i)} onClick={() => setWorkDays(toggle(workDays, i).sort())}>{d}</Chip>)}</div>
                </div>
                <div className="field-row">
                  <Field label="Od"><input className="input" type="time" step={60} value={workStart} onChange={(e) => setWorkStart(e.target.value)} /></Field>
                  <Field label="Do"><input className="input" type="time" step={60} value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} /></Field>
                </div>
                <Field label="Dojazd w jedną stronę (min)">
                  <input className="input" type="number" inputMode="numeric" min={0} max={180} value={commute} onChange={(e) => setCommute(Math.max(0, Math.min(180, Number(e.target.value) || 0)))} />
                </Field>
              </>
            )}
          </>
        )}
        {step === 3 && (
          <>
            <h1 className="onb__title">Rytm tygodnia</h1>
            <p className="onb__lead">Rytm jest tygodniowy i jest zachętą, nie wymogiem. Codzienna muzyka jest mile widziana, ale niepotrzebna; choroba, urlop i dni wolne nigdy nie przerywają rytmu.</p>
            <div className="field-row">
              <Field label="Pobudka"><input className="input" type="time" step={60} value={wake} onChange={(e) => setWake(e.target.value)} /></Field>
              <Field label="Sen"><input className="input" type="time" step={60} value={bed} onChange={(e) => setBed(e.target.value)} /></Field>
            </div>
            <div className="stack">
              <span className="field__label">Sesje w tygodniu</span>
              <div className="cluster">{[2, 3, 4, 5, 6].map((n) => <Chip key={n} on={target === n} onClick={() => setTarget(n)}>{n}</Chip>)}</div>
              <span className="field__hint">Realistycznie przy pełnym etacie: 3–4.</span>
            </div>
            <div className="stack">
              <span className="field__label">Typowa długość sesji</span>
              <div className="cluster">{[45, 60, 90, 120].map((n) => <Chip key={n} on={sessionLen === n} onClick={() => setSessionLen(n)}>{n} min</Chip>)}</div>
            </div>
            <div className="stack">
              <span className="field__label">Bloki nauki w tygodniu (opcjonalne)</span>
              <div className="cluster">{[0, 1, 2].map((n) => <Chip key={n} on={learning === n} onClick={() => setLearning(n)}>{n === 0 ? 'Nie proponuj' : n}</Chip>)}</div>
              <span className="field__hint">Pojawią się tylko, gdy zaczniesz ścieżkę w Akademii.</span>
            </div>
          </>
        )}
        {step === 4 && (
          <>
            <h1 className="onb__title">Gotowe</h1>
            <p className="onb__lead">Bez terminu końcowego i bez punktów. Najprostszy start: zakładka Twórz i jedno dotknięcie.</p>
            <div className="panel panel--tight stack small">
              <div className="spread"><span className="muted">Rytm</span><strong>{target} sesje w tygodniu, ok. {sessionLen} min</strong></div>
              <div className="spread"><span className="muted">Dzień</span><strong className="num">{wake}–{bed}</strong></div>
              {worksFixed && <div className="spread"><span className="muted">Praca</span><strong className="num">{workDays.map((d) => WD_SHORT[d]).join(' ')} · {workStart}–{workEnd}</strong></div>}
            </div>
          </>
        )}
      </div>

      <footer className="onb__foot">
        {step > 0 ? <Button variant="ghost" onClick={() => setStep(step - 1)}>Wstecz</Button> : <span />}
        <Button variant="primary" size="lg" onClick={next} disabled={step === 0 && !name.trim()}>
          {step === STEPS.length - 1 ? 'Zaczynam' : 'Dalej'}
        </Button>
      </footer>
      <p className="visually-hidden" aria-live="polite">{`Krok ${step + 1}: ${STEPS[step]}`}</p>
    </div>
  );
}
