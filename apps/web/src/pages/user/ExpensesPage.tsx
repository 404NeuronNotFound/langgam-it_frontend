import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useExpenseStore } from "../../store/expenseStore"
import { useCycleStore } from "../../store/cycleStore"
import { useFundStore } from "../../store/fundStore"
import { useAlertStore } from "../../store/alertStore"
import type {
  Alert,
  DailyLimit,
  Expense,
  ExpenseCategory,
  ExpenseCreatePayload,
  MonthCycle,
} from "../../types"

type ExpenseFilter = "all" | ExpenseCategory

export default function ExpensesPage() {
  const navigate = useNavigate()
  const expenseStore = useExpenseStore()
  const cycleStore = useCycleStore()
  const fundStore = useFundStore()
  const alertStore = useAlertStore()

  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<ExpenseFilter>("all")
  const [showAddModal, setShowAddModal] = useState(false)
  const [newAlerts, setNewAlerts] = useState<Alert[]>([])

  useEffect(() => {
    let isMounted = true

    async function loadExpenses() {
      await Promise.all([
        useExpenseStore.getState().fetchExpenses(),
        useExpenseStore.getState().fetchDailyLimit(),
        useFundStore.getState().fetchFunds(),
        useAlertStore.getState().fetchAlerts(),
      ])

      if (isMounted) {
        setIsLoading(false)
      }
    }

    loadExpenses()

    return () => {
      isMounted = false
    }
  }, [])

  async function handleFilterChange(filter: ExpenseFilter) {
    setActiveFilter(filter)
    if (filter === "all") {
      await expenseStore.fetchExpenses()
    } else {
      await expenseStore.fetchByCategory(filter)
    }
  }

  async function handleAddExpense(payload: ExpenseCreatePayload): Promise<void> {
    const response = await expenseStore.addExpense(payload)
    setShowAddModal(false)

    if (response.alerts.length > 0) {
      setNewAlerts(response.alerts)
    }

    if (activeFilter !== "all") {
      await expenseStore.fetchByCategory(activeFilter)
    }
  }

  const byDate = expenseStore.getExpensesByDate()
  const sortedDates = Object.keys(byDate).sort().reverse()
  const activeCycle = cycleStore.activeCycle
  const cashOnHand = fundStore.getCashOnHand()

  if (isLoading) return <ExpensesPageSkeleton />

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="exp-root">
        <div className="exp-header">
          <div>
            <h1 className="exp-title">Expenses</h1>
            <p className="exp-subtitle">Track your daily spending</p>
          </div>
          {activeCycle && (
            <button
              className="exp-btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <PlusIcon /> Add Expense
            </button>
          )}
        </div>

        {newAlerts.length > 0 && (
          <NewAlertsBanner
            alerts={newAlerts}
            onDismiss={() => setNewAlerts([])}
            onMarkRead={(id) => alertStore.markRead(id)}
          />
        )}

        {!activeCycle ? (
          <NoActiveCycleCard onNavigate={() => navigate("/income")} />
        ) : (
          <>
            {expenseStore.dailyLimit && (
              <DailyLimitWidget
                dailyLimit={expenseStore.dailyLimit}
                isOver={expenseStore.isOverDailyLimit()}
                remaining={expenseStore.getRemainingToday()}
              />
            )}

            <BudgetProgressCard
              cycle={activeCycle}
              needsProgress={cycleStore.getNeedsProgress()}
              wantsProgress={cycleStore.getWantsProgress()}
            />

            {cashOnHand && (
              <CashOnHandBadge
                balance={parseFloat(cashOnHand.current_balance)}
              />
            )}

            <FilterTabs
              active={activeFilter}
              onChange={handleFilterChange}
              needsTotal={expenseStore.getNeedsTotal()}
              wantsTotal={expenseStore.getWantsTotal()}
            />

            {expenseStore.expenses.length === 0 ? (
              <EmptyExpenses
                filter={activeFilter}
                onAddExpense={() => setShowAddModal(true)}
              />
            ) : (
              <ExpenseList byDate={byDate} sortedDates={sortedDates} />
            )}
          </>
        )}

        {showAddModal && (
          <AddExpenseModal
            cashOnHand={parseFloat(cashOnHand?.current_balance ?? "0")}
            onClose={() => setShowAddModal(false)}
            onAdd={handleAddExpense}
          />
        )}
      </div>
    </>
  )
}

