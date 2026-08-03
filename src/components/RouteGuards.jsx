import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ROUTES } from '../lib/routes';
import Spinner from '../components/Spinner';

export function ProtectedRoute() {
  const { user, ready } = useAuth();

  if (!ready) return <Spinner label="BOOTING..." />;
  if (!user) return <Navigate to={ROUTES.LOGIN} replace />;
  if (!user.emailVerified) return <Navigate to={ROUTES.VERIFY} replace />;

  return <Outlet />;
}

export function PublicRoute() {
  const { user, ready } = useAuth();

  if (!ready) return <Spinner label="BOOTING..." />;
  if (user && user.emailVerified) return <Navigate to={ROUTES.HOME} replace />;
  if (user && !user.emailVerified) return <Navigate to={ROUTES.VERIFY} replace />;

  return <Outlet />;
}
