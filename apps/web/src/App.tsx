// App.tsx

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// ── Protected route — kick unauthenticated to "/" ─────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

// ── Public route — kick authenticated to /dashboard ───────────────
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

// ── Placeholder dashboard ─────────────────────────────────────────
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

  useEffect(() => {
    hydrateUser();
  }, [hydrateUser]);

  return (
    <BrowserRouter>
      <Routes>
        {/* "/" is LoginPage — the main entry point */}
        <Route path="/"          element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register"  element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Protected */}
        <Route path="/dashboard" element={<PrivateRoute><DashboardPlaceholder /></PrivateRoute>} />

        {/* Anything else → back to login */}
        <Route path="*"          element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}