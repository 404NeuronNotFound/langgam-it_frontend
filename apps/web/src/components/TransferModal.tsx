"use client";

import { useState } from "react";
import { useInvestmentStore } from "../store/investmentStore";
import { useInvestmentAllocationStore } from "../store/investmentAllocationStore";
import { useFinanceStore } from "../store/financeStore";

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransferModal({ isOpen, onClose }: TransferModalProps) {
  const { profile } = useFinanceStore();
  const { transferToInvestments, transferToSavings, isLoading } = useInvestmentStore();
  const { updateAllocation } = useInvestmentAllocationStore();

  const [amount, setAmount]       = useState("");
  const [direction, setDirection] = useState<"to_investments" | "to_savings">("to_investments");
  const [error, setError]         = useState("");

  if (!isOpen || !profile) return null;

  const savings     = parseFloat(profile.savings);
  const investments = parseFloat(profile.investments_total);

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency", currency: "PHP", minimumFractionDigits: 2,
    }).format(val);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const transferAmount = parseFloat(amount);
    if (!transferAmount || transferAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    if (direction === "to_investments" && transferAmount > savings) {
      setError(`Insufficient savings. Available: ${formatCurrency(savings)}`);
      return;
    }

    if (direction === "to_savings" && transferAmount > investments) {
      setError(`Insufficient investments. Available: ${formatCurrency(investments)}`);
      return;
    }

    try {
      if (direction === "to_investments") {
        await transferToInvestments(transferAmount);
        // Sync allocation when transferring to investments
        await updateAllocation(transferAmount);
      } else {
        await transferToSavings(transferAmount);
      }
      setAmount("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Transfer failed. Please try again.");
    }
  }

  function handleClose() {
    if (!isLoading) {
      setAmount("");
      setError("");
      onClose();
    }
  }

  const available = direction === "to_investments" ? savings : investments;

  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div className="tm-overlay" onClick={handleClose}>
        <div className="tm-modal" onClick={(e) => e.stopPropagation()}>

          <div className="tm-header">
            <h2 className="tm-title">Transfer Funds</h2>
            <button className="tm-close-btn" onClick={handleClose} aria-label="Close">×</button>
          </div>

          <form className="tm-body" onSubmit={handleSubmit}>

            {/* Balance display */}
            <div className="tm-balances">
              <div className="tm-balance-item">
                <span className="tm-balance-label">Savings</span>
                <span className="tm-balance-value">{formatCurrency(savings)}</span>
              </div>
              <div className="tm-balance-arrow">⇄</div>
              <div className="tm-balance-item" style={{ textAlign: "right" }}>
                <span className="tm-balance-label">Investments</span>
                <span className="tm-balance-value">{formatCurrency(investments)}</span>
              </div>
            </div>

            {/* Direction */}
            <div className="tm-field">
              <label className="tm-label">Transfer Direction</label>
              <div className="tm-direction-btns">
                <button
                  type="button"
                  className={`tm-direction-btn${direction === "to_investments" ? " active" : ""}`}
                  onClick={() => { setDirection("to_investments"); setError(""); }}
                  disabled={isLoading}
                >
                  Savings → Investments
                </button>
                <button
                  type="button"
                  className={`tm-direction-btn${direction === "to_savings" ? " active" : ""}`}
                  onClick={() => { setDirection("to_savings"); setError(""); }}
                  disabled={isLoading}
                >
                  Investments → Savings
                </button>
              </div>
            </div>

            {/* Amount */}
            <div className="tm-field">
              <label className="tm-label" htmlFor="tm-amount">Amount</label>
              <div className="tm-input-wrap">
                <span className="tm-currency">₱</span>
                <input
                  id="tm-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  className="tm-input"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setError(""); }}
                  disabled={isLoading}
                />
              </div>
              <p className="tm-hint">Available: {formatCurrency(available)}</p>
            </div>

            {error && <p className="tm-error">{error}</p>}

            <div className="tm-footer">
              <button type="button" className="tm-btn-secondary"
                onClick={handleClose} disabled={isLoading}>
                Cancel
              </button>
              <button type="submit" className="tm-btn-primary" disabled={isLoading}>
                {isLoading
                  ? <span className="tm-spinner" />
                  : direction === "to_investments" ? "Move to Investments" : "Move to Savings"
                }
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
    --bg-card:#FFFFFF; --bg-surface:#F0EFEB;
    --border:rgba(0,0,0,0.09); --border-md:rgba(0,0,0,0.14);
    --text-1:#18181B; --text-2:#52525B; --text-3:#A1A1AA;
    --error:#993C1D; --error-bg:#FAECE7; --blue-icon:#185FA5;
    --sans:'Plus Jakarta Sans',system-ui,sans-serif;
    --radius-sm:8px; --radius-md:12px; --radius-lg:18px;
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg-card:#18181B; --bg-surface:#1F1F23;
      --border:rgba(255,255,255,0.08); --border-md:rgba(255,255,255,0.14);
      --text-1:#FAFAFA; --text-2:#A1A1AA; --text-3:#52525B;
      --error:#F0997B; --error-bg:#4A1B0C; --blue-icon:#85B7EB;
    }
  }

  .tm-overlay {
    position: fixed; inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex; align-items: center; justify-content: center;
    z-index: 1000; padding: 1rem;
  }
  .tm-modal {
    background: var(--bg-card); border-radius: var(--radius-lg);
    border: 0.5px solid var(--border-md);
    max-width: 480px; width: 100%;
  }
  .tm-header {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1.25rem 1.5rem; border-bottom: 0.5px solid var(--border);
  }
  .tm-title { font-family: var(--sans); font-size: 16px; font-weight: 500; color: var(--text-1); }
  .tm-close-btn {
    width: 28px; height: 28px; background: var(--bg-surface); border: none;
    border-radius: 6px; font-size: 20px; color: var(--text-2); cursor: pointer;
    display: flex; align-items: center; justify-content: center;
  }
  .tm-close-btn:hover { opacity: 0.7; }
  .tm-body { padding: 1.25rem 1.5rem; display: flex; flex-direction: column; gap: 1.125rem; }
  .tm-balances {
    display: flex; align-items: center; justify-content: space-between;
    padding: 1rem; background: var(--bg-surface); border-radius: var(--radius-md);
  }
  .tm-balance-item { display: flex; flex-direction: column; gap: 3px; }
  .tm-balance-label { font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.05em; }
  .tm-balance-value { font-size: 15px; font-weight: 500; color: var(--text-1); }
  .tm-balance-arrow { font-size: 20px; color: var(--text-3); }
  .tm-field { display: flex; flex-direction: column; gap: 7px; }
  .tm-label { font-size: 13px; font-weight: 500; color: var(--text-2); }
  .tm-direction-btns { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
  .tm-direction-btn {
    height: 38px; padding: 0 10px;
    background: var(--bg-surface); color: var(--text-2);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    font-family: var(--sans); font-size: 12px; font-weight: 500;
    cursor: pointer; transition: all 0.15s;
  }
  .tm-direction-btn:hover { border-color: var(--blue-icon); color: var(--text-1); }
  .tm-direction-btn.active { background: var(--text-1); color: var(--bg-card); border-color: var(--text-1); }
  .tm-direction-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .tm-input-wrap { position: relative; display: flex; align-items: center; }
  .tm-currency { position: absolute; left: 12px; font-size: 13px; font-weight: 500; color: var(--text-2); pointer-events: none; }
  .tm-input {
    width: 100%; height: 42px; padding: 0 14px 0 28px;
    font-family: var(--sans); font-size: 14px; color: var(--text-1);
    background: var(--bg-surface); border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm); outline: none;
    transition: border-color 0.15s;
  }
  .tm-input:focus { border-color: var(--text-2); }
  .tm-input:disabled { opacity: 0.5; cursor: not-allowed; }
  .tm-hint { font-size: 11px; color: var(--text-3); }
  .tm-error { font-size: 12px; color: var(--error); background: var(--error-bg); padding: 9px 12px; border-radius: var(--radius-sm); }
  .tm-footer { display: flex; gap: 10px; padding-top: 4px; }
  .tm-btn-secondary, .tm-btn-primary {
    flex: 1; height: 42px; border-radius: var(--radius-sm);
    font-family: var(--sans); font-size: 14px; font-weight: 500;
    cursor: pointer; border: none;
    display: flex; align-items: center; justify-content: center; gap: 8px;
    transition: opacity 0.15s;
  }
  .tm-btn-secondary { background: var(--bg-surface); color: var(--text-1); border: 0.5px solid var(--border-md); }
  .tm-btn-primary   { background: var(--text-1); color: var(--bg-card); }
  .tm-btn-secondary:hover, .tm-btn-primary:hover { opacity: 0.82; }
  .tm-btn-secondary:disabled, .tm-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
  .tm-spinner {
    width: 16px; height: 16px;
    border: 2px solid rgba(255,255,255,0.3); border-top-color: currentColor;
    border-radius: 50%; animation: tm-spin 0.7s linear infinite;
  }
  @keyframes tm-spin { to { transform: rotate(360deg); } }
`;