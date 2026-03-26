"use client";

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

// ------------------------------------------------------------------
// Langgam-It — Setup Wizard
// First-time onboarding: 5 financial bucket fields
// Design tokens match LoginPage / RegisterPage exactly
// ------------------------------------------------------------------

interface SetupForm {
  emergency_fund: string;
  savings: string;
  investments: string;
  rigs_fund: string;
  cash_on_hand: string;
}

interface SetupErrors {
  emergency_fund?: string;
  savings?: string;
  investments?: string;
  rigs_fund?: string;
  cash_on_hand?: string;
}

const FIELDS: {
  key: keyof SetupForm;
  label: string;
  description: string;
  placeholder: string;
  iconColor: string;
  iconBg: string;
  icon: string; // which icon variant
}[] = [
  {
    key: "emergency_fund",
    label: "Emergency fund",
    description: "Your safety net. Target is ₱10,000.",
    placeholder: "0.00",
    iconColor: "var(--green-icon)",
    iconBg: "var(--green-bg)",
    icon: "shield",
  },
  {
    key: "savings",
    label: "Savings",
    description: "Money set aside for future goals.",
    placeholder: "0.00",
    iconColor: "var(--blue-icon)",
    iconBg: "var(--blue-bg)",
    icon: "piggy",
  },
  {
    key: "investments",
    label: "Investments",
    description: "Stocks, crypto, mutual funds, etc.",
    placeholder: "0.00",
    iconColor: "var(--purple-icon)",
    iconBg: "var(--purple-bg)",
    icon: "chart",
  },
  {
    key: "rigs_fund",
    label: "Rigs fund",
    description: "Dedicated fund for equipment purchases.",
    placeholder: "0.00",
    iconColor: "var(--amber-icon)",
    iconBg: "var(--amber-bg)",
    icon: "box",
  },
  {
    key: "cash_on_hand",
    label: "Cash on hand",
    description: "Physical cash or liquid money available.",
    placeholder: "0.00",
    iconColor: "var(--text-2)",
    iconBg: "var(--bg-surface)",
    icon: "wallet",
  },
];

