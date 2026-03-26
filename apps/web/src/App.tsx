// App.tsx

import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import { useFinanceStore } from "./store/financeStore";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import Layout from "./layouts/Layout";
import SetupWizard from "./pages/user/SetupWizard";
import Dashboard from "./pages/user/Dashboard";

// ── Protected route with setup check ──────────────────────────────
// Redirects to setup if user hasn't completed it yet
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { profile, fetchProfile, isSetupComplete } = useFinanceStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated && !profile) {
      fetchProfile().finally(() => setIsChecking(false));
    } else {
      setIsChecking(false);
    }
  }, [isAuthenticated, profile, fetchProfile]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (isChecking) {
    return <div style={{ fontFamily: "system-ui", padding: "2rem" }}>Loading...</div>;
  }

  if (!isSetupComplete()) {
    return <Navigate to="/setup" replace />;
  }

  return <>{children}</>;
}

// ── Setup route ───────────────────────────────────────────────────
// Redirects to dashboard if setup is already complete
function SetupRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { profile, fetchProfile, isSetupComplete } = useFinanceStore();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    if (isAuthenticated && !profile) {
      fetchProfile().finally(() => setIsChecking(false));
    } else {
      setIsChecking(false);
    }
  }, [isAuthenticated, profile, fetchProfile]);

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (isChecking) {
    return <div style={{ fontFamily: "system-ui", padding: "2rem" }}>Loading...</div>;
  }

  if (isSetupComplete()) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
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

        {/* Setup wizard — protected, redirects to dashboard if already complete */}
        <Route
          path="/setup"
          element={
            <SetupRoute>
              <SetupWizard />
            </SetupRoute>
          }
        />

        {/* Protected — all inside Layout (sidebar), redirects to setup if incomplete */}
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
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