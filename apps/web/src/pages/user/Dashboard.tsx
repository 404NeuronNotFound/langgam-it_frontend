"use client";

import { useEffect } from "react";
import { useAuthStore } from "../../store/authStore";
import { useFinanceStore } from "../../store/financeStore";
import NetWorthChart from "../../components/NetWorthChart";

// ------------------------------------------------------------------
// Langgam-It — Dashboard
// Shows: greeting, net worth card, 4 bucket cards, chart
// Design tokens match the full Langgam-It system
// ------------------------------------------------------------------

export default function Dashboard() {
  const user = useAuthStore((s) => s.user);
  const { profile, snapshots, fetchProfile, fetchSnapshots } = useFinanceStore();

  useEffect(() => {
    fetchProfile();
    fetchSnapshots();
  }, [fetchProfile, fetchSnapshots]);

  const firstName = user?.first_name || user?.username || "there";

  // Calculate net worth from latest snapshot
  const latestSnapshot = snapshots[0];
  const netWorth = latestSnapshot ? parseFloat(latestSnapshot.net_worth) : 0;

  // Get bucket data from profile
  const bucketData = {
    emergency_fund: profile ? parseFloat(profile.emergency_fund) : 0,
    savings: profile ? parseFloat(profile.savings) : 0,
    investments_total: profile ? parseFloat(profile.investments_total) : 0,
    rigs_fund: profile ? parseFloat(profile.rigs_fund) : 0,
    cash_on_hand: profile ? parseFloat(profile.cash_on_hand) : 0,
  };

  // Transform snapshots for chart
  const history = snapshots.map((s: { snapshot_date: any; net_worth: string; }) => {
    // Parse the date - handle both ISO format and YYYY-MM-DD format
    let dateStr = s.snapshot_date;
    // If it's just YYYY-MM-DD, add time to make it valid ISO
    if (dateStr && !dateStr.includes('T')) {
      dateStr = dateStr + 'T00:00:00';
    }
    
    const date = new Date(dateStr);
    const month = !isNaN(date.getTime()) 
      ? date.toLocaleDateString("en-US", {
          month: "short",
          year: "numeric",
        })
      : "Unknown";
    
    return {
      month,
      net_worth: parseFloat(s.net_worth),
    };
  }).reverse();

  const currency = profile?.currency || "PHP";

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(val);
  }

  const BUCKETS = [
    {
      key: "emergency_fund",
      label: "Emergency fund",
      value: bucketData.emergency_fund,
      target: 10000,
      showTarget: true,
      iconBg: "var(--green-bg)",
      iconColor: "var(--green-icon)",
      icon: "shield",
    },
    {
      key: "savings",
      label: "Savings",
      value: bucketData.savings,
      target: null,
      showTarget: false,
      iconBg: "var(--blue-bg)",
      iconColor: "var(--blue-icon)",
      icon: "piggy",
    },
    {
      key: "investments_total",
      label: "Investments",
      value: bucketData.investments_total,
      target: null,
      showTarget: false,
      iconBg: "var(--purple-bg)",
      iconColor: "var(--purple-icon)",
      icon: "chart",
    },
    {
      key: "rigs_fund",
      label: "Rigs fund",
      value: bucketData.rigs_fund,
      target: 10000,
      showTarget: true,
      iconBg: "var(--amber-bg)",
      iconColor: "var(--amber-icon)",
      icon: "box",
    },
  ];

  const emergencyPct = Math.min((bucketData.emergency_fund / 10000) * 100, 100);
  const rigsPct      = Math.min((bucketData.rigs_fund / 10000) * 100, 100);

  return (
    <>
      <style>{DASH_STYLES}</style>

      <div className="db-root">

        {/* Greeting */}
        <div className="db-greeting">
          <div>
            <h1 className="db-greeting-title">Good morning, {firstName}.</h1>
            <p className="db-greeting-sub">Here's your financial snapshot for today.</p>
          </div>
          <div className="db-date">
            {new Date().toLocaleDateString("en-PH", {
              weekday: "long", month: "long", day: "numeric", year: "numeric",
            })}
          </div>
        </div>

        {/* Net worth hero card */}
        <div className="db-networth-card">
          <div className="db-networth-left">
            <p className="db-networth-label">Total net worth</p>
            <p className="db-networth-value">{formatCurrency(netWorth)}</p>
            <p className="db-networth-sub">
              {latestSnapshot 
                ? "emergency fund + savings + investments + rigs fund + cash on hand"
                : "No snapshots yet. Complete setup wizard to get started."}
            </p>
          </div>
          <div className="db-networth-right">
            <div className="db-cash-pill">
              <span className="db-cash-pill-label">Cash on hand</span>
              <span className="db-cash-pill-value">{formatCurrency(bucketData.cash_on_hand)}</span>
            </div>
          </div>
        </div>

        {/* 4 Bucket cards */}
        <div className="db-buckets">
          {BUCKETS.map((b) => {
            const pct = b.key === "emergency_fund" ? emergencyPct
                      : b.key === "rigs_fund"      ? rigsPct
                      : null;
            return (
              <div className="db-bucket-card" key={b.key}>
                <div className="db-bucket-header">
                  <div className="db-bucket-icon" style={{ background: b.iconBg }}>
                    <BucketIcon name={b.icon} color={b.iconColor} />
                  </div>
                  <span className="db-bucket-label">{b.label}</span>
                </div>
                <p className="db-bucket-value">{formatCurrency(b.value)}</p>
                {b.showTarget && pct !== null && (
                  <>
                    <div className="db-bucket-bar-track">
                      <div
                        className="db-bucket-bar-fill"
                        style={{ width: `${pct}%`, background: b.iconColor }}
                      />
                    </div>
                    <p className="db-bucket-target">
                      {pct.toFixed(0)}% of {formatCurrency(b.target!)} target
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {/* Net worth chart */}
        <div className="db-chart-card">
          <div className="db-chart-header">
            <div>
              <p className="db-chart-title">Net worth over time</p>
              <p className="db-chart-sub">Monthly snapshots of all your assets combined</p>
            </div>
          </div>
          <div className="db-chart-body">
            <NetWorthChart data={history} />
          </div>
        </div>

      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────

const DASH_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=Lora:ital,wght@0,500;1,400&display=swap');
  :root {
    --bg-page:    #F5F4F1;
    --bg-card:    #FFFFFF;
    --bg-surface: #F0EFEB;
    --border:     rgba(0,0,0,0.09);
    --border-md:  rgba(0,0,0,0.14);
    --text-1:     #18181B;
    --text-2:     #52525B;
    --text-3:     #A1A1AA;
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
      --green-bg:   #173404;  --green-icon: #97C459;
      --blue-bg:    #042C53;  --blue-icon:  #85B7EB;
      --purple-bg:  #26215C;  --purple-icon:#AFA9EC;
      --amber-bg:   #412402;  --amber-icon: #EF9F27;
    }
  }

  .db-root {
    font-family: var(--sans);
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  /* Greeting */
  .db-greeting {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }
  .db-greeting-title {
    font-family: var(--serif);
    font-size: 24px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.3px;
    margin-bottom: 3px;
  }
  .db-greeting-sub { font-size: 13px; color: var(--text-2); }
  .db-date { font-size: 12px; color: var(--text-3); padding-top: 4px; }

  /* Net worth card */
  .db-networth-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 1.5rem 1.75rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
    flex-wrap: wrap;
  }
  .db-networth-left { flex: 1; min-width: 0; }
  .db-networth-label {
    font-size: 10px; font-weight: 600; letter-spacing: 0.08em;
    text-transform: uppercase; color: var(--text-3); margin-bottom: 6px;
  }
  .db-networth-value {
    font-family: var(--serif);
    font-size: 36px; font-weight: 500;
    color: var(--text-1); letter-spacing: -0.5px;
    margin-bottom: 6px;
  }
  .db-networth-sub { font-size: 12px; color: var(--text-3); line-height: 1.5; }

  .db-networth-right { flex-shrink: 0; }
  .db-cash-pill {
    display: flex; flex-direction: column; align-items: flex-end;
    background: var(--bg-surface);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 12px 16px;
    gap: 3px;
  }
  .db-cash-pill-label { font-size: 11px; color: var(--text-3); }
  .db-cash-pill-value { font-size: 16px; font-weight: 500; color: var(--text-1); }

  /* Bucket cards */
  .db-buckets {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
  }
  .db-bucket-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.125rem 1.25rem;
  }
  .db-bucket-header {
    display: flex; align-items: center; gap: 8px;
    margin-bottom: 10px;
  }
  .db-bucket-icon {
    width: 28px; height: 28px;
    border-radius: 7px;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }
  .db-bucket-label { font-size: 12px; font-weight: 500; color: var(--text-2); }
  .db-bucket-value {
    font-family: var(--serif);
    font-size: 20px; font-weight: 500;
    color: var(--text-1); letter-spacing: -0.3px;
    margin-bottom: 10px;
  }
  .db-bucket-bar-track {
    height: 3px; background: var(--bg-surface);
    border-radius: 99px; overflow: hidden; margin-bottom: 5px;
  }
  .db-bucket-bar-fill { height: 100%; border-radius: 99px; transition: width 0.4s ease; }
  .db-bucket-target { font-size: 11px; color: var(--text-3); }

  /* Chart card */
  .db-chart-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 1.5rem 1.75rem;
  }
  .db-chart-header {
    display: flex; justify-content: space-between;
    align-items: flex-start; margin-bottom: 1.25rem;
  }
  .db-chart-title { font-size: 14px; font-weight: 500; color: var(--text-1); margin-bottom: 3px; }
  .db-chart-sub { font-size: 12px; color: var(--text-3); }
  .db-chart-body { margin: 0 -4px; }

  /* Responsive */
  @media (max-width: 768px) {
    .db-buckets { grid-template-columns: repeat(2, 1fr); }
    .db-networth-value { font-size: 28px; }
    .db-greeting-title { font-size: 20px; }
  }
  @media (max-width: 480px) {
    .db-buckets { grid-template-columns: 1fr 1fr; }
    .db-networth-card { padding: 1.25rem; }
    .db-chart-card { padding: 1.25rem; }
  }
  @media (min-width: 1024px) {
    .db-root { gap: 1.5rem; }
    .db-networth-card { padding: 2rem 2.25rem; }
    .db-chart-card { padding: 2rem 2.25rem; }
    .db-greeting-title { font-size: 28px; }
    .db-networth-value { font-size: 42px; }
  }
  @media (min-width: 1280px) {
    .db-buckets { gap: 16px; }
    .db-bucket-card { padding: 1.375rem 1.5rem; }
  }
`;

function BucketIcon({ name, color }: { name: string; color: string }) {
  const p = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: color, strokeWidth: "1.8", strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  if (name === "shield") return <svg {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
  if (name === "piggy")  return <svg {...p}><path d="M19 9a7 7 0 1 0-13.33 3H4a2 2 0 0 0 0 4h1.07A7 7 0 0 0 12 20a7 7 0 0 0 6.93-4H20a2 2 0 0 0 0-4h-1.67A6.97 6.97 0 0 0 19 9z" /><path d="M12 8v4"/></svg>;
  if (name === "chart")  return <svg {...p}><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>;
  return <svg {...p}><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /><polyline points="3.27 6.96 12 12.01 20.73 6.96" /><line x1="12" y1="22.08" x2="12" y2="12" /></svg>;
}