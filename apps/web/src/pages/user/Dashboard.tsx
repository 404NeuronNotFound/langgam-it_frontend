import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts"
import { useAuthStore } from "../../store/authStore"
import { useFundStore } from "../../store/fundStore"
import { useCycleStore } from "../../store/cycleStore"
import { useExpenseStore } from "../../store/expenseStore"
import { useAlertStore } from "../../store/alertStore"
import { useNetWorthStore } from "../../store/netWorthStore"
import { useTransferStore } from "../../store/transferStore"
import { useBudgetStore } from "../../store/budgetStore"
import type {
  Alert,
  DailyLimit,
  Expense,
  Fund,
  MonthCycle,
  Transfer,
} from "../../types"

type ChartDataPoint = {
  date: string
  net_worth: number
  label: string
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()

  const fundStore = useFundStore()
  const cycleStore = useCycleStore()
  const expenseStore = useExpenseStore()
  const alertStore = useAlertStore()
  const netWorthStore = useNetWorthStore()
  const transferStore = useTransferStore()
  const budgetStore = useBudgetStore()

  const [isLoading, setIsLoading] = useState(true)
  const [closingMonth, setClosingMonth] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setIsLoading(true)
      await Promise.all([
        useFundStore.getState().fetchFunds(),
        useNetWorthStore.getState().fetchSnapshots(30),
        useExpenseStore.getState().fetchExpenses(),
        useExpenseStore.getState().fetchDailyLimit(),
        useAlertStore.getState().fetchAlerts(),
        useTransferStore.getState().fetchTransfers({ limit: 10 }),
        useBudgetStore.getState().fetchSetups(),
      ])

      if (!cancelled) {
        setIsLoading(false)
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [])

  const cashOnHand = fundStore.getCashOnHand()
  const allFunds = fundStore.funds.filter((f) => f.status === "active")
  const activeCycle = cycleStore.activeCycle
  const chartData = netWorthStore.getChartDataLimited(30)
  const latestAlert = alertStore.getLatestUnread()
  const budgetWarning = budgetStore.activeSetup?.allocation_warning ?? null
  const recentExpenses = expenseStore.expenses.slice(0, 5)
  const recentTransfers = transferStore.getManualTransfers().slice(0, 5)
  const greeting = _getGreeting()
  const firstName = user?.first_name || user?.username || "there"

  async function handleCloseMonth() {
    setClosingMonth(true)
    try {
      await cycleStore.closeMonth()
      setShowCloseConfirm(false)
    } finally {
      setClosingMonth(false)
    }
  }

  if (isLoading) return <DashboardSkeleton />

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="dash-root">
        <DashboardHeader
          greeting={greeting}
          name={firstName}
          cycle={activeCycle}
          onCloseMonth={() => setShowCloseConfirm(true)}
        />

        {showCloseConfirm && (
          <CloseMonthModal
            cycle={activeCycle}
            isClosing={closingMonth}
            onConfirm={handleCloseMonth}
            onCancel={() => setShowCloseConfirm(false)}
          />
        )}

        {latestAlert && (
          <AlertBanner
            alert={latestAlert}
            onDismiss={() => alertStore.markRead(latestAlert.id)}
          />
        )}

        {!latestAlert && budgetWarning && (
          <div className="dash-alert-banner daily_limit" role="alert">
            <span aria-hidden="true">!</span>
            <div className="dash-alert-message">
              <span className="dash-alert-type">Budget warning</span>
              {budgetWarning}
            </div>
          </div>
        )}

        <NetWorthCard
          currentNetWorth={netWorthStore.getNetWorthNumber()}
          change={netWorthStore.getNetWorthChange()}
          changePct={netWorthStore.getNetWorthChangePct()}
          trend={netWorthStore.getTrendDirection()}
          chartData={chartData}
        />

        {activeCycle ? (
          <div className="dash-row-2">
            <CycleCard cycle={activeCycle} onNavigate={() => navigate("/income")} />
            <CashOnHandCard
              fund={cashOnHand}
              onAddMoney={() => navigate("/transfers")}
              onAddExpense={() => navigate("/expenses")}
            />
          </div>
        ) : (
          <NoActiveCycleCard onNavigate={() => navigate("/income")} />
        )}

        {activeCycle && (
          <BudgetProgressCard
            cycle={activeCycle}
            dailyLimit={expenseStore.dailyLimit}
            needsProgress={cycleStore.getNeedsProgress()}
            wantsProgress={cycleStore.getWantsProgress()}
          />
        )}

        <FundEnvelopesCard funds={allFunds} onViewAll={() => navigate("/funds")} />

        <RecentExpensesCard
          expenses={recentExpenses}
          onViewAll={() => navigate("/expenses")}
          onAddExpense={() => navigate("/expenses")}
        />

        <RecentTransfersCard
          transfers={recentTransfers}
          onViewAll={() => navigate("/transfers")}
          onAddMoney={() => navigate("/transfers")}
        />
      </div>
    </>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="dash-root">
        <div className="dash-header">
          <div>
            <div className="dash-skeleton-block" style={{ width: 220, height: 34 }} />
            <div
              className="dash-skeleton-block"
              style={{ width: 280, height: 14, marginTop: 10 }}
            />
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-skeleton-block" style={{ width: 110, height: 12 }} />
          <div
            className="dash-skeleton-block"
            style={{ width: "60%", height: 56, marginTop: 18 }}
          />
          <div
            className="dash-skeleton-block"
            style={{ width: "100%", height: 140, marginTop: 24 }}
          />
        </div>
        <div className="dash-row-2">
          <div className="dash-card">
            <div className="dash-skeleton-block" style={{ height: 120 }} />
          </div>
          <div className="dash-card">
            <div className="dash-skeleton-block" style={{ height: 120 }} />
          </div>
        </div>
        <div className="dash-card">
          <div className="dash-skeleton-block" style={{ height: 180 }} />
        </div>
      </div>
    </>
  )
}

