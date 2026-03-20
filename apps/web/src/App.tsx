// App.tsx
// Root of the app — sets up routing and hydrates auth state on boot.

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// ── Protected route wrapper ───────────────────────────────────────
// Redirects to /login if the user is not authenticated.

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

// ── Public route wrapper ──────────────────────────────────────────
// Redirects to /dashboard if user is already logged in
// (prevents logged-in users from seeing the login/register pages).

function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

// ── Placeholder dashboard ─────────────────────────────────────────
// Replace this with your real Dashboard page when ready.

function DashboardPlaceholder() {
  const { user, logout } = useAuthStore();
  return (
    <div style={{ padding: "2rem", fontFamily: "system-ui" }}>
      <h1>Dashboard</h1>
      <p>Welcome, {user?.first_name || user?.username}!</p>
      <button onClick={logout} style={{ marginTop: "1rem" }}>
        Sign out
      </button>
    </div>
  );
}

// ── App ───────────────────────────────────────────────────────────

export default function App() {
  const hydrateUser = useAuthStore((s) => s.hydrateUser);

  // On app boot, validate the stored token and refresh user data
  useEffect(() => {
    hydrateUser();
  }, [hydrateUser]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        {/* Public routes */}
        <Route path="/login"    element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected routes */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardPlaceholder /></PrivateRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}