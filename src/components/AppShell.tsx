import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useMemo } from 'react';

const tabs = [
  { to: '/home', label: 'Home', icon: '⚾' },
  { to: '/roster', label: 'Roster', icon: '👥' },
  { to: '/pitchers', label: 'Pitchers', icon: '🎯' },
  { to: '/stats', label: 'Stats', icon: '📊' },
  { to: '/settings', label: 'Setup', icon: '⚙️' }
];

export default function AppShell() {
  const location = useLocation();
  const inGame = useMemo(() => location.pathname.startsWith('/game/'), [location.pathname]);
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 safe-top">
        <Outlet />
      </main>
      {!inGame && (
        <nav className="sticky bottom-0 z-10 bg-ump-card border-t border-ump-line safe-bottom">
          <ul className="grid grid-cols-5">
            {tabs.map((t) => (
              <li key={t.to}>
                <NavLink
                  to={t.to}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center py-2 text-xs transition ${
                      isActive ? 'text-ump-accent' : 'text-ump-dim'
                    }`
                  }
                >
                  <span className="text-xl leading-none mb-0.5">{t.icon}</span>
                  {t.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
