import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import Logo from './Logo';
import PixelBadge from './PixelBadge';
import OfflineBanner from './OfflineBanner';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/routes';
import { useNotifications } from '../hooks/useNotifications';

const TABS = [
  { to: ROUTES.HOME, glyph: '▣', label: 'HOME' },
  { to: ROUTES.NEW_ORDER, glyph: '+', label: 'ORDER', primary: true },
  { to: ROUTES.RIDER_FEED, glyph: '◉', label: 'FEED' },
  { to: ROUTES.ORDER_HISTORY, glyph: '▤', label: 'LOG' },
  { to: ROUTES.PROFILE, glyph: '☺', label: 'ME' },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const unread = useNotifications(user?.uid).unread;

  return (
    <div className="min-h-dvh flex flex-col scanlines">
      <OfflineBanner />
      <header className="sticky top-0 z-40 bg-panel border-b-4 border-black safe-top">
        <div className="max-w-xl mx-auto px-4 py-2.5">
          {/* Row 1: Logo + action buttons */}
          <div className="flex items-center justify-between">
            <Logo small />
            <div className="flex items-center gap-2">
              <Link
                to={ROUTES.NOTIFICATIONS}
                className="relative font-pixel text-[10px] border-2 border-line px-2 py-1.5 hover:border-gold hover:text-gold cursor-pointer"
                aria-label="Notifications"
              >
                ◂▸
                {unread > 0 && (
                  <span className="absolute -top-2 -right-2 w-5 h-5 bg-brand border-2 border-black font-pixel text-[8px] text-black flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate(ROUTES.LOGIN);
                }}
                className="font-pixel text-[10px] text-fade border-2 border-line px-2 py-1.5 hover:border-danger hover:text-danger cursor-pointer"
              >
                EXIT
              </button>
            </div>
          </div>
          {/* Row 2: User rank badge */}
          {user && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t-2 border-line">
              <span className="font-pixel text-[8px] text-fade truncate">
                {user.name.toUpperCase()}
              </span>
              <PixelBadge orderCount={user.customerOrderCount} />
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-xl mx-auto px-4 pt-4 pb-24 sm:pb-28">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-panel border-t-4 border-black safe-bottom">
        <div className="max-w-xl mx-auto grid grid-cols-5 gap-0">
          {TABS.map((tab) =>
            tab.primary ? (
              <NavLink
                key={tab.to}
                to={tab.to}
                className="relative flex flex-col items-center justify-center gap-0.5 sm:gap-1 -mt-4 pb-1.5 sm:pb-2 cursor-pointer"
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`w-12 sm:w-14 h-10 sm:h-12 flex items-center justify-center font-pixel text-lg sm:text-xl border-2 border-black ${
                        isActive ? 'bg-cream text-black' : 'bg-brand text-black'
                      }`}
                    >
                      {tab.glyph}
                    </span>
                    <span className="font-pixel text-[7px] text-cream">{tab.label}</span>
                  </>
                )}
              </NavLink>
            ) : (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 sm:gap-1 py-2 sm:py-2.5 cursor-pointer ${
                    isActive ? 'text-brand' : 'text-fade'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span
                      className={`font-pixel text-lg sm:text-xl ${
                        isActive ? 'text-brand blink' : ''
                      }`}
                    >
                      {tab.glyph}
                    </span>
                    <span className="font-pixel text-[6px] sm:text-[7px]">{tab.label}</span>
                  </>
                )}
              </NavLink>
            ),
          )}
        </div>
      </nav>
    </div>
  );
}