export default function SetupWizard() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [form, setForm] = useState<SetupForm>({
    emergency_fund: "",
    savings: "",
    investments: "",
    rigs_fund: "",
    cash_on_hand: "",
  });

  const [errors, setErrors] = useState<SetupErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");

  const firstName = user?.first_name || user?.username || "there";

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    // Allow only numbers and decimal point
    if (value !== "" && !/^\d*\.?\d{0,2}$/.test(value)) return;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name as keyof SetupErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const next: SetupErrors = {};
    Object.entries(form).forEach(([key, val]) => {
      if (val !== "" && isNaN(parseFloat(val))) {
        next[key as keyof SetupErrors] = "Enter a valid amount.";
      }
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  // Compute net worth preview
  const netWorth = Object.values(form).reduce((sum, val) => {
    const n = parseFloat(val);
    return sum + (isNaN(n) ? 0 : n);
  }, 0);

  function formatPHP(val: number) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(val);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setIsLoading(true);
    // TODO: call POST /api/setup/ here
    await new Promise((r) => setTimeout(r, 1200));
    setIsLoading(false);
    setStep("success");
    setTimeout(() => navigate("/dashboard"), 2200);
  }

  // ── Success screen ────────────────────────────────────────────────
  if (step === "success") {
    return (
      <>
        <style>{SHARED_STYLES}{SUCCESS_STYLES}</style>
        <div className="sw-success-root">
          <div className="sw-success-card">
            <div className="sw-success-logo">
              <div className="sw-logo-mark"><LogoIcon color="var(--text-1)" /></div>
              <span className="sw-logo-name">Langgam-It</span>
            </div>
            <div className="sw-success-ring">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                stroke="var(--green-icon)" strokeWidth="2.2"
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="sw-success-title">You're all set!</h2>
            <p className="sw-success-sub">Taking you to your dashboard…</p>
            <div className="sw-bar-track"><div className="sw-bar-fill" /></div>
          </div>
        </div>
      </>
    );
  }

  // ── Setup form ────────────────────────────────────────────────────
  return (
    <>
      <style>{SHARED_STYLES}{FORM_STYLES}</style>
      <div className="sw-root">
        <div className="sw-container">

          {/* Header */}
          <div className="sw-header">
            <div className="sw-logo">
              <div className="sw-logo-mark"><LogoIcon color="var(--text-1)" /></div>
              <span className="sw-logo-name">Langgam-It</span>
            </div>
            <div className="sw-header-text">
              <h1 className="sw-title">Welcome, {firstName}.</h1>
              <p className="sw-subtitle">
                Tell us what you currently have so we can calculate your net worth and start tracking.
              </p>
            </div>
          </div>

          <div className="sw-body">
            {/* Left — form */}
            <form className="sw-form" onSubmit={handleSubmit} noValidate>
              <p className="sw-section-label">Your current assets</p>

              {FIELDS.map((field) => (
                <div className="sw-field" key={field.key}>
                  <div className="sw-field-meta">
                    <div className="sw-field-icon" style={{ background: field.iconBg }}>
                      <FieldIcon name={field.icon} color={field.iconColor} />
                    </div>
                    <div>
                      <label className="sw-label" htmlFor={`sw-${field.key}`}>
                        {field.label}
                      </label>
                      <p className="sw-field-desc">{field.description}</p>
                    </div>
                  </div>
                  <div className="sw-input-wrap">
                    <span className="sw-currency">₱</span>
                    <input
                      id={`sw-${field.key}`}
                      className={`sw-input${errors[field.key] ? " sw-input-error" : ""}`}
                      type="text"
                      inputMode="decimal"
                      name={field.key}
                      placeholder={field.placeholder}
                      value={form[field.key]}
                      onChange={handleChange}
                      autoComplete="off"
                    />
                  </div>
                  {errors[field.key] && (
                    <span className="sw-error-msg">{errors[field.key]}</span>
                  )}
                </div>
              ))}

              <button
                type="submit"
                className="sw-btn-primary"
                disabled={isLoading}
              >
                {isLoading ? <span className="sw-spinner" /> : (
                  <><span>Calculate my net worth</span><ArrowRightIcon /></>
                )}
              </button>

              <p className="sw-skip">
                Leave any field blank to start at{" "}
                <span style={{ color: "var(--text-1)", fontWeight: 500 }}>₱0.00</span>
                — you can update these anytime.
              </p>
            </form>

            {/* Right — live preview */}
            <div className="sw-preview">
              <p className="sw-section-label">Live preview</p>

              <div className="sw-networth-card">
                <p className="sw-networth-label">Estimated net worth</p>
                <p className="sw-networth-value">{formatPHP(netWorth)}</p>
                <p className="sw-networth-sub">Sum of all your assets below</p>
              </div>

              <div className="sw-breakdown">
                {FIELDS.map((field) => {
                  const val = parseFloat(form[field.key]) || 0;
                  const pct = netWorth > 0 ? (val / netWorth) * 100 : 0;
                  return (
                    <div className="sw-breakdown-row" key={field.key}>
                      <div className="sw-breakdown-left">
                        <div className="sw-breakdown-dot" style={{ background: field.iconColor }} />
                        <span className="sw-breakdown-label">{field.label}</span>
                      </div>
                      <div className="sw-breakdown-right">
                        <span className="sw-breakdown-val">{formatPHP(val)}</span>
                        <span className="sw-breakdown-pct">{pct.toFixed(0)}%</span>
                      </div>
                      <div className="sw-breakdown-bar-track">
                        <div
                          className="sw-breakdown-bar-fill"
                          style={{ width: `${pct}%`, background: field.iconColor }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────

const SHARED_STYLES = `
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
    --green-bg:   #EAF3DE;  --green-icon: #3B6D11;
    --blue-bg:    #E6F1FB;  --blue-icon:  #185FA5;
    --purple-bg:  #EEEDFE;  --purple-icon:#534AB7;
    --amber-bg:   #FAEEDA;  --amber-icon: #854F0B;
    --sans:  'Plus Jakarta Sans', system-ui, sans-serif;
    --serif: 'Lora', Georgia, serif;
    --radius-sm: 8px; --radius-md: 12px; --radius-lg: 18px;
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
      --green-bg:   #173404;  --green-icon: #97C459;
      --blue-bg:    #042C53;  --blue-icon:  #85B7EB;
      --purple-bg:  #26215C;  --purple-icon:#AFA9EC;
      --amber-bg:   #412402;  --amber-icon: #EF9F27;
    }
  }
`;

const SUCCESS_STYLES = `
  .sw-success-root { font-family:var(--sans); min-height:100vh; display:flex; align-items:center; justify-content:center; background:var(--bg-page); padding:24px 16px; }
  .sw-success-card { background:var(--bg-card); border:0.5px solid var(--border-md); border-radius:var(--radius-lg); padding:3rem 2.5rem 2.5rem; width:100%; max-width:380px; display:flex; flex-direction:column; align-items:center; animation:sw-fade-up 0.45s ease both; }
  @keyframes sw-fade-up { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
  .sw-success-logo { display:flex; align-items:center; gap:9px; margin-bottom:2rem; }
  .sw-logo-mark { width:30px; height:30px; background:var(--bg-surface); border-radius:var(--radius-sm); border:0.5px solid var(--border-md); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .sw-logo-name { font-family:var(--serif); font-size:16px; font-weight:500; color:var(--text-1); letter-spacing:-0.3px; }
  .sw-success-ring { width:64px; height:64px; border-radius:50%; background:var(--green-bg); border:0.5px solid rgba(59,109,17,0.2); display:flex; align-items:center; justify-content:center; margin-bottom:1.25rem; animation:sw-pop 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.2s both; }
  @keyframes sw-pop { from{opacity:0;transform:scale(0.6)} to{opacity:1;transform:scale(1)} }
  .sw-success-title { font-family:var(--serif); font-size:22px; font-weight:500; color:var(--text-1); margin-bottom:6px; text-align:center; }
  .sw-success-sub { font-size:13px; color:var(--text-3); text-align:center; margin-bottom:2rem; }
  .sw-bar-track { width:100%; height:3px; background:var(--bg-surface); border-radius:99px; overflow:hidden; }
  .sw-bar-fill { height:100%; width:0%; background:var(--text-1); border-radius:99px; animation:sw-progress 2s cubic-bezier(0.4,0,0.2,1) forwards; }
  @keyframes sw-progress { 0%{width:0%} 60%{width:75%} 85%{width:90%} 100%{width:100%} }
`;

const FORM_STYLES = `
  .sw-root { font-family:var(--sans); min-height:100vh; background:var(--bg-page); padding:2rem 1.5rem 3rem; }
  .sw-container { max-width:960px; margin:0 auto; }

  /* Header */
  .sw-header { margin-bottom:2.5rem; }
  .sw-logo { display:flex; align-items:center; gap:9px; margin-bottom:1.5rem; }
  .sw-logo-mark { width:30px; height:30px; background:var(--bg-card); border-radius:var(--radius-sm); border:0.5px solid var(--border-md); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .sw-logo-name { font-family:var(--serif); font-size:16px; font-weight:500; color:var(--text-1); letter-spacing:-0.3px; }
  .sw-title { font-family:var(--serif); font-size:28px; font-style:italic; font-weight:400; color:var(--text-1); margin-bottom:6px; line-height:1.2; letter-spacing:-0.3px; }
  .sw-subtitle { font-size:14px; color:var(--text-2); line-height:1.65; max-width:480px; }

  /* Body layout */
  .sw-body { display:grid; grid-template-columns:1fr 340px; gap:2rem; align-items:start; }

  /* Section label */
  .sw-section-label { font-size:10px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:var(--text-3); margin-bottom:1rem; }

  /* Form */
  .sw-form { background:var(--bg-card); border:0.5px solid var(--border-md); border-radius:var(--radius-lg); padding:1.75rem; }

  /* Field */
  .sw-field { margin-bottom:1.25rem; }
  .sw-field:last-of-type { margin-bottom:1.5rem; }
  .sw-field-meta { display:flex; align-items:flex-start; gap:11px; margin-bottom:8px; }
  .sw-field-icon { width:32px; height:32px; border-radius:var(--radius-sm); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .sw-label { font-size:13px; font-weight:500; color:var(--text-1); display:block; margin-bottom:2px; }
  .sw-field-desc { font-size:12px; color:var(--text-3); line-height:1.4; }

  /* Input */
  .sw-input-wrap { position:relative; display:flex; align-items:center; }
  .sw-currency { position:absolute; left:12px; font-size:13px; font-weight:500; color:var(--text-2); pointer-events:none; }
  .sw-input {
    width:100%; height:42px; padding:0 14px 0 28px;
    font-family:var(--sans); font-size:14px; color:var(--text-1);
    background:var(--bg-surface); border:0.5px solid var(--border-md);
    border-radius:var(--radius-sm); outline:none;
    transition:border-color 0.15s, box-shadow 0.15s;
  }
  .sw-input::placeholder { color:var(--text-3); }
  .sw-input:focus { border-color:var(--text-2); box-shadow:0 0 0 3px rgba(100,100,100,0.08); }
  .sw-input-error { border-color:var(--error) !important; }
  .sw-error-msg { font-size:11px; color:var(--error); margin-top:4px; display:block; }

  /* Submit */
  .sw-btn-primary {
    width:100%; height:44px;
    background:var(--text-1); color:var(--bg-card);
    border:none; border-radius:var(--radius-sm);
    font-family:var(--sans); font-size:14px; font-weight:500;
    cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px;
    transition:opacity 0.15s, transform 0.1s; margin-bottom:12px;
  }
  .sw-btn-primary:hover { opacity:0.82; }
  .sw-btn-primary:active { transform:scale(0.99); }
  .sw-btn-primary:disabled { opacity:0.55; cursor:not-allowed; }
  .sw-spinner { width:16px; height:16px; border:2px solid rgba(255,255,255,0.3); border-top-color:currentColor; border-radius:50%; animation:sw-spin 0.7s linear infinite; }
  @keyframes sw-spin { to{transform:rotate(360deg)} }
  .sw-skip { font-size:12px; color:var(--text-3); text-align:center; line-height:1.5; }

  /* Preview panel */
  .sw-preview { position:sticky; top:2rem; }

  .sw-networth-card {
    background:var(--bg-card); border:0.5px solid var(--border-md);
    border-radius:var(--radius-md); padding:1.25rem 1.5rem;
    margin-bottom:12px; text-align:center;
  }
  .sw-networth-label { font-size:11px; font-weight:600; letter-spacing:0.07em; text-transform:uppercase; color:var(--text-3); margin-bottom:8px; }
  .sw-networth-value { font-family:var(--serif); font-size:30px; font-weight:500; color:var(--text-1); letter-spacing:-0.5px; margin-bottom:4px; }
  .sw-networth-sub { font-size:12px; color:var(--text-3); }

  .sw-breakdown { background:var(--bg-card); border:0.5px solid var(--border-md); border-radius:var(--radius-md); padding:1.25rem; display:flex; flex-direction:column; gap:14px; }
  .sw-breakdown-row { display:flex; flex-direction:column; gap:5px; }
  .sw-breakdown-left { display:flex; align-items:center; gap:7px; }
  .sw-breakdown-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
  .sw-breakdown-label { font-size:12px; color:var(--text-2); flex:1; }
  .sw-breakdown-right { display:flex; justify-content:space-between; align-items:baseline; padding-left:14px; }
  .sw-breakdown-val { font-size:13px; font-weight:500; color:var(--text-1); }
  .sw-breakdown-pct { font-size:11px; color:var(--text-3); }
  .sw-breakdown-bar-track { height:3px; background:var(--bg-surface); border-radius:99px; overflow:hidden; }
  .sw-breakdown-bar-fill { height:100%; border-radius:99px; transition:width 0.3s ease; }

  /* Responsive */
  @media (max-width: 768px) {
    .sw-root { padding:1.5rem 1rem 5rem; }
    .sw-body { grid-template-columns:1fr; }
    .sw-preview { position:static; }
    .sw-title { font-size:22px; }
  }
  @media (max-width: 480px) {
    .sw-root { padding:1.25rem 0.875rem 5rem; }
    .sw-form { padding:1.25rem; }
  }
`;

// ─────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────

function LogoIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M4 15L10 5L16 15" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 11H13.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
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

function FieldIcon({ name, color }: { name: string; color: string }) {
  const props = { width: 16, height: 16, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "shield") return (
    <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
  );
  if (name === "piggy") return (
    <svg {...props}><path d="M19 9a7 7 0 1 0-13.33 3H4a2 2 0 0 0 0 4h1.07A7 7 0 0 0 12 20a7 7 0 0 0 6.93-4H20a2 2 0 0 0 0-4h-1.67A6.97 6.97 0 0 0 19 9z" /><path d="M12 8v4"/></svg>
  );
  if (name === "chart") return (
    <svg {...props}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>
  );
  if (name === "box") return (
    <svg {...props}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>
  );
  // wallet
  return (
    <svg {...props}><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M16 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z" /></svg>
  );
}