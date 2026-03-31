"use client";

import { useState } from "react";
import { useFinanceStore } from "../store/financeStore";
import { useCycleStore } from "../store/cycleStore";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const { profile } = useFinanceStore();
  const { moveToInvestments } = useCycleStore();
  const [amount, setAmount] = useState("");
  const [direction, setDirection] = useState<"to_investments" | "to_savings">("to_investments");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen || !profile) return null;

  const savings = parseFloat(profile.savings);
  const investments = parseFloat(profile.investments_total);

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(val);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (direction === "to_investments" && transferAmount > savings) {
      setError("Insufficient savings balance");
      return;
    }

    if (direction === "to_savings") {
      setError("Transfer from investments to savings not yet implemented");
      return;
    }

    setIsSubmitting(true);
    setError("");
    
    try {
      await moveToInvestments(transferAmount);
      setAmount("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to transfer funds");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (!isSubmitting) {
      setAmount("");
      setError("");
      onClose();
    }
  }

  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div className="tm-overlay" onClick={handleClose}>
        <div className="tm-modal" onClick={(e) => e.stopPropagation()}>
          <div className="tm-header">
            <h2 className="tm-title">Transfer Funds</h2>
            <button className="tm-close-btn" onClick={handleClose}>×</button>
          </div>

          <form className="tm-body" onSubmit={handleSubmit}>
            {/* Balance Display */}
            <div className="tm-balances">
              <div className="tm-balance-item">
                <span className="tm-balance-label">Savings</span>
                <span className="tm-balance-value">{formatCurrency(savings)}</span>
              </div>
              <div className="tm-balance-arrow">⇄</div>
              <div className="tm-balance-item">
                <span className="tm-balance-label">Investments</span>
                <span className="tm-balance-value">{formatCurrency(investments)}</span>
              </div>
            </div>

            {/* Direction Selector */}
            <div className="tm-field">
              <label className="tm-label">Transfer Direction</label>
              <div className="tm-direction-btns">
                <button
                  type="button"
                  className={`tm-direction-btn ${direction === "to_investments" ? "active" : ""}`}
                  onClick={() => setDirection("to_investments")}
                  disabled={isSubmitting}
                >
                  Savings → Investments
                </button>
                <button
                  type="button"
                  className={`tm-direction-btn ${direction === "to_savings" ? "active" : ""}`}
                  onClick={() => setDirection("to_savings")}
                  disabled={isSubmitting}
                >
                  Investments → Savings
                </button>
              </div>
            </div>

            {/* Amount Input */}
            <div className="tm-field">
              <label className="tm-label" htmlFor="amount">Amount</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                className="tm-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isSubmitting}
              />
              <p className="tm-hint">
                Available: {formatCurrency(direction === "to_investments" ? savings : investments)}
              </p>
            </div>

            {error && <p className="tm-error">{error}</p>}

            <div className="tm-footer">
              <button
                type="button"
                className="tm-btn-secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="tm-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Transferring..." : "Transfer"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

const MODAL_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&display=swap');
  :root {
    --bg-card:    #FFFFFF;
    --bg-surface: #F0EFEB;
    --border:     rgba(0,0,0,0.09);
    --border-md:  rgba(0,0,0,0.14);
    --text-1:     #18181B;
    --text-2:     #52525B;
    --text-3:     #A1A1AA;
    --error:      #993C1D;
    --success:    #3B6D11;
    --blue-icon:  #185FA5;
    --sans:  'Plus Jakarta Sans', system-ui, sans-serif;
    --radius-sm: 8px; --radius-md: 12px; --radius-lg: 18px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg-card:    #18181B;
      --bg-surface: #1F1F23;
      --border:     rgba(255,255,255,0.08);
      --border-md:  rgba(255,255,255,0.14);
      --text-1:     #FAFAFA;
      --text-2:     #A1A1AA;
      --text-3:     #52525B;
      --error:      #F0997B;
      --success:    #97C459;
      --blue-icon:  #85B7EB;
    }
  }

  .tm-overlay {
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

  .tm-modal {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    max-width: 500px;
    width: 100%;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .tm-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1.75rem;
    border-bottom: 0.5px solid var(--border);
  }
  .tm-title {
    font-family: var(--sans);
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1);
  }
  .tm-close-btn {
    width: 32px;
    height: 32px;
    background: var(--bg-surface);
    border: none;
    border-radius: 6px;
    font-size: 24px;
    color: var(--text-2);
    cursor: pointer;
  }
  .tm-close-btn:hover { opacity: 0.7; }

  .tm-body {
    padding: 1.5rem 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .tm-balances {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: var(--bg-surface);
    border-radius: var(--radius-md);
  }
  .tm-balance-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .tm-balance-label {
    font-size: 11px;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .tm-balance-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
  }
  .tm-balance-arrow {
    font-size: 24px;
    color: var(--text-3);
  }

  .tm-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .tm-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-1);
  }

  .tm-direction-btns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .tm-direction-btn {
    height: 40px;
    padding: 0 12px;
    background: var(--bg-surface);
    color: var(--text-2);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
  }
  .tm-direction-btn:hover {
    border-color: var(--blue-icon);
  }
  .tm-direction-btn.active {
    background: var(--blue-icon);
    color: white;
    border-color: var(--blue-icon);
  }
  .tm-direction-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tm-input {
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
  }
  .tm-input:focus {
    border-color: var(--text-2);
  }
  .tm-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tm-hint {
    font-size: 11px;
    color: var(--text-3);
  }

  .tm-error {
    font-size: 12px;
    color: var(--error);
    padding: 10px;
    background: var(--error-bg);
    border-radius: var(--radius-sm);
  }

  .tm-footer {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  .tm-btn-secondary,
  .tm-btn-primary {
    flex: 1;
    height: 44px;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
  }
  .tm-btn-secondary {
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
  }
  .tm-btn-primary {
    background: var(--text-1);
    color: var(--bg-card);
  }
  .tm-btn-secondary:hover,
  .tm-btn-primary:hover {
    opacity: 0.82;
  }
  .tm-btn-secondary:disabled,
  .tm-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
