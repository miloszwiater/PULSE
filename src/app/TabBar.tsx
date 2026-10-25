import { Icon, type IconName } from '../ui/Icon';
import { navigate, tabOf, TABS, usePath } from './router';
import { useStore } from '../data/store';

const ICONS: Record<string, IconName> = { '/': 'today', '/plan': 'plan', '/tworz': 'disc', '/nauka': 'learn', '/ty': 'user' };

export function TabBar() {
  const path = usePath();
  const active = tabOf(path);
  const live = useStore((s) => Object.values(s.rows.sessions).some((x) => x.deleted_at == null && x.status === 'running'));
  return (
    <nav className="tabbar" aria-label="Główna nawigacja">
      {TABS.map((t) => {
        const on = active === t.path;
        const create = t.path === '/tworz';
        return (
          <button key={t.path} className={`tabbar__item${on ? ' is-on' : ''}${create ? ' tabbar__item--create' : ''}`}
            aria-current={on ? 'page' : undefined} onClick={() => navigate(t.path)}>
            <span className="tabbar__icon">{create ? <span className={`tabbar__disc${live ? ' is-live' : ''}`} aria-hidden="true"><span /></span> : <Icon name={ICONS[t.path]} size={22} />}</span>
            <span className="tabbar__label">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
