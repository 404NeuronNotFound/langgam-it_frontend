"use client";

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// ------------------------------------------------------------------
// Langgam-It — Sidebar
// Design: same tokens as LoginPage / RegisterPage
// Fonts : Plus Jakarta Sans + Lora
// Mobile: collapses to a bottom nav bar on ≤768px
//         + a slide-in drawer toggled by the hamburger button
// ------------------------------------------------------------------

interface NavItem {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    path: "/dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    key: "income",
    label: "Income",
    path: "/income",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 19V5M5 12l7-7 7 7" />
      </svg>
    ),
  },
  {
    key: "expenses",
    label: "Expenses",
    path: "/expenses",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12l7 7 7-7" />
      </svg>
    ),
  },
  {
    key: "investments",
    label: "Investments",
    path: "/investments",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    ),
  },
  {
    key: "budget",
    label: "Budget",
    path: "/budget",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
  },
  {
    key: "reports",
    label: "Reports",
    path: "/reports",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
];

const BOTTOM_NAV_ITEMS = NAV_ITEMS.slice(0, 4); // dashboard, income, expenses, investments

export default function Sidebar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const initials = [user?.first_name?.[0], user?.last_name?.[0]]
    .filter(Boolean).join("").toUpperCase() || "U";

  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(" ")
    || user?.username || "User";

  function isActive(path: string) {
    return location.pathname === path;
  }

  function handleNav(path: string) {
    navigate(path);
    setDrawerOpen(false);
  }

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <>
      <style>{SIDEBAR_STYLES}</style>

      {/* ── Desktop sidebar ─────────────────────────────────────── */}
      <aside className="sb-root">

        {/* Logo */}
        <div className="sb-logo">
          <div className="sb-logo-mark">
            <LogoIcon color="var(--text-1)" />
          </div>
          <span className="sb-logo-name">Langgam-It</span>
        </div>

        {/* Nav label */}
        <p className="sb-section-label">Menu</p>

        {/* Nav items */}
        <nav className="sb-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`sb-nav-item${isActive(item.path) ? " sb-nav-item--active" : ""}`}
              onClick={() => handleNav(item.path)}
            >
              <span className="sb-nav-icon">{item.icon}</span>
              <span className="sb-nav-label">{item.label}</span>
              {isActive(item.path) && <span className="sb-nav-dot" />}
            </button>
          ))}
        </nav>

        {/* Spacer */}
        <div className="sb-spacer" />

        {/* Bottom section */}
        <div className="sb-bottom">
          <div className="sb-divider" />

          {/* Settings */}
          <button
            className={`sb-nav-item${isActive("/settings") ? " sb-nav-item--active" : ""}`}
            onClick={() => handleNav("/settings")}
          >
            <span className="sb-nav-icon"><SettingsIcon /></span>
            <span className="sb-nav-label">Settings</span>
          </button>

          {/* User card */}
          <div className="sb-user">
            <div className="sb-user-avatar">{initials}</div>
            <div className="sb-user-info">
              <span className="sb-user-name">{fullName}</span>
              <span className="sb-user-email">{user?.email || ""}</span>
            </div>
            <button className="sb-logout" onClick={handleLogout} aria-label="Sign out">
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Mobile: top bar ──────────────────────────────────────── */}
      <div className="sb-topbar">
        <div className="sb-topbar-logo">
          <div className="sb-logo-mark">
            <LogoIcon color="var(--text-1)" />
          </div>
          <span className="sb-logo-name">Langgam-It</span>
        </div>
        <button
          className="sb-hamburger"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
        >
          <HamburgerIcon />
        </button>
      </div>

      {/* ── Mobile: drawer overlay ───────────────────────────────── */}
      {drawerOpen && (
        <div className="sb-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── Mobile: slide-in drawer ──────────────────────────────── */}
      <div className={`sb-drawer${drawerOpen ? " sb-drawer--open" : ""}`}>
        <div className="sb-drawer-header">
          <div className="sb-topbar-logo">
            <div className="sb-logo-mark">
              <LogoIcon color="var(--text-1)" />
            </div>
            <span className="sb-logo-name">Langgam-It</span>
          </div>
          <button
            className="sb-hamburger"
            onClick={() => setDrawerOpen(false)}
            aria-label="Close menu"
          >
            <CloseIcon />
          </button>
        </div>

        <p className="sb-section-label" style={{ padding: "0 1.25rem" }}>Menu</p>

        <nav className="sb-drawer-nav">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              className={`sb-nav-item${isActive(item.path) ? " sb-nav-item--active" : ""}`}
              onClick={() => handleNav(item.path)}
            >
              <span className="sb-nav-icon">{item.icon}</span>
              <span className="sb-nav-label">{item.label}</span>
              {isActive(item.path) && <span className="sb-nav-dot" />}
            </button>
          ))}

          <div className="sb-divider" style={{ margin: "0.75rem 0" }} />

          <button
            className={`sb-nav-item${isActive("/settings") ? " sb-nav-item--active" : ""}`}
            onClick={() => handleNav("/settings")}
          >
            <span className="sb-nav-icon"><SettingsIcon /></span>
            <span className="sb-nav-label">Settings</span>
          </button>
        </nav>

        {/* Drawer user card */}
        <div className="sb-drawer-user">
          <div className="sb-user">
            <div className="sb-user-avatar">{initials}</div>
            <div className="sb-user-info">
              <span className="sb-user-name">{fullName}</span>
              <span className="sb-user-email">{user?.email || ""}</span>
            </div>
            <button className="sb-logout" onClick={handleLogout} aria-label="Sign out">
              <LogoutIcon />
            </button>
          </div>
        </div>
      </div>

      {/* ── Mobile: bottom nav ───────────────────────────────────── */}
      <nav className="sb-bottom-nav">
        {BOTTOM_NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`sb-bottom-nav-item${isActive(item.path) ? " sb-bottom-nav-item--active" : ""}`}
            onClick={() => handleNav(item.path)}
          >
            <span className="sb-bottom-nav-icon">{item.icon}</span>
            <span className="sb-bottom-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────