function DashboardHeader({
  greeting,
  name,
  cycle,
  onCloseMonth,
}: {
  greeting: string
  name: string
  cycle: MonthCycle | null
  onCloseMonth: () => void
}) {
  const subtitle = cycle
    ? `Here's your snapshot for ${_getMonthName(cycle.month)} ${cycle.year}`
    : "Here's your financial snapshot."

  return (
    <header className="dash-header">
      <div>
        <h1 className="dash-greeting">
          {greeting}, {name}.
        </h1>
        <p className="dash-greeting-sub">{subtitle}</p>
      </div>
      {cycle && (
        <button className="dash-btn-secondary" type="button" onClick={onCloseMonth}>
          Close Month
        </button>
      )}
    </header>
  )
}

function AlertBanner({
  alert,
  onDismiss,
}: {
  alert: Alert
  onDismiss: () => void
}) {
  return (
    <div className={`dash-alert-banner ${alert.type}`} role="alert">
      <span aria-hidden="true">!</span>
      <div className="dash-alert-message">
        <span className="dash-alert-type">{alert.type_display}</span>
        {alert.message}
      </div>
      <button
        className="dash-alert-dismiss"
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss alert"
      >
        x
      </button>
    </div>
  )
}

function NetWorthCard({
  currentNetWorth,
  change,
  changePct,
  trend,
  chartData,
}: {
  currentNetWorth: number
  change: number
  changePct: number
  trend: "up" | "down" | "flat"
  chartData: ChartDataPoint[]
}) {
  const arrow = trend === "up" ? "up" : trend === "down" ? "down" : "flat"
  const strokeColor = trend === "down" ? "#993C1D" : "#185FA5"

  return (
    <section className="dash-card">
      <p className="dash-section-label">Net Worth</p>
      <p className="dash-nw-value">{_formatCurrency(currentNetWorth)}</p>
      <p className={`dash-nw-change ${trend}`}>
        {arrow}: {_formatCurrency(Math.abs(change))} ({changePct.toFixed(1)}%)
      </p>

      {chartData.length >= 2 ? (
        <ResponsiveContainer width="100%" height={140}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
            <XAxis dataKey="label" hide />
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Tooltip
              formatter={(value) => _formatCurrency(Number(value))}
              labelFormatter={(label) => String(label)}
            />
            <Line
              type="monotone"
              dataKey="net_worth"
              stroke={strokeColor}
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      ) : (
        <div className="dash-chart-empty">
          Chart will appear after your first transactions
        </div>
      )}
    </section>
  )
}

