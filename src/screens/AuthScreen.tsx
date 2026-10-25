import { useEffect, useState, type FormEvent } from 'react';
import { api, ApiError } from '../data/api';
import type { AuthUser } from '../data/store';
import { Button, Field } from '../ui/kit';
import { Wordmark } from '../ui/Wordmark';

export function AuthScreen({ onDone }: { onDone: (u: AuthUser) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [cfg, setCfg] = useState<{ signupOpen: boolean; signupWithCode: boolean } | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ signupOpen: boolean; signupWithCode: boolean }>('/api/auth/config')
      .then((c) => { setCfg(c); if (c.signupOpen) setMode('register'); })
      .catch(() => setCfg({ signupOpen: false, signupWithCode: false }));
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ user: AuthUser }>(`/api/auth/${mode}`, { body: mode === 'login' ? { email, password } : { email, password, name, code: code || undefined } });
      onDone(res.user);
    } catch (err) {
      setError((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };

  const canRegister = cfg?.signupOpen || cfg?.signupWithCode;
  return (
    <div className="auth">
      <div className="auth__brand">
        <Wordmark size="lg" />
        <svg className="auth__line" viewBox="0 0 400 60" preserveAspectRatio="none" aria-hidden="true">
          <path pathLength={1} d="M0 34 H150 L162 40 L174 8 L188 52 L198 34 H260 L268 38 L276 24 L284 34 H400" />
        </svg>
        <p className="auth__lead">Muzyka jako regularna część życia. Plan, który rozumie pracę i odpoczynek, sesja jednym dotknięciem i nauka we własnym tempie.</p>
      </div>
      <form className="auth__form" onSubmit={submit} noValidate>
        <h1 className="auth__title">{mode === 'login' ? 'Zaloguj się' : cfg?.signupOpen ? 'Załóż swoje konto' : 'Załóż konto'}</h1>
        {mode === 'register' && (
          <Field label="Imię lub pseudonim">
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="nickname" maxLength={80} />
          </Field>
        )}
        <Field label="E-mail">
          <input className="input" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Hasło" hint={mode === 'register' ? 'Co najmniej 10 znaków.' : undefined}>
          <input className="input" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === 'register' ? 10 : 1} />
        </Field>
        {mode === 'register' && !cfg?.signupOpen && (
          <Field label="Kod zaproszenia">
            <input className="input" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
          </Field>
        )}
        {error && <p className="auth__error" role="alert">{error}</p>}
        <Button variant="primary" size="lg" block disabled={busy || !email || !password}>
          {busy ? 'Chwila…' : mode === 'login' ? 'Zaloguj się' : 'Załóż konto'}
        </Button>
        {canRegister && (
          <button type="button" className="auth__switch" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
            {mode === 'login' ? 'Nie masz konta? Załóż je' : 'Masz już konto? Zaloguj się'}
          </button>
        )}
        {cfg?.signupOpen && mode === 'register' && <p className="dim xs">To pierwsze konto na tym serwerze. Kolejne będą wymagały kodu zaproszenia.</p>}
      </form>
    </div>
  );
}
