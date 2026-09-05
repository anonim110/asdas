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
  Menu,
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { useRealtime } from '../store/realtime';
import { useT } from '../lib/i18n';
import { toast } from '../store/toast';
import { Avatar } from './Avatar';
import { Modal } from './Modal';
import { Dismiss } from './Dismiss';
import { PostComposer } from './PostComposer';
import { ThemeToggle } from './ThemeToggle';
import { RightSidebar } from './RightSidebar';
import { ScrollToTop } from './ScrollToTop';
import { RealtimeBridge } from './RealtimeBridge';
import { QuickSearch } from './QuickSearch';
import { UserName } from './UserName';

interface NavItem {
  to: string;
  label: string;
  icon: typeof Home;
  badge?: number;
}

export function Layout() {
  const t = useT();
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
  const showMobileComposer = !isChatRoute && location.pathname !== '/home' && !isMessagesRoute;

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
    { to: '/home', label: t('navHome'), icon: Home },
    { to: '/explore', label: t('navExplore'), icon: Hash },
    { to: '/notifications', label: t('navNotifications'), icon: Bell, badge: notifUnread },
    { to: '/messages', label: t('navMessages'), icon: Mail, badge: dmUnread },
    { to: '/bookmarks', label: t('navBookmarks'), icon: Bookmark },
    { to: `/${user.username}`, label: t('navProfile'), icon: User },
    { to: '/settings', label: t('navSettings'), icon: Settings },
  ];

  const mobileItems = items.filter((item) =>
    ['/home', '/explore', '/notifications', '/messages'].includes(item.to),
  );

  return (
    <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-[1320px] overflow-x-clip">
      <RealtimeBridge />

      <header className="sticky top-0 hidden h-screen w-[78px] shrink-0 flex-col justify-between border-r border-stone-300 bg-[#eeeae0] px-2 py-4 dark:border-white/10 dark:bg-[#0d0d0b] lg:flex xl:w-[248px] xl:px-4">
        <div>
          <NavLink
            to="/home"
            className="mb-5 flex h-11 items-center gap-3 px-2 text-stone-950 dark:text-stone-50"
            aria-label="Murmur home"
          >
            <span className="flex h-8 w-8 items-center justify-center bg-brand text-white">
              <Feather size={18} strokeWidth={2.4} />
            </span>
            <span className="hidden text-2xl font-black tracking-[-0.055em] xl:inline">Murmur</span>
          </NavLink>

          <nav className="flex flex-col gap-0.5">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `group relative flex min-h-12 items-center gap-3 border-l-2 px-3 py-2.5 text-[15px] transition-colors xl:w-full ${
                    isActive
                      ? 'border-brand font-black text-stone-950 dark:text-white'
                      : 'border-transparent font-semibold text-stone-600 hover:border-stone-400 hover:text-stone-950 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-white'
                  }`
                }
              >
                <span className="relative shrink-0">
                  <item.icon size={22} strokeWidth={2.1} />
                  {!!item.badge && item.badge > 0 && (
                    <span className="absolute -right-2 -top-2 min-w-[17px] bg-brand px-1 text-center text-[10px] font-black leading-[17px] text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="hidden truncate xl:inline">{item.label}</span>
              </NavLink>
            ))}

            <button
              type="button"
              onClick={() => setQuickSearch(true)}
              className="flex min-h-12 items-center gap-3 border-l-2 border-transparent px-3 py-2.5 text-[15px] font-semibold text-stone-600 transition-colors hover:border-stone-400 hover:text-stone-950 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-white"
            >
              <Search size={22} strokeWidth={2.1} />
              <span className="hidden xl:inline">{t('navSearch')}</span>
            </button>

            <div className="mt-1 border-t border-stone-300 pt-2 dark:border-white/10">
              <ThemeToggle withLabel />
            </div>
          </nav>

          <button
            onClick={() => setCompose(true)}
            className="btn-primary mt-5 h-11 w-11 px-0 xl:w-full xl:px-5"
          >
            <Feather size={19} className="xl:hidden" />
            <span className="hidden xl:inline">{t('post')}</span>
          </button>
        </div>

        <div className="relative border-t border-stone-300 pt-3 dark:border-white/10">
          <button
            onClick={() => setMenu((open) => !open)}
            className="flex min-h-14 w-full items-center gap-3 px-2 text-left transition-colors hover:bg-stone-200/70 dark:hover:bg-white/[0.04]"
          >
            <Avatar user={user} linkable={false} />
            <div className="hidden min-w-0 flex-1 xl:block">
              <UserName user={user} className="max-w-full" compact />
              <p className="truncate text-xs font-semibold text-stone-500">@{user.username}</p>
            </div>
            <MoreHorizontal className="hidden xl:block" size={18} />
          </button>

          {menu && <Dismiss onDismiss={() => setMenu(false)} />}
          {menu && (
            <div className="panel absolute bottom-16 left-0 z-10 w-64 overflow-hidden py-1">
              <button
                onClick={async () => {
                  await logout();
                  toast('Signed out', 'info');
                  navigate('/login');
                }}
                className="flex w-full items-center gap-2 px-4 py-3 text-left font-bold transition-colors hover:bg-stone-100 dark:hover:bg-white/[0.05]"
              >
                <LogOut size={18} /> {t('logOut')} @{user.username}
              </button>
            </div>
          )}
        </div>
      </header>

      <main
        className={`min-h-dvh min-w-0 w-full border-r border-stone-300 bg-[#f7f4ec] dark:border-white/10 dark:bg-[#151512] lg:border-l-0 ${
          isMessagesRoute ? 'max-w-[920px]' : 'max-w-[640px]'
        }`}
      >
        <div
          key={location.pathname}
          className={`min-w-0 animate-page-enter ${isChatRoute ? '' : 'mobile-content-pad lg:pb-0'}`}
        >
          <Outlet />
        </div>
      </main>

      <RightSidebar />

      {!isChatRoute && (
        <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-stone-300 bg-[#eeeae0] pb-[env(safe-area-inset-bottom)] lg:hidden dark:border-white/10 dark:bg-[#0d0d0b]">
          {mobileItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `relative flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 px-1 text-[10px] font-bold ${
                  isActive
                    ? 'border-brand text-stone-950 dark:text-white'
                    : 'border-transparent text-stone-500 dark:text-stone-500'
                }`
              }
            >
              <span className="relative">
                <item.icon size={21} />
                {!!item.badge && item.badge > 0 && (
                  <span className="absolute -right-2 -top-1 h-2 w-2 bg-brand" />
                )}
              </span>
              <span className="max-w-full truncate px-1">
                {item.to === '/notifications' ? t('navAlerts') : item.label}
              </span>
            </NavLink>
          ))}

          <button
            type="button"
            onClick={() => setMobileMenu(true)}
            className="flex min-h-14 flex-col items-center justify-center gap-0.5 border-t-2 border-transparent text-[10px] font-bold text-stone-500 dark:text-stone-500"
            aria-label="Open account menu"
          >
            <Menu size={21} />
            <span>{t('navMore')}</span>
          </button>
        </nav>
      )}

      {showMobileComposer && (
        <button
          onClick={() => setCompose(true)}
          className="btn-primary fixed bottom-[calc(env(safe-area-inset-bottom)+4.5rem)] right-3 z-40 h-12 w-12 px-0 lg:hidden"
          aria-label="Create post"
        >
          <Feather size={20} />
        </button>
      )}

      {!isChatRoute && <ScrollToTop />}

      <Modal open={compose} onClose={() => setCompose(false)} title="">
        <PostComposer autoFocus onPosted={() => setCompose(false)} />
      </Modal>

      <Modal open={mobileMenu} onClose={() => setMobileMenu(false)} title={t('yourMurmur')}>
        <div className="-mx-4 -mb-4">
          {[
            { to: `/${user.username}`, label: 'Profile', icon: User },
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
              className="flex min-h-14 w-full items-center gap-3 border-t border-stone-200 px-4 text-left font-bold transition-colors hover:bg-stone-100 dark:border-white/10 dark:hover:bg-white/[0.04]"
            >
              <item.icon size={20} />
              {item.label}
            </button>
          ))}
        </div>
      </Modal>

      <QuickSearch open={quickSearch} onClose={() => setQuickSearch(false)} />
    </div>
  );
}
