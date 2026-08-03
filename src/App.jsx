import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute, PublicRoute } from './components/RouteGuards';
import AppShell from './components/AppShell';
import Spinner from './components/Spinner';

const Splash = lazy(() => import('./pages/Splash'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const Verify = lazy(() => import('./pages/Verify'));
const Home = lazy(() => import('./pages/Home'));
const NewOrder = lazy(() => import('./pages/NewOrder'));
const OrderTracking = lazy(() => import('./pages/OrderTracking'));
const OrderHistory = lazy(() => import('./pages/OrderHistory'));
const RiderFeed = lazy(() => import('./pages/RiderFeed'));
const RiderOrderDetail = lazy(() => import('./pages/RiderOrderDetail'));
const ActiveOrder = lazy(() => import('./pages/ActiveOrder'));
const Earnings = lazy(() => import('./pages/Earnings'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));
const Chat = lazy(() => import('./pages/Chat'));
const Leaderboard = lazy(() => import('./pages/Leaderboard'));

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
