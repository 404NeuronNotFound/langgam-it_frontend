// App.tsx

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Layout from "./layouts/Layout";
import SetupWizard from "./pages/user/SetupWizard";
import Dashboard from "./pages/user/Dashboard";

// ── Protected route ───────────────────────────────────────────────
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

// ── Public route ──────────────────────────────────────────────────
function PublicRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <>{children}</>;
}

// ── Placeholder pages ─────────────────────────────────────────────
function IncomePage()      { return <div style={{ fontFamily: "system-ui" }}><h1>Income</h1></div>; }
function ExpensesPage()    { return <div style={{ fontFamily: "system-ui" }}><h1>Expenses</h1></div>; }
function InvestmentsPage() { return <div style={{ fontFamily: "system-ui" }}><h1>Investments</h1></div>; }
function BudgetPage()      { return <div style={{ fontFamily: "system-ui" }}><h1>Budget</h1></div>; }
function ReportsPage()     { return <div style={{ fontFamily: "system-ui" }}><h1>Reports</h1></div>; }
function SettingsPage()    { return <div style={{ fontFamily: "system-ui" }}><h1>Settings</h1></div>; }

// ── App ───────────────────────────────────────────────────────────
export default function App() {
  const hydrateUser = useAuthStore((s) => s.hydrateUser);

  useEffect(() => {
    hydrateUser();
  }, [hydrateUser]);

  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/"         element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

        {/* Setup wizard — protected but outside Layout (full-screen) */}
        <Route
          path="/setup"
          element={
            <PrivateRoute>
              <SetupWizard />
            </PrivateRoute>
          }
        />

        {/* Protected — all inside Layout (sidebar) */}
        <Route
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route path="/dashboard"   element={<Dashboard />} />
          <Route path="/income"      element={<IncomePage />} />
          <Route path="/expenses"    element={<ExpensesPage />} />
          <Route path="/investments" element={<InvestmentsPage />} />
          <Route path="/budget"      element={<BudgetPage />} />
          <Route path="/reports"     element={<ReportsPage />} />
          <Route path="/settings"    element={<SettingsPage />} />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />

      </Routes>
    </BrowserRouter>
  );
}