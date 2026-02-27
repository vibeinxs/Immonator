import { Navigate } from 'react-router-dom';
import { isLoggedIn } from '../../lib/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!isLoggedIn()) {
    return <Navigate to="/beta-login" replace />;
  }
  return <>{children}</>;
}

export default ProtectedRoute;
