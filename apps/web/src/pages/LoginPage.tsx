"use client";

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// ------------------------------------------------------------------
// Langgam-It — Login Page (connected to backend)
// ------------------------------------------------------------------

export default function LoginPage() {
  const navigate = useNavigate();

  // ── Store ────────────────────────────────────────────────────────
  const { login, isLoading, isAuthenticated, error, clearError } =
    useAuthStore();

  // ── Local form state ─────────────────────────────────────────────
  const [username, setUsername] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [remember, setRemember] = useState<boolean>(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isAuthenticated, navigate]);

  // Clear any lingering store error when the user starts typing again
  useEffect(() => {
    if (error) clearError();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [username, password]);

  // ── Submit ────────────────────────────────────────────────────────
  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password) return;
    try {
      await login({ username: username.trim(), password });
      // navigation happens inside the useEffect above after isAuthenticated flips
    } catch {
      // error is already set in the store — nothing extra needed here
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=Lora:ital,wght@0,500;1,400&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --bg-page:    #F5F4F1;
          --bg-card:    #FFFFFF;
          --bg-surface: #F0EFEB;
          --border:     rgba(0,0,0,0.09);
          --border-md:  rgba(0,0,0,0.14);
          --text-1:     #18181B;
          --text-2:     #52525B;
          --text-3:     #A1A1AA;
          --error:      #993C1D;
          --error-bg:   #FAECE7;
          --green-bg:   #EAF3DE;
          --green-icon: #3B6D11;
          --red-bg:     #FAECE7;
          --red-icon:   #993C1D;
          --blue-bg:    #E6F1FB;
          --blue-icon:  #185FA5;
          --sans:       'Plus Jakarta Sans', system-ui, sans-serif;
          --serif:      'Lora', Georgia, serif;
          --radius-sm:  8px;
          --radius-md:  12px;
          --radius-lg:  18px;
        }

        @media (prefers-color-scheme: dark) {
          :root {
            --bg-page:    #0F0F11;
            --bg-card:    #18181B;
            --bg-surface: #1F1F23;
            --border:     rgba(255,255,255,0.08);
            --border-md:  rgba(255,255,255,0.14);
            --text-1:     #FAFAFA;
            --text-2:     #A1A1AA;
            --text-3:     #52525B;
            --error:      #F0997B;
            --error-bg:   #4A1B0C;
            --green-bg:   #173404;
            --green-icon: #97C459;
            --red-bg:     #4A1B0C;
            --red-icon:   #F0997B;
            --blue-bg:    #042C53;
            --blue-icon:  #85B7EB;
          }
        }

        .li-root {
          font-family: var(--sans);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-page);
          padding: 24px 16px;
        }

        .li-shell {
          display: flex;
          width: 100%;
          max-width: 880px;
          min-height: 560px;
          background: var(--bg-card);
          border-radius: var(--radius-lg);
          border: 0.5px solid var(--border-md);
          overflow: hidden;
        }

        /* ── Left pane ── */
        .li-left {
          flex: 0 0 42%;
          background: var(--bg-surface);
          border-right: 0.5px solid var(--border);
          padding: 2.25rem 1.875rem;
          display: flex;
          flex-direction: column;
        }

        .li-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: auto;
        }

        .li-logo-mark {
          width: 34px; height: 34px;
          background: var(--bg-card);
          border-radius: var(--radius-sm);
          border: 0.5px solid var(--border-md);
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .li-logo-name {
          font-family: var(--serif);
          font-size: 17px; font-weight: 500;
          color: var(--text-1); letter-spacing: -0.3px;
        }

        .li-brand {
          flex: 1;
          display: flex; flex-direction: column; justify-content: center;
          padding: 2rem 0 1.5rem;
        }

        .li-headline {
          font-family: var(--serif);
          font-size: 23px; font-style: italic; font-weight: 400;
          color: var(--text-1); line-height: 1.38; margin-bottom: 0.75rem;
        }

        .li-tagline {
          font-size: 13px; color: var(--text-2);
          line-height: 1.7; margin-bottom: 1.25rem;
        }

        .li-pills { display: flex; flex-wrap: wrap; gap: 7px; }

        .li-pill {
          font-size: 11px; padding: 4px 11px;
          border-radius: 99px; border: 0.5px solid var(--border-md);
          color: var(--text-2); background: var(--bg-card);
        }

        .li-stat-cards { display: flex; flex-direction: column; gap: 9px; }

        .li-stat-card {
          background: var(--bg-card);
          border: 0.5px solid var(--border);
          border-radius: var(--radius-sm);
          padding: 11px 13px;
          display: flex; align-items: center; gap: 11px;
        }

        .li-stat-icon {
          width: 30px; height: 30px; border-radius: 7px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }

        .li-stat-label { font-size: 11px; color: var(--text-3); margin-bottom: 2px; }
        .li-stat-val   { font-size: 14px; font-weight: 500; color: var(--text-1); }

        /* ── Right pane ── */
        .li-right {
          flex: 1; padding: 2.5rem 2.25rem;
          display: flex; flex-direction: column; justify-content: center;
        }

        .li-mobile-logo {
          display: none; align-items: center;
          gap: 10px; margin-bottom: 1.75rem;
        }

        .li-form-head { margin-bottom: 1.875rem; }

        .li-form-title {
          font-family: var(--serif);
          font-size: 22px; font-weight: 500;
          color: var(--text-1); margin-bottom: 4px; letter-spacing: -0.2px;
        }

        .li-form-sub { font-size: 13px; color: var(--text-2); }

        /* ── Error banner ── */
        .li-error-banner {
          background: var(--error-bg);
          border: 0.5px solid var(--error);
          border-radius: var(--radius-sm);
          padding: 10px 13px;
          margin-bottom: 16px;
          display: flex; align-items: flex-start; gap: 9px;
        }

        .li-error-banner-icon { color: var(--error); flex-shrink: 0; margin-top: 1px; }

        .li-error-banner-text {
          font-size: 13px; color: var(--error); line-height: 1.5;
        }

        /* ── Fields ── */
        .li-field { margin-bottom: 15px; }

        .li-label-row {
          display: flex; justify-content: space-between;
          align-items: center; margin-bottom: 6px;
        }

        .li-label { font-size: 13px; font-weight: 500; color: var(--text-2); }

        .li-forgot {
          font-size: 12px; color: var(--text-2);
          background: none; border: none; cursor: pointer;
          text-decoration: underline; font-family: var(--sans); padding: 0;
        }

        .li-input-wrap {
          position: relative; display: flex; align-items: center;
        }

        .li-input-icon {
          position: absolute; left: 11px;
          color: var(--text-3); display: flex;
          align-items: center; pointer-events: none;
        }

        .li-input {
          width: 100%; height: 40px;
          padding: 0 40px 0 36px;
          font-family: var(--sans); font-size: 14px;
          color: var(--text-1); background: var(--bg-surface);
          border: 0.5px solid var(--border-md);
          border-radius: var(--radius-sm);
          outline: none; transition: border-color 0.15s, box-shadow 0.15s;
        }

        .li-input::placeholder { color: var(--text-3); }

        .li-input:focus {
          border-color: var(--text-2);
          box-shadow: 0 0 0 3px rgba(100,100,100,0.08);
        }

        .li-input-has-error {
          border-color: var(--error) !important;
        }

        .li-eye {
          position: absolute; right: 10px;
          background: none; border: none; cursor: pointer;
          color: var(--text-3); display: flex;
          align-items: center; padding: 4px;
        }

        .li-remember {
          display: flex; align-items: center;
          gap: 8px; margin-bottom: 18px;
        }

        .li-remember input[type="checkbox"] { width: 15px; height: 15px; cursor: pointer; }
        .li-remember span { font-size: 13px; color: var(--text-2); }

        /* ── Primary button ── */
        .li-btn-primary {
          width: 100%; height: 42px;
          background: var(--text-1); color: var(--bg-card);
          border: none; border-radius: var(--radius-sm);
          font-family: var(--sans); font-size: 14px; font-weight: 500;
          cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 8px;
          transition: opacity 0.15s, transform 0.1s; margin-bottom: 16px;
        }

        .li-btn-primary:hover   { opacity: 0.82; }
        .li-btn-primary:active  { transform: scale(0.99); }
        .li-btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

        .li-spinner {
          width: 16px; height: 16px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: currentColor;
          border-radius: 50%;
          animation: li-spin 0.7s linear infinite;
        }

        @keyframes li-spin { to { transform: rotate(360deg); } }

        /* ── Divider ── */
        .li-divider { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
        .li-divider-line { flex: 1; height: 0.5px; background: var(--border); }
        .li-divider-text { font-size: 12px; color: var(--text-3); white-space: nowrap; }

        /* ── Social ── */
        .li-social-row { display: flex; gap: 10px; margin-bottom: 22px; }

        .li-social-btn {
          flex: 1; height: 38px;
          background: var(--bg-surface); border: 0.5px solid var(--border-md);
          border-radius: var(--radius-sm); font-family: var(--sans);
          font-size: 13px; color: var(--text-2); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          gap: 7px; transition: background 0.15s;
        }

        .li-social-btn:hover { background: var(--border); }

        /* ── Signup line ── */
        .li-signup { text-align: center; font-size: 13px; color: var(--text-2); }

        .li-signup-link {
          color: var(--text-1); font-weight: 500; text-decoration: underline;
          background: none; border: none; cursor: pointer;
          font-family: var(--sans); font-size: 13px;
        }

        /* ── Responsive ── */
        @media (max-width: 640px) {
          .li-left        { display: none !important; }
          .li-right       { padding: 2rem 1.5rem; }
          .li-mobile-logo { display: flex !important; }
          .li-shell       { max-width: 100%; border-radius: var(--radius-md); }
        }

        @media (max-width: 400px) {
          .li-right      { padding: 1.5rem 1.25rem; }
          .li-social-row { flex-direction: column; }
        }
      `}</style>

      <div className="li-root">
        <div className="li-shell">

          {/* ── Left branding pane ── */}
          <div className="li-left">
            <div className="li-logo">
              <div className="li-logo-mark"><LogoIcon color="var(--text-1)" /></div>
              <span className="li-logo-name">Langgam-It</span>
            </div>

            <div className="li-brand">
              <p className="li-headline">Your money,<br />your story.</p>
              <p className="li-tagline">
                Track income, master your spending habits,<br />
                and grow investments — all in one place.
              </p>
              <div className="li-pills">
                <span className="li-pill">Income tracking</span>
                <span className="li-pill">Spending habits</span>
                <span className="li-pill">Investments</span>
              </div>
            </div>

            <div className="li-stat-cards">
              <StatCard iconBg="var(--green-bg)" icon={<ArrowUpIcon color="var(--green-icon)" />} label="Monthly income"      value="₱0.00" />
              <StatCard iconBg="var(--red-bg)"   icon={<ArrowDownIcon color="var(--red-icon)" />} label="This month's spend" value="₱0.00" />
              <StatCard iconBg="var(--blue-bg)"  icon={<BarIcon color="var(--blue-icon)" />}      label="Investments"        value="₱0.00" />
            </div>
          </div>

          {/* ── Right form pane ── */}
          <div className="li-right">

            {/* Mobile logo */}
            <div className="li-mobile-logo">
              <div className="li-logo-mark"><LogoIcon color="var(--text-1)" /></div>
              <span className="li-logo-name">Langgam-It</span>
            </div>

            <div className="li-form-head">
              <h1 className="li-form-title">Welcome back</h1>
              <p className="li-form-sub">Sign in to your dashboard</p>
            </div>

            {/* ── API error banner ── */}
            {error && (
              <div className="li-error-banner" role="alert">
                <span className="li-error-banner-icon">
                  <AlertIcon />
                </span>
                <span className="li-error-banner-text">{error}</span>
              </div>
            )}

            <form onSubmit={handleSignIn} noValidate>

              {/* Username */}
              <div className="li-field">
                <div className="li-label-row">
                  <label className="li-label" htmlFor="li-username">Username</label>
                </div>
                <div className="li-input-wrap">
                  <span className="li-input-icon"><AtIcon /></span>
                  <input
                    id="li-username"
                    className={`li-input${error ? " li-input-has-error" : ""}`}
                    type="text"
                    placeholder="yourhandle"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="li-field">
                <div className="li-label-row">
                  <label className="li-label" htmlFor="li-password">Password</label>
                  <button type="button" className="li-forgot">Forgot password?</button>
                </div>
                <div className="li-input-wrap">
                  <span className="li-input-icon"><LockIcon /></span>
                  <input
                    id="li-password"
                    className={`li-input${error ? " li-input-has-error" : ""}`}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    className="li-eye"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>

              {/* Remember me */}
              <div className="li-remember">
                <input
                  id="li-remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <span>Remember me for 30 days</span>
              </div>

              {/* Submit */}
              <button
                type="submit"
                className="li-btn-primary"
                disabled={isLoading || !username.trim() || !password}
              >
                {isLoading ? (
                  <span className="li-spinner" />
                ) : (
                  <>Sign in <ArrowRightIcon /></>
                )}
              </button>

              {/* Divider */}
              <div className="li-divider">
                <div className="li-divider-line" />
                <span className="li-divider-text">or continue with</span>
                <div className="li-divider-line" />
              </div>

              {/* Social */}
              <div className="li-social-row">
                <button type="button" className="li-social-btn"><GoogleIcon /> Google</button>
                <button type="button" className="li-social-btn"><FacebookIcon /> Facebook</button>
              </div>
            </form>

            <p className="li-signup">
              Don&apos;t have an account?{" "}
              <button
                type="button"
                className="li-signup-link"
                onClick={() => navigate("/register")}
              >
                Create one free
              </button>
            </p>
          </div>

        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

function StatCard({ iconBg, icon, label, value }: {
  iconBg: string; icon: React.ReactNode; label: string; value: string;
}) {
  return (
    <div className="li-stat-card">
      <div className="li-stat-icon" style={{ background: iconBg }}>{icon}</div>
      <div>
        <div className="li-stat-label">{label}</div>
        <div className="li-stat-val">{value}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// SVG Icons
// ─────────────────────────────────────────────

function LogoIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path d="M4 15L10 5L16 15" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 11H13.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function AtIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="4" /><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

function ArrowUpIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M8 12V4M5 7L8 4L11 7" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <path d="M8 4V12M5 9L8 12L11 9" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BarIcon({ color }: { color: string }) {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="9" width="3" height="5" rx="1" fill={color} />
      <rect x="6.5" y="6" width="3" height="8" rx="1" fill={color} opacity="0.6" />
      <rect x="11" y="3" width="3" height="11" rx="1" fill={color} opacity="0.35" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

function FacebookIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="#1877F2">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}