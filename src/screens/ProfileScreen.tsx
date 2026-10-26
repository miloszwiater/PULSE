import { useEffect, useRef, useState } from 'react';
import { useProfile } from '../data/store';
import { useClock } from '../data/clock';
import { patchProfile } from '../data/actions';
import { navigate } from '../app/router';
import { Button, Chip, IconButton, Row, Section } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { NightScene } from '../ui/NightScene';
import { useScene } from '../ui/useScene';
import { setHeroPhoto, useHeroPhoto } from '../ui/heroPhoto';
import { toast } from '../ui/toast';
import { Wordmark } from '../ui/Wordmark';
import { HeroBackdrop } from '../ui/Hero';
import { back } from '../app/router';

const VALUE_SUGGESTIONS = ['Autentyczność', 'Rozwój', 'Wolność', 'Dyscyplina', 'Emocje', 'Rodzina', 'Zdrowie', 'Szczerość', 'Rzemiosło'];
const SCENES = [
  { value: 'auto', label: 'Studio PULSE', hint: 'Fotografia nocnego studia w kolorach PULSE.' },
  { value: 'night', label: 'Miasto nocą', hint: 'Generowana panorama miasta — inna dla każdego konta.' },
  { value: 'rain', label: 'Deszcz', hint: 'Noc z deszczem na szybie.' },
  { value: 'photo', label: 'Własne zdjęcie', hint: 'Zapisane tylko na tym urządzeniu.' },
] as const;

export function ProfileScreen() {
  const p = useProfile();
  const clock = useClock();
  const scene = useScene(clock.nowMin);
  const photo = useHeroPhoto();
  const [vision, setVision] = useState(p?.vision ?? '');
  const [draft, setDraft] = useState('');
  const [style, setStyle] = useState(p?.music_style ?? '');
  const [insp, setInsp] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!p || vision === p.vision) return;
    const t = setTimeout(() => patchProfile({ vision: vision.trim() }), 700);
    return () => clearTimeout(t);
  }, [vision, p]);
  if (!p) return null;
  const name = p.artist_name || p.display_name || 'Artysta';
  const all = [...p.values, ...VALUE_SUGGESTIONS.filter((v) => !p.values.includes(v))];

  return (
    <div className="profile">
      <section className="profile__hero">
        <HeroBackdrop nowMin={clock.nowMin} />
        <header className="profile__top">
          <IconButton icon="back" label="Wróć" onClick={() => back('/ty')} />
          <IconButton icon="settings" label="Ustawienia" onClick={() => navigate('/ustawienia')} />
        </header>
        <div className="profile__id">
          <Wordmark size="lg" />
          <p className="profile__name">{name}</p>
          <p className="profile__sub">{p.music_style || p.genres.join(', ')}</p>
        </div>
      </section>

      <div className="profile__body">
        <section className="card2 pcard">
          <div className="pcard__head"><h2>Twoja muzyka</h2></div>
          <input className="input" value={style} onChange={(e) => setStyle(e.target.value)} onBlur={() => style !== p.music_style && patchProfile({ music_style: style.trim() })} maxLength={1000} placeholder="np. melodyjny, emocjonalny rap z gitarami" aria-label="Opis Twojej muzyki" />
          <span className="field__label">Inspiracje</span>
          <div className="cluster">
            {p.inspirations.map((v) => <Chip key={v} on onClick={() => patchProfile({ inspirations: p.inspirations.filter((x) => x !== v) })}>{v}</Chip>)}
          </div>
          <form className="inline-add" onSubmit={(e) => { e.preventDefault(); const t = insp.trim(); if (t && !p.inspirations.includes(t)) patchProfile({ inspirations: [...p.inspirations, t].slice(0, 50) }); setInsp(''); }}>
            <input className="input" value={insp} onChange={(e) => setInsp(e.target.value)} placeholder="Dodaj artystę lub utwór" maxLength={80} />
            <Button variant="secondary" icon="plus" aria-label="Dodaj inspirację" disabled={!insp.trim()} />
          </form>
          <p className="dim xs">Kontekst dla Akademii i Towarzysza. PULSE nie ocenia Twojej muzyki.</p>
        </section>

        <section className="card2 pcard">
          <div className="pcard__head"><h2>Po co to robię</h2><Icon name="edit" size={16} /></div>
          <textarea className="pcard__vision" value={vision} onChange={(e) => setVision(e.target.value)} maxLength={1000} rows={3}
            aria-label="Po co to robię" placeholder="Dla siebie, własnymi słowami. Opcjonalne." />
        </section>

        <section className="card2 pcard">
          <div className="pcard__head"><h2>Wartości</h2></div>
          <div className="cluster">
            {all.map((v) => <Chip key={v} on={p.values.includes(v)} onClick={() => patchProfile({ values: p.values.includes(v) ? p.values.filter((x) => x !== v) : [...p.values, v] })}>{v}</Chip>)}
          </div>
          <form className="inline-add" onSubmit={(e) => { e.preventDefault(); const t = draft.trim(); if (t && !p.values.includes(t)) patchProfile({ values: [...p.values, t] }); setDraft(''); }}>
            <input className="input" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Własna wartość" maxLength={60} />
            <Button variant="secondary" icon="plus" aria-label="Dodaj wartość" disabled={!draft.trim()} />
          </form>
        </section>

        <section className="card2 pcard">
          <div className="pcard__head"><h2>Wygląd aplikacji</h2></div>
          <div className="scenes">
            {SCENES.map((sc) => (
              <button key={sc.value} className={`scenepick${p.scene === sc.value ? ' is-on' : ''}`} aria-pressed={p.scene === sc.value}
                onClick={() => { if (sc.value === 'photo' && !photo) { fileRef.current?.click(); return; } patchProfile({ scene: sc.value }); }}>
                <span className="scenepick__thumb">
                  {sc.value === 'photo'
                    ? (photo ? <img src={photo} alt="" /> : <Icon name="image" size={22} />)
                    : sc.value === 'auto' ? <img src="/photos/desk.webp" alt="" /> : <NightScene seed={scene.seed} minute={23 * 60} rain={sc.value === 'rain'} />}
                </span>
                <span className="scenepick__label">{sc.label}</span>
              </button>
            ))}
          </div>
          <p className="dim xs">{SCENES.find((x) => x.value === p.scene)?.hint}</p>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            try { await setHeroPhoto(f); patchProfile({ scene: 'photo' }); toast('Zdjęcie ustawione na tym urządzeniu.', 'ok'); } catch { toast('Nie udało się wczytać zdjęcia.', 'error'); }
            e.target.value = '';
          }} />
          {photo && <div className="cluster"><Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>Zmień zdjęcie</Button><Button size="sm" variant="ghost" onClick={() => { void setHeroPhoto(null); if (p.scene === 'photo') patchProfile({ scene: 'auto' }); }}>Usuń zdjęcie</Button></div>}
        </section>

        <Section title="Więcej o Tobie">
          <div className="list">
            <Row leading={<Icon name="heart" />} title="Samopoczucie" sub="Energia i zdrowie" onClick={() => navigate('/care')} />
            <Row leading={<Icon name="settings" />} title="Ustawienia" sub="Rytm, przypomnienia, dane, konto" onClick={() => navigate('/ustawienia')} />
          </div>
        </Section>
      </div>
    </div>
  );
}