function CycleCard({
  cycle,
  onNavigate,
}: {
  cycle: MonthCycle
  onNavigate: () => void
}) {
  const label =
    cycle.income_scenario === "full"
      ? "Full income"
      : cycle.income_scenario === "low"
        ? "Low income"
        : "Zero income"

  return (
    <section className="dash-card">
      <p className="dash-section-label">This Month</p>
      <span className={`dash-badge ${cycle.income_scenario || "zero"}`}>
        {label}
      </span>
      <p className="dash-cycle-income">
        {_getMonthName(cycle.month)} {cycle.year}
      </p>
      <p className="dash-greeting-sub">
        Income entered: {_formatCurrency(parseFloat(cycle.income_entered))}
      </p>
      <button className="dash-link-btn" type="button" onClick={onNavigate}>
        Edit income -&gt;
      </button>
    </section>
  )
}

function CashOnHandCard({
  fund,
  onAddMoney,
  onAddExpense,
}: {
  fund: Fund | undefined
  onAddMoney: () => void
  onAddExpense: () => void
}) {
  return (
    <section className="dash-card">
      <p className="dash-section-label">Cash On Hand</p>
      <p className="dash-coh-value">
        {_formatCurrency(fund ? parseFloat(fund.current_balance) : 0)}
      </p>
      <p className="dash-coh-sub">Available to spend</p>
      <div className="dash-actions">
        <button className="dash-btn-secondary" type="button" onClick={onAddMoney}>
          + Add Money
        </button>
        <button className="dash-btn-primary" type="button" onClick={onAddExpense}>
          + Add Expense
        </button>
      </div>
    </section>
  )
}

function NoActiveCycleCard({ onNavigate }: { onNavigate: () => void }) {
  return (
    <section className="dash-card dash-no-cycle">
      <div className="dash-no-cycle-icon">Start</div>
      <h2 className="dash-no-cycle-title">No active cycle</h2>
      <p className="dash-no-cycle-sub">
        Submit your income to start tracking this month's budget.
      </p>
      <button className="dash-btn-primary" type="button" onClick={onNavigate}>
        Submit Income -&gt;
      </button>
    </section>
  )
}

function BudgetProgressCard({
  cycle,
  dailyLimit,
  needsProgress,
  wantsProgress,
}: {
  cycle: MonthCycle
  dailyLimit: DailyLimit | null
  needsProgress: number
  wantsProgress: number
}) {
  const todaySpent = dailyLimit ? parseFloat(dailyLimit.today_spent) : 0
  const limit = dailyLimit ? parseFloat(dailyLimit.daily_limit) : 0
  const overDaily = dailyLimit ? todaySpent > limit : false

  return (
    <section className="dash-card">
      <p className="dash-section-label">Budget</p>
      <ProgressRow
        label="Needs"
        progress={needsProgress}
        spent={parseFloat(cycle.needs_spent)}
        budget={parseFloat(cycle.needs_budget_used)}
      />
      <ProgressRow
        label="Wants"
        progress={wantsProgress}
        spent={parseFloat(cycle.wants_spent)}
        budget={parseFloat(cycle.wants_budget_used)}
      />
      {dailyLimit && (
        <p className={`dash-daily-limit-row ${overDaily ? "over" : ""}`}>
          Daily limit: {_formatCurrency(limit)}/day - Today:{" "}
          {_formatCurrency(todaySpent)}
        </p>
      )}
    </section>
  )
}

