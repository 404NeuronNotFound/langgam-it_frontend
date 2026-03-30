"use client";

import { useState } from "react";

interface EndOfMonthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  cycleData?: {
    month: string;
    income: string;
    expenses_budget: string;
    wants_budget: string;
    remaining_budget: string;
    needs_spent: number;
    wants_spent: number;
    unspent_total: number;
  };
}

export default function EndOfMonthModal({
  isOpen,
  onClose,
  onConfirm,
  cycleData,
}: EndOfMonthModalProps) {
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen || !cycleData) return null;

  function formatCurrency(val: number | string) {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(num);
  }

  async function handleConfirm() {
    setIsConfirming(true);
    try {
      await onConfirm();
    } finally {
      setIsConfirming(false);
    }
  }

  const monthYear = new Date(cycleData.month + "-01").toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const needsRemaining = parseFloat(cycleData.expenses_budget) - cycleData.needs_spent;
  const wantsRemaining = parseFloat(cycleData.wants_budget) - cycleData.wants_spent;

  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div className="eom-overlay" onClick={onClose}>
        <div className="eom-modal" onClick={(e) => e.stopPropagation()}>
          <div className="eom-header">
            <div>
              <h2 className="eom-title">End of Month Summary</h2>
              <p className="eom-subtitle">{monthYear}</p>
            </div>
            <button className="eom-close-btn" onClick={onClose}>
              ×
            </button>
          </div>

          <div className="eom-body">
            {/* Income Summary */}
            <div className="eom-section">
              <p className="eom-section-label">Income</p>
              <div className="eom-stat-row">
                <span className="eom-stat-label">Total Income</span>
                <span className="eom-stat-value">{formatCurrency(cycleData.income)}</span>
              </div>
            </div>

            {/* Spending Summary */}
            <div className="eom-section">
              <p className="eom-section-label">Spending</p>
              <div className="eom-stat-row">
                <span className="eom-stat-label">Needs (Allocated)</span>
                <span className="eom-stat-value">{formatCurrency(cycleData.expenses_budget)}</span>
              </div>
              <div className="eom-stat-row">
                <span className="eom-stat-label">Needs (Spent)</span>
                <span className="eom-stat-value eom-spent">{formatCurrency(cycleData.needs_spent)}</span>
              </div>
              <div className="eom-stat-row">
                <span className="eom-stat-label">Needs (Remaining)</span>
                <span className="eom-stat-value eom-remaining">{formatCurrency(needsRemaining)}</span>
              </div>

              <div className="eom-divider" />

              <div className="eom-stat-row">
                <span className="eom-stat-label">Wants (Allocated)</span>
                <span className="eom-stat-value">{formatCurrency(cycleData.wants_budget)}</span>
              </div>
              <div className="eom-stat-row">
                <span className="eom-stat-label">Wants (Spent)</span>
                <span className="eom-stat-value eom-spent">{formatCurrency(cycleData.wants_spent)}</span>
              </div>
              <div className="eom-stat-row">
                <span className="eom-stat-label">Wants (Remaining)</span>
                <span className="eom-stat-value eom-remaining">{formatCurrency(wantsRemaining)}</span>
              </div>
            </div>

            {/* Rollover Summary */}
            <div className="eom-section eom-highlight">
              <p className="eom-section-label">Unspent Budget Rollover</p>
              <div className="eom-stat-row">
                <span className="eom-stat-label">Total Unspent</span>
                <span className="eom-stat-value eom-success">{formatCurrency(cycleData.unspent_total)}</span>
              </div>
              <p className="eom-info-text">
                This amount will be added to your Cash on Hand for discretionary use.
              </p>
            </div>

            {/* Warning */}
            <div className="eom-warning">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <p className="eom-warning-title">Confirm Cycle Closure</p>
                <p className="eom-warning-text">
                  This will close the current cycle and start a new month. This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <div className="eom-footer">
            <button className="eom-btn-secondary" onClick={onClose} disabled={isConfirming}>
              Cancel
            </button>
            <button className="eom-btn-primary" onClick={handleConfirm} disabled={isConfirming}>
              {isConfirming ? "Closing Cycle..." : "Confirm & Close Cycle"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const MODAL_STYLES = `
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
    --success:    #3B6D11;
    --warning:    #854F0B;
    --warning-bg: #FAEEDA;
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
      --success:    #97C459;
      --warning:    #EF9F27;
      --warning-bg: #412402;
    }
  }

  .eom-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .eom-modal {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    max-width: 600px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }

  .eom-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 1.5rem 1.75rem;
    border-bottom: 0.5px solid var(--border);
  }
  .eom-title {
    font-family: var(--serif);
    font-size: 20px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.3px;
    margin-bottom: 4px;
  }
  .eom-subtitle {
    font-size: 13px;
    color: var(--text-2);
  }
  .eom-close-btn {
    width: 32px;
    height: 32px;
    background: var(--bg-surface);
    border: none;
    border-radius: 6px;
    font-size: 24px;
    color: var(--text-2);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity 0.15s;
  }
  .eom-close-btn:hover { opacity: 0.7; }

  .eom-body {
    padding: 1.5rem 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .eom-section {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .eom-section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 4px;
  }

  .eom-stat-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 0;
  }
  .eom-stat-label {
    font-size: 13px;
    color: var(--text-2);
  }
  .eom-stat-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-1);
  }
  .eom-stat-value.eom-spent {
    color: var(--error);
  }
  .eom-stat-value.eom-remaining {
    color: var(--text-2);
  }
  .eom-stat-value.eom-success {
    font-size: 20px;
    color: var(--success);
  }

  .eom-divider {
    height: 0.5px;
    background: var(--border);
    margin: 6px 0;
  }

  .eom-highlight {
    background: var(--bg-surface);
    padding: 1rem 1.25rem;
    border-radius: var(--radius-md);
  }

  .eom-info-text {
    font-size: 12px;
    color: var(--text-3);
    line-height: 1.5;
    margin-top: 6px;
  }

  .eom-warning {
    display: flex;
    gap: 12px;
    padding: 1rem 1.25rem;
    background: var(--warning-bg);
    border: 0.5px solid var(--warning);
    border-radius: var(--radius-md);
  }
  .eom-warning svg {
    color: var(--warning);
    flex-shrink: 0;
  }
  .eom-warning-title {
    font-size: 13px;
    font-weight: 600;
    color: var(--warning);
    margin-bottom: 4px;
  }
  .eom-warning-text {
    font-size: 12px;
    color: var(--text-2);
    line-height: 1.5;
  }

  .eom-footer {
    display: flex;
    gap: 10px;
    padding: 1.25rem 1.75rem;
    border-top: 0.5px solid var(--border);
  }

  .eom-btn-secondary {
    flex: 1;
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
  .eom-btn-secondary:hover { opacity: 0.82; }
  .eom-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

  .eom-btn-primary {
    flex: 1;
    height: 44px;
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .eom-btn-primary:hover { opacity: 0.82; }
  .eom-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  @media (max-width: 640px) {
    .eom-modal {
      max-height: 95vh;
    }
    .eom-header,
    .eom-body,
    .eom-footer {
      padding-left: 1.25rem;
      padding-right: 1.25rem;
    }
  }
`;
