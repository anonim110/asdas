import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  Home,
  Hash,
  Bell,
  Mail,
  Bookmark,
  User,
  Settings,
  Feather,
  LogOut,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { useRealtime } from '../store/realtime';
import { toast } from '../store/toast';
import { Avatar } from './Avatar';
import { Modal } from './Modal';
import { Dismiss } from './Dismiss';
import { PostComposer } from './PostComposer';
import { ThemeToggle } from './ThemeToggle';
import { RightSidebar } from './RightSidebar';
import { ScrollToTop } from './ScrollToTop';
import { RealtimeBridge } from './RealtimeBridge';
import { CallOverlay } from './CallOverlay';
import { QuickSearch } from './QuickSearch';
import { UserName } from './UserName';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  badge?: number;
}

export function Layout() {
  const user = useAuth((s) => s.user);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const location = useLocation();
  const { notifUnread, dmUnread } = useRealtime();
  const [compose, setCompose] = useState(false);
  const [menu, setMenu] = useState(false);
  const [quickSearch, setQuickSearch] = useState(false);
  const isMessagesRoute = location.pathname.startsWith('/messages');
  const isChatRoute = /^\/messages\/[^/]+/.test(location.pathname);

  useEffect(() => {
    const openSearch = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setQuickSearch(true);
      } else if (!typing && event.key === '/') {
        event.preventDefault();
        setQuickSearch(true);
      }
    };
    window.addEventListener('keydown', openSearch);
    return () => window.removeEventListener('keydown', openSearch);
  }, []);

  if (!user) return null;

  const items: NavItem[] = [
    { to: '/home', label: 'Home', icon: Home },
    { to: '/explore', label: 'Explore', icon: Hash },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: notifUnread },
    { to: '/messages', label: 'Messages', icon: Mail, badge: dmUnread },
    { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
    { to: `/${user.username}`, label: 'Profile', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="mx-auto flex max-w-[1400px] sm:px-3 xl:px-6">
      <RealtimeBridge />
      <CallOverlay />

      {/* Left navigation (desktop) */}
      <header className="sticky top-0 hidden h-screen shrink-0 flex-col justify-between px-2 py-4 sm:flex xl:w-[285px]">
        <div className="flex flex-col items-center xl:items-start">
          <NavLink
            to="/home"
            className="mb-3 flex min-h-12 items-center gap-3 rounded-full p-2.5 text-brand transition duration-200 hover:bg-white/80 hover:shadow-soft active:scale-95 dark:hover:bg-white/[0.06]"
            aria-label="Murmur home"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand text-white shadow-lift">
              <Feather size={23} />
            </span>
            <span className="hidden bg-gradient-to-r from-brand via-brand-soft to-accent bg-clip-text text-2xl font-extrabold text-transparent xl:inline">
              Murmur
            </span>
          </NavLink>

          <nav className="flex w-full flex-col gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group flex min-h-12 items-center gap-4 rounded-lg px-3 py-2.5 text-lg transition duration-200 xl:w-full ${
                    isActive
                      ? 'bg-white font-extrabold text-brand shadow-sm ring-1 ring-slate-200/70 dark:bg-white/[0.08] dark:text-rose-300 dark:ring-white/10'
                      : 'text-slate-700 hover:bg-white/75 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white'
                  }`
                }
              >
                <span className="relative transition duration-200 group-active:scale-90">
                  <item.icon size={25} strokeWidth={2.2} />
                  {!!item.badge && item.badge > 0 && (
                    <span className="absolute -right-2 -top-1 min-w-[18px] rounded-full bg-accent px-1 text-center text-xs font-bold text-white shadow-sm">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="hidden xl:inline">{item.label}</span>
              </NavLink>
            ))}
            <button
              onClick={() => setQuickSearch(true)}
              className="group flex min-h-12 items-center gap-4 rounded-lg px-3 py-2.5 text-lg text-slate-700 transition duration-200 hover:bg-white/75 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-white/[0.06] dark:hover:text-white"
            >
              <Search size={25} strokeWidth={2.2} className="transition duration-200 group-active:scale-90" />
              <span className="hidden xl:inline">Search</span>
            </button>
            <ThemeToggle withLabel />
          </nav>

          <button onClick={() => setCompose(true)} className="btn-primary mt-4 w-12 xl:w-full xl:py-3">
            <Feather size={20} className="xl:hidden" />
            <span className="hidden xl:inline">Post</span>
          </button>
        </div>

        {/* Account switcher / logout */}
        <div className="relative">
          <button
            onClick={() => setMenu((o) => !o)}
            className="flex min-h-14 w-full items-center gap-3 rounded-2xl p-2.5 transition duration-200 hover:bg-white/80 hover:shadow-soft dark:hover:bg-white/[0.06]"
          >
            <Avatar user={user} linkable={false} />
            <div className="hidden min-w-0 flex-1 text-left xl:block">
              <UserName user={user} className="max-w-full" compact />
              <p className="truncate text-sm text-gray-500">@{user.username}</p>
            </div>
            <MoreHorizontal className="hidden xl:block" size={18} />
          </button>
          {menu && <Dismiss onDismiss={() => setMenu(false)} />}
          {menu && (
            <div className="panel absolute bottom-16 z-10 w-64 overflow-hidden py-2">
              <button
                onClick={async () => {
                  await logout();
                  toast('Signed out', 'info');
                  navigate('/login');
                }}
                className="flex w-full items-center gap-2 px-4 py-3 font-bold transition hover:bg-rose-50 dark:hover:bg-white/[0.07]"
              >
                <LogOut size={18} /> Log out @{user.username}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content — keyed by route for a subtle fade on navigation */}
      <main
        className={`min-h-screen w-full border-x border-slate-200/80 bg-white/70 shadow-soft backdrop-blur dark:border-white/10 dark:bg-black/35 ${
          isMessagesRoute ? 'max-w-[920px]' : 'max-w-[600px]'
        }`}
      >
        <div key={location.pathname} className={`animate-page-enter ${isChatRoute ? '' : 'pb-16 sm:pb-0'}`}>
          <Outlet />
        </div>
      </main>

      <RightSidebar />

      {/* Mobile bottom navigation */}
      {!isChatRoute && (
        <nav className="mobile-safe-pad fixed bottom-0 left-0 right-0 z-40 grid grid-cols-5 border-t border-slate-200/80 bg-white/95 px-1 pt-1 shadow-[0_-16px_40px_-30px_rgba(15,23,42,0.45)] backdrop-blur-xl sm:hidden dark:border-white/10 dark:bg-[#07080f]/95">
          {items.slice(0, 4).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-bold transition duration-200 ${
                  isActive ? 'text-brand dark:text-rose-300' : 'text-slate-500'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`relative flex h-8 min-w-12 items-center justify-center rounded-full transition duration-200 ${
                      isActive ? 'bg-rose-100 dark:bg-white/[0.08]' : ''
                    }`}
                  >
                    <item.icon size={22} className={isActive ? 'animate-nav-pop' : ''} />
                    {!!item.badge && item.badge > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white dark:ring-[#07080f]" />
                    )}
                  </span>
                  <span className="max-w-full truncate px-1">
                    {item.label === 'Notifications' ? 'Alerts' : item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
          <NavLink
            to={`/${user.username}`}
            className={({ isActive }) =>
              `flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-2xl transition duration-200 ${
                isActive ? 'bg-rose-50 dark:bg-white/[0.07]' : ''
              }`
            }
          >
            <Avatar user={user} size="sm" linkable={false} />
            <span className="text-[11px] font-bold text-slate-500">Profile</span>
          </NavLink>
        </nav>
      )}

      {/* Floating compose button (mobile) */}
      {!isChatRoute && (
        <button
          onClick={() => setCompose(true)}
          className="btn-primary fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full p-0 sm:hidden"
          aria-label="Create post"
        >
          <Feather size={22} />
        </button>
      )}

      {!isChatRoute && <ScrollToTop />}

      <Modal open={compose} onClose={() => setCompose(false)} title="">
        <PostComposer autoFocus onPosted={() => setCompose(false)} />
      </Modal>
      <QuickSearch open={quickSearch} onClose={() => setQuickSearch(false)} />
    </div>
  );
}
