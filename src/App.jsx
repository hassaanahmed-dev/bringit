import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/RouteGuards';
import AppShell from './components/AppShell';
import Spinner from './components/Spinner';

// Retry a lazy chunk once before giving up — flaky mobile networks sometimes
// drop the first request. A second failure is caught by the ErrorBoundary.
const lazyRetry = (loader) =>
  lazy(() =>
    loader().catch((err) => {
      console.warn('[app] chunk load failed — retrying', err);
      return loader();
    }),
  );

const Splash = lazyRetry(() => import('./pages/Splash'));
const Login = lazyRetry(() => import('./pages/Login'));
const Signup = lazyRetry(() => import('./pages/Signup'));
const Verify = lazyRetry(() => import('./pages/Verify'));
const Home = lazyRetry(() => import('./pages/Home'));
const NewOrder = lazyRetry(() => import('./pages/NewOrder'));
const OrderTracking = lazyRetry(() => import('./pages/OrderTracking'));
const OrderHistory = lazyRetry(() => import('./pages/OrderHistory'));
const RiderFeed = lazyRetry(() => import('./pages/RiderFeed'));
const RiderOrderDetail = lazyRetry(() => import('./pages/RiderOrderDetail'));
const ActiveOrder = lazyRetry(() => import('./pages/ActiveOrder'));
const Earnings = lazyRetry(() => import('./pages/Earnings'));
const Profile = lazyRetry(() => import('./pages/Profile'));
const Notifications = lazyRetry(() => import('./pages/Notifications'));
const Chat = lazyRetry(() => import('./pages/Chat'));
const Leaderboard = lazyRetry(() => import('./pages/Leaderboard'));

const loader = (el) => (
  <Suspense fallback={<Spinner label="LOADING..." />}>{el}</Suspense>
);

export default function App() {
  return (
    <Routes>
      <Route path="/" element={loader(<Splash />)} />

      <Route element={<PublicRoute />}>
        <Route path="/login" element={loader(<Login />)} />
        <Route path="/signup" element={loader(<Signup />)} />
      </Route>

      <Route path="/verify" element={loader(<Verify />)} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/home" element={loader(<Home />)} />
          <Route path="/new-order" element={loader(<NewOrder />)} />
          <Route path="/order-history" element={loader(<OrderHistory />)} />
          <Route path="/feed" element={loader(<RiderFeed />)} />
          <Route path="/earnings" element={loader(<Earnings />)} />
          <Route path="/profile" element={loader(<Profile />)} />
          <Route path="/notifications" element={loader(<Notifications />)} />
          <Route path="/leaderboard" element={loader(<Leaderboard />)} />
        </Route>

        <Route path="/order/:id" element={loader(<OrderTracking />)} />
        <Route path="/rider/order/:id" element={loader(<RiderOrderDetail />)} />
        <Route path="/active/:id" element={loader(<ActiveOrder />)} />
        <Route path="/chat/:id" element={loader(<Chat />)} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
