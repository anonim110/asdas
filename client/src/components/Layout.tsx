import { useState } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../store/auth';
import { useRealtime } from '../store/realtime';
import { toast } from '../store/toast';
import { Avatar } from './Avatar';
import { Modal } from './Modal';
import { PostComposer } from './PostComposer';
import { ThemeToggle } from './ThemeToggle';
import { RightSidebar } from './RightSidebar';
import { RealtimeBridge } from './RealtimeBridge';

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
  const isMessagesRoute = location.pathname.startsWith('/messages');
  const isChatRoute = /^\/messages\/[^/]+/.test(location.pathname);

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
    <div className="mx-auto flex max-w-7xl">
      <RealtimeBridge />

      {/* Left navigation (desktop) */}
      <header className="sticky top-0 hidden h-screen shrink-0 flex-col justify-between px-2 py-3 sm:flex xl:w-[275px]">
        <div className="flex flex-col items-center xl:items-start">
          <NavLink
            to="/home"
            className="mb-2 flex items-center gap-2 rounded-full p-3 text-brand transition hover:bg-brand/10 active:scale-95"
          >
            <Feather size={28} />
            <span className="hidden bg-gradient-to-r from-brand to-brand-soft bg-clip-text text-2xl font-extrabold tracking-tight text-transparent xl:inline">
              Murmur
            </span>
          </NavLink>

          <nav className="flex flex-col gap-1">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-4 rounded-full p-3 text-xl transition hover:bg-gray-100 dark:hover:bg-gray-900 ${
                    isActive ? 'font-bold' : ''
                  }`
                }
              >
                <span className="relative">
                  <item.icon size={26} />
                  {!!item.badge && item.badge > 0 && (
                    <span className="absolute -right-2 -top-1 min-w-[18px] rounded-full bg-brand px-1 text-center text-xs font-bold text-white">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </span>
                <span className="hidden xl:inline">{item.label}</span>
              </NavLink>
            ))}
            <ThemeToggle withLabel />
          </nav>

          <button onClick={() => setCompose(true)} className="btn-primary mt-3 w-12 xl:w-full xl:py-3">
            <Feather size={20} className="xl:hidden" />
            <span className="hidden xl:inline">Post</span>
          </button>
        </div>

        {/* Account switcher / logout */}
        <div className="relative">
          <button
            onClick={() => setMenu((o) => !o)}
            className="flex w-full items-center gap-2 rounded-full p-3 hover:bg-gray-100 dark:hover:bg-gray-900"
          >
            <Avatar user={user} linkable={false} />
            <div className="hidden min-w-0 flex-1 text-left xl:block">
              <p className="truncate font-bold">{user.displayName}</p>
              <p className="truncate text-sm text-gray-500">@{user.username}</p>
            </div>
            <MoreHorizontal className="hidden xl:block" size={18} />
          </button>
          {menu && (
            <div className="absolute bottom-16 w-60 overflow-hidden rounded-2xl border border-gray-200 bg-white py-2 shadow-xl dark:border-gray-800 dark:bg-black">
              <button
                onClick={async () => {
                  await logout();
                  toast('Signed out', 'info');
                  navigate('/login');
                }}
                className="flex w-full items-center gap-2 px-4 py-3 font-bold hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                <LogOut size={18} /> Log out @{user.username}
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main content — keyed by route for a subtle fade on navigation */}
      <main
        className={`min-h-screen w-full border-x border-gray-200 dark:border-gray-800 ${
          isMessagesRoute ? 'max-w-[920px]' : 'max-w-[600px]'
        }`}
      >
        <div key={location.pathname} className={`animate-fade-in ${isChatRoute ? '' : 'pb-16 sm:pb-0'}`}>
          <Outlet />
        </div>
      </main>

      <RightSidebar />

      {/* Mobile bottom navigation */}
      {!isChatRoute && (
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-gray-200 bg-white/90 py-2 backdrop-blur sm:hidden dark:border-gray-800 dark:bg-black/90">
          {items.slice(0, 4).map((item) => (
            <NavLink key={item.to} to={item.to} className="relative p-2">
              <item.icon size={26} />
              {!!item.badge && item.badge > 0 && (
                <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-brand" />
              )}
            </NavLink>
          ))}
          <NavLink to={`/${user.username}`} className="p-1">
            <Avatar user={user} size="sm" linkable={false} />
          </NavLink>
        </nav>
      )}

      {/* Floating compose button (mobile) */}
      {!isChatRoute && (
        <button
          onClick={() => setCompose(true)}
          className="btn-primary fixed bottom-16 right-4 z-40 h-14 w-14 rounded-full sm:hidden"
        >
          <Feather size={22} />
        </button>
      )}

      <Modal open={compose} onClose={() => setCompose(false)} title="">
        <PostComposer autoFocus onPosted={() => setCompose(false)} />
      </Modal>
    </div>
  );
}
