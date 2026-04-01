"use client";

import { useState } from "react";
import type { InvestmentCreate } from "@/types/investment";

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvestmentCreate) => Promise<void>;
  totalInvested?: number;
  totalAllocated?: number;
}

export default function AddInvestmentModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  totalInvested = 0,
  totalAllocated = 0,
}: AddInvestmentModalProps) {
  const [formData, setFormData] = useState<InvestmentCreate>({
    name: "",
    type: "stocks",
    total_invested: 0,
    current_value: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("Please enter investment name");
      return;
    }
    if (formData.total_invested <= 0) {
      setError("Please enter a valid invested amount");
      return;
    }
    if (formData.current_value <= 0) {
      setError("Please enter a valid current value");
      return;
    }

    // Check if adding this investment would exceed allocation
    const remainingAllocation = totalAllocated - totalInvested;
    if (formData.total_invested > remainingAllocation) {
      setError(
        `Cannot add investment. Remaining allocation: ₱${remainingAllocation.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}. Please transfer more funds from savings to increase allocation.`
      );
      return;
    }

    setIsSubmitting(true);
    setError("");
    
    try {
      await onSubmit(formData);
      // Reset form
      setFormData({
        name: "",
        type: "stocks",
        total_invested: 0,
        current_value: 0,
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to add investment");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (!isSubmitting) {
      setFormData({
        name: "",
        type: "stocks",
        total_invested: 0,
        current_value: 0,
      });
      setError("");
      onClose();
    }
  }

  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div className="aim-overlay" onClick={handleClose}>
        <div className="aim-modal" onClick={(e) => e.stopPropagation()}>
          <div className="aim-header">
            <h2 className="aim-title">Add Investment</h2>
            <button className="aim-close-btn" onClick={handleClose}>×</button>
          </div>

          <form className="aim-body" onSubmit={handleSubmit}>
            {/* Allocation Info */}
            {totalAllocated > 0 && (
              <div className="aim-allocation-info">
                <div className="aim-allocation-row">
                  <span className="aim-allocation-label">Total Allocated:</span>
                  <span className="aim-allocation-value">
                    ₱{totalAllocated.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="aim-allocation-row">
                  <span className="aim-allocation-label">Already Invested:</span>
                  <span className="aim-allocation-value">
                    ₱{totalInvested.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="aim-allocation-row" style={{ borderTop: "0.5px solid var(--border-md)", paddingTop: "8px", marginTop: "8px" }}>
                  <span className="aim-allocation-label" style={{ fontWeight: 600 }}>Remaining:</span>
                  <span className="aim-allocation-value" style={{ fontWeight: 600, color: (totalAllocated - totalInvested) > 0 ? "var(--success)" : "var(--error)" }}>
                    ₱{(totalAllocated - totalInvested).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            )}

            <div className="aim-field">
              <label className="aim-label" htmlFor="name">Investment Name</label>
              <input
                id="name"
                type="text"
                className="aim-input"
                placeholder="e.g., Apple Inc. (AAPL)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div className="aim-field">
              <label className="aim-label" htmlFor="type">Type</label>
              <select
                id="type"
                className="aim-select"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                disabled={isSubmitting}
              >
                <option value="stocks">Stocks</option>
                <option value="crypto">Crypto</option>
                <option value="real_estate">Real Estate</option>
                <option value="bonds">Bonds</option>
                <option value="mutual_funds">Mutual Funds</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="aim-field">
              <label className="aim-label" htmlFor="invested">Total Invested</label>
              <input
                id="invested"
                type="number"
                step="0.01"
                className="aim-input"
                placeholder="0.00"
                value={formData.total_invested || ""}
                onChange={(e) => setFormData({ ...formData, total_invested: parseFloat(e.target.value) || 0 })}
                disabled={isSubmitting}
              />
            </div>

            <div className="aim-field">
              <label className="aim-label" htmlFor="current">Current Value</label>
              <input
                id="current"
                type="number"
                step="0.01"
                className="aim-input"
                placeholder="0.00"
                value={formData.current_value || ""}
                onChange={(e) => setFormData({ ...formData, current_value: parseFloat(e.target.value) || 0 })}
                disabled={isSubmitting}
              />
            </div>

            {error && <p className="aim-error">{error}</p>}

            <div className="aim-footer">
              <button
                type="button"
                className="aim-btn-secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="aim-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Adding..." : "Add Investment"}
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
    }
  }

  .aim-overlay {
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

  .aim-modal {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
  }

  .aim-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1.75rem;
    border-bottom: 0.5px solid var(--border);
  }
  .aim-title {
    font-family: var(--sans);
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1);
  }
  .aim-close-btn {
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
  }
  .aim-close-btn:hover { opacity: 0.7; }

  .aim-body {
    padding: 1.5rem 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .aim-allocation-info {
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    padding: 12px;
    margin-bottom: 8px;
  }
  .aim-allocation-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    padding: 6px 0;
  }
  .aim-allocation-label {
    color: var(--text-3);
  }
  .aim-allocation-value {
    color: var(--text-1);
    font-weight: 500;
  }

  .aim-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .aim-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-1);
  }
  .aim-input,
  .aim-select {
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
  .aim-input:focus,
  .aim-select:focus {
    border-color: var(--text-2);
  }
  .aim-input:disabled,
  .aim-select:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .aim-error {
    font-size: 12px;
    color: var(--error);
    margin-top: -4px;
  }

  .aim-footer {
    display: flex;
    gap: 10px;
    margin-top: 8px;
  }

  .aim-btn-secondary,
  .aim-btn-primary {
    flex: 1;
    height: 44px;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
  }
  .aim-btn-secondary {
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
  }
  .aim-btn-primary {
    background: var(--text-1);
    color: var(--bg-card);
  }
  .aim-btn-secondary:hover,
  .aim-btn-primary:hover {
    opacity: 0.82;
  }
  .aim-btn-secondary:disabled,
  .aim-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;
