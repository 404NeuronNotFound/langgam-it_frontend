"use client";

import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// Mock data - will be replaced with API calls later
const mockIncomeVsExpenses = [
  { month: "Jan", income: 10000, expenses: 7500 },
  { month: "Feb", income: 12000, expenses: 8200 },
  { month: "Mar", income: 11000, expenses: 7800 },
  { month: "Apr", income: 13000, expenses: 9100 },
  { month: "May", income: 11500, expenses: 8500 },
  { month: "Jun", income: 14000, expenses: 9800 },
];

const mockSavingsTrend = [
  { month: "Jan", savings: 2500, cumulative: 2500 },
  { month: "Feb", savings: 3800, cumulative: 6300 },
  { month: "Mar", savings: 3200, cumulative: 9500 },
  { month: "Apr", savings: 3900, cumulative: 13400 },
  { month: "May", savings: 3000, cumulative: 16400 },
  { month: "Jun", savings: 4200, cumulative: 20600 },
];

const mockNetWorth = [
  { month: "Jan", net_worth: 50000 },
  { month: "Feb", net_worth: 56300 },
  { month: "Mar", net_worth: 59500 },
  { month: "Apr", net_worth: 63400 },
  { month: "May", net_worth: 66400 },
  { month: "Jun", net_worth: 70600 },
];