const SIDEBAR_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=Lora:ital,wght@0,500;1,400&display=swap');

  /* ── Tokens (same as login/register pages) ── */
  :root {
    --bg-page:    #F5F4F1;
    --bg-card:    #FFFFFF;
    --bg-surface: #F0EFEB;
    --border:     rgba(0,0,0,0.09);
    --border-md:  rgba(0,0,0,0.14);
    --text-1:     #18181B;
    --text-2:     #52525B;
    --text-3:     #A1A1AA;
    --sans:       'Plus Jakarta Sans', system-ui, sans-serif;
    --serif:      'Lora', Georgia, serif;
    --radius-sm:  8px;
    --radius-md:  12px;
    --radius-lg:  18px;
    --sb-width:   224px;
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
    }
  }

  /* ── Desktop sidebar ── */
  .sb-root {
    font-family: var(--sans);
    width: var(--sb-width);
    min-height: 100vh;
    height: 100%;
    background: var(--bg-card);
    border-right: 0.5px solid var(--border-md);
    display: flex;
    flex-direction: column;
    padding: 1.5rem 1rem;
    position: fixed;
    top: 0;
    left: 0;
    z-index: 40;
    flex-shrink: 0;
  }

  /* ── Logo ── */
  .sb-logo {
    display: flex;
    align-items: center;
    gap: 9px;
    margin-bottom: 2rem;
    padding: 0 0.25rem;
  }

  .sb-logo-mark {
    width: 30px;
    height: 30px;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    border: 0.5px solid var(--border-md);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sb-logo-name {
    font-family: var(--serif);
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.3px;
  }

  /* ── Section label ── */
  .sb-section-label {
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--text-3);
    padding: 0 0.5rem;
    margin-bottom: 0.5rem;
  }

  /* ── Nav ── */
  .sb-nav {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sb-nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 9px 10px;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-family: var(--sans);
    font-size: 13.5px;
    font-weight: 400;
    color: var(--text-2);
    text-align: left;
    position: relative;
    transition: background 0.12s, color 0.12s;
  }

  .sb-nav-item:hover {
    background: var(--bg-surface);
    color: var(--text-1);
  }

  .sb-nav-item--active {
    background: var(--bg-surface);
    color: var(--text-1);
    font-weight: 500;
  }

  .sb-nav-icon {
    display: flex;
    align-items: center;
    flex-shrink: 0;
    color: inherit;
  }

  .sb-nav-label { flex: 1; }

  .sb-nav-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--text-1);
    flex-shrink: 0;
  }

  /* ── Spacer & bottom ── */
  .sb-spacer { flex: 1; }

  .sb-bottom {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .sb-divider {
    height: 0.5px;
    background: var(--border);
    margin: 0.5rem 0;
  }

  /* ── User card ── */
  .sb-user {
    display: flex;
    align-items: center;
    gap: 9px;
    padding: 8px 6px;
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    border: 0.5px solid var(--border);
    margin-top: 4px;
  }

  .sb-user-avatar {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    color: var(--text-1);
    flex-shrink: 0;
    letter-spacing: 0.03em;
  }

  .sb-user-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .sb-user-name {
    font-size: 12.5px;
    font-weight: 500;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sb-user-email {
    font-size: 11px;
    color: var(--text-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .sb-logout {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-3);
    display: flex;
    align-items: center;
    padding: 4px;
    border-radius: 6px;
    flex-shrink: 0;
    transition: color 0.12s, background 0.12s;
  }

  .sb-logout:hover {
    color: var(--text-1);
    background: var(--border);
  }

  /* ── Mobile top bar ── */
  .sb-topbar {
    display: none;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    height: 52px;
    background: var(--bg-card);
    border-bottom: 0.5px solid var(--border-md);
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 40;
    font-family: var(--sans);
  }

  .sb-topbar-logo {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .sb-hamburger {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-2);
    display: flex;
    align-items: center;
    padding: 6px;
    border-radius: var(--radius-sm);
    transition: background 0.12s;
  }

  .sb-hamburger:hover { background: var(--bg-surface); }

  /* ── Drawer overlay ── */
  .sb-overlay {
    display: none;
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.3);
    z-index: 50;
  }

  /* ── Drawer ── */
  .sb-drawer {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: 260px;
    background: var(--bg-card);
    border-right: 0.5px solid var(--border-md);
    z-index: 60;
    flex-direction: column;
    transform: translateX(-100%);
    transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: var(--sans);
  }

  .sb-drawer--open {
    transform: translateX(0);
  }

  .sb-drawer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1rem;
    height: 52px;
    border-bottom: 0.5px solid var(--border);
    flex-shrink: 0;
  }

  .sb-drawer-nav {
    flex: 1;
    overflow-y: auto;
    padding: 0.75rem 0.75rem;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .sb-drawer-user {
    padding: 0.75rem;
    border-top: 0.5px solid var(--border);
    flex-shrink: 0;
  }

  /* ── Mobile bottom nav ── */
  .sb-bottom-nav {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 56px;
    background: var(--bg-card);
    border-top: 0.5px solid var(--border-md);
    z-index: 40;
    align-items: center;
    justify-content: space-around;
    padding: 0 0.5rem;
    font-family: var(--sans);
  }

  .sb-bottom-nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    flex: 1;
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px 4px;
    border-radius: var(--radius-sm);
    color: var(--text-3);
    font-family: var(--sans);
    transition: color 0.12s;
  }

  .sb-bottom-nav-item--active { color: var(--text-1); }

  .sb-bottom-nav-icon {
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .sb-bottom-nav-label {
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.01em;
  }

  /* ── Responsive ── */
  @media (max-width: 768px) {
    .sb-root       { display: none; }
    .sb-topbar     { display: flex; }
    .sb-overlay    { display: block; }
    .sb-drawer     { display: flex; }
    .sb-bottom-nav { display: flex; }
  }
`;

// ─────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────

function LogoIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path d="M4 15L10 5L16 15" stroke={color} strokeWidth="1.6"
        strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6.5 11H13.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}