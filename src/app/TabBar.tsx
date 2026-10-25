import { Icon, type IconName } from '../ui/Icon';
import { navigate, tabOf, TABS, usePath } from './router';

const ICONS: Record<string, IconName> = { '/': 'start', '/plan': 'plan', '/tworz': 'create', '/rozwoj': 'growth', '/kariera': 'career' };

export function TabBar() {
  const path = usePath();
  const active = tabOf(path);
  return (
    <nav className="tabbar" aria-label="Główna nawigacja">
      {TABS.map((t) => {
        const on = active === t.path;
        const create = t.path === '/tworz';
        return (
          <button key={t.path} className={`tabbar__item${on ? ' is-on' : ''}${create ? ' tabbar__item--create' : ''}`}
            aria-current={on ? 'page' : undefined} onClick={() => navigate(t.path)}>
            <span className="tabbar__icon"><Icon name={ICONS[t.path]} size={create ? 24 : 22} strokeWidth={create ? 2.2 : 1.75} /></span>
            <span className="tabbar__label">{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
