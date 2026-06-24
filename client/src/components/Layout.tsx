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
  Gamepad2,
  Menu,
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
  const [mobileMenu, setMobileMenu] = useState(false);
  const [quickSearch, setQuickSearch] = useState(false);
  const isMessagesRoute = location.pathname.startsWith('/messages');
  const isChatRoute = /^\/messages\/[^/]+/.test(location.pathname);
  const isCommunityDetailRoute = /^\/communities\/[^/]+/.test(location.pathname);
  const showMobileComposer = !isChatRoute && !isCommunityDetailRoute;

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

  // Deep-link from a clicked OS notification (fired by lib/notify).
  useEffect(() => {
    const onNavigate = (event: Event) => {
      const path = (event as CustomEvent<string>).detail;
      if (typeof path === 'string') navigate(path);
    };
    window.addEventListener('murmur:navigate', onNavigate);
    return () => window.removeEventListener('murmur:navigate', onNavigate);
  }, [navigate]);

  if (!user) return null;

  const items: NavItem[] = [
    { to: '/home', label: 'Home', icon: Home },
    { to: '/explore', label: 'Explore', icon: Hash },
    { to: '/communities', label: 'Servers', icon: Gamepad2 },
    { to: '/notifications', label: 'Notifications', icon: Bell, badge: notifUnread },
    { to: '/messages', label: 'Messages', icon: Mail, badge: dmUnread },
    { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
    { to: `/${user.username}`, label: 'Profile', icon: User },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-[1400px] overflow-x-clip sm:px-3 xl:px-6">
      <RealtimeBridge />
      <CallOverlay />

      {/* Left navigation (desktop) */}
      <header className="sticky top-0 hidden h-screen shrink-0 flex-col justify-between px-2 py-4 lg:flex xl:w-[285px]">
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
        className={`glass mx-auto min-h-dvh min-w-0 w-full sm:rounded-none lg:mx-0 ${
          isMessagesRoute ? 'max-w-[920px]' : 'max-w-[600px]'
        }`}
      >
        <div key={location.pathname} className={`min-w-0 animate-page-enter ${isChatRoute ? '' : 'mobile-content-pad lg:pb-0'}`}>
          <Outlet />
        </div>
      </main>

      <RightSidebar />

      {/* Mobile bottom navigation */}
      {!isChatRoute && (
        <nav className="glass-strong mobile-safe-pad fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 px-1 pt-1 lg:hidden">
          {items
            .filter((item) => ['/home', '/explore', '/communities', '/messages'].includes(item.to))
            .map((item) => (
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
          <button
            type="button"
            onClick={() => setMobileMenu(true)}
            className="relative flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-lg text-[11px] font-bold text-slate-500 transition active:bg-rose-50 dark:active:bg-white/[0.07]"
            aria-label="Open account menu"
          >
            <span className="relative flex h-8 min-w-12 items-center justify-center rounded-full">
              <Menu size={22} />
              {(notifUnread > 0) && (
                <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-accent ring-2 ring-white dark:ring-[#07080f]" />
              )}
            </span>
            <span>More</span>
          </button>
        </nav>
      )}

      {/* Floating compose button (mobile) */}
      {showMobileComposer && (
        <button
          onClick={() => setCompose(true)}
          className="btn-primary fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full p-0 lg:hidden"
          aria-label="Create post"
        >
          <Feather size={22} />
        </button>
      )}

      {!isChatRoute && <ScrollToTop />}

      <Modal open={compose} onClose={() => setCompose(false)} title="">
        <PostComposer autoFocus onPosted={() => setCompose(false)} />
      </Modal>
      <Modal open={mobileMenu} onClose={() => setMobileMenu(false)} title="Your Murmur">
        <div className="grid gap-2 pb-2">
          {[
            { to: `/${user.username}`, label: 'Profile', icon: User },
            { to: '/notifications', label: 'Notifications', icon: Bell, badge: notifUnread },
            { to: '/bookmarks', label: 'Bookmarks', icon: Bookmark },
            { to: '/settings', label: 'Settings', icon: Settings },
          ].map((item) => (
            <button
              key={item.to}
              type="button"
              onClick={() => {
                setMobileMenu(false);
                navigate(item.to);
              }}
              className="flex min-h-14 items-center gap-3 rounded-2xl px-3 text-left font-bold transition active:bg-rose-50 dark:active:bg-white/[0.07]"
            >
              <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-white/[0.07] dark:text-slate-200">
                <item.icon size={21} />
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-accent px-1 text-center text-[11px] text-white">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
              {item.label}
            </button>
          ))}
        </div>
      </Modal>
      <QuickSearch open={quickSearch} onClose={() => setQuickSearch(false)} />
    </div>
  );
}
