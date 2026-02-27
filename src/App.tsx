import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { isLoggedIn } from './lib/auth';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppShell } from './components/layout/AppShell';
import { BetaLogin } from './pages/BetaLogin';

function RootRedirect() {
  return <Navigate to={isLoggedIn() ? '/properties' : '/beta-login'} replace />;
}

// Placeholder — replace with real page components as they are built.
function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ fontFamily: 'var(--font-body)', color: 'var(--color-text-primary)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', marginTop: 0 }}>{title}</h1>
    </div>
  );
}

function ShellRoute({ children }: { children: React.ReactNode }) {
  return (
    <ProtectedRoute>
      <AppShell>{children}</AppShell>
    </ProtectedRoute>
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

        {/* Backwards-compat redirect */}
        <Route path="/dashboard" element={<Navigate to="/properties" replace />} />

        {/* Protected — all wrapped in AppShell */}
        <Route path="/properties" element={<ShellRoute><PlaceholderPage title="Properties" /></ShellRoute>} />
        <Route path="/portfolio"  element={<ShellRoute><PlaceholderPage title="My Portfolio" /></ShellRoute>} />
        <Route path="/markets"    element={<ShellRoute><PlaceholderPage title="Markets" /></ShellRoute>} />
        <Route path="/strategy"   element={<ShellRoute><PlaceholderPage title="Strategy" /></ShellRoute>} />

        {/* Catch-all: redirect to root */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
