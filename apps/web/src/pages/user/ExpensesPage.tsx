"use client";

import { useState, useEffect } from "react";
import { useExpenseStore } from "../../store/expenseStore";
import { useCycleStore } from "../../store/cycleStore";
import { useFinanceStore } from "../../store/financeStore";

// ------------------------------------------------------------------
// Langgam-It — Expenses Page
// Add expense form + today's transaction list
// Daily limit calculation and budget tracking
// ------------------------------------------------------------------

export default function ExpensesPage() {
  const { currentCycle, fetchCurrentCycle } = useCycleStore();
  const { profile } = useFinanceStore();
  const {
    todayExpenses,
    dailyLimit,
    fetchTodayExpenses,
    fetchDailyLimit,
    addExpense,
    isLoading: storeLoading,
  } = useExpenseStore();

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<"needs" | "wants">("needs");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchCurrentCycle();
    fetchTodayExpenses();
    fetchDailyLimit();
  }, [fetchCurrentCycle, fetchTodayExpenses, fetchDailyLimit]);

  const currency = profile?.currency || "PHP";

  function formatCurrency(val: number | string) {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
    }).format(num);
  }

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (value !== "" && !/^\d*\.?\d{0,2}$/.test(value)) return;
    setAmount(value);
    setError("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (!description.trim()) {
      setError("Please add a description.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    addExpense({
      amount: amountNum,
      category,
      description: description.trim(),
    })
      .then(() => {
        setAmount("");
        setDescription("");
        setCategory("needs");
      })
      .catch((err) => {
        console.error("Failed to add expense:", err);
        console.error("Error response data:", err.response?.data);
        console.error("Error status:", err.response?.status);
        
        // Extract error message from backend
        let errorMsg = "Failed to add expense. ";
        if (err.response?.data) {
          const data = err.response.data;
          if (typeof data === 'string') {
            errorMsg += data;
          } else if (data.detail) {
            errorMsg += data.detail;
          } else if (data.message) {
            errorMsg += data.message;
          } else if (data.error) {
            errorMsg += data.error;
          } else {
            // Show all field errors
            const fieldErrors = Object.entries(data)
              .map(([field, msgs]) => `${field}: ${Array.isArray(msgs) ? msgs.join(', ') : msgs}`)
              .join('; ');
            errorMsg += fieldErrors || "Please check your input.";
          }
        } else {
          errorMsg += err.message || "Please try again.";
        }
        
        setError(errorMsg);
      })
      .finally(() => {
        setIsSubmitting(false);
      });
  }

  // Calculate today's total and remaining
  const todayTotal = todayExpenses.reduce(
    (sum, exp) => sum + parseFloat(exp.amount),
    0
  );

  const dailyLimitAmount = dailyLimit ? parseFloat(dailyLimit.daily_limit) : 0;
  const remainingToday = dailyLimit 
    ? parseFloat(dailyLimit.remaining_today)
    : dailyLimitAmount - todayTotal;
  const usagePercent = dailyLimitAmount > 0 ? (todayTotal / dailyLimitAmount) * 100 : 0;

  // Show loading state while fetching initial data
  if (storeLoading && !dailyLimit && todayExpenses.length === 0) {
    return (
      <>
        <style>{EXPENSES_STYLES}</style>
        <div className="exp-root">
          <div className="exp-header">
            <h1 className="exp-title">Expenses</h1>
            <p className="exp-subtitle">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  // Show message if no cycle exists AND no cash on hand
  const cashOnHand = profile ? parseFloat(profile.cash_on_hand) : 0;
  
  if (!currentCycle && !storeLoading && cashOnHand === 0) {
    return (
      <>
        <style>{EXPENSES_STYLES}</style>
        <div className="exp-root">
          <div className="exp-header">
            <h1 className="exp-title">Expenses</h1>
            <p className="exp-subtitle">No active cycle and no cash on hand. Add income or cash to start tracking expenses.</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{EXPENSES_STYLES}</style>
      <div className="exp-root">
        <div className="exp-header">
          <div>
            <h1 className="exp-title">Expenses</h1>
            <p className="exp-subtitle">Track your daily spending and stay within budget</p>
          </div>
        </div>

        {/* Daily limit card */}
        <div className="exp-daily-card">
          <div className="exp-daily-header">
            <div>
              <p className="exp-daily-label">Daily Limit</p>
              <p className="exp-daily-value">{formatCurrency(dailyLimitAmount)}</p>
              <p className="exp-daily-sub">
                {dailyLimit?.remaining_days || 0} days remaining in cycle
              </p>
            </div>
            <div className="exp-daily-remaining">
              <p className="exp-daily-remaining-label">Remaining Today</p>
              <p
                className="exp-daily-remaining-value"
                style={{
                  color: remainingToday >= 0 ? "var(--success)" : "var(--error)",
                }}
              >
                {formatCurrency(remainingToday)}
              </p>
            </div>
          </div>

          <div className="exp-daily-progress">
            <div className="exp-daily-progress-bar">
              <div
                className="exp-daily-progress-fill"
                style={{
                  width: `${Math.min(usagePercent, 100)}%`,
                  background:
                    usagePercent > 100
                      ? "var(--error)"
                      : usagePercent > 80
                      ? "var(--warning)"
                      : "var(--success)",
                }}
              />
            </div>
            <p className="exp-daily-progress-text">
              {formatCurrency(todayTotal)} spent today ({usagePercent.toFixed(0)}%)
            </p>
          </div>
        </div>

        {/* Add expense form */}
        <form className="exp-form-card" onSubmit={handleSubmit}>
          <p className="exp-section-label">Add Expense</p>

          <div className="exp-form-grid">
            {/* Amount */}
            <div className="exp-field">
              <label className="exp-label" htmlFor="exp-amount">
                Amount
              </label>
              <div className="exp-input-wrap">
                <span className="exp-currency">₱</span>
                <input
                  id="exp-amount"
                  className={`exp-input${error && !description ? " exp-input-error" : ""}`}
                  type="text"
                  inputMode="decimal"
                  placeholder="0.00"
                  value={amount}
                  onChange={handleAmountChange}
                  autoComplete="off"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Category */}
            <div className="exp-field">
              <label className="exp-label" htmlFor="exp-category">
                Category
              </label>
              <select
                id="exp-category"
                className="exp-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as "needs" | "wants")}
                disabled={isSubmitting}
              >
                <option value="needs">Needs (Essential)</option>
                <option value="wants">Wants (Discretionary)</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="exp-field">
            <label className="exp-label" htmlFor="exp-description">
              Description
            </label>
            <input
              id="exp-description"
              className={`exp-input${error && !amount ? " exp-input-error" : ""}`}
              type="text"
              placeholder="What did you spend on?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              autoComplete="off"
              disabled={isSubmitting}
            />
          </div>

          {error && <span className="exp-error-msg">{error}</span>}

          <button type="submit" className="exp-btn-primary" disabled={isSubmitting}>
            {isSubmitting ? <span className="exp-spinner" /> : "Add Expense"}
          </button>
        </form>

        {/* Today's transactions */}
        <div className="exp-transactions-card">
          <div className="exp-transactions-header">
            <div>
              <p className="exp-section-label">Today's Transactions</p>
              <p className="exp-transactions-date">
                {new Date().toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
            <div className="exp-transactions-total">
              <span className="exp-transactions-total-label">Total</span>
              <span className="exp-transactions-total-value">
                {formatCurrency(todayTotal)}
              </span>
            </div>
          </div>

          {todayExpenses.length === 0 ? (
            <div className="exp-empty">
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
                No expenses recorded today
              </p>
            </div>
          ) : (
            <div className="exp-list">
              {todayExpenses.map((expense) => (
                <div className="exp-item" key={expense.id}>
                  <div className="exp-item-left">
                    <div
                      className="exp-item-icon"
                      style={{
                        background:
                          expense.category === "needs"
                            ? "var(--error-bg)"
                            : "var(--purple-bg)",
                      }}
                    >
                      {expense.category === "needs" ? (
                        <NeedsIcon color="var(--error)" />
                      ) : (
                        <WantsIcon color="var(--purple-icon)" />
                      )}
                    </div>
                    <div>
                      <p className="exp-item-desc">{expense.description}</p>
                      <div className="exp-item-meta">
                        <span
                          className="exp-item-category"
                          style={{
                            color:
                              expense.category === "needs"
                                ? "var(--error)"
                                : "var(--purple-icon)",
                          }}
                        >
                          {expense.category === "needs" ? "Needs" : "Wants"}
                        </span>
                        <span className="exp-item-time">
                          {new Date(expense.date).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className="exp-item-amount">
                    {formatCurrency(expense.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Budget summary */}
        <div className="exp-summary-card">
          <p className="exp-section-label">Budget Summary</p>
          <div className="exp-summary-grid">
            <div className="exp-summary-item">
              <span className="exp-summary-label">Expenses Budget</span>
              <span className="exp-summary-value">
                {formatCurrency(currentCycle?.expenses_budget || "0")}
              </span>
            </div>
            <div className="exp-summary-item">
              <span className="exp-summary-label">Wants Budget</span>
              <span className="exp-summary-value">
                {formatCurrency(currentCycle?.wants_budget || "0")}
              </span>
            </div>
            <div className="exp-summary-item">
              <span className="exp-summary-label">Remaining Budget</span>
              <span className="exp-summary-value exp-summary-value-highlight">
                {formatCurrency(currentCycle?.remaining_budget || "0")}
              </span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Icons
// ─────────────────────────────────────────────────────────────────────

function NeedsIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <line x1="2" y1="10" x2="22" y2="10" />
    </svg>
  );
}

function WantsIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
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

const EXPENSES_STYLES = `
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
    --warning:    #854F0B;
    --warning-bg: #FAEEDA;
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
      --warning:    #EF9F27;
      --warning-bg: #412402;
      --purple-bg:  #26215C;
      --purple-icon:#AFA9EC;
    }
  }

  .exp-root {
    font-family: var(--sans);
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Header */
  .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 0.5rem;
  }
  .exp-title {
    font-family: var(--serif);
    font-size: 24px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }
  .exp-subtitle {
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.6;
  }

  /* Daily limit card */
  .exp-daily-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }
  .exp-daily-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
    gap: 1rem;
  }
  .exp-daily-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 6px;
  }
  .exp-daily-value {
    font-family: var(--serif);
    font-size: 28px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }
  .exp-daily-sub {
    font-size: 12px;
    color: var(--text-3);
  }
  .exp-daily-remaining {
    text-align: right;
  }
  .exp-daily-remaining-label {
    font-size: 11px;
    color: var(--text-3);
    margin-bottom: 4px;
  }
  .exp-daily-remaining-value {
    font-size: 20px;
    font-weight: 600;
    letter-spacing: -0.3px;
  }

  .exp-daily-progress {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .exp-daily-progress-bar {
    height: 8px;
    background: var(--bg-surface);
    border-radius: 99px;
    overflow: hidden;
  }
  .exp-daily-progress-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s ease, background 0.3s ease;
  }
  .exp-daily-progress-text {
    font-size: 12px;
    color: var(--text-2);
  }

  /* Form card */
  .exp-form-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }
  .exp-section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 1rem;
  }

  .exp-form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .exp-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .exp-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-1);
  }

  .exp-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }
  .exp-currency {
    position: absolute;
    left: 14px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-2);
    pointer-events: none;
  }
  .exp-input {
    width: 100%;
    height: 44px;
    padding: 0 14px;
    font-family: var(--sans);
    font-size: 14px;
    color: var(--text-1);
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .exp-input-wrap .exp-input {
    padding-left: 32px;
  }
  .exp-input::placeholder {
    color: var(--text-3);
  }
  .exp-input:focus {
    border-color: var(--text-2);
    box-shadow: 0 0 0 3px rgba(100,100,100,0.08);
  }
  .exp-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .exp-input-error {
    border-color: var(--error) !important;
  }

  .exp-select {
    width: 100%;
    height: 44px;
    padding: 0 14px;
    font-family: var(--sans);
    font-size: 14px;
    color: var(--text-1);
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    outline: none;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .exp-select:focus {
    border-color: var(--text-2);
    box-shadow: 0 0 0 3px rgba(100,100,100,0.08);
  }
  .exp-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .exp-error-msg {
    font-size: 11px;
    color: var(--error);
    margin-bottom: 12px;
  }

  .exp-btn-primary {
    width: 100%;
    height: 44px;
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.15s, transform 0.1s;
    margin-top: 12px
  }
  .exp-btn-primary:hover {
    opacity: 0.82;
  }
  .exp-btn-primary:active {
    transform: scale(0.99);
  }
  .exp-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .exp-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: exp-spin 0.7s linear infinite;
  }
  @keyframes exp-spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Transactions card */
  .exp-transactions-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }
  .exp-transactions-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
    gap: 1rem;
  }
  .exp-transactions-date {
    font-size: 13px;
    color: var(--text-2);
    margin-top: 4px;
  }
  .exp-transactions-total {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }
  .exp-transactions-total-label {
    font-size: 11px;
    color: var(--text-3);
  }
  .exp-transactions-total-value {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1);
  }

  .exp-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
  }

  .exp-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .exp-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    gap: 1rem;
  }
  .exp-item-left {
    display: flex;
    gap: 12px;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .exp-item-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .exp-item-desc {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .exp-item-meta {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 11px;
  }
  .exp-item-category {
    font-weight: 500;
  }
  .exp-item-time {
    color: var(--text-3);
  }
  .exp-item-amount {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
    flex-shrink: 0;
  }

  /* Summary card */
  .exp-summary-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }
  .exp-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  .exp-summary-item {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .exp-summary-label {
    font-size: 11px;
    color: var(--text-3);
  }
  .exp-summary-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
  }
  .exp-summary-value-highlight {
    color: var(--success);
  }

  /* Responsive */
  @media (max-width: 640px) {
    .exp-form-grid {
      grid-template-columns: 1fr;
    }
    .exp-daily-header {
      flex-direction: column;
    }
    .exp-daily-remaining {
      text-align: left;
    }
    .exp-summary-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
  }
  @media (min-width: 768px) {
    .exp-root {
      gap: 1.5rem;
    }
    .exp-daily-card,
    .exp-form-card,
    .exp-transactions-card,
    .exp-summary-card {
      padding: 1.75rem 2rem;
    }
  }
  @media (min-width: 1024px) {
    .exp-root {
      max-width: 1100px;
      gap: 1.75rem;
    }
    .exp-title {
      font-size: 28px;
    }
    .exp-subtitle {
      font-size: 14px;
    }
    .exp-daily-card,
    .exp-form-card,
    .exp-transactions-card,
    .exp-summary-card {
      padding: 2rem 2.25rem;
    }
    .exp-daily-value {
      font-size: 32px;
    }
  }
  @media (min-width: 1280px) {
    .exp-root {
      max-width: 1200px;
    }
  }
`;
