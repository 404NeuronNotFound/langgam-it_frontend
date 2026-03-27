"use client";

import { useState, useEffect } from "react";
import { useCycleStore } from "../../store/cycleStore";
import { useFinanceStore } from "../../store/financeStore";

// ------------------------------------------------------------------
// Langgam-It — Income Page
// Submit income and preview allocation before confirming
// ------------------------------------------------------------------

export default function IncomePage() {
  const { currentCycle, addIncome, fetchCurrentCycle, lastAllocationResult } = useCycleStore();
  const { profile } = useFinanceStore();
  
  const [incomeInput, setIncomeInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showResult, setShowResult] = useState(false);

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (value !== "" && !/^\d*\.?\d{0,2}$/.test(value)) return;
    setIncomeInput(value);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const amount = parseFloat(incomeInput);
    if (!amount || amount <= 0) {
      setError("Please enter a valid income amount.");
      return;
    }

    setIsLoading(true);
    setError("");
    
    try {
      console.log("Submitting income:", { amount });
      const result = await addIncome(amount);
      console.log("Income submission result:", result);
      
      // Check if result has the expected structure
      if (!result || !result.cycle) {
        console.error("Unexpected response structure:", result);
        setError("Received unexpected response from server. Check console for details.");
        return;
      }
      
      setShowResult(true);
      setIncomeInput("");
    } catch (err: any) {
      console.error("Income submission error:", err);
      console.error("Error response:", err.response);
      console.error("Error data:", err.response?.data);
      console.error("Error status:", err.response?.status);
      
      let errorMessage = "Failed to submit income. ";
      
      if (err.response?.status === 404) {
        errorMessage += "Endpoint not found. Check if /api/income/ exists.";
      } else if (err.response?.status === 400) {
        errorMessage += err.response?.data?.detail || err.response?.data?.message || "Invalid request data.";
      } else if (err.response?.status === 500) {
        errorMessage += "Server error. Check backend logs.";
      } else if (err.response?.data?.detail) {
        errorMessage += err.response.data.detail;
      } else if (err.response?.data?.message) {
        errorMessage += err.response.data.message;
      } else if (err.message) {
        errorMessage += err.message;
      } else {
        errorMessage += "Unknown error occurred.";
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  function handleNewIncome() {
    setShowResult(false);
  }

  // Show allocation result
  if (showResult && lastAllocationResult && lastAllocationResult.logs) {
    const { cycle, logs, survival_mode } = lastAllocationResult;
    
    return (
      <>
        <style>{INCOME_STYLES}</style>
        <div className="income-root">
          <div className="income-header">
            <h1 className="income-title">Allocation Complete</h1>
            <p className="income-subtitle">
              Your income has been allocated across your financial buckets.
            </p>
          </div>

          {survival_mode && (
            <div className="income-survival-alert">
              <div className="income-survival-icon">⚠️</div>
              <div>
                <p className="income-survival-title">Survival Mode Activated</p>
                <p className="income-survival-text">
                  No income detected. Emergency fund is being used for essential expenses.
                </p>
              </div>
            </div>
          )}

          <div className="income-result-card">
            <div className="income-result-header">
              <div>
                <p className="income-result-label">Total Income</p>
                <p className="income-result-value">{formatCurrency(cycle.income)}</p>
              </div>
              <div className="income-result-status">
                <span className="income-status-badge">{cycle.status}</span>
              </div>
            </div>

            <div className="income-result-grid">
              <div className="income-result-item">
                <span className="income-result-item-label">Expenses Budget</span>
                <span className="income-result-item-value">{formatCurrency(cycle.expenses_budget)}</span>
              </div>
              <div className="income-result-item">
                <span className="income-result-item-label">Wants Budget</span>
                <span className="income-result-item-value">{formatCurrency(cycle.wants_budget)}</span>
              </div>
              <div className="income-result-item">
                <span className="income-result-item-label">Remaining</span>
                <span className="income-result-item-value">{formatCurrency(cycle.remaining_budget)}</span>
              </div>
            </div>
          </div>

          {logs && logs.length > 0 && (
            <div className="income-logs-card">
              <p className="income-section-label">Allocation Breakdown</p>
              <div className="income-logs-list">
                {logs.map((log) => (
                  <div className="income-log-item" key={log.id}>
                    <div className="income-log-left">
                      <div className="income-log-arrow">→</div>
                      <div>
                        <p className="income-log-route">
                          <span className="income-log-from">{log.from_bucket}</span>
                          {" → "}
                          <span className="income-log-to">{log.to_bucket}</span>
                        </p>
                        <p className="income-log-time">
                          {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <span className="income-log-amount">{formatCurrency(log.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button className="income-btn-secondary" onClick={handleNewIncome}>
            Add More Income
          </button>
        </div>
      </>
    );
  }

  // Show income input form
  return (
    <>
      <style>{INCOME_STYLES}</style>
      <div className="income-root">
        <div className="income-header">
          <h1 className="income-title">Add Income</h1>
          <p className="income-subtitle">
            Enter your income amount. The allocation engine will automatically distribute it across your financial buckets.
          </p>
        </div>

        {currentCycle ? (
          <div className="income-current-card">
            <div className="income-current-header">
              <p className="income-current-label">Current Cycle</p>
              <span className="income-status-badge">{currentCycle.status}</span>
            </div>
            <p className="income-current-month">
              {new Date(currentCycle.month + "-01").toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <div className="income-current-grid">
              <div>
                <p className="income-current-item-label">Total Income</p>
                <p className="income-current-item-value">{formatCurrency(currentCycle.income)}</p>
              </div>
              <div>
                <p className="income-current-item-label">Expenses Budget</p>
                <p className="income-current-item-value">{formatCurrency(currentCycle.expenses_budget)}</p>
              </div>
              <div>
                <p className="income-current-item-label">Wants Budget</p>
                <p className="income-current-item-value">{formatCurrency(currentCycle.wants_budget)}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="income-info-card">
            <div className="income-info-icon">💡</div>
            <div>
              <p className="income-info-title">No Active Cycle</p>
              <p className="income-info-text">
                Submit your first income to create a new monthly cycle and start tracking your budget.
              </p>
            </div>
          </div>
        )}

        <form className="income-form-card" onSubmit={handleSubmit}>
          <div className="income-field">
            <label className="income-label" htmlFor="income-amount">
              Income Amount
            </label>
            <p className="income-field-desc">
              Enter the amount you received. This will trigger the allocation engine.
            </p>
            <div className="income-input-wrap">
              <span className="income-currency">₱</span>
              <input
                id="income-amount"
                className={`income-input${error ? " income-input-error" : ""}`}
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={incomeInput}
                onChange={handleChange}
                autoComplete="off"
                disabled={isLoading}
              />
            </div>
            {error && <span className="income-error-msg">{error}</span>}
            {error && (
              <div className="income-error-details">
                <p style={{ fontSize: "11px", color: "var(--text-3)", marginTop: "4px" }}>
                  Check browser console for details. Make sure the backend endpoint <code>/api/income/</code> is implemented.
                </p>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="income-btn-primary"
            disabled={isLoading || !incomeInput}
          >
            {isLoading ? <span className="income-spinner" /> : "Submit Income"}
          </button>

          <p className="income-hint">
            The allocation engine will fill your emergency fund, rigs fund, savings, and set your spendable budgets automatically.
          </p>
        </form>
      </div>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────

const INCOME_STYLES = `
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
    --success-bg: #EAF3DE;
    --success:    #3B6D11;
    --warning-bg: #FAEEDA;
    --warning:    #854F0B;
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
      --success-bg: #173404;
      --success:    #97C459;
      --warning-bg: #412402;
      --warning:    #EF9F27;
    }
  }

  .income-root {
    font-family: var(--sans);
    max-width: 700px;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* Header */
  .income-header { margin-bottom: 0.5rem; }
  .income-title {
    font-family: var(--serif);
    font-size: 24px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }
  .income-subtitle { font-size: 13px; color: var(--text-2); line-height: 1.6; }

  /* Current cycle card */
  .income-current-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.25rem 1.5rem;
  }
  .income-current-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
  }
  .income-current-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
  }
  .income-current-month {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 1rem;
  }
  .income-current-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  .income-current-item-label {
    font-size: 11px;
    color: var(--text-3);
    margin-bottom: 4px;
  }
  .income-current-item-value {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-1);
  }

  /* Form card */
  .income-form-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }

  .income-field { margin-bottom: 1.5rem; }
  .income-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-1);
    display: block;
    margin-bottom: 4px;
  }
  .income-field-desc {
    font-size: 12px;
    color: var(--text-3);
    margin-bottom: 10px;
    line-height: 1.5;
  }

  .income-input-wrap { position: relative; display: flex; align-items: center; }
  .income-currency {
    position: absolute;
    left: 14px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-2);
    pointer-events: none;
  }
  .income-input {
    width: 100%;
    height: 44px;
    padding: 0 14px 0 32px;
    font-family: var(--sans);
    font-size: 15px;
    color: var(--text-1);
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .income-input::placeholder { color: var(--text-3); }
  .income-input:focus {
    border-color: var(--text-2);
    box-shadow: 0 0 0 3px rgba(100,100,100,0.08);
  }
  .income-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .income-input-error { border-color: var(--error) !important; }
  .income-error-msg {
    font-size: 11px;
    color: var(--error);
    margin-top: 6px;
    display: block;
  }

  .income-btn-primary {
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
    margin-bottom: 12px;
  }
  .income-btn-primary:hover { opacity: 0.82; }
  .income-btn-primary:active { transform: scale(0.99); }
  .income-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .income-btn-secondary {
    width: 100%;
    height: 44px;
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .income-btn-secondary:hover { opacity: 0.82; }

  .income-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: income-spin 0.7s linear infinite;
  }
  @keyframes income-spin { to { transform: rotate(360deg); } }

  .income-hint {
    font-size: 12px;
    color: var(--text-3);
    text-align: center;
    line-height: 1.5;
  }

  /* Info card */
  .income-info-card {
    background: var(--bg-surface);
    border: 0.5px solid var(--border);
    border-radius: var(--radius-md);
    padding: 1rem 1.25rem;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .income-info-icon {
    font-size: 18px;
    flex-shrink: 0;
  }
  .income-info-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 3px;
  }
  .income-info-text {
    font-size: 12px;
    color: var(--text-2);
    line-height: 1.6;
  }

  /* Result cards */
  .income-survival-alert {
    background: var(--warning-bg);
    border: 0.5px solid var(--warning);
    border-radius: var(--radius-md);
    padding: 1rem 1.25rem;
    display: flex;
    gap: 12px;
    align-items: flex-start;
  }
  .income-survival-icon { font-size: 20px; }
  .income-survival-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--warning);
    margin-bottom: 3px;
  }
  .income-survival-text {
    font-size: 12px;
    color: var(--text-2);
    line-height: 1.5;
  }

  .income-result-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }
  .income-result-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
    padding-bottom: 1.25rem;
    border-bottom: 0.5px solid var(--border);
  }
  .income-result-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 6px;
  }
  .income-result-value {
    font-family: var(--serif);
    font-size: 28px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.4px;
  }
  .income-status-badge {
    font-size: 11px;
    font-weight: 500;
    padding: 4px 10px;
    background: var(--success-bg);
    color: var(--success);
    border-radius: 99px;
    text-transform: capitalize;
  }

  .income-result-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  .income-result-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .income-result-item-label {
    font-size: 11px;
    color: var(--text-3);
  }
  .income-result-item-value {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-1);
  }

  /* Logs */
  .income-logs-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }
  .income-section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 1rem;
  }
  .income-logs-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .income-log-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
  }
  .income-log-left {
    display: flex;
    gap: 10px;
    align-items: center;
    flex: 1;
  }
  .income-log-arrow {
    width: 24px;
    height: 24px;
    background: var(--bg-card);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    color: var(--text-2);
    flex-shrink: 0;
  }
  .income-log-route {
    font-size: 13px;
    color: var(--text-1);
    margin-bottom: 2px;
  }
  .income-log-from { font-weight: 500; }
  .income-log-to { font-weight: 500; color: var(--success); }
  .income-log-time {
    font-size: 11px;
    color: var(--text-3);
  }
  .income-log-amount {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-1);
  }

  /* Responsive */
  @media (max-width: 640px) {
    .income-current-grid,
    .income-result-grid {
      grid-template-columns: 1fr;
      gap: 0.75rem;
    }
  }
`;
