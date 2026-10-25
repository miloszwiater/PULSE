import { useState } from 'react';
import { profileSchema, routineSchema, skillLevelSchema, SKILL_CATEGORIES, type SkillCategory } from '../../shared/schema';
import { CATEGORY_LABEL } from '../../shared/catalog/exercises';
import { seedMilestones } from '../../shared/domain/roadmap';
import { newId } from '../../shared/domain/snapshot';
import { parseHHMM } from '../../shared/time';
import { commit, useStore, type Write } from '../data/store';
import { clockNow } from '../data/clock';
import { Button, Chip, Field, Toggle } from '../ui/kit';
import { Wordmark } from '../ui/Wordmark';
import { WD_SHORT } from '../ui/format';

const GENRES = ['Rap melancholijny', 'Emo rap', 'Rap z gitarą', 'Alternatywa', 'Pop-rap', 'Rock', 'Trap', 'R&B'];
const INSPIRATIONS = ['Machine Gun Kelly', 'Linkin Park', 'Opał', 'Gibbs'];
type Self = 'strong' | 'ok' | 'grow';

const STEPS = ['Ty', 'Muzyka', 'Warsztat', 'Praca', 'Rytm', 'Start'] as const;

export function Onboarding() {
  const user = useStore((s) => s.user);
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user?.name ?? '');
  const [artist, setArtist] = useState('');
  const [genres, setGenres] = useState<string[]>(['Rap melancholijny', 'Rap z gitarą']);
  const [inspirations, setInspirations] = useState<string[]>(INSPIRATIONS);
  const [newInsp, setNewInsp] = useState('');
  const [selfEval, setSelfEval] = useState<Record<SkillCategory, Self>>({ songwriting: 'ok', flow: 'ok', melody: 'ok', production: 'ok', analysis: 'ok' });
  const [goals, setGoals] = useState('');
  const [worksFixed, setWorksFixed] = useState(true);
  const [workDays, setWorkDays] = useState<number[]>([0, 1, 2, 3, 4]);
  const [workStart, setWorkStart] = useState('08:00');
  const [workEnd, setWorkEnd] = useState('16:00');
  const [commute, setCommute] = useState(30);
  const [wake, setWake] = useState('07:00');
  const [bed, setBed] = useState('23:30');
  const [target, setTarget] = useState(4);
  const [sessionLen, setSessionLen] = useState(90);
  const [consent, setConsent] = useState(false);

  const toggle = <T,>(list: T[], v: T) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const finish = () => {
    const now = Date.now();
    const c = clockNow();
    const ws = parseHHMM(workStart) ?? 480;
    let we = parseHHMM(workEnd) ?? 960;
    if (we <= ws) we += 1440;
    const strengths = SKILL_CATEGORIES.filter((k) => selfEval[k] === 'strong').map((k) => CATEGORY_LABEL[k]);
    const weaknesses = SKILL_CATEGORIES.filter((k) => selfEval[k] === 'grow').map((k) => CATEGORY_LABEL[k]);
    const focus = SKILL_CATEGORIES.filter((k) => selfEval[k] === 'grow').slice(0, 3);
    const writes: Write[] = [
      { entity: 'profile', row: profileSchema.parse({
        id: 'me', updated_at: now, display_name: name.trim(), artist_name: artist.trim(), genres, inspirations,
        strengths, weaknesses, goals_text: goals.trim(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw',
        wake_min: parseHHMM(wake) ?? 420, bed_min: parseHHMM(bed) ?? 1410, weekly_session_target: target,
        weekly_minutes_target: target * sessionLen, session_default_min: sessionLen, focus_categories: focus,
        start_date: c.today, onboarding_done: true, mentor_text_consent: consent,
      }) },
      ...SKILL_CATEGORIES.map((k) => ({ entity: 'skill_levels' as const, row: skillLevelSchema.parse({
        id: k, updated_at: now, category: k, level: selfEval[k] === 'strong' ? 2 : 1, reason: 'Samoocena przy starcie',
      }) })),
      ...seedMilestones(now).map((m) => ({ entity: 'milestones' as const, row: m })),
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
            <h1 className="onb__title">365 dni świadomego rozwoju.</h1>
            <p className="onb__lead">Nie musisz tworzyć codziennie. Musisz tworzyć konsekwentnie. Kilka pytań, żeby plan pasował do Twojego życia — wszystko zmienisz później w ustawieniach.</p>
            <Field label="Jak się do Ciebie zwracać?"><input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="given-name" /></Field>
            <Field label="Pseudonim artystyczny" hint="Opcjonalnie."><input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} maxLength={80} /></Field>
          </>
        )}
        {step === 1 && (
          <>
            <h1 className="onb__title">Twoje brzmienie</h1>
            <p className="onb__lead">PULSE wydobywa techniki z inspiracji — nie uczy kopiowania artystów.</p>
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
            <h1 className="onb__title">Gdzie dziś jesteś?</h1>
            <p className="onb__lead">Szczera samoocena ustawia punkt startowy ćwiczeń. To nie jest ocena talentu — poziomy będą się zmieniać na podstawie Twoich prób.</p>
            <div className="selfeval">
              {SKILL_CATEGORIES.map((k) => (
                <div key={k} className="selfeval__row">
                  <span className="selfeval__label">{CATEGORY_LABEL[k]}</span>
                  <div className="segmented" role="radiogroup" aria-label={CATEGORY_LABEL[k]}>
                    {(['grow', 'ok', 'strong'] as Self[]).map((v) => (
                      <button key={v} role="radio" aria-checked={selfEval[k] === v} className={`segmented__opt${selfEval[k] === v ? ' is-on' : ''}`} onClick={() => setSelfEval({ ...selfEval, [k]: v })}>
                        {v === 'grow' ? 'Do rozwoju' : v === 'ok' ? 'W porządku' : 'Mocna strona'}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <Field label="Co chcesz osiągnąć w tym roku?" hint="Własnymi słowami. Mentor będzie się do tego odnosił.">
              <textarea className="textarea" value={goals} onChange={(e) => setGoals(e.target.value)} maxLength={4000} placeholder="Np. skończyć 6 utworów, wydać pierwszy singiel, pisać bardziej obrazowo…" />
            </Field>
          </>
        )}
        {step === 3 && (
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
                  <Field label="Od"><input className="input" type="time" value={workStart} onChange={(e) => setWorkStart(e.target.value)} /></Field>
                  <Field label="Do"><input className="input" type="time" value={workEnd} onChange={(e) => setWorkEnd(e.target.value)} /></Field>
                </div>
                <Field label="Dojazd w jedną stronę (min)">
                  <input className="input" type="number" inputMode="numeric" min={0} max={180} value={commute} onChange={(e) => setCommute(Math.max(0, Math.min(180, Number(e.target.value) || 0)))} />
                </Field>
              </>
            )}
          </>
        )}
        {step === 4 && (
          <>
            <h1 className="onb__title">Rytm tygodnia</h1>
            <p className="onb__lead">Cel jest tygodniowy. Jedno opuszczone popołudnie niczego nie przekreśla, a choroba czy urlop obniżają cel automatycznie.</p>
            <div className="field-row">
              <Field label="Pobudka"><input className="input" type="time" value={wake} onChange={(e) => setWake(e.target.value)} /></Field>
              <Field label="Sen"><input className="input" type="time" value={bed} onChange={(e) => setBed(e.target.value)} /></Field>
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
          </>
        )}
        {step === 5 && (
          <>
            <h1 className="onb__title">Dzień 1</h1>
            <p className="onb__lead">Program 365 zaczyna się dziś. Fazy roadmapy przesuwają się według realnych postępów, nie według kalendarza.</p>
            <div className="panel panel--tight stack small">
              <div className="spread"><span className="muted">Cel tygodnia</span><strong>{target} sesje × {sessionLen} min</strong></div>
              <div className="spread"><span className="muted">Dzień</span><strong className="num">{wake}–{bed}</strong></div>
              {worksFixed && <div className="spread"><span className="muted">Praca</span><strong className="num">{workDays.map((d) => WD_SHORT[d]).join(' ')} · {workStart}–{workEnd}</strong></div>}
              <div className="spread"><span className="muted">Priorytety</span><strong>{SKILL_CATEGORIES.filter((k) => selfEval[k] === 'grow').map((k) => CATEGORY_LABEL[k]).join(', ') || 'równomiernie'}</strong></div>
            </div>
            <Toggle checked={consent} onChange={setConsent} label="Analiza tekstów, które wkleję mentorowi"
              hint="Mentor nigdy nie ocenia tekstów, których nie widział. Włączenie pozwala mu omawiać fragmenty wklejone przez Ciebie w rozmowie." />
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
