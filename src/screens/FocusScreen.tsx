import { useState } from 'react';
import type { Profile } from '../../shared/schema';
import { hhmm, parseHHMM } from '../../shared/time';
import { useProfile } from '../data/store';
import { patchProfile, startSession } from '../data/actions';
import { Button, Chip, Field, IconButton, ScreenHeader, Sheet } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { WD_SHORT } from '../ui/format';
import { toast } from '../ui/toast';
import { navigate } from '../app/router';

const COMMON_APPS = ['Instagram', 'TikTok', 'YouTube', 'X', 'Facebook', 'Snapchat', 'Reddit', 'Discord', 'Netflix', 'Twitch', 'Gry'];

/** URL that runs a user-made Apple Shortcut, passing the planned minutes as text input. */
export function shortcutUrl(name: string, minutes: number): string {
  return `shortcuts://run-shortcut?name=${encodeURIComponent(name)}&input=text&text=${minutes}`;
}

type Block = Profile['focus_blocks'][number];

export function FocusScreen() {
  const p = useProfile();
  const [custom, setCustom] = useState('');
  const [shortcut, setShortcut] = useState(p?.focus_shortcut ?? '');
  const [block, setBlock] = useState<{ i: number | null; b: Block } | null>(null);
  if (!p) return null;
  const apps = p.focus_apps;
  const toggleApp = (a: string) => patchProfile({ focus_apps: apps.includes(a) ? apps.filter((x) => x !== a) : [...apps, a] });

  return (
    <div className="screen focus withhero">
      <div className="screenhero photo" aria-hidden="true"><img src="/photos/focus.webp" alt="" /></div>
      <ScreenHeader title="Skupienie" onBack sub="Mniej rozpraszaczy, więcej muzyki — na tyle, na ile pozwala iPhone." />
      <button className="slab" onClick={() => { startSession({ focus: true }); navigate('/sesja'); }}>
        <span className="slab__disc" aria-hidden="true" />
        <span className="slab__text"><span className="slab__title">Sesja ze skupieniem</span><span className="slab__sub">Ekran nie gaśnie{p.focus_shortcut ? `, skrót „${p.focus_shortcut}” pod ręką` : ''}</span></span>
        <Icon name="play" size={20} fill="currentColor" />
      </button>
      <div className="honest">
        <Icon name="shield" size={22} />
        <div>
          <p><strong>Co PULSE potrafi, a czego nie.</strong> PULSE działa jako aplikacja webowa — iOS nie pozwala jej blokować innych aplikacji. Prawdziwe blokady ustawia się w systemie (Czas przed ekranem, Skupienie). PULSE pomaga je przygotować, trzyma ekran włączony w trakcie sesji i może uruchomić Twój skrót.</p>
        </div>
      </div>

      <section className="block" aria-labelledby="apps-h">
        <h2 className="block__title" id="apps-h">Co Cię rozprasza</h2>
        <p className="muted small">Lista do ustawień iOS poniżej — PULSE nie widzi, czego używasz.</p>
        <div className="cluster">
          {[...new Set([...COMMON_APPS, ...apps])].map((a) => <Chip key={a} on={apps.includes(a)} onClick={() => toggleApp(a)}>{a}</Chip>)}
        </div>
        <form className="inline-add" onSubmit={(e) => { e.preventDefault(); const t = custom.trim(); if (t && !apps.includes(t)) patchProfile({ focus_apps: [...apps, t].slice(0, 50) }); setCustom(''); }}>
          <input className="input" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="Inna aplikacja" maxLength={60} />
          <Button variant="secondary" icon="plus" aria-label="Dodaj aplikację" disabled={!custom.trim()} />
        </form>
      </section>

      <section className="block" aria-labelledby="session-h">
        <h2 className="block__title" id="session-h">Skupienie w trakcie sesji</h2>
        <ol className="steps">
          <li>W aplikacji <strong>Skróty</strong> utwórz skrót, np. „PULSE Skupienie”, z akcją <strong>Ustaw skupienie</strong> → wybrany tryb (np. Nie przeszkadzać albo własny „Muzyka”) → <strong>Włącz</strong>.</li>
          <li>Opcjonalnie: dodaj „Dopasuj datę” i ustaw skupienie <strong>do</strong> obliczonej godziny — PULSE przekazuje do skrótu liczbę minut sesji. Jeśli tryb się sam nie wyłączy, wyłącz go w Centrum sterowania.</li>
          <li>W <strong>Ustawienia → Skupienie → [tryb]</strong> wycisz powiadomienia z aplikacji z listy powyżej. Skupienie filtruje powiadomienia — nie blokuje otwierania aplikacji.</li>
          <li>Wpisz nazwę skrótu poniżej. W sesji ze skupieniem pojawi się przycisk, który go uruchamia.</li>
        </ol>
        <Field label="Nazwa skrótu" hint="Dokładnie jak w aplikacji Skróty. Puste = bez skrótu.">
          <input className="input" value={shortcut} onChange={(e) => setShortcut(e.target.value)} onBlur={() => shortcut !== p.focus_shortcut && patchProfile({ focus_shortcut: shortcut.trim() })} maxLength={120} placeholder="PULSE Skupienie" />
        </Field>
        {p.focus_shortcut && <a className="btn btn--secondary btn--sm" href={shortcutUrl(p.focus_shortcut, 25)}>Wypróbuj skrót (25 min)</a>}
      </section>

      <section className="block" aria-labelledby="blocks-h">
        <div className="block__head">
          <h2 className="block__title" id="blocks-h">Bloki dnia bez rozpraszaczy</h2>
          <button className="btn btn--quiet" onClick={() => setBlock({ i: null, b: { weekdays: [0, 1, 2, 3, 4], start_min: 19 * 60, end_min: 22 * 60, label: 'Wieczór na muzykę' } })}><Icon name="plus" size={16} /> Dodaj</button>
        </div>
        {p.focus_blocks.length ? (
          <ul className="fblocks">
            {p.focus_blocks.map((b, i) => (
              <li key={i}>
                <button className="row row--action" onClick={() => setBlock({ i, b })}>
                  <span className="row__main"><span className="row__title">{b.label || 'Blok'} <span className="num muted">{hhmm(b.start_min)}–{hhmm(b.end_min)}</span></span><span className="row__sub">{b.weekdays.length === 7 ? 'codziennie' : b.weekdays.map((d) => WD_SHORT[d]).join(', ')}</span></span>
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="muted small">Np. wieczory w dni robocze. To plan, który przeniesiesz do ustawień iOS.</p>}
        <ol className="steps">
          <li><strong>Ustawienia → Czas przed ekranem → Przestój</strong>: ustaw harmonogram zgodny z blokami. W przestoju działają tylko aplikacje „Zawsze dozwolone” i połączenia telefoniczne.</li>
          <li>Albo <strong>Limity aplikacji</strong> dla aplikacji z listy powyżej.</li>
          <li>Żeby blokady trudno było zdjąć impulsywnie: ustaw <strong>kod Czasu przed ekranem</strong> i włącz blokowanie po upływie limitu / w przestoju. Najskuteczniej, gdy kod zna zaufana osoba, a nie Ty.</li>
          <li>Telefon i połączenia alarmowe zawsze pozostają dostępne — nie blokuj ich.</li>
        </ol>
      </section>

      <section className="block" aria-labelledby="native-h">
        <h2 className="block__title" id="native-h">Prawdziwe blokowanie z poziomu PULSE</h2>
        <p className="muted small">Wymagałoby osobnej aplikacji natywnej na iOS z dostępem do Screen Time API (Family Controls). Apple przyznaje ten dostęp do dystrybucji po osobnym wniosku, a aplikacja wymaga konta Apple Developer Program. Tego PULSE dziś nie robi — i nie udaje, że robi.</p>
      </section>

      <BlockSheet value={block} onClose={() => setBlock(null)} blocks={p.focus_blocks} />
    </div>
  );
}

function BlockSheet({ value, onClose, blocks }: { value: { i: number | null; b: Block } | null; onClose: () => void; blocks: Block[] }) {
  const [b, setB] = useState<Block | null>(null);
  const [key, setKey] = useState<unknown>(null);
  if (value !== key) { setKey(value); setB(value?.b ?? null); }
  if (!value || !b) return null;
  const save = () => {
    const next = [...blocks];
    if (value.i == null) next.push(b); else next[value.i] = b;
    patchProfile({ focus_blocks: next.slice(0, 12) });
    toast('Zapisano blok.', 'ok');
    onClose();
  };
  return (
    <Sheet open onClose={onClose} title={value.i == null ? 'Nowy blok' : 'Blok'}
      footer={<>{value.i != null && <IconButton icon="trash" label="Usuń blok" onClick={() => { patchProfile({ focus_blocks: blocks.filter((_, j) => j !== value.i) }); onClose(); }} />}<Button variant="primary" disabled={!b.weekdays.length || b.end_min <= b.start_min} onClick={save}>Zapisz</Button></>}>
      <Field label="Nazwa"><input className="input" value={b.label} onChange={(e) => setB({ ...b, label: e.target.value })} maxLength={60} /></Field>
      <div className="cluster" role="group" aria-label="Dni tygodnia">
        {WD_SHORT.map((d, i) => <Chip key={d} on={b.weekdays.includes(i)} onClick={() => setB({ ...b, weekdays: b.weekdays.includes(i) ? b.weekdays.filter((x) => x !== i) : [...b.weekdays, i].sort() })}>{d}</Chip>)}
      </div>
      <div className="field-row">
        <Field label="Od"><input className="input" type="time" step={60} value={hhmm(b.start_min)} onChange={(e) => { const v = parseHHMM(e.target.value); if (v != null) setB({ ...b, start_min: v }); }} /></Field>
        <Field label="Do"><input className="input" type="time" step={60} value={hhmm(b.end_min)} onChange={(e) => { const v = parseHHMM(e.target.value); if (v != null) setB({ ...b, end_min: v }); }} /></Field>
      </div>
    </Sheet>
  );
}
