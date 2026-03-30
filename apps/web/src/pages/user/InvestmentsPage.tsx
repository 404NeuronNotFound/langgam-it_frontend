"use client";

import { useState } from "react";

// Mock data for now - will be replaced with API calls later
const mockInvestments = [
  {
    id: 1,
    name: "Apple Inc. (AAPL)",
    type: "stocks",
    purchase_price: "150000",
    current_value: "175000",
    quantity: "100",
    purchase_date: "2025-01-15",
    notes: "Tech stock investment",
  },
  {
    id: 2,
    name: "Bitcoin",
    type: "crypto",
    purchase_price: "50000",
    current_value: "48000",
    quantity: "0.5",
    purchase_date: "2025-02-01",
    notes: "Long-term hold",
  },
];

export default function InvestmentsPage() {
  const [investments] = useState(mockInvestments);

  // Calculate totals
  const totalInvested = investments.reduce((sum, inv) => sum + parseFloat(inv.purchase_price), 0);
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

  return (
    <>
      <style>{INVESTMENTS_STYLES}</style>
      <div className="inv-root">
        <div className="inv-header">
          <div>
            <h1 className="inv-title">Investments</h1>
            <p className="inv-subtitle">Track your assets and portfolio performance</p>
          </div>
          <button className="inv-btn-primary">
            Add Investment
          </button>
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
        </div>

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
                const invested = parseFloat(investment.purchase_price);
                const current = parseFloat(investment.current_value);
                const pl = current - invested;
                const plPercent = invested > 0 ? (pl / invested) * 100 : 0;
                const typeColor = getTypeColor(investment.type);

                return (
                  <div
                    key={investment.id}
                    className="inv-item"
                  >
                    <div className="inv-item-left">
                      <div className="inv-item-icon" style={{ background: typeColor.bg }}>
                        <InvestmentIcon type={investment.type} color={typeColor.text} />
                      </div>
                      <div>
                        <p className="inv-item-name">{investment.name}</p>
                        <div className="inv-item-meta">
                          <span
                            className="inv-item-type"
                            style={{ color: typeColor.text }}
                          >
                            {getTypeLabel(investment.type)}
                          </span>
                          <span className="inv-item-quantity">
                            Qty: {parseFloat(investment.quantity).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="inv-item-right">
                      <p className="inv-item-value">{formatCurrency(current)}</p>
                      <p
                        className="inv-item-pl"
                        style={{ color: pl >= 0 ? "var(--success)" : "var(--error)" }}
                      >
                        {pl >= 0 ? "+" : ""}{formatCurrency(pl)} ({pl >= 0 ? "+" : ""}
                        {plPercent.toFixed(2)}%)
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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

  .inv-summary-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
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

  @media (max-width: 768px) {
    .inv-summary-grid {
      grid-template-columns: 1fr;
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
