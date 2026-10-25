import { useEffect, useState } from 'react';
import { useProfile } from '../../data/store';
import { patchProfile } from '../../data/actions';
import { navigate } from '../../app/router';
import { Button, Chip, Field, ScreenHeader, Section, Toggle } from '../../ui/kit';

const TECHNIQUES = [
  'Obrazowanie zamiast deklaracji', 'Puenta', 'Narracja z punktem zwrotnym', 'Kontrast emocjonalny zwrotka–refren',
  'Melodyjny refren na długich samogłoskach', 'Gitarowa tekstura w aranżacji', 'Jedna metafora przez cały utwór',
  'Pauza przed ważnym słowem', 'Rymy wewnętrzne', 'Osobisty szczegół zamiast ogólnika',
];

function ListEditor({ label, values, onChange, suggestions = [], hint }: { label: string; values: string[]; onChange: (v: string[]) => void; suggestions?: string[]; hint?: string }) {
  const [draft, setDraft] = useState('');
  const all = [...values, ...suggestions.filter((s) => !values.includes(s))];
  return (
    <div className="stack">
      <span className="field__label">{label}</span>
      {hint && <span className="field__hint">{hint}</span>}
      <div className="cluster">
        {all.map((v) => <Chip key={v} on={values.includes(v)} onClick={() => onChange(values.includes(v) ? values.filter((x) => x !== v) : [...values, v])}>{v}</Chip>)}
      </div>
      <form className="inline-add" onSubmit={(e) => { e.preventDefault(); const t = draft.trim(); if (t && !values.includes(t)) onChange([...values, t]); setDraft(''); }}>
        <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Dodaj własne" maxLength={120} />
        <Button variant="secondary" icon="plus" aria-label="Dodaj" disabled={!draft.trim()} />
      </form>
    </div>
  );
}

export function StyleScreen() {
  const p = useProfile();
  const [style, setStyle] = useState(p?.style_text ?? '');
  useEffect(() => {
    if (!p || style === p.style_text) return;
    const t = setTimeout(() => patchProfile({ style_text: style }), 700);
    return () => clearTimeout(t);
  }, [style, p]);
  if (!p) return null;
  return (
    <div className="screen">
      <ScreenHeader title="Styl artysty" onBack sub="Z inspiracji wydobywasz techniki, nie kopiujesz brzmienia ani wykonania." />

      <Section title="Mój styl własnymi słowami">
        <Field label="Tematy, techniki, brzmienie, czego świadomie unikasz" hint="Wracaj tu co kilka tygodni. Mentor odnosi się do tego opisu.">
          <textarea className="textarea" style={{ minHeight: 160 }} value={style} onChange={(e) => setStyle(e.target.value)} maxLength={4000}
            placeholder="Np. Melancholijny rap z gitarą. Piszę obrazem — miejsca, przedmioty, pora dnia. Refren śpiewany, prosty, z jedną myślą. Unikam ogólników o „bólu” i cudzych fraz." />
        </Field>
      </Section>

      <Section title="Kierunek">
        <ListEditor label="Gatunki i klimat" values={p.genres} onChange={(v) => patchProfile({ genres: v })} />
      </Section>
      <Section title="Punkty odniesienia">
        <ListEditor label="Artyści i utwory" values={p.inspirations} onChange={(v) => patchProfile({ inspirations: v })} hint="Np. MGK i Linkin Park za energię gitar, Opał i Gibbs za pisanie i storytelling." />
      </Section>
      <Section title="Techniki do wydobycia">
        <ListEditor label="Co bierzesz od inspiracji" values={p.techniques} onChange={(v) => patchProfile({ techniques: v })} suggestions={TECHNIQUES} />
      </Section>
      <Section title="Samoocena">
        <div className="stack-lg">
          <ListEditor label="Mocne strony" values={p.strengths} onChange={(v) => patchProfile({ strengths: v })} />
          <ListEditor label="Do rozwoju" values={p.weaknesses} onChange={(v) => patchProfile({ weaknesses: v })} />
        </div>
      </Section>

      <Section title="Analiza fragmentu tekstu">
        <div className="stack">
          <p className="muted small">Mentor może omówić fragment, który wkleisz — techniki, obraz, rytm, spójność — z zaznaczeniem niepewności. Nie wydaje wyroków o sztuce i nie widzi niczego, czego nie wkleisz.</p>
          <Toggle checked={p.mentor_text_consent} onChange={(v) => patchProfile({ mentor_text_consent: v })} label="Zgoda na analizę wklejonych fragmentów" hint="Fragment trafia do dostawcy AI tylko w chwili wysłania wiadomości." />
          <Button variant="secondary" icon="mentor" disabled={!p.mentor_text_consent} onClick={() => navigate('/mentor?analyze=1')}>Omów fragment z mentorem</Button>
        </div>
      </Section>
    </div>
  );
}
