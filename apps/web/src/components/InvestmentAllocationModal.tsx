"use client";

import { useState, useEffect } from "react";

export interface InvestmentTypeAllocation {
  type: "stocks" | "crypto" | "real_estate" | "bonds" | "mutual_funds" | "other";
  label: string;
  allocated: number;
}

interface InvestmentAllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (allocations: InvestmentTypeAllocation[]) => Promise<void>;
  totalAllocated: number;
}

const INVESTMENT_TYPES = [
  { type: "stocks" as const, label: "Stocks", description: "Individual stocks, ETFs" },
  { type: "crypto" as const, label: "Cryptocurrency", description: "Bitcoin, Ethereum, etc." },
  { type: "real_estate" as const, label: "Real Estate", description: "Properties, REITs" },
  { type: "bonds" as const, label: "Bonds", description: "Government, corporate bonds" },
  { type: "mutual_funds" as const, label: "Mutual Funds", description: "Managed funds" },
  { type: "other" as const, label: "Other", description: "Other investments" },
];

export default function InvestmentAllocationModal({
  isOpen,
  onClose,
  onSubmit,
  totalAllocated,
}: InvestmentAllocationModalProps) {
  const [allocations, setAllocations] = useState<InvestmentTypeAllocation[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Initialize with zeros
      setAllocations(
        INVESTMENT_TYPES.map((t) => ({
          type: t.type,
          label: t.label,
          allocated: 0,
        }))
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const totalAllocatedByType = allocations.reduce((sum, a) => sum + a.allocated, 0);
  const remaining = totalAllocated - totalAllocatedByType;

  function handleAllocationChange(type: string, value: number) {
    setAllocations((prev) =>
      prev.map((a) => (a.type === type ? { ...a, allocated: Math.max(0, value) } : a))
    );
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (totalAllocatedByType !== totalAllocated) {
      setError(
        `Total allocation must equal ₱${totalAllocated.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}. Currently: ₱${totalAllocatedByType.toLocaleString("en-PH", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(allocations);
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to save allocations");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleClose() {
    if (!isSubmitting) {
      setError("");
      onClose();
    }
  }

  return (
    <>
      <style>{MODAL_STYLES}</style>
      <div className="iam-overlay" onClick={handleClose}>
        <div className="iam-modal" onClick={(e) => e.stopPropagation()}>
          <div className="iam-header">
            <h2 className="iam-title">Allocate Investment Budget</h2>
            <button className="iam-close-btn" onClick={handleClose} aria-label="Close">
              ×
            </button>
          </div>

          <form className="iam-body" onSubmit={handleSubmit}>
            {/* Total Info */}
            <div className="iam-info-box">
              <div className="iam-info-row">
                <span className="iam-info-label">Total Budget:</span>
                <span className="iam-info-value">
                  ₱{totalAllocated.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="iam-info-row">
                <span className="iam-info-label">Allocated:</span>
                <span className="iam-info-value">
                  ₱{totalAllocatedByType.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="iam-info-row" style={{ borderTop: "0.5px solid var(--border-md)", paddingTop: "8px", marginTop: "8px" }}>
                <span className="iam-info-label" style={{ fontWeight: 600 }}>
                  Remaining:
                </span>
                <span
                  className="iam-info-value"
                  style={{
                    fontWeight: 600,
                    color: remaining === 0 ? "var(--success)" : remaining > 0 ? "var(--text-2)" : "var(--error)",
                  }}
                >
                  ₱{remaining.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Allocation Fields by Type */}
            <div className="iam-fields">
              {allocations.map((alloc) => {
                const typeInfo = INVESTMENT_TYPES.find((t) => t.type === alloc.type);
                return (
                  <div key={alloc.type} className="iam-field">
                    <label className="iam-label" htmlFor={`alloc-${alloc.type}`}>
                      <div className="iam-label-content">
                        <span className="iam-label-name">{alloc.label}</span>
                        <span className="iam-label-desc">{typeInfo?.description}</span>
                      </div>
                    </label>
                    <div className="iam-input-wrap">
                      <span className="iam-currency">₱</span>
                      <input
                        id={`alloc-${alloc.type}`}
                        type="number"
                        step="0.01"
                        min="0"
                        className="iam-input"
                        placeholder="0.00"
                        value={alloc.allocated || ""}
                        onChange={(e) => handleAllocationChange(alloc.type, parseFloat(e.target.value) || 0)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {error && <p className="iam-error">{error}</p>}

            <div className="iam-footer">
              <button type="button" className="iam-btn-secondary" onClick={handleClose} disabled={isSubmitting}>
                Cancel
              </button>
              <button type="submit" className="iam-btn-primary" disabled={isSubmitting || remaining !== 0}>
                {isSubmitting ? "Saving..." : "Save Allocations"}
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

  .iam-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .iam-modal {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    border: 0.5px solid var(--border-md);
    max-width: 520px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .iam-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1.75rem;
    border-bottom: 0.5px solid var(--border);
  }

  .iam-title {
    font-family: var(--sans);
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1);
  }

  .iam-close-btn {
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

  .iam-close-btn:hover {
    opacity: 0.7;
  }

  .iam-body {
    padding: 1.5rem 1.75rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .iam-info-box {
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    padding: 12px;
  }

  .iam-info-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    padding: 6px 0;
  }

  .iam-info-label {
    color: var(--text-3);
  }

  .iam-info-value {
    color: var(--text-1);
    font-weight: 500;
  }

  .iam-fields {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
  }

  .iam-no-investments-container {
    grid-column: 1 / -1;
    text-align: center;
    padding: 2rem 1rem;
  }

  .iam-no-investments {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 6px;
  }

  .iam-no-investments-sub {
    font-size: 12px;
    color: var(--text-3);
  }

  .iam-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .iam-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-1);
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }

  .iam-label-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .iam-label-name {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-1);
  }

  .iam-label-desc {
    font-size: 11px;
    color: var(--text-3);
    font-weight: 400;
  }

  .iam-type-badge {
    font-size: 10px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-3);
    background: var(--bg-surface);
    padding: 2px 6px;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .iam-input-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .iam-currency {
    position: absolute;
    left: 12px;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
    pointer-events: none;
  }

  .iam-input {
    width: 100%;
    height: 40px;
    padding: 0 14px 0 28px;
    font-family: var(--sans);
    font-size: 13px;
    color: var(--text-1);
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    outline: none;
    transition: border-color 0.15s;
  }

  .iam-input:focus {
    border-color: var(--text-2);
  }

  .iam-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .iam-error {
    font-size: 12px;
    color: var(--error);
    background: rgba(153, 60, 29, 0.1);
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    border: 0.5px solid var(--error);
  }

  .iam-footer {
    display: flex;
    gap: 10px;
    padding-top: 8px;
  }

  .iam-btn-secondary,
  .iam-btn-primary {
    flex: 1;
    height: 44px;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: opacity 0.15s;
  }

  .iam-btn-secondary {
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
  }

  .iam-btn-primary {
    background: var(--text-1);
    color: var(--bg-card);
  }

  .iam-btn-secondary:hover,
  .iam-btn-primary:hover {
    opacity: 0.82;
  }

  .iam-btn-secondary:disabled,
  .iam-btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 640px) {
    .iam-fields {
      grid-template-columns: 1fr;
    }
  }
`;
