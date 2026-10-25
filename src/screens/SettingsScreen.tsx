import { useEffect, useState } from 'react';
import { SKILL_CATEGORIES } from '../../shared/schema';
import { CATEGORY_LABEL } from '../../shared/catalog/exercises';
import { hhmm, parseHHMM } from '../../shared/time';
import { api, ApiError } from '../data/api';
import { clearLocal, persistNow, useProfile, useStore } from '../data/store';
import { syncNow } from '../data/sync';
import { patchProfile } from '../data/actions';
import { isIOS, isStandalone } from '../app/pwa';
import { navigate } from '../app/router';
import { Button, Chip, Confirm, Field, ScreenHeader, Section, Toggle } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { toast } from '../ui/toast';

function b64ToUint8(b64: string) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function SettingsScreen() {
  const p = useProfile();
  const user = useStore((s) => s.user);
  const syncState = useStore((s) => s.syncState);
  const lastSynced = useStore((s) => s.lastSyncedAt);
  const outbox = useStore((s) => s.outbox.length);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [push, setPush] = useState<{ available: boolean; publicKey: string | null } | null>(null);
  const [subscribed, setSubscribed] = useState<boolean | null>(null);
  const [mentor, setMentor] = useState<{ configured: boolean; model: string } | null>(null);
  const [name, setName] = useState(p?.display_name ?? '');
  const [artist, setArtist] = useState(p?.artist_name ?? '');

  useEffect(() => {
    api<{ available: boolean; publicKey: string | null }>('/api/push/config').then(setPush).catch(() => setPush(null));
    api<{ configured: boolean; model: string }>('/api/mentor/status').then(setMentor).catch(() => setMentor(null));
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.getRegistration().then((r) => r?.pushManager.getSubscription()).then((s) => setSubscribed(!!s)).catch(() => setSubscribed(false));
    } else setSubscribed(false);
  }, []);

  if (!p) return null;
  const pushSupported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

  const enablePush = async () => {
    try {
      if (!push?.publicKey) return;
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { toast('Bez zgody na powiadomienia przypomnienia nie będą wysyłane.', 'info'); return; }
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToUint8(push.publicKey) });
      await api('/api/push/subscribe', { body: sub.toJSON() });
      setSubscribed(true);
      patchProfile({ reminders: { ...p.reminders, enabled: true } });
      toast('Powiadomienia włączone na tym urządzeniu.', 'ok');
    } catch (e) {
      toast(`Nie udało się włączyć powiadomień: ${(e as Error).message}`, 'error');
    }
  };
  const disablePush = async () => {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) { await api('/api/push/unsubscribe', { body: { endpoint: sub.endpoint } }).catch(() => undefined); await sub.unsubscribe(); }
    setSubscribed(false);
    patchProfile({ reminders: { ...p.reminders, enabled: false } });
  };

  const exportData = () => {
    const s = useStore.getState();
    const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), user: s.user, data: s.rows }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pulse-eksport-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };

  return (
    <div className="screen">
      <ScreenHeader title="Ustawienia" onBack />

      <button className="row row--action" onClick={() => navigate('/profil')} style={{ marginBottom: 8 }}>
        <span className="row__lead"><Icon name="user" /></span>
        <span className="row__main"><span className="row__title">Profil i wygląd</span><span className="row__sub">Wizja, wartości, scena w tle</span></span>
        <span className="row__trail"><Icon name="chevron" size={18} /></span>
      </button>

      <Section title="Profil">
        <div className="stack">
          <Field label="Imię"><input className="input" value={name} onChange={(e) => setName(e.target.value)} onBlur={() => name !== p.display_name && patchProfile({ display_name: name.trim() })} maxLength={80} /></Field>
          <Field label="Pseudonim artystyczny"><input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} onBlur={() => artist !== p.artist_name && patchProfile({ artist_name: artist.trim() })} maxLength={80} /></Field>
          <Field label="Strefa czasowa"><input className="input" value={p.timezone} readOnly /></Field>
          <Field label="Start programu 365"><input className="input" type="date" value={p.start_date ?? ''} onChange={(e) => e.target.value && patchProfile({ start_date: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title="Rytm">
        <div className="stack">
          <div className="field-row">
            <Field label="Pobudka"><input className="input" type="time" defaultValue={hhmm(p.wake_min)} onBlur={(e) => { const v = parseHHMM(e.target.value); if (v != null) patchProfile({ wake_min: v }); }} /></Field>
            <Field label="Sen"><input className="input" type="time" defaultValue={hhmm(p.bed_min)} onBlur={(e) => { const v = parseHHMM(e.target.value); if (v != null) patchProfile({ bed_min: v }); }} /></Field>
          </div>
          <div className="stack"><span className="field__label">Sesje w tygodniu</span>
            <div className="cluster">{[1, 2, 3, 4, 5, 6, 7].map((n) => <Chip key={n} on={p.weekly_session_target === n} onClick={() => patchProfile({ weekly_session_target: n })}>{n}</Chip>)}</div>
          </div>
          <div className="stack"><span className="field__label">Typowa sesja</span>
            <div className="cluster">{[45, 60, 90, 120, 150].map((n) => <Chip key={n} on={p.session_default_min === n} onClick={() => patchProfile({ session_default_min: n })}>{n} min</Chip>)}</div>
          </div>
          <div className="stack"><span className="field__label">Priorytetowe obszary</span>
            <div className="cluster">{SKILL_CATEGORIES.map((c) => <Chip key={c} on={p.focus_categories.includes(c)} onClick={() => patchProfile({ focus_categories: p.focus_categories.includes(c) ? p.focus_categories.filter((x) => x !== c) : [...p.focus_categories, c].slice(0, 5) })}>{CATEGORY_LABEL[c]}</Chip>)}</div>
          </div>
        </div>
      </Section>

      <Section title="Przypomnienia">
        <div className="stack">
          {!pushSupported ? (
            <div className="callout"><Icon name="info" size={18} /><span>{isIOS() && !isStandalone() ? 'Na iPhonie powiadomienia działają tylko po dodaniu PULSE do ekranu początkowego (iOS 16.4+). Dodaj aplikację i otwórz ją z ikony.' : 'Ta przeglądarka nie obsługuje powiadomień web push.'}</span></div>
          ) : push && !push.available ? (
            <div className="callout"><Icon name="info" size={18} /><span>Serwer nie ma skonfigurowanych kluczy VAPID — przypomnienia push są wyłączone. Reszta aplikacji działa normalnie.</span></div>
          ) : (
            <Toggle checked={!!subscribed && p.reminders.enabled} onChange={(v) => void (v ? enablePush() : disablePush())} label="Powiadomienia na tym urządzeniu" hint="iOS decyduje o dokładnym czasie dostarczenia — przypomnienia mogą przyjść z opóźnieniem." />
          )}
          <Toggle checked={p.reminders.morning_brief} onChange={(v) => patchProfile({ reminders: { ...p.reminders, morning_brief: v } })} label="Poranny skrót dnia" hint="Pół godziny po pobudce." />
          <Toggle checked={p.reminders.session_start} onChange={(v) => patchProfile({ reminders: { ...p.reminders, session_start: v } })} label="Przed zaplanowaną sesją" hint="Ok. 15 minut wcześniej." />
          <Toggle checked={p.reminders.weekly_review} onChange={(v) => patchProfile({ reminders: { ...p.reminders, weekly_review: v } })} label="Podsumowanie tygodnia" hint="Niedziela wieczorem." />
          <Toggle checked={p.reminders.quiet_during_work} onChange={(v) => patchProfile({ reminders: { ...p.reminders, quiet_during_work: v } })} label="Cisza w czasie pracy" hint="Nic nie przychodzi w godzinach pracy z grafiku." />
          {subscribed && <Button variant="secondary" size="sm" onClick={() => api('/api/push/test', { body: {} }).then(() => toast('Wysłano testowe powiadomienie.', 'ok')).catch((e: ApiError) => toast(e.message, 'error'))}>Wyślij test</Button>}
        </div>
      </Section>

      <Section title="Skupienie">
        <div className="focuscard">
          <span className="focuscard__icon"><Icon name="lock" size={20} /></span>
          <div className="stack" style={{ gap: 6 }}>
            <p><strong>Blokowanie aplikacji wymaga natywnej aplikacji iOS.</strong></p>
            <p className="muted small">Blokowanie TikToka czy Instagrama podczas sesji wymaga API Czasu przed ekranem (Screen Time), niedostępnego dla aplikacji webowych. PULSE nie udaje tej funkcji.</p>
            <p className="muted small">Co działa teraz: tryb skupienia w sesji (ekran nie gaśnie, widok bez rozpraszaczy) oraz systemowy tryb Skupienie w iOS — możesz go włączać ręcznie lub automatyzacją w aplikacji Skróty.</p>
          </div>
        </div>
      </Section>

      <Section title="Mentor AI">
        <p className="muted small">
          {mentor == null ? 'Nie udało się sprawdzić stanu.' : mentor.configured ? `Połączony (model: ${mentor.model}). Wywołania tylko z serwera, gdy wysyłasz wiadomość.` : 'Niepodłączony — brak klucza ANTHROPIC_API_KEY na serwerze. Obserwacje z danych działają bez AI.'}
        </p>
      </Section>

      {!isStandalone() && (
        <Section title="Instalacja na iPhonie">
          <ol className="steps small">
            <li>Otwórz PULSE w Safari.</li>
            <li>Stuknij <strong>Udostępnij</strong> (kwadrat ze strzałką).</li>
            <li>Wybierz <strong>Do ekranu początk.</strong> i potwierdź.</li>
          </ol>
        </Section>
      )}

      <Section title="Dane i synchronizacja">
        <div className="stack">
          <p className="muted small">
            {syncState === 'offline' ? 'Offline. ' : syncState === 'error' ? 'Błąd synchronizacji. ' : 'Zsynchronizowane. '}
            {outbox ? `${outbox} zmian czeka na wysłanie. ` : ''}
            {lastSynced ? `Ostatnio: ${new Date(lastSynced).toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}.` : ''}
          </p>
          <div className="cluster">
            <Button size="sm" variant="secondary" icon="sync" onClick={() => void syncNow()}>Synchronizuj</Button>
            <Button size="sm" variant="secondary" onClick={exportData}>Eksportuj dane (JSON)</Button>
          </div>
        </div>
      </Section>

      <Section title="Konto">
        <p className="muted small">{user?.email}</p>
        <Button variant="ghost" onClick={() => setLogoutOpen(true)}>Wyloguj</Button>
      </Section>
      <Confirm open={logoutOpen} onClose={() => setLogoutOpen(false)} title="Wylogować?" confirmLabel="Wyloguj"
        text={outbox ? `Uwaga: ${outbox} zmian nie zostało jeszcze wysłanych na serwer i zostaną utracone.` : 'Dane są na serwerze — po zalogowaniu wrócą.'}
        danger={outbox > 0}
        onConfirm={async () => { await persistNow(); await api('/api/auth/logout', { body: {} }).catch(() => undefined); await clearLocal(); location.href = '/'; }} />
    </div>
  );
}
