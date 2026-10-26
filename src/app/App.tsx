import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { api, ApiError } from '../data/api';
import { clearLocal, lastUser, loadLocal, useStore, type AuthUser } from '../data/store';
import { startSyncLoop, syncNow } from '../data/sync';
import { Toaster } from '../ui/kit';
import { navigate, tabOf, usePath } from './router';
import { TabBar } from './TabBar';
import { ActiveSessionPill } from './ActiveSessionPill';
import { AuthScreen } from '../screens/AuthScreen';
import { Onboarding } from '../screens/Onboarding';
import { TodayScreen } from '../screens/TodayScreen';
import { PlanScreen } from '../screens/plan/PlanScreen';
import { CreateScreen } from '../screens/create/CreateScreen';
import { SessionScreen } from '../screens/create/SessionScreen';
import { Splash } from './Splash';

// Less frequent screens load on demand; Dziś/Plan/Twórz/Sesja stay in the main bundle.
const AcademyScreen = lazy(() => import('../screens/learn/AcademyScreen').then((m) => ({ default: m.AcademyScreen })));
const PathScreen = lazy(() => import('../screens/learn/AcademyScreen').then((m) => ({ default: m.PathScreen })));
const LessonScreen = lazy(() => import('../screens/learn/AcademyScreen').then((m) => ({ default: m.LessonScreen })));
const BooksScreen = lazy(() => import('../screens/learn/BooksScreen').then((m) => ({ default: m.BooksScreen })));
const YouScreen = lazy(() => import('../screens/you/YouScreen').then((m) => ({ default: m.YouScreen })));
const RhythmScreen = lazy(() => import('../screens/you/YouScreen').then((m) => ({ default: m.RhythmScreen })));
const ProjectsScreen = lazy(() => import('../screens/create/Projects').then((m) => ({ default: m.ProjectsScreen })));
const ProjectScreen = lazy(() => import('../screens/create/Projects').then((m) => ({ default: m.ProjectScreen })));
const FocusScreen = lazy(() => import('../screens/FocusScreen').then((m) => ({ default: m.FocusScreen })));
const CompanionScreen = lazy(() => import('../screens/CompanionScreen').then((m) => ({ default: m.CompanionScreen })));
const CareScreen = lazy(() => import('../screens/CareScreen').then((m) => ({ default: m.CareScreen })));
const ProfileScreen = lazy(() => import('../screens/ProfileScreen').then((m) => ({ default: m.ProfileScreen })));
const SettingsScreen = lazy(() => import('../screens/SettingsScreen').then((m) => ({ default: m.SettingsScreen })));

let loopStarted = false;

async function boot(): Promise<'auth' | 'ready'> {
  const cached = await lastUser();
  if (cached) {
    await loadLocal(cached);
    try {
      const me = await api<{ user: AuthUser }>('/api/me');
      if (me.user.id !== cached.id) { await clearLocal(); await loadLocal(me.user); }
    } catch (e) {
      if ((e as ApiError).status === 401) return 'auth';
      // offline: continue with local data
    }
    return 'ready';
  }
  try {
    const me = await api<{ user: AuthUser }>('/api/me');
    await loadLocal(me.user);
    return 'ready';
  } catch {
    return 'auth';
  }
}

export function App() {
  const [phase, setPhase] = useState<'boot' | 'auth' | 'ready'>('boot');
  const user = useStore((s) => s.user);
  const profile = useStore((s) => s.snap.profile);
  const synced = useStore((s) => s.lastSyncedAt != null || s.syncState === 'offline' || s.syncState === 'error');

  useEffect(() => {
    void boot().then(setPhase);
    const onUnauth = () => setPhase('auth');
    window.addEventListener('pulse:unauthorized', onUnauth);
    return () => window.removeEventListener('pulse:unauthorized', onUnauth);
  }, []);

  useEffect(() => {
    if (phase === 'ready' && user && !loopStarted) {
      loopStarted = true;
      startSyncLoop();
    } else if (phase === 'ready' && user) {
      void syncNow();
    }
  }, [phase, user]);

  if (phase === 'boot') return <Splash />;
  if (phase === 'auth') {
    return (
      <>
        <AuthScreen onDone={async (u) => {
          const prev = useStore.getState().user;
          if (prev && prev.id !== u.id) await clearLocal();
          await loadLocal(u);
          setPhase('ready');
        }} />
        <Toaster />
      </>
    );
  }
  if (!profile && !synced) return <Splash />;
  if (!profile?.onboarding_done) return (<><Onboarding /><Toaster /></>);
  return <Shell />;
}

/** Old (v1/v2) addresses still open something sensible — bookmarks and notifications keep working. */
const LEGACY: Record<string, string> = {
  '/rozwoj': '/nauka', '/rozwoj/biblioteka': '/nauka/ksiazki', '/rozwoj/statystyki': '/ty/rytm', '/rozwoj/styl': '/profil',
  '/kariera': '/ty', '/mentor': '/towarzysz',
};

function Shell() {
  const path = usePath();
  const fullscreen = path === '/sesja' || path === '/towarzysz';
  let screen: ReactNode;
  const seg = path.split('/').filter(Boolean);
  const legacy = LEGACY[path] ?? (seg[0] === 'rozwoj' ? '/nauka' : seg[0] === 'kariera' ? '/ty' : null);
  if (legacy) queueMicrotask(() => navigate(legacy, { replace: true }));
  switch (legacy ? '__legacy' : seg[0]) {
    case undefined: screen = <TodayScreen />; break;
    case 'plan': screen = <PlanScreen />; break;
    case 'tworz': screen = <CreateScreen />; break;
    case 'sesja': screen = <SessionScreen />; break;
    case 'projekty': screen = seg[1] ? <ProjectScreen id={seg[1]} /> : <ProjectsScreen />; break;
    case 'nauka':
      screen = seg[1] === 'ksiazki' ? <BooksScreen />
        : seg[2] ? <LessonScreen lessonKey={seg[2]} />
        : seg[1] ? <PathScreen pathKey={seg[1]} />
        : <AcademyScreen />;
      break;
    case 'ty': screen = seg[1] === 'rytm' ? <RhythmScreen /> : <YouScreen />; break;
    case 'towarzysz': screen = <CompanionScreen />; break;
    case 'skupienie': screen = <FocusScreen />; break;
    case 'care': screen = <CareScreen />; break;
    case 'ustawienia': screen = <SettingsScreen />; break;
    case 'profil': screen = <ProfileScreen />; break;
    case '__legacy': screen = null; break;
    default:
      queueMicrotask(() => navigate('/', { replace: true }));
      screen = null;
  }
  return (
    <div className="shell" data-tab={tabOf(path)}>
      <main key={path} className="shell__main"><Suspense fallback={<div className="screen" aria-busy="true" />}>{screen}</Suspense></main>
      {!fullscreen && path !== '/tworz' && <ActiveSessionPill />}
      {!fullscreen && <TabBar />}
      <Toaster />
    </div>
  );
}