export default function ReportsPage() {
  const [timeRange, setTimeRange] = useState<"6m" | "1y" | "all">("6m");

  function formatCurrency(val: number) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  }

  // Calculate summary stats
  const totalIncome = mockIncomeVsExpenses.reduce((sum, d) => sum + d.income, 0);
  const totalExpenses = mockIncomeVsExpenses.reduce((sum, d) => sum + d.expenses, 0);
  const totalSavings = totalIncome - totalExpenses;
  const savingsRate = totalIncome > 0 ? (totalSavings / totalIncome) * 100 : 0;

  return (
    <>
      <style>{REPORTS_STYLES}</style>
      <div className="rep-root">
        <div className="rep-header">
          <div>
            <h1 className="rep-title">Reports</h1>
            <p className="rep-subtitle">Analyze your financial trends and performance</p>
          </div>
          <div className="rep-time-selector">
            <button
              className={`rep-time-btn ${timeRange === "6m" ? "active" : ""}`}
              onClick={() => setTimeRange("6m")}
            >
              6 Months
            </button>
            <button
              className={`rep-time-btn ${timeRange === "1y" ? "active" : ""}`}
              onClick={() => setTimeRange("1y")}
            >
              1 Year
            </button>
            <button
              className={`rep-time-btn ${timeRange === "all" ? "active" : ""}`}
              onClick={() => setTimeRange("all")}
            >
              All Time
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="rep-summary-grid">
          <div className="rep-summary-card">
            <p className="rep-summary-label">Total Income</p>
            <p className="rep-summary-value" style={{ color: "var(--success)" }}>
              {formatCurrency(totalIncome)}
            </p>
          </div>
          <div className="rep-summary-card">
            <p className="rep-summary-label">Total Expenses</p>
            <p className="rep-summary-value" style={{ color: "var(--error)" }}>
              {formatCurrency(totalExpenses)}
            </p>
          </div>
          <div className="rep-summary-card">
            <p className="rep-summary-label">Total Savings</p>
            <p className="rep-summary-value" style={{ color: "var(--blue-icon)" }}>
              {formatCurrency(totalSavings)}
            </p>
          </div>
          <div className="rep-summary-card">
            <p className="rep-summary-label">Savings Rate</p>
            <p className="rep-summary-value" style={{ color: "var(--purple-icon)" }}>
              {savingsRate.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Income vs Expenses Chart */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <p className="rep-chart-title">Income vs Expenses</p>
              <p className="rep-chart-sub">Monthly comparison of income and spending</p>
            </div>
          </div>
          <div className="rep-chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockIncomeVsExpenses}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-3)" style={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-3)" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "0.5px solid var(--border-md)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="income" fill="#3B6D11" name="Income" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" fill="#993C1D" name="Expenses" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Savings Trend Chart */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <p className="rep-chart-title">Savings Trend</p>
              <p className="rep-chart-sub">Monthly and cumulative savings over time</p>
            </div>
          </div>
          <div className="rep-chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockSavingsTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-3)" style={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-3)" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "0.5px solid var(--border-md)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="savings"
                  stroke="#185FA5"
                  strokeWidth={2}
                  name="Monthly Savings"
                  dot={{ fill: "#185FA5", r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulative"
                  stroke="#534AB7"
                  strokeWidth={2}
                  name="Cumulative"
                  dot={{ fill: "#534AB7", r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Net Worth Chart */}
        <div className="rep-chart-card">
          <div className="rep-chart-header">
            <div>
              <p className="rep-chart-title">Net Worth Over Time</p>
              <p className="rep-chart-sub">Track your total wealth growth</p>
            </div>
          </div>
          <div className="rep-chart-body">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockNetWorth}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--text-3)" style={{ fontSize: 12 }} />
                <YAxis stroke="var(--text-3)" style={{ fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: "var(--bg-card)",
                    border: "0.5px solid var(--border-md)",
                    borderRadius: "8px",
                    fontSize: 12,
                  }}
                  formatter={(value: any) => formatCurrency(Number(value))}
                />
                <Line
                  type="monotone"
                  dataKey="net_worth"
                  stroke="#3B6D11"
                  strokeWidth={3}
                  name="Net Worth"
                  dot={{ fill: "#3B6D11", r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </>
  );
}

const REPORTS_STYLES = `
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
    --blue-icon:  #185FA5;
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
      --success:    #97C459;
      --blue-icon:  #85B7EB;
      --purple-icon:#AFA9EC;
    }
  }

  .rep-root {
    font-family: var(--sans);
    max-width: 1200px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .rep-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
  }
  .rep-title {
    font-family: var(--serif);
    font-size: 24px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.3px;
    margin-bottom: 6px;
  }
  .rep-subtitle {
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.6;
  }

  .rep-time-selector {
    display: flex;
    gap: 6px;
    background: var(--bg-surface);
    padding: 4px;
    border-radius: var(--radius-sm);
  }
  .rep-time-btn {
    height: 32px;
    padding: 0 14px;
    background: transparent;
    color: var(--text-2);
    border: none;
    border-radius: 6px;
    font-family: var(--sans);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }
  .rep-time-btn:hover {
    background: var(--bg-card);
  }
  .rep-time-btn.active {
    background: var(--bg-card);
    color: var(--text-1);
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  }

  .rep-summary-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 1rem;
  }
  .rep-summary-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1.25rem 1.5rem;
  }
  .rep-summary-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--text-3);
    margin-bottom: 8px;
  }
  .rep-summary-value {
    font-family: var(--serif);
    font-size: 24px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.4px;
  }

  .rep-chart-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 1.5rem 1.75rem;
  }
  .rep-chart-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
  }
  .rep-chart-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 3px;
  }
  .rep-chart-sub {
    font-size: 12px;
    color: var(--text-3);
  }
  .rep-chart-body {
    margin: 0 -4px;
  }

  @media (max-width: 768px) {
    .rep-summary-grid {
      grid-template-columns: repeat(2, 1fr);
    }
    .rep-title {
      font-size: 20px;
    }
    .rep-time-selector {
      width: 100%;
    }
    .rep-time-btn {
      flex: 1;
    }
  }
  @media (min-width: 1024px) {
    .rep-root {
      gap: 1.5rem;
    }
    .rep-title {
      font-size: 28px;
    }
    .rep-summary-card {
      padding: 1.5rem 1.75rem;
    }
    .rep-chart-card {
      padding: 2rem 2.25rem;
    }
    .rep-summary-value {
      font-size: 28px;
    }
  }
`;
