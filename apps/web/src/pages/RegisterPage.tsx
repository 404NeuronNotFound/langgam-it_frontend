"use client"

import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuthStore } from "../store/authStore"
import type { RegisterPayload } from "../types"

export default function RegisterPage() {
  const navigate = useNavigate()
  const { register, isLoading, error, clearError } = useAuthStore()

  const [form, setForm] = useState<RegisterPayload>({
    first_name:       "",
    last_name:        "",
    email:            "",
    username:         "",
    password:         "",
    confirm_password: "",
  })

  const [showPassword,        setShowPassword]        = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldErrors,         setFieldErrors]         = useState<Partial<Record<keyof RegisterPayload, string>>>({})
  const [touched,             setTouched]             = useState<Set<string>>(new Set())
  const [isSuccess,           setIsSuccess]           = useState(false)
  const [successName,         setSuccessName]         = useState("")

  // Clear server error when user types in key fields
  useEffect(() => {
    if (error) clearError()
  }, [form.username, form.email, form.password])

  // Auto-redirect after success
  useEffect(() => {
    if (!isSuccess) return
    const timer = setTimeout(() => navigate("/"), 2000)
    return () => clearTimeout(timer)
  }, [isSuccess])

  function validate(): boolean {
    const errs: Partial<Record<keyof RegisterPayload, string>> = {}

    if (!form.first_name.trim())
      errs.first_name = "First name is required."

    if (!form.last_name.trim())
      errs.last_name = "Last name is required."

    if (!form.email.trim()) {
      errs.email = "Email is required."
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      errs.email = "Enter a valid email address."
    }

    if (!form.username.trim()) {
      errs.username = "Username is required."
    } else if (form.username.trim().length < 3) {
      errs.username = "Username must be at least 3 characters."
    } else if (/\s/.test(form.username)) {
      errs.username = "Username cannot contain spaces."
    }

    if (!form.password) {
      errs.password = "Password is required."
    } else if (form.password.length < 8) {
      errs.password = "Password must be at least 8 characters."
    }

    if (!form.confirm_password) {
      errs.confirm_password = "Please confirm your password."
    } else if (form.password !== form.confirm_password) {
      errs.confirm_password = "Passwords do not match."
    }

    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    // Clear field error as user corrects it
    if (fieldErrors[name as keyof RegisterPayload]) {
      setFieldErrors((prev) => ({ ...prev, [name]: undefined }))
    }
  }

  function handleBlur(e: React.FocusEvent<HTMLInputElement>) {
    setTouched((prev) => new Set(prev).add(e.target.name))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // Mark all fields as touched on submit
    setTouched(new Set(Object.keys(form)))

    if (!validate()) return

    try {
      const result = await register(form)
      setSuccessName(result.user.first_name || result.user.username)
      setIsSuccess(true)
    } catch {
      // error is set in authStore — displayed in JSX
    }
  }

  if (isSuccess) {
    return <SuccessScreen name={successName} onGoToLogin={() => navigate("/")} />
  }

  return (
    <>
      <style>
        {SHARED_STYLES}
        {FORM_STYLES}
      </style>
      <div className="rg-root">
        <div className="rg-shell">
          {/* Left pane */}
          <div className="rg-left">
            <div className="rg-logo">
              <div className="rg-logo-mark">
                <LogoIcon color="var(--text-1)" />
              </div>
              <span className="rg-logo-name">Langgam-It</span>
            </div>
            <div className="rg-brand">
              <p className="rg-headline">
                Start your financial
                <br />
                journey today.
              </p>
              <p className="rg-tagline">
                Create your free account and take control of your income,
                spending, and investments.
              </p>
              <div className="rg-steps">
                <div className="rg-step">
                  <div className="rg-step-num">1</div>
                  <div className="rg-step-text">
                    <span className="rg-step-title">Create your account</span>
                    Takes less than a minute.
                  </div>
                </div>
                <div className="rg-step">
                  <div className="rg-step-num">2</div>
                  <div className="rg-step-text">
                    <span className="rg-step-title">Connect your finances</span>
                    Add income sources and spending categories.
                  </div>
                </div>
                <div className="rg-step">
                  <div className="rg-step-num">3</div>
                  <div className="rg-step-text">
                    <span className="rg-step-title">Track and grow</span>
                    Watch your money work for you.
                  </div>
                </div>
              </div>
            </div>
            <p className="rg-bottom-note">
              Free forever for personal use. No credit card required.
            </p>
          </div>

          {/* Right pane */}
          <div className="rg-right">
            <div className="rg-mobile-logo">
              <div className="rg-logo-mark">
                <LogoIcon color="var(--text-1)" />
              </div>
              <span className="rg-logo-name">Langgam-It</span>
            </div>

            <div className="rg-form-head">
              <h1 className="rg-form-title">Create an account</h1>
              <p className="rg-form-sub">Fill in your details to get started</p>
            </div>

            {error && (
              <div className="rg-error-banner" role="alert">
                <span className="rg-error-banner-icon">
                  <AlertIcon />
                </span>
                <span className="rg-error-banner-text">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              {/* Username */}
              <div className="rg-field-full">
                <label className="rg-label" htmlFor="rg-username">
                  Username
                </label>
                <div className="rg-input-wrap">
                  <span className="rg-input-icon">
                    <AtIcon />
                  </span>
                  <input
                    id="rg-username"
                    className={`rg-input${touched.has("username") && fieldErrors.username ? " rg-input-error" : ""}`}
                    type="text"
                    name="username"
                    placeholder="yourhandle"
                    autoComplete="username"
                    value={form.username}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                  />
                </div>
                {touched.has("username") && fieldErrors.username && (
                  <span className="rg-error-msg">{fieldErrors.username}</span>
                )}
              </div>

              {/* First + Last */}
              <div className="rg-row">
                <div className="rg-field">
                  <label className="rg-label" htmlFor="rg-first">
                    First name
                  </label>
                  <div className="rg-input-wrap">
                    <span className="rg-input-icon">
                      <UserIcon />
                    </span>
                    <input
                      id="rg-first"
                      className={`rg-input${touched.has("first_name") && fieldErrors.first_name ? " rg-input-error" : ""}`}
                      type="text"
                      name="first_name"
                      placeholder="Juan"
                      autoComplete="given-name"
                      value={form.first_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      autoFocus
                      disabled={isLoading}
                    />
                  </div>
                  {touched.has("first_name") && fieldErrors.first_name && (
                    <span className="rg-error-msg">{fieldErrors.first_name}</span>
                  )}
                </div>
                <div className="rg-field">
                  <label className="rg-label" htmlFor="rg-last">
                    Last name
                  </label>
                  <div className="rg-input-wrap">
                    <span className="rg-input-icon">
                      <UserIcon />
                    </span>
                    <input
                      id="rg-last"
                      className={`rg-input${touched.has("last_name") && fieldErrors.last_name ? " rg-input-error" : ""}`}
                      type="text"
                      name="last_name"
                      placeholder="dela Cruz"
                      autoComplete="family-name"
                      value={form.last_name}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isLoading}
                    />
                  </div>
                  {touched.has("last_name") && fieldErrors.last_name && (
                    <span className="rg-error-msg">{fieldErrors.last_name}</span>
                  )}
                </div>
              </div>

              {/* Email */}
              <div className="rg-field-full">
                <label className="rg-label" htmlFor="rg-email">
                  Email address
                </label>
                <div className="rg-input-wrap">
                  <span className="rg-input-icon">
                    <MailIcon />
                  </span>
                  <input
                    id="rg-email"
                    className={`rg-input${touched.has("email") && fieldErrors.email ? " rg-input-error" : ""}`}
                    type="email"
                    name="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    value={form.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={isLoading}
                  />
                </div>
                {touched.has("email") && fieldErrors.email && (
                  <span className="rg-error-msg">{fieldErrors.email}</span>
                )}
              </div>

              {/* Password + Confirm */}
              <div className="rg-row">
                <div className="rg-field">
                  <label className="rg-label" htmlFor="rg-password">
                    Password
                  </label>
                  <div className="rg-input-wrap">
                    <span className="rg-input-icon">
                      <LockIcon />
                    </span>
                    <input
                      id="rg-password"
                      className={`rg-input rg-input-pw${touched.has("password") && fieldErrors.password ? " rg-input-error" : ""}`}
                      type={showPassword ? "text" : "password"}
                      name="password"
                      placeholder="Min. 8 chars"
                      autoComplete="new-password"
                      value={form.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="rg-eye"
                      aria-label={showPassword ? "Hide" : "Show"}
                      onClick={() => setShowPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {touched.has("password") && fieldErrors.password && (
                    <span className="rg-error-msg">{fieldErrors.password}</span>
                  )}
                </div>
                <div className="rg-field">
                  <label className="rg-label" htmlFor="rg-confirm">
                    Confirm password
                  </label>
                  <div className="rg-input-wrap">
                    <span className="rg-input-icon">
                      <LockIcon />
                    </span>
                    <input
                      id="rg-confirm"
                      className={`rg-input rg-input-pw${touched.has("confirm_password") && fieldErrors.confirm_password ? " rg-input-error" : ""}`}
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirm_password"
                      placeholder="Repeat password"
                      autoComplete="new-password"
                      value={form.confirm_password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="rg-eye"
                      aria-label={showConfirmPassword ? "Hide" : "Show"}
                      onClick={() => setShowConfirmPassword((v) => !v)}
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                  {touched.has("confirm_password") && fieldErrors.confirm_password && (
                    <span className="rg-error-msg">
                      {fieldErrors.confirm_password}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="rg-btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="rg-spinner" />
                    <span>Creating account…</span>
                  </>
                ) : (
                  <>
                    <span>Create account</span>
                    <ArrowRightIcon />
                  </>
                )}
              </button>
            </form>

            <p className="rg-signin">
              Already have an account?{" "}
              <Link to="/" className="rg-signin-link">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Success Screen Component
// ─────────────────────────────────────────────────────────────────────

function SuccessScreen({
  name,
  onGoToLogin,
}: {
  name: string
  onGoToLogin: () => void
}) {
  return (
    <>
      <style>
        {SHARED_STYLES}
        {SUCCESS_STYLES}
      </style>
      <div className="su-root">
        <div className="su-card">
          <div className="su-logo-wrap">
            <div className="su-logo-mark">
              <LogoIcon color="var(--text-1)" />
            </div>
            <span className="su-logo-name">Langgam-It</span>
          </div>
          <div className="su-icon-ring">
            <CheckCircleIcon />
          </div>
          <h2 className="su-title">Account created!</h2>
          <p className="su-sub">
            Welcome to Langgam-It, {name}.
            <br />
            Redirecting to login in 2 seconds…
          </p>
          <div className="su-bar-track" style={{ marginBottom: "1.5rem" }}>
            <div className="su-bar-fill" />
          </div>
          <button
            className="rg-btn-primary"
            style={{ margin: 0 }}
            onClick={onGoToLogin}
          >
            Go to Login
          </button>
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────

const SHARED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=Lora:ital,wght@0,500;1,400&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --bg-page:#F5F4F1; --bg-card:#FFFFFF; --bg-surface:#F0EFEB;
    --border:rgba(0,0,0,0.09); --border-md:rgba(0,0,0,0.14);
    --text-1:#18181B; --text-2:#52525B; --text-3:#A1A1AA;
    --error:#993C1D; --error-bg:#FAECE7; --green-bg:#EAF3DE; --green-icon:#3B6D11;
    --sans:'Plus Jakarta Sans',system-ui,sans-serif; --serif:'Lora',Georgia,serif;
    --radius-sm:8px; --radius-md:12px; --radius-lg:18px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg-page:#0F0F11; --bg-card:#18181B; --bg-surface:#1F1F23;
      --border:rgba(255,255,255,0.08); --border-md:rgba(255,255,255,0.14);
      --text-1:#FAFAFA; --text-2:#A1A1AA; --text-3:#52525B;
      --error:#F0997B; --error-bg:#4A1B0C; --green-bg:#173404; --green-icon:#97C459;
    }
  }
`

const SUCCESS_STYLES = `
  .su-root { font-family:var(--sans); min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg-page); padding:24px 16px; }
  .su-card { background:var(--bg-card); border:0.5px solid var(--border-md); border-radius:var(--radius-lg); padding:3rem 2.5rem 2.5rem; width:100%; max-width:380px; display:flex; flex-direction:column; align-items:center; animation:su-fade-up 0.45s ease both; }
  @keyframes su-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .su-logo-wrap { display:flex; align-items:center; gap:9px; margin-bottom:2rem; }
  .su-logo-mark { width:30px; height:30px; background:var(--bg-surface); border-radius:var(--radius-sm); border:0.5px solid var(--border-md); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .su-logo-name { font-family:var(--serif); font-size:16px; font-weight:500; color:var(--text-1); letter-spacing:-0.3px; }
  .su-icon-ring { width:64px; height:64px; border-radius:50%; background:var(--green-bg); border:0.5px solid rgba(59,109,17,0.2); display:flex; align-items:center; justify-content:center; margin-bottom:1.25rem; animation:su-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both; }
  @keyframes su-pop { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
  .su-title { font-family:var(--serif); font-size:22px; font-weight:500; color:var(--text-1); letter-spacing:-0.2px; margin-bottom:6px; text-align:center; }
  .su-sub { font-size:13px; color:var(--text-3); text-align:center; margin-bottom:2rem; line-height:1.5; }
  .su-bar-track { width:100%; height:3px; background:var(--bg-surface); border-radius:99px; overflow:hidden; }
  .su-bar-fill { height:100%; width:0%; background:var(--text-1); border-radius:99px; animation:su-progress 2.4s cubic-bezier(0.4,0,0.2,1) forwards; }
  @keyframes su-progress { 0%{width:0%} 60%{width:75%} 85%{width:90%} 100%{width:100%} }
`

const FORM_STYLES = `
  .rg-root { font-family:var(--sans); min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg-page); padding:24px 16px; }
  .rg-shell { display:flex; width:100%; max-width:880px; background:var(--bg-card); border-radius:var(--radius-lg); border:0.5px solid var(--border-md); overflow:hidden; }
  .rg-left { flex:0 0 40%; background:var(--bg-surface); border-right:0.5px solid var(--border); padding:2.25rem 1.875rem; display:flex; flex-direction:column; }
  .rg-logo { display:flex; align-items:center; gap:10px; margin-bottom:2.5rem; }
  .rg-logo-mark { width:34px; height:34px; background:var(--bg-card); border-radius:var(--radius-sm); border:0.5px solid var(--border-md); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .rg-logo-name { font-family:var(--serif); font-size:17px; font-weight:500; color:var(--text-1); letter-spacing:-0.3px; }
  .rg-brand { flex:1; display:flex; flex-direction:column; justify-content:center; }
  .rg-headline { font-family:var(--serif); font-size:22px; font-style:italic; font-weight:400; color:var(--text-1); line-height:1.4; margin-bottom:0.75rem; }
  .rg-tagline { font-size:13px; color:var(--text-2); line-height:1.7; margin-bottom:1.5rem; }
  .rg-steps { display:flex; flex-direction:column; gap:14px; margin-bottom:2rem; }
  .rg-step { display:flex; align-items:flex-start; gap:12px; }
  .rg-step-num { width:24px; height:24px; border-radius:50%; background:var(--bg-card); border:0.5px solid var(--border-md); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:500; color:var(--text-2); flex-shrink:0; margin-top:1px; }
  .rg-step-text { font-size:13px; color:var(--text-2); line-height:1.5; }
  .rg-step-title { font-weight:500; color:var(--text-1); display:block; margin-bottom:1px; }
  .rg-bottom-note { font-size:12px; color:var(--text-3); line-height:1.6; padding-top:1.5rem; border-top:0.5px solid var(--border); }
  .rg-right { flex:1; padding:2.25rem; display:flex; flex-direction:column; justify-content:center; }
  .rg-mobile-logo { display:none; align-items:center; gap:10px; margin-bottom:1.75rem; }
  .rg-form-head { margin-bottom:1.5rem; }
  .rg-form-title { font-family:var(--serif); font-size:22px; font-weight:500; color:var(--text-1); margin-bottom:4px; letter-spacing:-0.2px; }
  .rg-form-sub { font-size:13px; color:var(--text-2); }
  .rg-error-banner { background:var(--error-bg); border:0.5px solid var(--error); border-radius:var(--radius-sm); padding:10px 13px; margin-bottom:16px; display:flex; align-items:flex-start; gap:9px; }
  .rg-error-banner-icon { color:var(--error); flex-shrink:0; margin-top:1px; }
  .rg-error-banner-text { font-size:13px; color:var(--error); line-height:1.5; }
  .rg-row { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:13px; }
  .rg-field { display:flex; flex-direction:column; gap:6px; }
  .rg-field-full { margin-bottom:13px; display:flex; flex-direction:column; gap:6px; }
  .rg-label { font-size:13px; font-weight:500; color:var(--text-2); }
  .rg-input-wrap { position:relative; display:flex; align-items:center; }
  .rg-input-icon { position:absolute; left:11px; color:var(--text-3); display:flex; align-items:center; pointer-events:none; }
  .rg-input { width:100%; height:40px; padding:0 12px 0 36px; font-family:var(--sans); font-size:14px; color:var(--text-1); background:var(--bg-surface); border:0.5px solid var(--border-md); border-radius:var(--radius-sm); outline:none; transition:border-color 0.15s,box-shadow 0.15s; }
  .rg-input-pw { padding-right:38px; }
  .rg-input::placeholder { color:var(--text-3); }
  .rg-input:focus { border-color:var(--text-2); box-shadow:0 0 0 3px rgba(100,100,100,0.08); }
  .rg-input-error { border-color:var(--error) !important; box-shadow:0 0 0 3px rgba(153,60,29,0.08) !important; }
  .rg-error-msg { font-size:11px; color:var(--error); margin-top:2px; }
  .rg-eye { position:absolute; right:10px; background:none; border:none; cursor:pointer; color:var(--text-3); display:flex; align-items:center; padding:4px; }
  .rg-btn-primary { width:100%; height:42px; background:var(--text-1); color:var(--bg-card); border:none; border-radius:var(--radius-sm); font-family:var(--sans); font-size:14px; font-weight:500; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; transition:opacity 0.15s,transform 0.1s; margin-bottom:18px; }
  .rg-btn-primary:hover { opacity:0.82; }
  .rg-btn-primary:active { transform:scale(0.99); }
  .rg-btn-primary:disabled { opacity:0.55; cursor:not-allowed; }
  .rg-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:currentColor; border-radius:50%; animation:rg-spin 0.7s linear infinite; }
  .rg-signin { text-align:center; font-size:13px; color:var(--text-2); }
  .rg-signin-link { color:var(--text-1); font-weight:500; text-decoration:underline; background:none; border:none; cursor:pointer; font-family:var(--sans); font-size:13px; padding:0; }
  @keyframes rg-spin { to{transform:rotate(360deg)} }
  @media (max-width:680px) { .rg-left{display:none !important} .rg-right{padding:2rem 1.5rem} .rg-mobile-logo{display:flex !important} .rg-shell{border-radius:var(--radius-md)} }
  @media (max-width:480px) { .rg-right{padding:1.5rem 1.25rem} .rg-row{grid-template-columns:1fr;gap:0;margin-bottom:0} .rg-row .rg-field{margin-bottom:13px} }
`

// ─────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────

function LogoIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
      <path
        d="M4 15L10 5L16 15"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 11H13.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}
function AlertIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  )
}
function AtIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94" />
    </svg>
  )
}
function UserIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function MailIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  )
}
function LockIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
function EyeIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  )
}
function ArrowRightIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}
function CheckCircleIcon() {
  return (
    <svg
      width="56"
      height="56"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--green-icon)"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  )
}
