import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './lib/auth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { BetaLogin } from './pages/BetaLogin';

function RootRedirect() {
  return <Navigate to={isLoggedIn() ? '/dashboard' : '/beta-login'} replace />;
}

// Placeholder — replace with real page components as they are built.
function Dashboard() {
  return (
    <div style={{ padding: 32, fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)' }}>Dashboard</h1>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route path="/beta-login" element={<BetaLogin />} />

        {/* Root — redirect based on auth state */}
        <Route path="/" element={<RootRedirect />} />

        {/* Protected */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Catch-all: redirect to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
