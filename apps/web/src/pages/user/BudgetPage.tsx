"use client";

import { useEffect, useState } from "react";
import { useCycleStore } from "../../store/cycleStore";
import { useExpenseStore } from "../../store/expenseStore";
import { useFinanceStore } from "../../store/financeStore";

export default function BudgetPage() {
  const { currentCycle, fetchCurrentCycle, resetExpenses } = useCycleStore();
  const { expenses, fetchExpenses, isLoading } = useExpenseStore();
  const { profile } = useFinanceStore();
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    fetchCurrentCycle();
  }, [fetchCurrentCycle]);

  useEffect(() => {
    // Fetch all expenses - we'll filter by cycle on frontend
    fetchExpenses();
  }, [fetchExpenses]);

  const currency = profile?.currency || "PHP";

  function formatCurrency(val: number | string) {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(num);
  }

  async function handleResetExpenses() {
    setIsResetting(true);
    try {
      await resetExpenses();
      // Refresh expenses after reset
      await fetchExpenses();
    } catch (error) {
      console.error("Failed to reset expenses:", error);
    } finally {
      setIsResetting(false);
    }
  }

  if (isLoading && !currentCycle) {
    return (
      <>
        <style>{BUDGET_STYLES}</style>
        <div className="budget-root">
          <div className="budget-header">
            <h1 className="budget-title">Budget Overview</h1>
            <p className="budget-subtitle">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  if (!currentCycle) {
    return (
      <>
        <style>{BUDGET_STYLES}</style>
        <div className="budget-root">
          <div className="budget-header">
            <h1 className="budget-title">Budget Overview</h1>
            <p className="budget-subtitle">No active cycle. Add income to start tracking.</p>
          </div>
        </div>
      </>
    );
  }

  const expensesBudget = parseFloat(currentCycle.expenses_budget);
  const wantsBudget = parseFloat(currentCycle.wants_budget);
  const remainingBudget = parseFloat(currentCycle.remaining_budget);

  // Filter expenses to only include those from the current cycle
  const currentCycleExpenses = expenses.filter((e) => e.cycle === currentCycle.id);

  console.log("Budget Page - Current Cycle ID:", currentCycle.id);
  console.log("Budget Page - All Expenses:", expenses);
  console.log("Budget Page - Current Cycle Expenses:", currentCycleExpenses);

  const needsSpent = currentCycleExpenses
    .filter((e) => e.category === "needs")
    .reduce((sum, e) => {
      const amount = parseFloat(e.amount);
      return sum + amount;
    }, 0);

  const wantsSpent = currentCycleExpenses
    .filter((e) => e.category === "wants")
    .reduce((sum, e) => {
      const amount = parseFloat(e.amount);
      return sum + amount;
    }, 0);

  console.log("Budget Page - Needs spent (current cycle only):", needsSpent);
  console.log("Budget Page - Wants spent (current cycle only):", wantsSpent);

  const needsRemaining = expensesBudget - needsSpent;
  const wantsRemaining = wantsBudget - wantsSpent;

  const needsPercentage = expensesBudget > 0 ? (needsSpent / expensesBudget) * 100 : 0;
  const wantsPercentage = wantsBudget > 0 ? (wantsSpent / wantsBudget) * 100 : 0;

  const monthYear = new Date(currentCycle.month + "-01").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <style>{BUDGET_STYLES}</style>
      <div className="budget-root">
        <div className="budget-header">
          <div>
            <h1 className="budget-title">Budget Overview</h1>
            <p className="budget-subtitle">Track your spending for {monthYear}</p>
          </div>
        </div>

        <div className="budget-cards-grid">
          <div className="budget-card">
            <div className="budget-card-header">
              <div className="budget-card-icon" style={{ background: "var(--error-bg)" }}>
                <NeedsIcon color="var(--error)" />
              </div>
              <span className="budget-card-label">Needs Budget</span>
            </div>
            <div className="budget-card-body">
              <div className="budget-stat">
                <span className="budget-stat-label">Allocated</span>
                <span className="budget-stat-value">{formatCurrency(expensesBudget)}</span>
              </div>
              <div className="budget-stat">
                <span className="budget-stat-label">Spent</span>
                <span className="budget-stat-value budget-stat-spent">{formatCurrency(needsSpent)}</span>
              </div>
              <div className="budget-stat">
                <span className="budget-stat-label">Remaining</span>
                <span
                  className="budget-stat-value"
                  style={{ color: needsRemaining < 0 ? "var(--error)" : "var(--success)" }}
                >
                  {formatCurrency(needsRemaining)}
                </span>
              </div>
            </div>
            <div className="budget-progress">
              <div className="budget-progress-header">
                <span className="budget-progress-label">Usage</span>
                <span className="budget-progress-percent">{needsPercentage.toFixed(1)}%</span>
              </div>
              <div className="budget-progress-bar">
                <div
                  className="budget-progress-fill"
                  style={{
                    width: `${Math.min(needsPercentage, 100)}%`,
                    background: needsPercentage > 100 ? "var(--error)" : "var(--error)",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="budget-card">
            <div className="budget-card-header">
              <div className="budget-card-icon" style={{ background: "var(--purple-bg)" }}>
                <WantsIcon color="var(--purple-icon)" />
              </div>
              <span className="budget-card-label">Wants Budget</span>
            </div>
            <div className="budget-card-body">
              <div className="budget-stat">
                <span className="budget-stat-label">Allocated</span>
                <span className="budget-stat-value">{formatCurrency(wantsBudget)}</span>
              </div>
              <div className="budget-stat">
                <span className="budget-stat-label">Spent</span>
                <span className="budget-stat-value budget-stat-spent">{formatCurrency(wantsSpent)}</span>
              </div>
              <div className="budget-stat">
                <span className="budget-stat-label">Remaining</span>
                <span
                  className="budget-stat-value"
                  style={{ color: wantsRemaining < 0 ? "var(--error)" : "var(--success)" }}
                >
                  {formatCurrency(wantsRemaining)}
                </span>
              </div>
            </div>
            <div className="budget-progress">
              <div className="budget-progress-header">
                <span className="budget-progress-label">Usage</span>
                <span className="budget-progress-percent">{wantsPercentage.toFixed(1)}%</span>
              </div>
              <div className="budget-progress-bar">
                <div
                  className="budget-progress-fill"
                  style={{
                    width: `${Math.min(wantsPercentage, 100)}%`,
                    background: wantsPercentage > 100 ? "var(--error)" : "var(--purple-icon)",
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="budget-remaining-card">
          <div>
            <p className="budget-remaining-label">Total Remaining Budget</p>
            <p className="budget-remaining-value">{formatCurrency(remainingBudget)}</p>
            <p className="budget-remaining-sub">Available for spending this month</p>
          </div>
        </div>

        <div className="budget-expenses-card">
          <p className="budget-section-label">Recent Expenses</p>
          {currentCycleExpenses.length === 0 ? (
            <div className="budget-empty">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ color: "var(--text-3)", marginBottom: 8 }}
              >
                <rect x="2" y="5" width="20" height="14" rx="2" />
                <line x1="2" y1="10" x2="22" y2="10" />
              </svg>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                No expenses recorded for this cycle
              </p>
            </div>
          ) : (
            <div className="budget-expenses-list">
              {currentCycleExpenses.slice(0, 10).map((expense) => (
                <div className="budget-expense-item" key={expense.id}>
                  <div className="budget-expense-left">
                    <div
                      className="budget-expense-icon"
                      style={{
                        background: expense.category === "needs" ? "var(--error-bg)" : "var(--purple-bg)",
                      }}
                    >
                      {expense.category === "needs" ? (
                        <NeedsIcon color="var(--error)" />
                      ) : (
                        <WantsIcon color="var(--purple-icon)" />
                      )}
                    </div>
                    <div>
                      <p className="budget-expense-desc">{expense.description || "No description"}</p>
                      <div className="budget-expense-meta">
                        <span
                          className="budget-expense-category"
                          style={{
                            color: expense.category === "needs" ? "var(--error)" : "var(--purple-icon)",
                          }}
                        >
                          {expense.category === "needs" ? "Needs" : "Wants"}
                        </span>
                        <span className="budget-expense-date">
                          {new Date(expense.date).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="budget-expense-amount">{formatCurrency(expense.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function NeedsIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function WantsIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
      <line x1="9" y1="9" x2="9.01" y2="9" />
      <line x1="15" y1="9" x2="15.01" y2="9" />
    </svg>
  );
}

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
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .budget-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
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

  .budget-reset-btn {
    height: 36px;
    padding: 0 16px;
    background: var(--error-bg);
    color: var(--error);
    border: 0.5px solid var(--error);
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .budget-reset-btn:hover { opacity: 0.82; }
  .budget-reset-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .budget-cards-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .budget-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.25rem 1.5rem;
  }
  .budget-card-header {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 1rem;
  }
  .budget-card-icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .budget-card-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-1);
  }

  .budget-card-body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 1rem;
  }
  .budget-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .budget-stat-label {
    font-size: 12px;
    color: var(--text-3);
  }
  .budget-stat-value {
    font-size: 15px;
    font-weight: 600;
    color: var(--text-1);
  }
  .budget-stat-spent {
    color: var(--error);
  }

  .budget-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .budget-progress-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .budget-progress-label {
    font-size: 11px;
    color: var(--text-3);
  }
  .budget-progress-percent {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-2);
  }
  .budget-progress-bar {
    height: 6px;
    background: var(--bg-surface);
    border-radius: 99px;
    overflow: hidden;
  }
  .budget-progress-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s ease;
  }

  .budget-remaining-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }
  .budget-remaining-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 8px;
  }
  .budget-remaining-value {
    font-family: var(--serif);
    font-size: 32px;
    font-weight: 500;
    color: var(--success);
    letter-spacing: -0.5px;
    margin-bottom: 6px;
  }
  .budget-remaining-sub {
    font-size: 12px;
    color: var(--text-3);
  }

  .budget-expenses-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }
  .budget-section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 1rem;
  }

  .budget-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
  }

  .budget-expenses-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .budget-expense-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    gap: 1rem;
  }
  .budget-expense-left {
    display: flex;
    gap: 12px;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .budget-expense-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .budget-expense-desc {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .budget-expense-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 11px;
  }
  .budget-expense-category {
    font-weight: 500;
  }
  .budget-expense-date {
    color: var(--text-3);
  }
  .budget-expense-amount {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
    flex-shrink: 0;
  }

  @media (max-width: 768px) {
    .budget-cards-grid {
      grid-template-columns: 1fr;
    }
    .budget-title {
      font-size: 20px;
    }
  }
  @media (min-width: 1024px) {
    .budget-root {
      gap: 1.5rem;
    }
    .budget-title {
      font-size: 28px;
    }
    .budget-card {
      padding: 1.5rem 1.75rem;
    }
    .budget-remaining-card,
    .budget-expenses-card {
      padding: 1.75rem 2rem;
    }
    .budget-remaining-value {
      font-size: 36px;
    }
  }
`;