function ProgressRow({
  label,
  progress,
  spent,
  budget,
}: {
  label: string
  progress: number
  spent: number
  budget: number
}) {
  const color = progress >= 100 ? "red" : progress >= 80 ? "amber" : "green"

  return (
    <div className="dash-progress-row">
      <span className="dash-progress-label">{label}</span>
      <div className="dash-progress-track">
        <div
          className={`dash-progress-fill ${color}`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
      <span className="dash-progress-text">
        {_formatCurrency(spent)} / {_formatCurrency(budget)}
      </span>
    </div>
  )
}

function FundEnvelopesCard({
  funds,
  onViewAll,
}: {
  funds: Fund[]
  onViewAll: () => void
}) {
  const visible = funds
    .slice()
    .sort((a, b) => a.allocation_priority - b.allocation_priority)
    .slice(0, 6)
  const hiddenCount = Math.max(0, funds.length - visible.length)

  return (
    <section className="dash-card">
      <div className="dash-section-header">
        <p className="dash-section-label">Funds</p>
        <button className="dash-link-btn" type="button" onClick={onViewAll}>
          View all -&gt;
        </button>
      </div>
      <div className="dash-fund-list">
        {visible.map((fund) => (
          <FundRow fund={fund} key={fund.id} />
        ))}
      </div>
      {hiddenCount > 0 && <p className="dash-more">+{hiddenCount} more</p>}
    </section>
  )
}

function FundRow({ fund }: { fund: Fund }) {
  const progress = fund.progress_percentage ?? null
  const needed = fund.monthly_allocation_needed
    ? parseFloat(fund.monthly_allocation_needed)
    : 0
  const allocated = parseFloat(fund.monthly_allocation)
  const behindPace = fund.type === "goal" && needed > allocated && allocated > 0

  return (
    <div className="dash-fund-row">
      <span className="dash-fund-icon">{_fundIcon(fund)}</span>
      <div className="dash-fund-info">
        <p className="dash-fund-name">
          {fund.name}
          {behindPace && (
            <span className="dash-warning-dot" title="Behind target pace" />
          )}
        </p>
        <p className="dash-fund-sub">
          {fund.target_amount ? `Target ${_formatCurrency(parseFloat(fund.target_amount))}` : fund.type}
        </p>
      </div>
      <p className="dash-fund-balance">
        {_formatCurrency(parseFloat(fund.current_balance))}
      </p>
      {progress !== null && (
        <div className="dash-fund-progress-wrap">
          <div className="dash-fund-track">
            <div
              className={`dash-fund-fill ${progress >= 100 ? "complete" : ""}`}
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
          <p className="dash-fund-pct">{progress}%</p>
        </div>
      )}
    </div>
  )
}

function RecentExpensesCard({
  expenses,
  onViewAll,
  onAddExpense,
}: {
  expenses: Expense[]
  onViewAll: () => void
  onAddExpense: () => void
}) {
  return (
    <section className="dash-card">
      <div className="dash-section-header">
        <p className="dash-section-label">Recent Expenses</p>
        <button className="dash-link-btn" type="button" onClick={onViewAll}>
          View all -&gt;
        </button>
      </div>
      {expenses.length === 0 ? (
        <div className="dash-empty">
          <p>No expenses yet this month.</p>
          <button className="dash-btn-primary" type="button" onClick={onAddExpense}>
            Log first expense
          </button>
        </div>
      ) : (
        <div className="dash-expense-list">
          {expenses.map((expense) => (
            <div className="dash-expense-row" key={expense.id}>
              <span className={`dash-expense-dot ${expense.category}`} />
              <p className="dash-expense-desc">
                {expense.description || "Expense"}
              </p>
              <span className="dash-expense-date">{_formatDate(expense.date)}</span>
              <span className="dash-expense-amount">
                -{_formatCurrency(parseFloat(expense.amount))}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

function RecentTransfersCard({
  transfers,
  onViewAll,
  onAddMoney,
}: {
  transfers: Transfer[]
  onViewAll: () => void
  onAddMoney: () => void
}) {
  return (
    <section className="dash-card">
      <div className="dash-section-header">
        <p className="dash-section-label">Recent Transfers</p>
        <button className="dash-link-btn" type="button" onClick={onViewAll}>
          View all -&gt;
        </button>
      </div>
      {transfers.length === 0 ? (
        <div className="dash-empty">
          <p>No transfers yet.</p>
          <button className="dash-btn-primary" type="button" onClick={onAddMoney}>
            Add money
          </button>
        </div>
      ) : (
        <div className="dash-transfer-list">
          {transfers.map((transfer) => {
            const isCashIn = transfer.to_fund_name === "Cash on Hand"
            return (
              <div className="dash-transfer-row" key={transfer.id}>
                <div className="dash-transfer-flow">
                  <p className="dash-transfer-route">
                    {transfer.from_fund_name} -&gt; {transfer.to_fund_name}
                  </p>
                  <p className="dash-transfer-note">
                    {transfer.note || _formatDate(transfer.date)}
                  </p>
                </div>
                <span
                  className={`dash-transfer-amount ${isCashIn ? "positive" : ""}`}
                >
                  {isCashIn ? "+" : ""}
                  {_formatCurrency(parseFloat(transfer.amount))}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function CloseMonthModal({
  cycle,
  isClosing,
  onConfirm,
  onCancel,
}: {
  cycle: MonthCycle | null
  isClosing: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div className="dash-modal-overlay">
      <div className="dash-modal">
        <h2 className="dash-modal-title">
          Close {cycle ? `${_getMonthName(cycle.month)} ${cycle.year}` : "month"}?
        </h2>
        <p className="dash-modal-body">
          This will finalize your month summary and close the current cycle.
        </p>
        <div className="dash-modal-actions">
          <button
            className="dash-btn-secondary"
            type="button"
            onClick={onCancel}
            disabled={isClosing}
          >
            Cancel
          </button>
          <button
            className="dash-btn-primary"
            type="button"
            onClick={onConfirm}
            disabled={isClosing}
          >
            {isClosing && <span className="dash-btn-spinner" />}
            Close Month
          </button>
        </div>
      </div>
    </div>
  )
}

function _getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function _formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function _formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  })
}

function _getMonthName(month: number): string {
  return new Date(2026, month - 1).toLocaleDateString("en-PH", {
    month: "long",
  })
}

function _fundIcon(fund: Fund): string {
  if (fund.name === "Emergency Fund") return "EF"
  if (fund.name === "Savings") return "SV"
  if (fund.name === "Cash on Hand") return "CH"
  return fund.icon || "FD"
}

const PAGE_STYLES = `
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
    --warning:    #854F0B;
    --warning-bg: #FAEEDA;
    --blue:       #185FA5;
    --blue-bg:    #E6F1FB;
    --purple:     #534AB7;
    --purple-bg:  #EEEDFE;
    --sans:  'Plus Jakarta Sans', system-ui, sans-serif;
    --serif: 'Lora', Georgia, serif;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;
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
      --warning:    #EF9F27;
      --warning-bg: #412402;
      --blue:       #85B7EB;
      --blue-bg:    #042C53;
      --purple:     #AFA9EC;
      --purple-bg:  #26215C;
    }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .dash-root {
    font-family: var(--sans);
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 2rem;
  }

  .dash-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
    padding-top: 0.25rem;
  }

  .dash-greeting {
    font-family: var(--serif);
    font-size: 26px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }

  .dash-greeting-sub { font-size: 13px; color: var(--text-3); line-height: 1.5; }

  .dash-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
  }

  .dash-section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
    margin-bottom: 0.75rem;
  }

  .dash-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .dash-section-header .dash-section-label { margin-bottom: 0; }

  .dash-link-btn {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-3);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
  }

  .dash-link-btn:hover { color: var(--text-1); }

  .dash-nw-value {
    font-family: var(--serif);
    font-size: 40px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.8px;
    line-height: 1;
    margin-bottom: 6px;
  }

  .dash-nw-change {
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 1.25rem;
  }

  .dash-nw-change.up { color: var(--success); }
  .dash-nw-change.down { color: var(--error); }
  .dash-nw-change.flat { color: var(--text-3); }

  .dash-chart-empty {
    height: 140px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    color: var(--text-3);
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    text-align: center;
    padding: 1rem;
  }

  .dash-row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  @media (max-width: 540px) {
    .dash-row-2 { grid-template-columns: 1fr; }
  }

  .dash-badge {
    display: inline-flex;
    align-items: center;
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    margin-bottom: 0.5rem;
  }

  .dash-badge.full { background: var(--success-bg); color: var(--success); }
  .dash-badge.low { background: var(--warning-bg); color: var(--warning); }
  .dash-badge.zero { background: var(--error-bg); color: var(--error); }

  .dash-cycle-income,
  .dash-coh-value {
    font-family: var(--serif);
    font-size: 28px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }

  .dash-coh-sub {
    font-size: 12px;
    color: var(--text-3);
    margin-bottom: 1rem;
  }

  .dash-actions { display: flex; gap: 0.5rem; flex-wrap: wrap; }

  .dash-progress-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0.75rem;
  }

  .dash-progress-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
    min-width: 42px;
  }

  .dash-progress-track {
    flex: 1;
    height: 8px;
    background: var(--bg-surface);
    border-radius: 4px;
    overflow: hidden;
  }

  .dash-progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.4s ease;
  }

  .dash-progress-fill.green { background: var(--success); }
  .dash-progress-fill.amber { background: var(--warning); }
  .dash-progress-fill.red { background: var(--error); }

  .dash-progress-text {
    font-size: 12px;
    color: var(--text-3);
    min-width: 155px;
    text-align: right;
    white-space: nowrap;
  }

  .dash-daily-limit-row {
    font-size: 12px;
    color: var(--text-3);
    margin-top: 0.375rem;
    padding-top: 0.75rem;
    border-top: 0.5px solid var(--border);
  }

  .dash-daily-limit-row.over { color: var(--warning); }

  .dash-alert-banner {
    border-radius: var(--radius-md);
    padding: 12px 16px;
    display: flex;
    align-items: flex-start;
    gap: 10px;
    font-size: 13px;
    line-height: 1.5;
  }

  .dash-alert-banner.overspend,
  .dash-alert-banner.daily_limit { background: var(--warning-bg); color: var(--warning); }
  .dash-alert-banner.hard_stop,
  .dash-alert-banner.emergency_low { background: var(--error-bg); color: var(--error); }
  .dash-alert-banner.goal_behind { background: var(--purple-bg); color: var(--purple); }

  .dash-alert-message { flex: 1; }
  .dash-alert-type { font-weight: 600; margin-right: 4px; }

  .dash-alert-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    padding: 0;
    font-size: 18px;
    line-height: 1;
    opacity: 0.7;
    flex-shrink: 0;
  }

  .dash-alert-dismiss:hover { opacity: 1; }

  .dash-fund-list,
  .dash-expense-list,
  .dash-transfer-list {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .dash-fund-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 8px;
    border-radius: var(--radius-sm);
    transition: background 0.15s;
  }

  .dash-fund-row:hover { background: var(--bg-surface); }

  .dash-fund-icon {
    width: 32px;
    height: 32px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-2);
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .dash-fund-info { flex: 1; min-width: 0; }

  .dash-fund-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .dash-fund-sub {
    font-size: 11px;
    color: var(--text-3);
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dash-fund-balance {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    text-align: right;
    flex-shrink: 0;
  }

  .dash-fund-progress-wrap { width: 60px; flex-shrink: 0; }

  .dash-fund-track {
    height: 4px;
    background: var(--bg-surface);
    border-radius: 2px;
    overflow: hidden;
    margin-bottom: 2px;
  }

  .dash-fund-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--blue);
  }

  .dash-fund-fill.complete { background: var(--success); }

  .dash-fund-pct {
    font-size: 10px;
    color: var(--text-3);
    text-align: right;
  }

  .dash-warning-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--warning);
    flex-shrink: 0;
  }

  .dash-more {
    margin-top: 0.75rem;
    font-size: 12px;
    color: var(--text-3);
  }

  .dash-expense-row,
  .dash-transfer-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 4px;
    border-bottom: 0.5px solid var(--border);
  }

  .dash-expense-row:last-child,
  .dash-transfer-row:last-child { border-bottom: none; }

  .dash-expense-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .dash-expense-dot.needs { background: var(--success); }
  .dash-expense-dot.wants { background: var(--warning); }

  .dash-expense-desc {
    flex: 1;
    font-size: 13px;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dash-expense-date {
    font-size: 11px;
    color: var(--text-3);
    flex-shrink: 0;
  }

  .dash-expense-amount {
    font-size: 13px;
    font-weight: 500;
    color: var(--error);
    flex-shrink: 0;
    min-width: 70px;
    text-align: right;
  }

  .dash-transfer-flow { flex: 1; min-width: 0; }

  .dash-transfer-route {
    font-size: 13px;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dash-transfer-note {
    font-size: 11px;
    color: var(--text-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .dash-transfer-amount {
    font-size: 13px;
    font-weight: 500;
    text-align: right;
    flex-shrink: 0;
    color: var(--text-2);
  }

  .dash-transfer-amount.positive { color: var(--success); }

  .dash-btn-primary,
  .dash-btn-secondary {
    height: 40px;
    padding: 0 16px;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .dash-btn-primary {
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
  }

  .dash-btn-secondary {
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
  }

  .dash-btn-primary:hover,
  .dash-btn-secondary:hover { opacity: 0.85; }
  .dash-btn-primary:disabled,
  .dash-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

  .dash-no-cycle {
    text-align: center;
    padding: 2rem;
  }

  .dash-no-cycle-icon {
    font-family: var(--serif);
    font-size: 30px;
    color: var(--text-1);
    margin-bottom: 0.75rem;
  }

  .dash-no-cycle-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 6px;
  }

  .dash-no-cycle-sub {
    font-size: 13px;
    color: var(--text-3);
    margin-bottom: 1.25rem;
    line-height: 1.5;
  }

  .dash-empty {
    padding: 1.5rem;
    text-align: center;
    font-size: 13px;
    color: var(--text-3);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  @keyframes dash-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .dash-skeleton-block {
    border-radius: var(--radius-sm);
    background: linear-gradient(90deg, var(--bg-surface) 25%, var(--border-md) 50%, var(--bg-surface) 75%);
    background-size: 200% 100%;
    animation: dash-shimmer 1.5s ease-in-out infinite;
  }

  .dash-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1.5rem;
  }

  .dash-modal {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    border: 0.5px solid var(--border-md);
    padding: 2rem;
    max-width: 400px;
    width: 100%;
  }

  .dash-modal-title {
    font-size: 18px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 8px;
  }

  .dash-modal-body {
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.6;
    margin-bottom: 1.5rem;
  }

  .dash-modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
  }

  .dash-btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: dash-spin 0.7s linear infinite;
  }

  @keyframes dash-spin { to { transform: rotate(360deg); } }

  @media (min-width: 640px) {
    .dash-greeting { font-size: 30px; }
    .dash-nw-value { font-size: 48px; }
    .dash-card { padding: 1.75rem; }
  }

  @media (max-width: 560px) {
    .dash-progress-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .dash-progress-track {
      width: 100%;
      flex: none;
    }

    .dash-progress-text {
      min-width: 0;
      text-align: left;
    }

    .dash-fund-row {
      align-items: flex-start;
      flex-wrap: wrap;
    }

    .dash-fund-balance {
      margin-left: auto;
    }
  }
`
