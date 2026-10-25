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
import { StartScreen } from '../screens/StartScreen';
import { PlanScreen } from '../screens/plan/PlanScreen';
import { CreateScreen } from '../screens/create/CreateScreen';
import { SessionScreen } from '../screens/create/SessionScreen';
import { ProjectsScreen, ProjectScreen } from '../screens/create/Projects';
import { Splash } from './Splash';

// Less frequent screens load on demand; Start/Plan/Twórz/Sesja stay in the main bundle.
const GrowthScreen = lazy(() => import('../screens/growth/GrowthScreen').then((m) => ({ default: m.GrowthScreen })));
const SkillScreen = lazy(() => import('../screens/growth/SkillScreen').then((m) => ({ default: m.SkillScreen })));
const LibraryScreen = lazy(() => import('../screens/growth/LibraryScreen').then((m) => ({ default: m.LibraryScreen })));
const StyleScreen = lazy(() => import('../screens/growth/StyleScreen').then((m) => ({ default: m.StyleScreen })));
const StatsScreen = lazy(() => import('../screens/growth/StatsScreen').then((m) => ({ default: m.StatsScreen })));
const CareerScreen = lazy(() => import('../screens/career/CareerScreen').then((m) => ({ default: m.CareerScreen })));
const RoadmapScreen = lazy(() => import('../screens/career/RoadmapScreen').then((m) => ({ default: m.RoadmapScreen })));
const PromotionScreen = lazy(() => import('../screens/career/PromotionScreen').then((m) => ({ default: m.PromotionScreen })));
const GoalsScreen = lazy(() => import('../screens/career/GoalsScreen').then((m) => ({ default: m.GoalsScreen })));
const MentorScreen = lazy(() => import('../screens/MentorScreen').then((m) => ({ default: m.MentorScreen })));
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

function Shell() {
  const path = usePath();
  const fullscreen = path === '/sesja' || path === '/mentor';
  let screen: ReactNode;
  const seg = path.split('/').filter(Boolean);
  switch (seg[0]) {
    case undefined: screen = <StartScreen />; break;
    case 'plan': screen = <PlanScreen />; break;
    case 'tworz': screen = <CreateScreen />; break;
    case 'sesja': screen = <SessionScreen />; break;
    case 'projekty': screen = seg[1] ? <ProjectScreen id={seg[1]} /> : <ProjectsScreen />; break;
    case 'rozwoj':
      screen = seg[1] === 'obszar' && seg[2] ? <SkillScreen category={seg[2]} />
        : seg[1] === 'biblioteka' ? <LibraryScreen />
        : seg[1] === 'styl' ? <StyleScreen />
        : seg[1] === 'statystyki' ? <StatsScreen />
        : <GrowthScreen />;
      break;
    case 'kariera':
      screen = seg[1] === 'roadmapa' ? <RoadmapScreen />
        : seg[1] === 'promocja' ? <PromotionScreen />
        : seg[1] === 'cele' ? <GoalsScreen />
        : <CareerScreen />;
      break;
    case 'mentor': screen = <MentorScreen />; break;
    case 'care': screen = <CareScreen />; break;
    case 'ustawienia': screen = <SettingsScreen />; break;
    case 'profil': screen = <ProfileScreen />; break;
    default:
      queueMicrotask(() => navigate('/', { replace: true }));
      screen = null;
  }
  return (
    <div className="shell" data-tab={tabOf(path)}>
      <main key={seg[0] ?? 'start'} className="shell__main"><Suspense fallback={<div className="screen" aria-busy="true" />}>{screen}</Suspense></main>
      {!fullscreen && <ActiveSessionPill />}
      {!fullscreen && <TabBar />}
      <Toaster />
    </div>
  );
}