function DailyLimitWidget({
  dailyLimit,
  isOver,
  remaining,
}: {
  dailyLimit: DailyLimit
  isOver: boolean
  remaining: number
}) {
  const limit = parseFloat(dailyLimit.daily_limit)
  const todaySpent = parseFloat(dailyLimit.today_spent)
  const progress = limit > 0 ? Math.min(100, (todaySpent / limit) * 100) : 0

  return (
    <div className="exp-card exp-daily-card">
      <p className="exp-section-label">Daily limit</p>
      <div className="exp-daily-grid">
        <div>
          <p className="exp-daily-limit-value">{_formatCurrency(limit)}</p>
          <p className="exp-daily-limit-sub">per day guideline</p>
          <p className="exp-daily-days-left">
            {dailyLimit.remaining_days} day
            {dailyLimit.remaining_days !== 1 ? "s" : ""} left
          </p>
        </div>

        <div>
          <div className="exp-daily-today-row">
            <p className="exp-daily-today-label">Today</p>
            <p className={`exp-daily-today-value${isOver ? " over" : ""}`}>
              {_formatCurrency(todaySpent)}
            </p>
          </div>
          <div className="exp-daily-track">
            <div
              className={`exp-daily-fill${isOver ? " over" : ""}`}
              style={{ width: Math.min(100, progress) + "%" }}
            />
          </div>
          <p className={`exp-daily-remaining${isOver ? " over" : ""}`}>
            {isOver
              ? `${_formatCurrency(todaySpent - limit)} over limit`
              : `${_formatCurrency(remaining)} remaining today`}
          </p>
        </div>
      </div>
    </div>
  )
}

function BudgetProgressCard({
  cycle,
  needsProgress,
  wantsProgress,
}: {
  cycle: MonthCycle
  needsProgress: number
  wantsProgress: number
}) {
  const needsSpent = parseFloat(cycle.needs_spent)
  const wantsSpent = parseFloat(cycle.wants_spent)
  const needsBudget = parseFloat(cycle.needs_budget_used)
  const wantsBudget = parseFloat(cycle.wants_budget_used)
  const remaining = parseFloat(cycle.remaining_budget)

  function barColor(pct: number) {
    if (pct >= 100) return "red"
    if (pct >= 80) return "amber"
    return "green"
  }

  return (
    <div className="exp-card">
      <p className="exp-section-label">Budget progress</p>
      <div className="exp-progress-row">
        <span className="exp-progress-label">Needs</span>
        <div className="exp-progress-track">
          <div
            className={`exp-progress-fill ${barColor(needsProgress)}`}
            style={{ width: Math.min(100, needsProgress) + "%" }}
          />
        </div>
        <span className="exp-progress-text">
          {_formatCurrency(needsSpent)} / {_formatCurrency(needsBudget)}
        </span>
      </div>

      <div className="exp-progress-row">
        <span className="exp-progress-label">Wants</span>
        <div className="exp-progress-track">
          <div
            className={`exp-progress-fill ${barColor(wantsProgress)}`}
            style={{ width: Math.min(100, wantsProgress) + "%" }}
          />
        </div>
        <span className="exp-progress-text">
          {_formatCurrency(wantsSpent)} / {_formatCurrency(wantsBudget)}
        </span>
      </div>

      <div className="exp-remaining-row">
        <span className="exp-remaining-label">Remaining budget</span>
        <span
          className={`exp-remaining-value${
            remaining <= 0 ? " depleted" : ""
          }`}
        >
          {_formatCurrency(Math.max(0, remaining))}
          {remaining <= 0 && " - Stop spending"}
        </span>
      </div>
    </div>
  )
}

function CashOnHandBadge({ balance }: { balance: number }) {
  return (
    <div className="exp-coh-badge">
      <span className="exp-coh-label">Cash on Hand</span>
      <span className={`exp-coh-value${balance <= 0 ? " empty" : ""}`}>
        {_formatCurrency(balance)}
      </span>
    </div>
  )
}

