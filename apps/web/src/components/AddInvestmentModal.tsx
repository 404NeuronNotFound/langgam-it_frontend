"use client";

import { useState } from "react";
import { usePriceData } from "@/hooks/usePriceData";
import type { InvestmentCreate } from "@/types/investment";

interface AddInvestmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: InvestmentCreate) => Promise<void>;
  availableInvestmentPool?: number;
}

export default function AddInvestmentModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  availableInvestmentPool = 0,
}: AddInvestmentModalProps) {
  const [formData, setFormData] = useState<InvestmentCreate>({
    name: "",
    type: "stocks",
    total_invested: 0,
    current_value: 0,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { price, isLoading: isPriceLoading, fetchPrice } = usePriceData();

  if (!isOpen) return null;

  async function handleFetchPrice() {
    if (!formData.name.trim()) {
      setError("Please enter investment symbol first");
      return;
    }
    await fetchPrice(formData.name, formData.type);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      setError("Please enter investment symbol");
      return;
    }
    if (formData.total_invested <= 0) {
      setError("Please enter a valid invested amount");
      return;
    }
    
    // For crypto, price fetch is required
    if (formData.type === "crypto" && !price) {
      setError("Please fetch the current price for crypto");
      return;
    }

    setIsSubmitting(true);
    setError("");
    
    try {
      // For crypto with price: use fetched price
      // For stocks or crypto without price: use invested amount as current value
      const currentValue = price ? formData.total_invested : formData.total_invested;
      
      await onSubmit({
        ...formData,
        current_value: currentValue,
      });
      
      // Reset form
      setFormData({
        name: "",
        type: "stocks",
        total_invested: 0,
        current_value: 0,
      });
      onClose();
    } catch (err: any) {
      // Extract error message from backend response
      let errorMsg = "Failed to add investment";
      
      if (err.response?.data) {
        const data = err.response.data;
        // Handle different error formats
        if (typeof data === "string") {
          errorMsg = data;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (data.error) {
          errorMsg = data.error;
        } else if (typeof data === "object") {
          // Handle field-specific errors
          const firstError = Object.values(data)[0];
          if (Array.isArray(firstError)) {
            errorMsg = firstError[0];
          } else if (typeof firstError === "string") {
            errorMsg = firstError;
          }
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
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
            {availableInvestmentPool > 0 && (
              <div className="aim-pool-info">
                <p className="aim-pool-label">Available Investment Pool</p>
                <p className="aim-pool-value">
                  ₱{availableInvestmentPool.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="aim-pool-sub">Transferred from savings. Use this to invest in stocks or crypto.</p>
              </div>
            )}

            <div className="aim-field">
              <label className="aim-label" htmlFor="name">Investment Symbol</label>
              <div className="aim-input-group">
                <input
                  id="name"
                  type="text"
                  className="aim-input"
                  placeholder="e.g., BTC, ETH, AAPL"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    setError("");
                  }}
                  disabled={isSubmitting || isPriceLoading}
                />
                {formData.type === "crypto" && (
                  <button
                    type="button"
                    className="aim-fetch-btn"
                    onClick={handleFetchPrice}
                    disabled={isPriceLoading || !formData.name.trim()}
                  >
                    {isPriceLoading ? "Fetching..." : "Fetch Price"}
                  </button>
                )}
              </div>
              {formData.type === "stocks" && (
                <p className="aim-hint">Enter stock symbol (e.g., AAPL, MSFT). Price fetch requires manual entry.</p>
              )}
            </div>

            {price && (
              <div className="aim-price-info">
                <div className="aim-price-row">
                  <span className="aim-price-label">{price.name} Current Price:</span>
                  <span className="aim-price-value">
                    ₱{price.currentPrice.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                {price.changePercent24h !== undefined && (
                  <div className="aim-price-row">
                    <span className="aim-price-label">24h Change:</span>
                    <span className="aim-price-value" style={{ color: price.changePercent24h >= 0 ? "var(--success)" : "var(--error)" }}>
                      {price.changePercent24h >= 0 ? "+" : ""}{price.changePercent24h.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
            )}

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
                <option value="crypto">Cryptocurrency</option>
              </select>
            </div>

            <div className="aim-field">
              <label className="aim-label" htmlFor="invested">Amount Invested (₱)</label>
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
              <p className="aim-hint">Enter how much you invested in Philippine Peso</p>
            </div>

            {price && (
              <div className="aim-current-value">
                <p className="aim-current-label">Current Value (Auto-calculated)</p>
                <div className="aim-current-display">
                  <p className="aim-current-price">₱{price.currentPrice.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  <p className="aim-current-sub">per {formData.name.toUpperCase()}</p>
                </div>
                {formData.total_invested > 0 && (
                  <div className="aim-calculation">
                    <p className="aim-calc-label">Your Holdings:</p>
                    <p className="aim-calc-value">
                      {(formData.total_invested / price.currentPrice).toFixed(8)} {formData.name.toUpperCase()}
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && (
              <div className="aim-error-box">
                <p className="aim-error">{error}</p>
                {error.includes("exceeds available investment budget") && (
                  <p className="aim-error-hint">
                    💡 Tip: Click "Transfer from Savings" to add more funds to your investment budget.
                  </p>
                )}
              </div>
            )}

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

  .aim-pool-info {
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .aim-pool-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-3);
    letter-spacing: 0.05em;
  }

  .aim-pool-value {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1);
  }

  .aim-pool-sub {
    font-size: 11px;
    color: var(--text-3);
  }

  .aim-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .aim-input-group {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .aim-input-group .aim-input {
    flex: 1;
  }

  .aim-fetch-btn {
    height: 44px;
    padding: 0 12px;
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: opacity 0.15s;
  }

  .aim-fetch-btn:hover:not(:disabled) {
    opacity: 0.82;
  }

  .aim-fetch-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .aim-price-info {
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .aim-price-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
  }

  .aim-price-label {
    color: var(--text-3);
  }

  .aim-price-value {
    color: var(--text-1);
    font-weight: 600;
  }

  .aim-use-price-btn {
    height: 36px;
    background: var(--success);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .aim-use-price-btn:hover {
    opacity: 0.82;
  }

  .aim-use-price-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .aim-hint {
    font-size: 11px;
    color: var(--text-3);
    margin-top: -2px;
  }

  .aim-current-value {
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .aim-current-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    color: var(--text-3);
    letter-spacing: 0.05em;
  }

  .aim-current-display {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .aim-current-price {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1);
  }

  .aim-current-sub {
    font-size: 11px;
    color: var(--text-3);
  }

  .aim-calculation {
    border-top: 0.5px solid var(--border-md);
    padding-top: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .aim-calc-label {
    font-size: 11px;
    color: var(--text-3);
  }

  .aim-calc-value {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-1);
    font-family: monospace;
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

  .aim-error-box {
    background: var(--error-bg);
    border: 0.5px solid var(--error);
    border-radius: var(--radius-sm);
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .aim-error-box .aim-error {
    margin: 0;
  }

  .aim-error-hint {
    font-size: 11px;
    color: var(--error);
    margin: 0;
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
