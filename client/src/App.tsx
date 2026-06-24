import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './store/auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { PublicOnly } from './components/PublicOnly';
import { Layout } from './components/Layout';

import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import { Home } from './pages/Home';
import { Explore } from './pages/Explore';
import { PostDetail } from './pages/PostDetail';
import { Profile } from './pages/Profile';
import { FollowList } from './pages/FollowList';
import { Settings } from './pages/Settings';
import { Notifications } from './pages/Notifications';
import { Messages } from './pages/Messages';
import { Bookmarks } from './pages/Bookmarks';
import { Search } from './pages/Search';
import { Hashtag } from './pages/Hashtag';
import { NotFound } from './pages/NotFound';

export default function App() {
  const bootstrap = useAuth((s) => s.bootstrap);

  // Attempt to silently restore the session on first load.
  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        {/* Signed-out routes */}
        <Route element={<PublicOnly />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>

        {/* Authenticated app shell */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/home" element={<Home />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/bookmarks" element={<Bookmarks />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:id" element={<Messages />} />
            <Route path="/search" element={<Search />} />
            <Route path="/hashtag/:tag" element={<Hashtag />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/post/:id" element={<PostDetail />} />
            <Route path="/:username/followers" element={<FollowList type="followers" />} />
            <Route path="/:username/following" element={<FollowList type="following" />} />
            <Route path="/:username" element={<Profile />} />
          </Route>
        </Route>

        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  );
}