function FilterTabs({
  active,
  onChange,
  needsTotal,
  wantsTotal,
}: {
  active: ExpenseFilter
  onChange: (filter: ExpenseFilter) => void
  needsTotal: number
  wantsTotal: number
}) {
  const tabs = [
    { key: "all", label: "All", sub: null },
    { key: "needs", label: "Needs", sub: _formatCurrency(needsTotal) },
    { key: "wants", label: "Wants", sub: _formatCurrency(wantsTotal) },
  ] as const

  return (
    <div className="exp-filter-tabs">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          className={`exp-filter-tab${active === tab.key ? " active" : ""}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.sub && <span className="exp-filter-tab-sub">{tab.sub}</span>}
        </button>
      ))}
    </div>
  )
}

function ExpenseList({
  byDate,
  sortedDates,
}: {
  byDate: Record<string, Expense[]>
  sortedDates: string[]
}) {
  return (
    <div className="exp-list-wrap">
      {sortedDates.map((date) => (
        <div key={date}>
          <p className="exp-date-header">{_formatDateHeader(date)}</p>
          <div className="exp-card exp-list-card">
            {byDate[date].map((expense, idx) => (
              <ExpenseRow
                key={expense.id}
                expense={expense}
                isLast={idx === byDate[date].length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ExpenseRow({
  expense,
  isLast,
}: {
  expense: Expense
  isLast: boolean
}) {
  const amount = parseFloat(expense.amount)

  return (
    <div className={`exp-row${isLast ? " last" : ""}`}>
      <div className="exp-row-left">
        <span
          className={`exp-row-dot ${expense.category}`}
          aria-label={expense.category}
        />
        <div className="exp-row-info">
          <p className="exp-row-desc">{expense.description || "Expense"}</p>
          <p className="exp-row-cat">
            {expense.category === "needs" ? "Needs" : "Wants"}
          </p>
        </div>
      </div>
      <span className="exp-row-amount">-{_formatCurrency(amount)}</span>
    </div>
  )
}

function NewAlertsBanner({
  alerts,
  onDismiss,
  onMarkRead,
}: {
  alerts: Alert[]
  onDismiss: () => void
  onMarkRead: (id: number) => Promise<void>
}) {
  function alertTone(alert: Alert) {
    if (alert.type === "hard_stop" || alert.type === "emergency_low") {
      return "error"
    }
    if (alert.type === "goal_behind") return "purple"
    return "warning"
  }

  function handleDismiss() {
    alerts.forEach((alert) => {
      void onMarkRead(alert.id)
    })
    onDismiss()
  }

  return (
    <div className="exp-alerts-wrap">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`exp-alert-banner ${alertTone(alert)}`}
          role="alert"
        >
          <span className="exp-alert-icon">!</span>
          <div className="exp-alert-body">
            <span className="exp-alert-type">{alert.type_display}</span>
            <span className="exp-alert-msg">{alert.message}</span>
          </div>
          <button
            className="exp-alert-dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss alerts"
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}

function EmptyExpenses({
  filter,
  onAddExpense,
}: {
  filter: ExpenseFilter
  onAddExpense: () => void
}) {
  const label =
    filter === "all"
      ? "No expenses yet."
      : `No ${filter === "needs" ? "needs" : "wants"} expenses yet.`

  return (
    <div className="exp-card exp-empty">
      <p className="exp-empty-title">{label}</p>
      <p className="exp-empty-sub">
        Log your first expense to see your spending history here.
      </p>
      <button className="exp-btn-primary" onClick={onAddExpense}>
        <PlusIcon /> Add Expense
      </button>
    </div>
  )
}

function NoActiveCycleCard({ onNavigate }: { onNavigate: () => void }) {
  return (
    <div className="exp-card exp-empty">
      <p className="exp-empty-title">No active cycle</p>
      <p className="exp-empty-sub">
        Submit your income first to start tracking expenses this month.
      </p>
      <button className="exp-btn-primary" onClick={onNavigate}>
        Submit Income
      </button>
    </div>
  )
}

function AddExpenseModal({
  cashOnHand,
  onClose,
  onAdd,
}: {
  cashOnHand: number
  onClose: () => void
  onAdd: (payload: ExpenseCreatePayload) => Promise<void>
}) {
  const [amount, setAmount] = useState("")
  const [category, setCategory] = useState<ExpenseCategory>("needs")
  const [description, setDescription] = useState("")
  const [date, setDate] = useState(_todayIso())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    const parsedAmount = parseFloat(amount)
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a valid amount.")
      return
    }

    if (parsedAmount > cashOnHand) {
      setError(`Cash on Hand only has ${_formatCurrency(cashOnHand)}.`)
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      await onAdd({
        amount: parsedAmount,
        category,
        description: description.trim(),
        date,
      })
    } catch (err) {
      setError(_errorMessage(err, "Failed to add expense."))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="exp-overlay" onClick={onClose}>
      <div className="exp-modal" onClick={(e) => e.stopPropagation()}>
        <div className="exp-modal-header">
          <h3 className="exp-modal-title">Add expense</h3>
          <button
            type="button"
            className="exp-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <form className="exp-modal-body" onSubmit={handleSubmit}>
          <p className="exp-modal-coh">
            Cash on Hand:{" "}
            <span className={cashOnHand <= 0 ? "exp-coh-danger" : ""}>
              {_formatCurrency(cashOnHand)}
            </span>
          </p>

          <div className="exp-field">
            <label className="exp-label" htmlFor="expense-amount">
              Amount
            </label>
            <div className="exp-amount-wrap">
              <span className="exp-amount-prefix">PHP</span>
              <input
                id="expense-amount"
                type="number"
                min="0.01"
                step="0.01"
                className="exp-amount-input"
                placeholder="0.00"
                value={amount}
                onChange={(e) => {
                  setAmount(e.target.value)
                  setError("")
                }}
                disabled={isSubmitting}
                autoFocus
              />
            </div>
          </div>

          <div className="exp-field">
            <label className="exp-label">Category</label>
            <div className="exp-category-btns">
              <button
                type="button"
                className={`exp-category-btn needs${
                  category === "needs" ? " active" : ""
                }`}
                onClick={() => setCategory("needs")}
                disabled={isSubmitting}
              >
                <span className="exp-cat-dot needs" />
                Needs
                <span className="exp-cat-hint">Essentials</span>
              </button>
              <button
                type="button"
                className={`exp-category-btn wants${
                  category === "wants" ? " active" : ""
                }`}
                onClick={() => setCategory("wants")}
                disabled={isSubmitting}
              >
                <span className="exp-cat-dot wants" />
                Wants
                <span className="exp-cat-hint">Flexible</span>
              </button>
            </div>
          </div>

          <div className="exp-field">
            <label className="exp-label" htmlFor="expense-description">
              Description <span className="exp-optional">(optional)</span>
            </label>
            <input
              id="expense-description"
              className="exp-input"
              placeholder="Groceries, coffee, medicine..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="exp-field">
            <label className="exp-label" htmlFor="expense-date">
              Date
            </label>
            <input
              id="expense-date"
              type="date"
              className="exp-input"
              value={date}
              max={_todayIso()}
              onChange={(e) => setDate(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="exp-field-error">{error}</p>}

          <div className="exp-modal-actions">
            <button
              type="button"
              className="exp-btn-secondary"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="exp-btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="exp-btn-spinner" /> Adding...
                </>
              ) : (
                "Add Expense"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function ExpensesPageSkeleton() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="exp-root">
        <div className="exp-header">
          <div>
            <div
              className="exp-skeleton-block"
              style={{ width: 130, height: 30, marginBottom: 8 }}
            />
            <div
              className="exp-skeleton-block"
              style={{ width: 220, height: 14 }}
            />
          </div>
          <div
            className="exp-skeleton-block"
            style={{ width: 126, height: 40 }}
          />
        </div>
        {[1, 2, 3].map((item) => (
          <div key={item} className="exp-card">
            <div
              className="exp-skeleton-block"
              style={{ width: "35%", height: 14, marginBottom: 16 }}
            />
            <div
              className="exp-skeleton-block"
              style={{ width: "100%", height: 84 }}
            />
          </div>
        ))}
      </div>
    </>
  )
}

function PlusIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    >
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

function _formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value)
}

function _formatDateHeader(dateStr: string): string {
  const date = new Date(dateStr + "T00:00:00")
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const formatted = date.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })

  if (date.getTime() === today.getTime()) return `Today - ${formatted}`
  if (date.getTime() === yesterday.getTime()) return `Yesterday - ${formatted}`

  return date.toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function _todayIso(): string {
  return new Date().toISOString().split("T")[0]
}

function _errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as any).response?.data
    if (typeof data?.detail === "string") return data.detail
    if (typeof data?.error === "string") return data.error
    if (typeof data?.amount === "string") return data.amount
    if (Array.isArray(data?.amount)) return data.amount[0]
    if (typeof data?.category === "string") return data.category
    if (Array.isArray(data?.category)) return data.category[0]
  }
  if (error instanceof Error) return error.message
  return fallback
}

const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=Lora:ital,wght@0,500;1,400&display=swap');

  :root {
    --bg-page:      #F5F4F1;
    --bg-card:      #FFFFFF;
    --bg-surface:   #F0EFEB;
    --border:       rgba(0,0,0,0.09);
    --border-md:    rgba(0,0,0,0.14);
    --border-focus: rgba(0,0,0,0.35);
    --text-1:       #18181B;
    --text-2:       #52525B;
    --text-3:       #A1A1AA;
    --error:        #993C1D;
    --error-bg:     #FAECE7;
    --success:      #3B6D11;
    --success-bg:   #EAF3DE;
    --warning:      #854F0B;
    --warning-bg:   #FAEEDA;
    --blue:         #185FA5;
    --blue-bg:      #E6F1FB;
    --purple:       #534AB7;
    --purple-bg:    #EEEDFE;
    --sans:  'Plus Jakarta Sans', system-ui, sans-serif;
    --serif: 'Lora', Georgia, serif;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg-page:      #0F0F11;
      --bg-card:      #18181B;
      --bg-surface:   #1F1F23;
      --border:       rgba(255,255,255,0.08);
      --border-md:    rgba(255,255,255,0.14);
      --border-focus: rgba(255,255,255,0.4);
      --text-1:       #FAFAFA;
      --text-2:       #A1A1AA;
      --text-3:       #52525B;
      --error:        #F0997B;
      --error-bg:     #4A1B0C;
      --success:      #97C459;
      --success-bg:   #173404;
      --warning:      #EF9F27;
      --warning-bg:   #412402;
      --blue:         #85B7EB;
      --blue-bg:      #042C53;
      --purple:       #AFA9EC;
      --purple-bg:    #26215C;
    }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .exp-root {
    font-family: var(--sans);
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 2rem;
  }

  .exp-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1rem;
    padding-top: 0.25rem;
  }

  .exp-title {
    font-family: var(--serif);
    font-size: 26px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }

  .exp-subtitle {
    font-size: 13px;
    color: var(--text-3);
  }

  .exp-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 1.25rem 1.5rem;
  }

  .exp-section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
    margin-bottom: 0.75rem;
  }

  .exp-daily-grid {
    display: grid;
    grid-template-columns: 1fr 1.5fr;
    gap: 1.5rem;
    align-items: start;
  }

  .exp-daily-limit-value {
    font-family: var(--serif);
    font-size: 28px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 2px;
  }

  .exp-daily-limit-sub {
    font-size: 11px;
    color: var(--text-3);
    margin-bottom: 8px;
  }

  .exp-daily-days-left {
    font-size: 12px;
    color: var(--text-3);
    padding: 4px 10px;
    background: var(--bg-surface);
    border-radius: 20px;
    display: inline-block;
  }

  .exp-daily-today-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 8px;
  }

  .exp-daily-today-label {
    font-size: 12px;
    color: var(--text-3);
  }

  .exp-daily-today-value {
    font-size: 20px;
    font-weight: 500;
    font-family: var(--serif);
    color: var(--text-1);
    letter-spacing: -0.2px;
  }

  .exp-daily-today-value.over { color: var(--error); }

  .exp-daily-track {
    height: 8px;
    background: var(--bg-surface);
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 6px;
  }

  .exp-daily-fill {
    height: 100%;
    border-radius: 4px;
    background: var(--success);
    transition: width 0.4s ease;
  }

  .exp-daily-fill.over { background: var(--error); }

  .exp-daily-remaining {
    font-size: 12px;
    color: var(--success);
    font-weight: 500;
  }

  .exp-daily-remaining.over { color: var(--error); }

  .exp-progress-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 0.625rem;
  }

  .exp-progress-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
    min-width: 42px;
  }

  .exp-progress-track {
    flex: 1;
    height: 8px;
    background: var(--bg-surface);
    border-radius: 4px;
    overflow: hidden;
  }

  .exp-progress-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.4s ease;
  }

  .exp-progress-fill.green { background: var(--success); }
  .exp-progress-fill.amber { background: var(--warning); }
  .exp-progress-fill.red { background: var(--error); }

  .exp-progress-text {
    font-size: 12px;
    color: var(--text-3);
    min-width: 130px;
    text-align: right;
    white-space: nowrap;
  }

  .exp-remaining-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.75rem;
    margin-top: 0.25rem;
    border-top: 0.5px solid var(--border);
  }

  .exp-remaining-label {
    font-size: 13px;
    color: var(--text-2);
    font-weight: 500;
  }

  .exp-remaining-value {
    font-size: 14px;
    font-weight: 600;
    color: var(--success);
  }

  .exp-remaining-value.depleted { color: var(--error); }

  .exp-coh-badge {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 14px;
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    border: 0.5px solid var(--border-md);
  }

  .exp-coh-label {
    font-size: 13px;
    color: var(--text-2);
    font-weight: 500;
  }

  .exp-coh-value {
    font-family: var(--serif);
    font-size: 18px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.2px;
  }

  .exp-coh-value.empty { color: var(--error); }

  .exp-filter-tabs {
    display: flex;
    gap: 6px;
    padding: 4px;
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    border: 0.5px solid var(--border-md);
  }

  .exp-filter-tab {
    flex: 1;
    min-height: 36px;
    padding: 7px 12px;
    background: none;
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .exp-filter-tab.active {
    background: var(--bg-card);
    color: var(--text-1);
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .exp-filter-tab-sub {
    font-size: 11px;
    color: var(--text-3);
    font-weight: 400;
  }

  .exp-list-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .exp-date-header {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.5rem;
    padding-left: 4px;
  }

  .exp-list-card {
    padding: 0;
    overflow: hidden;
  }

  .exp-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 1.25rem;
    border-bottom: 0.5px solid var(--border);
    gap: 1rem;
  }

  .exp-row:hover { background: var(--bg-surface); }
  .exp-row.last { border-bottom: none; }

  .exp-row-left {
    display: flex;
    align-items: center;
    gap: 12px;
    flex: 1;
    min-width: 0;
  }

  .exp-row-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .exp-row-dot.needs { background: var(--success); }
  .exp-row-dot.wants { background: var(--warning); }

  .exp-row-info { min-width: 0; }

  .exp-row-desc {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .exp-row-cat {
    font-size: 11px;
    color: var(--text-3);
    margin-top: 2px;
  }

  .exp-row-amount {
    font-size: 14px;
    font-weight: 600;
    color: var(--error);
    flex-shrink: 0;
    white-space: nowrap;
  }

  .exp-alerts-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .exp-alert-banner {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 14px;
    border-radius: var(--radius-md);
    font-size: 13px;
    line-height: 1.5;
  }

  .exp-alert-banner.warning { background: var(--warning-bg); color: var(--warning); }
  .exp-alert-banner.error { background: var(--error-bg); color: var(--error); }
  .exp-alert-banner.purple { background: var(--purple-bg); color: var(--purple); }

  .exp-alert-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    border: 1px solid currentColor;
    font-size: 12px;
    font-weight: 600;
    flex-shrink: 0;
    margin-top: 1px;
  }

  .exp-alert-body { flex: 1; }
  .exp-alert-type { font-weight: 600; margin-right: 6px; }
  .exp-alert-msg { color: inherit; opacity: 0.85; }

  .exp-alert-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    font-size: 16px;
    padding: 0;
    opacity: 0.6;
    flex-shrink: 0;
    line-height: 1;
  }

  .exp-alert-dismiss:hover { opacity: 1; }

  .exp-empty {
    text-align: center;
    padding: 2.5rem 1.5rem;
  }

  .exp-empty-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 6px;
  }

  .exp-empty-sub {
    font-size: 13px;
    color: var(--text-3);
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .exp-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 100;
    padding: 0;
  }

  .exp-modal {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    width: 100%;
    max-height: 92vh;
    overflow-y: auto;
  }

  .exp-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 0.5px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--bg-card);
    z-index: 1;
  }

  .exp-modal-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
  }

  .exp-modal-close {
    background: none;
    border: none;
    font-size: 16px;
    color: var(--text-3);
    cursor: pointer;
    padding: 0;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }

  .exp-modal-close:hover { color: var(--text-1); }

  .exp-modal-body {
    padding: 1.25rem 1.5rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .exp-modal-coh {
    font-size: 13px;
    color: var(--text-3);
    margin-bottom: 1rem;
    padding: 8px 12px;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
  }

  .exp-coh-danger { color: var(--error); font-weight: 500; }

  .exp-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 1rem;
  }

  .exp-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
  }

  .exp-optional {
    font-size: 12px;
    color: var(--text-3);
    font-weight: 400;
  }

  .exp-input {
    width: 100%;
    height: 42px;
    padding: 0 12px;
    font-family: var(--sans);
    font-size: 14px;
    color: var(--text-1);
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    outline: none;
    transition: border-color 0.15s;
  }

  .exp-input:focus { border-color: var(--border-focus); }

  .exp-amount-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .exp-amount-prefix {
    position: absolute;
    left: 14px;
    font-size: 12px;
    color: var(--text-3);
    pointer-events: none;
    font-weight: 600;
  }

  .exp-amount-input {
    width: 100%;
    height: 56px;
    padding: 0 14px 0 54px;
    font-family: var(--serif);
    font-size: 28px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.4px;
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    outline: none;
    transition: border-color 0.15s;
  }

  .exp-amount-input:focus {
    border-color: var(--border-focus);
    background: var(--bg-card);
  }

  .exp-category-btns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .exp-category-btn {
    height: 56px;
    padding: 0 16px;
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 500;
    color: var(--text-2);
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
  }

  .exp-category-btn.needs.active {
    background: var(--success-bg);
    border-color: var(--success);
    color: var(--success);
  }

  .exp-category-btn.wants.active {
    background: var(--warning-bg);
    border-color: var(--warning);
    color: var(--warning);
  }

  .exp-cat-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    margin-bottom: 2px;
  }

  .exp-cat-dot.needs { background: var(--success); }
  .exp-cat-dot.wants { background: var(--warning); }

  .exp-cat-hint {
    font-size: 11px;
    font-weight: 400;
    opacity: 0.7;
  }

  .exp-field-error {
    font-size: 12px;
    color: var(--error);
    margin-bottom: 0.5rem;
  }

  .exp-modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 1.25rem;
  }

  .exp-btn-primary {
    min-height: 40px;
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
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
  }

  .exp-btn-primary:hover:not(:disabled) { opacity: 0.85; }
  .exp-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .exp-btn-secondary {
    flex: 1;
    height: 42px;
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
  }

  .exp-btn-secondary:hover:not(:disabled) { opacity: 0.82; }
  .exp-modal-actions .exp-btn-primary { flex: 2; }

  .exp-btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: exp-spin 0.7s linear infinite;
  }

  @keyframes exp-spin { to { transform: rotate(360deg); } }

  @keyframes exp-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .exp-skeleton-block {
    border-radius: var(--radius-sm);
    background: linear-gradient(
      90deg,
      var(--bg-surface) 25%,
      var(--border-md) 50%,
      var(--bg-surface) 75%
    );
    background-size: 200% 100%;
    animation: exp-shimmer 1.5s ease-in-out infinite;
  }

  @media (min-width: 540px) {
    .exp-overlay {
      align-items: center;
      padding: 1.5rem;
    }

    .exp-modal {
      border-radius: var(--radius-lg);
      max-width: 460px;
    }
  }

  @media (max-width: 520px) {
    .exp-daily-grid { grid-template-columns: 1fr; gap: 1rem; }
    .exp-progress-row {
      display: grid;
      grid-template-columns: 48px 1fr;
      gap: 8px;
    }
    .exp-progress-text {
      grid-column: 2;
      min-width: 0;
      text-align: left;
    }
    .exp-filter-tab {
      flex-direction: column;
      gap: 2px;
    }
  }
`
