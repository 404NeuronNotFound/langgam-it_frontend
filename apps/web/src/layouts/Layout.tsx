"use client";

import { Outlet } from "react-router-dom";
import Sidebar from "../components/SideBar";

// ------------------------------------------------------------------
// Langgam-It — Layout
// Used by all protected routes.
// Renders: Sidebar (fixed left) + scrollable main content area.
// On mobile: Sidebar hides, top bar + bottom nav take over.
// ------------------------------------------------------------------

export default function Layout() {
  return (
    <>
      <style>{LAYOUT_STYLES}</style>
      <div className="layout-root">
        <Sidebar />
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </>
  );
}

const LAYOUT_STYLES = `
  /* ── Tokens (same as the whole app) ── */
  :root {
    --bg-page:   #F5F4F1;
    --sb-width:  224px;
  }
  @media (prefers-color-scheme: dark) {
    :root { --bg-page: #0F0F11; }
  }

  /* ── Layout shell ── */
  .layout-root {
    display: flex;
    min-height: 100vh;
    background: var(--bg-page);
  }

  /* ── Main content ── */
  .layout-main {
    flex: 1;
    margin-left: var(--sb-width);   /* offset for the fixed sidebar */
    min-height: 100vh;
    padding: 2rem 2rem;
    overflow-y: auto;
  }

  /* ── Mobile adjustments ── */
  @media (max-width: 768px) {
    .layout-main {
      margin-left: 0;
      padding: 1.25rem 1rem;
      /* top bar is 52px, bottom nav is 56px */
      padding-top: calc(52px + 1.25rem);
      padding-bottom: calc(56px + 1rem);
    }
  }
`;