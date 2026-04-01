"use client";

import { useEffect, useState } from "react";
import { useInvestmentStore } from "../../store/investmentStore";
import { useInvestmentAllocationStore } from "../../store/investmentAllocationStore";
import { useFinanceStore } from "../../store/financeStore";
import AddInvestmentModal from "../../components/AddInvestmentModal";
import TransferModal from "../../components/TransferModal";
import type { InvestmentCreate } from "@/types/investment";

export default function InvestmentsPage() {
  const { investments, fetchInvestments, addInvestment, editInvestment, isLoading, error } = useInvestmentStore();
  const { allocation, fetchAllocation } = useInvestmentAllocationStore();
  const { profile } = useFinanceStore();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  useEffect(() => {
    fetchInvestments();
    fetchAllocation();
  }, [fetchInvestments, fetchAllocation]);

  // Calculate totals
  const totalInvested = investments.reduce((sum, inv) => sum + parseFloat(inv.total_invested), 0);
  const totalCurrent = investments.reduce((sum, inv) => sum + parseFloat(inv.current_value), 0);
  const totalPL = totalCurrent - totalInvested;
  const plPercentage = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

  function formatCurrency(val: number | string) {
    const num = typeof val === "string" ? parseFloat(val) : val;
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 2,
    }).format(num);
  }

  function getTypeLabel(type: string) {
    const labels: { [key: string]: string } = {
      stocks: "Stocks",
      crypto: "Crypto",
      real_estate: "Real Estate",
      bonds: "Bonds",
      mutual_funds: "Mutual Funds",
      other: "Other",
    };
    return labels[type] || type;
  }

  function getTypeColor(type: string) {
    const colors: { [key: string]: { bg: string; text: string } } = {
      stocks: { bg: "var(--blue-bg)", text: "var(--blue-icon)" },
      crypto: { bg: "var(--purple-bg)", text: "var(--purple-icon)" },
      real_estate: { bg: "var(--green-bg)", text: "var(--green-icon)" },
      bonds: { bg: "var(--amber-bg)", text: "var(--amber-icon)" },
      mutual_funds: { bg: "var(--blue-bg)", text: "var(--blue-icon)" },
      other: { bg: "var(--bg-surface)", text: "var(--text-2)" },
    };
    return colors[type] || colors.other;
  }

  function handleEditClick(investment: any) {
    setEditingId(investment.id);
    setEditValue(investment.current_value);
  }

  async function handleSaveEdit(id: number) {
    try {
      await editInvestment(id, { current_value: parseFloat(editValue) });
      setEditingId(null);
      setEditValue("");
    } catch (error) {
      console.error("Failed to update investment:", error);
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditValue("");
  }

  async function handleAddInvestment(data: InvestmentCreate) {
    await addInvestment(data);
  }

  if (error) {
    return (
      <>
        <style>{INVESTMENTS_STYLES}</style>
        <div className="inv-root">
          <div className="inv-header">
            <h1 className="inv-title">Investments</h1>
            <p className="inv-subtitle" style={{ color: "var(--error)" }}>
              Error: {error}
            </p>
          </div>
          <button
            onClick={() => fetchInvestments()}
            style={{
              padding: "10px 20px",
              background: "var(--text-1)",
              color: "var(--bg-card)",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
            }}
          >
            Retry
          </button>
        </div>
      </>
    );
  }

  if (isLoading && investments.length === 0) {
    return (
      <>
        <style>{INVESTMENTS_STYLES}</style>
        <div className="inv-root">
          <div className="inv-header">
            <h1 className="inv-title">Investments</h1>
            <p className="inv-subtitle">Loading...</p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{INVESTMENTS_STYLES}</style>
      <div className="inv-root">
        <div className="inv-header">
          <div>
            <h1 className="inv-title">Investments</h1>
            <p className="inv-subtitle">Track your assets and portfolio performance</p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button className="inv-btn-secondary" onClick={() => setShowTransferModal(true)}>
              Transfer Funds
            </button>
            <button className="inv-btn-primary" onClick={() => setShowAddModal(true)}>
              Add Investment
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="inv-summary-grid">
          <div className="inv-summary-card">
            <p className="inv-summary-label">Total Invested</p>
            <p className="inv-summary-value">{formatCurrency(totalInvested)}</p>
          </div>
          <div className="inv-summary-card">
            <p className="inv-summary-label">Current Value</p>
            <p className="inv-summary-value">{formatCurrency(totalCurrent)}</p>
          </div>
          <div className="inv-summary-card">
            <p className="inv-summary-label">Profit/Loss</p>
            <p
              className="inv-summary-value"
              style={{ color: totalPL >= 0 ? "var(--success)" : "var(--error)" }}
            >
              {formatCurrency(totalPL)}
            </p>
            <p
              className="inv-summary-sub"
              style={{ color: totalPL >= 0 ? "var(--success)" : "var(--error)" }}
            >
              {totalPL >= 0 ? "+" : ""}{plPercentage.toFixed(2)}%
            </p>
          </div>
          <div className="inv-summary-card">
            <p className="inv-summary-label">Profile Total</p>
            <p className="inv-summary-value">{formatCurrency(profile ? parseFloat(profile.investments_total) : 0)}</p>
            <p className="inv-summary-sub" style={{ fontSize: 11, color: "var(--text-3)" }}>
              From setup wizard
            </p>
          </div>
        </div>

        {/* Allocation Status */}
        {allocation && (
          <div className="inv-allocation-card">
            <div className="inv-allocation-header">
              <div>
                <p className="inv-allocation-title">Investment Allocation</p>
                <p className="inv-allocation-sub">
                  {allocation.is_balanced ? "✓ Balanced" : "⚠ Mismatch"}
                </p>
              </div>
              <div className="inv-allocation-status" style={{
                color: allocation.is_balanced ? "var(--success)" : "var(--error)",
              }}>
                {formatCurrency(totalInvested)} / {formatCurrency(parseFloat(allocation.total_allocated))}
              </div>
            </div>
            <div className="inv-allocation-progress">
              <div className="inv-allocation-bar">
                <div
                  className="inv-allocation-fill"
                  style={{
                    width: `${Math.min((totalInvested / parseFloat(allocation.total_allocated)) * 100, 100)}%`,
                    background: allocation.is_balanced ? "var(--success)" : "var(--error)",
                  }}
                />
              </div>
            </div>
            {!allocation.is_balanced && (
              <p className="inv-allocation-warning">
                Individual investments don't match setup total. Please adjust to balance.
              </p>
            )}
          </div>
        )}

        {/* Investments List */}
        <div className="inv-list-card">
          <p className="inv-section-label">Your Investments</p>
          {investments.length === 0 ? (
            <div className="inv-empty">
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
                <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
                <polyline points="16 7 22 7 22 13" />
              </svg>
              <p style={{ fontSize: 13, color: "var(--text-3)" }}>
                No investments yet. Add your first investment to start tracking.
              </p>
            </div>
          ) : (
            <div className="inv-list">
              {investments.map((investment) => {
                const invested = parseFloat(investment.total_invested);
                const current = parseFloat(investment.current_value);
                const pl = parseFloat(investment.profit_loss);
                const plPercent = invested > 0 ? (pl / invested) * 100 : 0;
                const typeColor = getTypeColor(investment.type);
                const isEditing = editingId === investment.id;

                return (
                  <div key={investment.id} className="inv-item">
                    <div className="inv-item-left">
                      <div className="inv-item-icon" style={{ background: typeColor.bg }}>
                        <InvestmentIcon type={investment.type} color={typeColor.text} />
                      </div>
                      <div>
                        <p className="inv-item-name">{investment.name}</p>
                        <div className="inv-item-meta">
                          <span className="inv-item-type" style={{ color: typeColor.text }}>
                            {getTypeLabel(investment.type)}
                          </span>
                          <span className="inv-item-quantity">
                            Invested: {formatCurrency(invested)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="inv-item-right">
                      {isEditing ? (
                        <div className="inv-edit-form">
                          <input
                            type="number"
                            className="inv-edit-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            placeholder="Current value"
                          />
                          <button
                            className="inv-edit-btn inv-save-btn"
                            onClick={() => handleSaveEdit(investment.id)}
                          >
                            Save
                          </button>
                          <button className="inv-edit-btn inv-cancel-btn" onClick={handleCancelEdit}>
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <>
                          <p className="inv-item-value">{formatCurrency(current)}</p>
                          <p
                            className="inv-item-pl"
                            style={{ color: pl >= 0 ? "var(--success)" : "var(--error)" }}
                          >
                            {pl >= 0 ? "+" : ""}{formatCurrency(pl)} ({pl >= 0 ? "+" : ""}
                            {plPercent.toFixed(2)}%)
                          </p>
                          <button
                            className="inv-update-btn"
                            onClick={() => handleEditClick(investment)}
                          >
                            Update Value
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <AddInvestmentModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddInvestment}
          totalInvested={totalInvested}
          totalAllocated={allocation ? parseFloat(allocation.total_allocated) : 0}
        />

        <TransferModal
          isOpen={showTransferModal}
          onClose={() => setShowTransferModal(false)}
        />
      </div>
    </>
  );
}

function InvestmentIcon({ type, color }: { type: string; color: string }) {
  const props = {
    width: 16,
    height: 16,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth: "2",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (type === "stocks") {
    return (
      <svg {...props}>
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
    );
  }
  if (type === "crypto") {
    return (
      <svg {...props}>
        <circle cx="12" cy="12" r="10" />
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
  }
  if (type === "real_estate") {
    return (
      <svg {...props}>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    );
  }
  if (type === "bonds") {
    return (
      <svg {...props}>
        <rect x="2" y="7" width="20" height="14" rx="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

const INVESTMENTS_STYLES = `
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
    --blue-bg:    #E6F1FB;
    --blue-icon:  #185FA5;
    --purple-bg:  #EEEDFE;
    --purple-icon:#534AB7;
    --green-bg:   #EAF3DE;
    --green-icon: #3B6D11;
    --amber-bg:   #FAEEDA;
    --amber-icon: #854F0B;
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
      --blue-bg:    #042C53;
      --blue-icon:  #85B7EB;
      --purple-bg:  #26215C;
      --purple-icon:#AFA9EC;
      --green-bg:   #173404;
      --green-icon: #97C459;
      --amber-bg:   #412402;
      --amber-icon: #EF9F27;
    }
  }

  .inv-root {
    font-family: var(--sans);
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .inv-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .inv-title {
    font-family: var(--serif);
    font-size: 24px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }
  .inv-subtitle {
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.6;
  }

  .inv-btn-primary {
    height: 36px;
    padding: 0 16px;
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .inv-btn-primary:hover { opacity: 0.82; }

  .inv-btn-secondary {
    height: 36px;
    padding: 0 16px;
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .inv-btn-secondary:hover { opacity: 0.82; }

  .inv-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  .inv-summary-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.25rem 1.5rem;
  }
  .inv-summary-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 8px;
  }
  .inv-summary-value {
    font-family: var(--serif);
    font-size: 28px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }
  .inv-summary-sub {
    font-size: 13px;
    font-weight: 600;
  }

  .inv-allocation-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }
  .inv-allocation-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1rem;
  }
  .inv-allocation-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .inv-allocation-sub {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-3);
  }
  .inv-allocation-status {
    font-size: 16px;
    font-weight: 600;
    text-align: right;
  }
  .inv-allocation-progress {
    margin-bottom: 1rem;
  }
  .inv-allocation-bar {
    height: 8px;
    background: var(--bg-surface);
    border-radius: 99px;
    overflow: hidden;
  }
  .inv-allocation-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s ease;
  }
  .inv-allocation-warning {
    font-size: 12px;
    color: var(--error);
    margin-top: 8px;
  }

  .inv-list-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.5rem;
  }
  .inv-section-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 1rem;
  }

  .inv-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 1rem;
    text-align: center;
  }

  .inv-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .inv-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    gap: 1rem;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .inv-item:hover { opacity: 0.82; }

  .inv-item-left {
    display: flex;
    gap: 12px;
    align-items: center;
    flex: 1;
    min-width: 0;
  }
  .inv-item-icon {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .inv-item-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .inv-item-meta {
    display: flex;
    gap: 10px;
    align-items: center;
    font-size: 11px;
  }
  .inv-item-type {
    font-weight: 500;
  }
  .inv-item-quantity {
    color: var(--text-3);
  }

  .inv-item-right {
    text-align: right;
  }
  .inv-item-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1);
    margin-bottom: 4px;
  }
  .inv-item-pl {
    font-size: 12px;
    font-weight: 500;
  }

  .inv-update-btn {
    margin-top: 8px;
    height: 28px;
    padding: 0 12px;
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .inv-update-btn:hover { opacity: 0.82; }

  .inv-edit-form {
    display: flex;
    flex-direction: column;
    gap: 8px;
    align-items: flex-end;
  }
  .inv-edit-input {
    width: 140px;
    height: 32px;
    padding: 0 10px;
    font-size: 13px;
    border: 0.5px solid var(--border-md);
    border-radius: 6px;
    background: var(--bg-surface);
    color: var(--text-1);
  }
  .inv-edit-btn {
    height: 28px;
    padding: 0 12px;
    border: none;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .inv-edit-btn:hover { opacity: 0.82; }
  .inv-save-btn {
    background: var(--success);
    color: white;
  }
  .inv-cancel-btn {
    background: var(--bg-surface);
    color: var(--text-2);
    border: 0.5px solid var(--border-md);
  }

  @media (max-width: 768px) {
    .inv-summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .inv-title {
      font-size: 20px;
    }
  }
  @media (min-width: 1024px) {
    .inv-root {
      gap: 1.5rem;
    }
    .inv-title {
      font-size: 28px;
    }
    .inv-summary-card {
      padding: 1.5rem 1.75rem;
    }
    .inv-list-card {
      padding: 1.75rem 2rem;
    }
    .inv-summary-value {
      font-size: 32px;
    }
  }
`;
