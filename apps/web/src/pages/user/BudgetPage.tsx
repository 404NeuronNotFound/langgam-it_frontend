"use client";

import { useEffect } from "react";
import { useCycleStore } from "../../store/cycleStore";
import { useFinanceStore } from "../../store/financeStore";

// ------------------------------------------------------------------
// Langgam-It — Budget Page
// Display expenses_budget vs wants_budget with progress bars
// ------------------------------------------------------------------

export default function BudgetPage() {
  const { currentCycle, fetchCurrentCycle } = useCycleStore();
  const { profile } = useFinanceStore();

  useEffect(() => {
    fetchCurrentCycle();
  }, [fetchCurrentCycle]);

  const currency = profile?.currency || "PHP";

  function formatCurrency(val: number | string) {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(num);
  }

  if (!currentCycle) {
    return (
      <>
        <style>{BUDGET_STYLES}</style>
        <div className="budget-root">
          <div className="budget-header">
            <h1 className="budget-title">Budget</h1>
            <p className="budget-subtitle">
              No active cycle found. Add income to start tracking your budget.
            </p>
          </div>
        </div>
      </>
    );
  }

  const income = parseFloat(currentCycle.income);
  const expensesBudget = parseFloat(currentCycle.expenses_budget);
  const wantsBudget = parseFloat(currentCycle.wants_budget);
  const remaining = parseFloat(currentCycle.remaining_budget);

  // Calculate spent (for demo, assuming 0 spent - you can track this separately)
  const expensesSpent = 0;
  const wantsSpent = 0;

  const expensesRemaining = expensesBudget - expensesSpent;
  const wantsRemaining = wantsBudget - wantsSpent;

  const expensesPct = expensesBudget > 0 ? (expensesSpent / expensesBudget) * 100 : 0;
  const wantsPct = wantsBudget > 0 ? (wantsSpent / wantsBudget) * 100 : 0;

  const cycleMonth = new Date(currentCycle.month + "-01").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <style>{BUDGET_STYLES}</style>
      <div className="budget-root">
        <div className="budget-header">
          <div>
            <h1 className="budget-title">Budget</h1>
            <p className="budget-subtitle">Track your spending for {cycleMonth}</p>
          </div>
          <span className="budget-status-badge">{currentCycle.status}</span>
        </div>

        {/* Overview card */}
        <div className="budget-overview-card">
          <div className="budget-overview-item">
            <p className="budget-overview-label">Total Income</p>
            <p className="budget-overview-value">{formatCurrency(income)}</p>
          </div>
          <div className="budget-overview-divider" />
          <div className="budget-overview-item">
            <p className="budget-overview-label">Total Budget</p>
            <p className="budget-overview-value">{formatCurrency(expensesBudget + wantsBudget)}</p>
          </div>
          <div className="budget-overview-divider" />
          <div className="budget-overview-item">
            <p className="budget-overview-label">Remaining</p>
            <p className="budget-overview-value budget-overview-value-success">
              {formatCurrency(remaining)}
            </p>
          </div>
        </div>

        {/* Expenses budget */}
        <div className="budget-card">
          <div className="budget-card-header">
            <div className="budget-card-icon" style={{ background: "var(--error-bg)" }}>
              <ExpenseIcon color="var(--error)" />
            </div>
            <div className="budget-card-header-text">
              <h2 className="budget-card-title">Expenses Budget</h2>
              <p className="budget-card-subtitle">Essential spending (rent, utilities, food)</p>
            </div>
          </div>

          <div className="budget-amounts">
            <div className="budget-amount-item">
              <span className="budget-amount-label">Allocated</span>
              <span className="budget-amount-value">{formatCurrency(expensesBudget)}</span>
            </div>
            <div className="budget-amount-item">
              <span className="budget-amount-label">Spent</span>
              <span className="budget-amount-value budget-amount-value-spent">
                {formatCurrency(expensesSpent)}
              </span>
            </div>
            <div className="budget-amount-item">
              <span className="budget-amount-label">Remaining</span>
              <span className="budget-amount-value budget-amount-value-remaining">
                {formatCurrency(expensesRemaining)}
              </span>
            </div>
          </div>

          <div className="budget-progress">
            <div className="budget-progress-bar">
              <div
                className="budget-progress-fill budget-progress-fill-expenses"
                style={{ width: `${Math.min(expensesPct, 100)}%` }}
              />
            </div>
            <p className="budget-progress-text">
              {expensesPct.toFixed(1)}% used
            </p>
          </div>
        </div>

        {/* Wants budget */}
        <div className="budget-card">
          <div className="budget-card-header">
            <div className="budget-card-icon" style={{ background: "var(--purple-bg)" }}>
              <WantIcon color="var(--purple-icon)" />
            </div>
            <div className="budget-card-header-text">
              <h2 className="budget-card-title">Wants Budget</h2>
              <p className="budget-card-subtitle">Discretionary spending (entertainment, dining out)</p>
            </div>
          </div>

          <div className="budget-amounts">
            <div className="budget-amount-item">
              <span className="budget-amount-label">Allocated</span>
              <span className="budget-amount-value">{formatCurrency(wantsBudget)}</span>
            </div>
            <div className="budget-amount-item">
              <span className="budget-amount-label">Spent</span>
              <span className="budget-amount-value budget-amount-value-spent">
                {formatCurrency(wantsSpent)}
              </span>
            </div>
            <div className="budget-amount-item">
              <span className="budget-amount-label">Remaining</span>
              <span className="budget-amount-value budget-amount-value-remaining">
                {formatCurrency(wantsRemaining)}
              </span>
            </div>
          </div>

          <div className="budget-progress">
            <div className="budget-progress-bar">
              <div
                className="budget-progress-fill budget-progress-fill-wants"
                style={{ width: `${Math.min(wantsPct, 100)}%` }}
              />
            </div>
            <p className="budget-progress-text">
              {wantsPct.toFixed(1)}% used
            </p>
          </div>
        </div>

        {/* Info card */}
        <div className="budget-info-card">
          <div className="budget-info-icon">ℹ️</div>
          <div>
            <p className="budget-info-title">Budget Allocation</p>
            <p className="budget-info-text">
              Your budgets are automatically calculated when you submit income. Expenses budget covers essential needs, while wants budget is for discretionary spending.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────

function ExpenseIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function WantIcon({ color }: { color: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────

const BUDGET_STYLES = `
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
    --error:      #993C1D;
    --error-bg:   #FAECE7;
    --success:    #3B6D11;
    --success-bg: #EAF3DE;
    --purple-bg:  #EEEDFE;
    --purple-icon:#534AB7;
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
      --success:    #97C459;
      --success-bg: #173404;
      --purple-bg:  #26215C;
      --purple-icon:#AFA9EC;
    }
  }

  .budget-root {
    font-family: var(--sans);
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Header */
  .budget-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
    gap: 1rem;
  }
  .budget-title {
    font-family: var(--serif);
    font-size: 24px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }
  .budget-subtitle {
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.6;
  }
  .budget-status-badge {
    font-size: 11px;
    font-weight: 500;
    padding: 5px 12px;
    background: var(--success-bg);
    color: var(--success);
    border-radius: 99px;
    text-transform: capitalize;
    flex-shrink: 0;
  }

  /* Overview card */
  .budget-overview-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }
  .budget-overview-item {
    flex: 1;
    text-align: center;
  }
  .budget-overview-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 6px;
  }
  .budget-overview-value {
    font-family: var(--serif);
    font-size: 22px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.3px;
  }
  .budget-overview-value-success {
    color: var(--success);
  }
  .budget-overview-divider {
    width: 0.5px;
    height: 40px;
    background: var(--border);
  }

  /* Budget card */
  .budget-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }
  .budget-card-header {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }
  .budget-card-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .budget-card-header-text {
    flex: 1;
  }
  .budget-card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 3px;
  }
  .budget-card-subtitle {
    font-size: 12px;
    color: var(--text-3);
    line-height: 1.5;
  }

  /* Amounts */
  .budget-amounts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
    margin-bottom: 1.25rem;
    padding-bottom: 1.25rem;
    border-bottom: 0.5px solid var(--border);
  }
  .budget-amount-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .budget-amount-label {
    font-size: 11px;
    color: var(--text-3);
  }
  .budget-amount-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
  }
  .budget-amount-value-spent {
    color: var(--error);
  }
  .budget-amount-value-remaining {
    color: var(--success);
  }

  /* Progress */
  .budget-progress {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .budget-progress-bar {
    flex: 1;
    height: 8px;
    background: var(--bg-surface);
    border-radius: 99px;
    overflow: hidden;
  }
  .budget-progress-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s ease;
  }
  .budget-progress-fill-expenses {
    background: var(--error);
  }
  .budget-progress-fill-wants {
    background: var(--purple-icon);
  }
  .budget-progress-text {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-2);
    flex-shrink: 0;
    min-width: 60px;
    text-align: right;
  }

  /* Info card */
  .budget-info-card {
    background: var(--bg-surface);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1rem 1.25rem;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .budget-info-icon {
    font-size: 18px;
    flex-shrink: 0;
  }
  .budget-info-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 3px;
  }
  .budget-info-text {
    font-size: 12px;
    color: var(--text-2);
    line-height: 1.6;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .budget-overview-card {
      flex-direction: column;
      gap: 1rem;
    }
    .budget-overview-divider {
      width: 100%;
      height: 0.5px;
    }
    .budget-amounts {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
  }
  @media (min-width: 768px) {
    .budget-root {
      gap: 1.5rem;
    }
    .budget-overview-card,
    .budget-card,
    .budget-info-card {
      padding: 1.75rem 2rem;
    }
  }
  @media (min-width: 1024px) {
    .budget-root {
      max-width: 1100px;
      gap: 1.75rem;
    }
    .budget-title {
      font-size: 28px;
    }
    .budget-subtitle {
      font-size: 14px;
    }
    .budget-overview-card,
    .budget-card {
      padding: 2rem 2.25rem;
    }
    .budget-overview-value {
      font-size: 26px;
    }
    .budget-card-title {
      font-size: 18px;
    }
  }
  @media (min-width: 1280px) {
    .budget-root {
      max-width: 1200px;
    }
    .budget-amounts {
      gap: 1.5rem;
    }
  }
`;
