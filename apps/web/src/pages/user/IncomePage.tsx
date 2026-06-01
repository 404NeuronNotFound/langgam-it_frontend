import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useCycleStore } from "../../store/cycleStore"
import { useFundStore } from "../../store/fundStore"
import { useBudgetStore } from "../../store/budgetStore"
import { useNetWorthStore } from "../../store/netWorthStore"
import type { Fund, MonthCycle, MonthlyBudgetSetup } from "../../types"

type IncomeScenario = "full" | "low" | "zero" | "empty"

interface AllocationLine {
  fundId: number
  name: string
  icon: string
  amount: number
  isCash: boolean
}

export default function IncomePage() {
  const navigate = useNavigate()
  const cycleStore = useCycleStore()
  const fundStore = useFundStore()
  const budgetStore = useBudgetStore()
  const netWorthStore = useNetWorthStore()

  const [incomeInput, setIncomeInput] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [showZeroModal, setShowZeroModal] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isClosingMonth, setIsClosingMonth] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      await Promise.all([
        useFundStore.getState().fetchFunds(),
        useBudgetStore.getState().fetchSetups(),
        useNetWorthStore.getState().fetchCurrentNetWorth(),
      ])

      if (!cancelled) setIsLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (cycleStore.survivalMode) {
      setShowZeroModal(true)
    }
  }, [cycleStore.survivalMode])

  const activeCycle = cycleStore.activeCycle
  const activeSetup = budgetStore.activeSetup
  const incomeNum = incomeInput.trim() === "" ? 0 : parseFloat(incomeInput) || 0
  const estimatedIncome = activeSetup
    ? parseFloat(activeSetup.estimated_monthly_income)
    : 0
  const scenario =
    incomeInput.trim() === "" ? "empty" : _getScenario(incomeNum, estimatedIncome)
  const allocationPreview = _computeAllocationPreview(
    incomeNum,
    fundStore.funds.filter(
      (fund) => fund.status === "active" && fund.name !== "Cash on Hand"
    ),
    activeSetup
  )

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSubmitError(null)

    if (incomeInput.trim() === "") {
      setSubmitError("Enter your income amount.")
      return
    }
    if (incomeNum < 0) {
      setSubmitError("Income cannot be negative.")
      return
    }

    setIsSubmitting(true)
    try {
      const response = await cycleStore.submitIncome({ income: incomeNum })

      if (response.survival_mode) {
        setIsSubmitting(false)
        return
      }

      await netWorthStore.fetchCurrentNetWorth()
      navigate("/dashboard")
    } catch (err) {
      setSubmitError(_errorMessage(err, cycleStore.error || "Failed to submit income."))
      setIsSubmitting(false)
    }
  }

  async function handleConfirmSurvival() {
    setIsSubmitting(true)
    try {
      await cycleStore.confirmSurvivalDraw()
      await netWorthStore.fetchCurrentNetWorth()
      setShowZeroModal(false)
      navigate("/dashboard")
    } catch (err) {
      setSubmitError(
        _errorMessage(err, cycleStore.error || "Failed to draw from Emergency Fund.")
      )
      setIsSubmitting(false)
    }
  }

  function handleDeclineSurvival() {
    cycleStore.declineSurvivalDraw()
    setShowZeroModal(false)
    navigate("/dashboard")
  }

  async function handleCloseMonth() {
    setIsClosingMonth(true)
    try {
      await cycleStore.closeMonth()
      await netWorthStore.fetchCurrentNetWorth()
      navigate("/dashboard")
    } finally {
      setIsClosingMonth(false)
    }
  }

  if (isLoading) return <IncomePageSkeleton />

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="income-root">
        <div className="income-header">
          <div>
            <h1 className="income-title">Income</h1>
            <p className="income-subtitle">
              {activeCycle
                ? "Your income for this month"
                : "Submit your monthly income to start tracking"}
            </p>
          </div>
        </div>

        {showZeroModal && (
          <SurvivalModal
            prompt={cycleStore.survivalPrompt}
            needsBudget={activeSetup ? parseFloat(activeSetup.needs_budget) : 0}
            emergencyFundBalance={parseFloat(
              fundStore.getEmergencyFund()?.current_balance ?? "0"
            )}
            isSubmitting={isSubmitting}
            onConfirm={handleConfirmSurvival}
            onDecline={handleDeclineSurvival}
          />
        )}

        {activeCycle ? (
          <ActiveCycleView
            cycle={activeCycle}
            funds={fundStore.funds}
            isClosing={isClosingMonth}
            onCloseMonth={handleCloseMonth}
            onNavigateDashboard={() => navigate("/dashboard")}
          />
        ) : (
          <>
            {activeSetup && <BudgetReferenceCard setup={activeSetup} />}

            <IncomeFormCard
              incomeInput={incomeInput}
              incomeNum={incomeNum}
              estimatedIncome={estimatedIncome}
              scenario={scenario}
              allocationPreview={allocationPreview}
              isSubmitting={isSubmitting}
              submitError={submitError}
              onIncomeChange={(value) => {
                setIncomeInput(value)
                setSubmitError(null)
              }}
              onSubmit={handleSubmit}
              onZeroIncome={() => setIncomeInput("0")}
            />
          </>
        )}
      </div>
    </>
  )
}

function BudgetReferenceCard({ setup }: { setup: MonthlyBudgetSetup }) {
  const income = parseFloat(setup.estimated_monthly_income)
  const needs = parseFloat(setup.needs_budget)
  const wants = parseFloat(setup.wants_budget)

  return (
    <div className="income-card income-ref-card">
      <p className="income-section-label">Your budget setup</p>
      <div className="income-ref-grid">
        <div className="income-ref-item">
          <p className="income-ref-label">Estimated income</p>
          <p className="income-ref-value">{_formatCurrency(income)}/mo</p>
        </div>
        <div className="income-ref-item">
          <p className="income-ref-label">Needs budget</p>
          <p className="income-ref-value">{_formatCurrency(needs)}</p>
        </div>
        <div className="income-ref-item">
          <p className="income-ref-label">Wants budget</p>
          <p className="income-ref-value">{_formatCurrency(wants)}</p>
        </div>
      </div>
    </div>
  )
}

function IncomeFormCard({
  incomeInput,
  estimatedIncome,
  scenario,
  allocationPreview,
  isSubmitting,
  submitError,
  onIncomeChange,
  onSubmit,
  onZeroIncome,
}: {
  incomeInput: string
  incomeNum: number
  estimatedIncome: number
  scenario: IncomeScenario
  allocationPreview: AllocationLine[]
  isSubmitting: boolean
  submitError: string | null
  onIncomeChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  onZeroIncome: () => void
}) {
  return (
    <div className="income-card">
      <h2 className="income-form-title">How much did you earn this month?</h2>
      <p className="income-form-sub">
        Enter your total income for this cycle. The backend allocation engine
        will distribute it across your active funds.
      </p>

      <form onSubmit={onSubmit} noValidate>
        <div className="income-input-group">
          <div className="income-amount-wrap">
            <span className="income-amount-prefix">PHP</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="income-amount-input"
              placeholder="0.00"
              value={incomeInput}
              onChange={(event) => onIncomeChange(event.target.value)}
              disabled={isSubmitting}
              autoFocus
            />
          </div>
          {estimatedIncome > 0 && (
            <p className="income-estimate-hint">
              Estimated: {_formatCurrency(estimatedIncome)}/mo
            </p>
          )}
        </div>

        {scenario !== "empty" && <ScenarioBadge scenario={scenario} />}

        {scenario === "low" && (
          <div className="income-info-box amber">
            <p className="income-info-text">
              This is below your estimated income. Funds marked skip on low
              income may not receive an allocation this month.
            </p>
          </div>
        )}

        {scenario === "zero" && (
          <div className="income-info-box red">
            <p className="income-info-text">
              With zero income, you will be asked if you want to use your
              Emergency Fund to cover this month's needs budget.
            </p>
          </div>
        )}

        {allocationPreview.length > 0 && (
          <AllocationPreview lines={allocationPreview} />
        )}

        {submitError && (
          <div className="income-error-box" role="alert">
            {submitError}
          </div>
        )}

        <button
          type="submit"
          className="income-btn-primary"
          disabled={isSubmitting || incomeInput.trim() === ""}
        >
          {isSubmitting ? (
            <>
              <span className="income-btn-spinner" /> Processing...
            </>
          ) : (
            "Submit Income"
          )}
        </button>

        <button
          type="button"
          className="income-zero-btn"
          onClick={onZeroIncome}
          disabled={isSubmitting}
        >
          I have PHP 0 income this month
        </button>
      </form>
    </div>
  )
}

function ScenarioBadge({ scenario }: { scenario: IncomeScenario }) {
  const config = {
    full: { label: "Full income month", cls: "success" },
    low: { label: "Low income month", cls: "warning" },
    zero: { label: "Zero income month", cls: "error" },
    empty: { label: "", cls: "" },
  }[scenario]

  if (!config.label) return null

  return (
    <div className={`income-scenario-badge ${config.cls}`}>
      {config.label}
    </div>
  )
}

function AllocationPreview({ lines }: { lines: AllocationLine[] }) {
  return (
    <div className="income-alloc-preview">
      <p className="income-alloc-title">Preview allocation</p>
      <div className="income-alloc-list">
        {lines.map((line, index) => (
          <div
            key={line.isCash ? "cash" : line.fundId}
            className={`income-alloc-row${line.isCash ? " cash" : ""}`}
          >
            <div className="income-alloc-left">
              <span className="income-alloc-connector">
                {index === lines.length - 1 ? "-" : "|"}
              </span>
              <span className="income-alloc-icon">{line.icon}</span>
              <span className="income-alloc-name">{line.name}</span>
              {line.isCash && <span className="income-alloc-cash-tag">remainder</span>}
            </div>
            <span className="income-alloc-amount">{_formatCurrency(line.amount)}</span>
          </div>
        ))}
      </div>
      <p className="income-preview-note">
        Preview only. Actual allocation is calculated by the backend.
      </p>
    </div>
  )
}

function SurvivalModal({
  prompt,
  needsBudget,
  emergencyFundBalance,
  isSubmitting,
  onConfirm,
  onDecline,
}: {
  prompt: string | null
  needsBudget: number
  emergencyFundBalance: number
  isSubmitting: boolean
  onConfirm: () => void
  onDecline: () => void
}) {
  const canDraw = emergencyFundBalance > 0

  return (
    <div className="income-overlay">
      <div className="income-modal">
        <p className="income-modal-title">No income this month</p>
        <p className="income-modal-body">
          {prompt || `Use Emergency Fund to cover ${_formatCurrency(needsBudget)} needs?`}
        </p>

        <div className="income-modal-ef-info">
          <div className="income-modal-ef-row">
            <span>Needs budget</span>
            <strong>{_formatCurrency(needsBudget)}</strong>
          </div>
          <div className="income-modal-ef-row">
            <span>Emergency Fund</span>
            <strong className={canDraw ? "income-ef-ok" : "income-ef-empty"}>
              {_formatCurrency(emergencyFundBalance)}
            </strong>
          </div>
        </div>

        {!canDraw && (
          <div className="income-modal-warning">
            Emergency Fund is empty. You can decline and manage manually.
          </div>
        )}

        <div className="income-modal-actions">
          <button
            className="income-modal-btn-primary"
            type="button"
            onClick={onConfirm}
            disabled={isSubmitting || !canDraw}
          >
            {isSubmitting ? (
              <>
                <span className="income-btn-spinner" /> Processing...
              </>
            ) : (
              "Yes, use Emergency Fund"
            )}
          </button>
          <button
            className="income-modal-btn-secondary"
            type="button"
            onClick={onDecline}
            disabled={isSubmitting}
          >
            No, I will manage
          </button>
        </div>
      </div>
    </div>
  )
}

function ActiveCycleView({
  cycle,
  funds,
  isClosing,
  onCloseMonth,
  onNavigateDashboard,
}: {
  cycle: MonthCycle
  funds: Fund[]
  isClosing: boolean
  onCloseMonth: () => void
  onNavigateDashboard: () => void
}) {
  const allocatedFunds = funds
    .filter((fund) => fund.status === "active" && fund.name !== "Cash on Hand")
    .sort((a, b) => a.allocation_priority - b.allocation_priority)
  const cashOnHand = funds.find(
    (fund) => fund.status === "active" && fund.name === "Cash on Hand"
  )
  const scenarioLabel =
    cycle.income_scenario === "full"
      ? "Full income month"
      : cycle.income_scenario === "low"
        ? "Low income month"
        : "Zero income month"

  return (
    <>
      <div className="income-card">
        <div className="income-active-header">
          <div>
            <p className="income-active-month">
              {_getMonthLabel(cycle.year, cycle.month)}
            </p>
            <span className={`income-scenario-badge ${cycle.income_scenario}`}>
              {scenarioLabel}
            </span>
          </div>
          <button
            className="income-btn-secondary"
            type="button"
            onClick={onCloseMonth}
            disabled={isClosing}
          >
            {isClosing ? "Closing..." : "Close Month"}
          </button>
        </div>

        <div className="income-active-stats">
          <StatItem label="Income entered" value={parseFloat(cycle.income_entered)} />
          <StatItem label="Needs budget" value={parseFloat(cycle.needs_budget_used)} />
          <StatItem label="Wants budget" value={parseFloat(cycle.wants_budget_used)} />
          <StatItem label="Remaining budget" value={parseFloat(cycle.remaining_budget)} />
        </div>
      </div>

      <div className="income-card">
        <p className="income-section-label">Fund balances this cycle</p>
        <div className="income-fund-list">
          {allocatedFunds.map((fund, index) => (
            <div
              key={fund.id}
              className={`income-fund-row${
                index === allocatedFunds.length - 1 && !cashOnHand ? " last" : ""
              }`}
            >
              <div className="income-fund-left">
                <span className="income-fund-icon">{_fundIcon(fund)}</span>
                <span className="income-fund-name">{fund.name}</span>
              </div>
              <span className="income-fund-balance">
                {_formatCurrency(parseFloat(fund.current_balance))}
              </span>
            </div>
          ))}
          {cashOnHand && (
            <div className="income-fund-row last income-fund-cash">
              <div className="income-fund-left">
                <span className="income-fund-icon">{_fundIcon(cashOnHand)}</span>
                <span className="income-fund-name">Cash on Hand</span>
                <span className="income-fund-spendable-tag">spendable</span>
              </div>
              <span className="income-fund-balance">
                {_formatCurrency(parseFloat(cashOnHand.current_balance))}
              </span>
            </div>
          )}
        </div>

        <div className="income-active-actions">
          <button
            className="income-btn-secondary"
            type="button"
            onClick={onNavigateDashboard}
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </>
  )
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <div className="income-stat-item">
      <p className="income-stat-label">{label}</p>
      <p className="income-stat-value">{_formatCurrency(value)}</p>
    </div>
  )
}

function IncomePageSkeleton() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="income-root">
        <div className="income-header">
          <div className="income-skeleton-block title" />
          <div className="income-skeleton-block subtitle" />
        </div>
        <div className="income-card">
          <div className="income-skeleton-block ref" />
        </div>
        <div className="income-card">
          <div className="income-skeleton-block form" />
        </div>
      </div>
    </>
  )
}

function _getScenario(income: number, estimated: number): IncomeScenario {
  if (income === 0) return "zero"
  if (estimated > 0 && income >= estimated) return "full"
  return "low"
}

function _computeAllocationPreview(
  income: number,
  funds: Fund[],
  activeSetup: MonthlyBudgetSetup | null
): AllocationLine[] {
  if (income <= 0 || !activeSetup) return []

  const lines: AllocationLine[] = []
  let remaining = income
  const sorted = [...funds].sort(
    (a, b) => a.allocation_priority - b.allocation_priority
  )

  for (const fund of sorted) {
    const allocation = parseFloat(fund.monthly_allocation)
    if (allocation <= 0) continue
    const transfer = Math.min(allocation, remaining)
    if (transfer <= 0) break

    lines.push({
      fundId: fund.id,
      name: fund.name,
      icon: _fundIcon(fund),
      amount: transfer,
      isCash: false,
    })
    remaining -= transfer
  }

  if (remaining > 0) {
    lines.push({
      fundId: -1,
      name: "Cash on Hand",
      icon: "CH",
      amount: remaining,
      isCash: true,
    })
  }

  return lines
}

function _formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function _getMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  })
}

function _errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data
    if (data && typeof data === "object") {
      if ("error" in data && typeof data.error === "string") return data.error
      if ("detail" in data && typeof data.detail === "string") return data.detail
      const first = Object.values(data)[0]
      if (Array.isArray(first) && typeof first[0] === "string") return first[0]
      if (typeof first === "string") return first
    }
  }
  if (error instanceof Error) return error.message
  return fallback
}

function _fundIcon(fund: Fund): string {
  if (fund.name === "Emergency Fund") return "EF"
  if (fund.name === "Savings") return "SV"
  if (fund.name === "Cash on Hand") return "CH"
  return (fund.icon || "FD").slice(0, 2).toUpperCase()
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
    }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .income-root {
    font-family: var(--sans);
    max-width: 680px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 2rem;
  }

  .income-header { padding-top: 0.25rem; }

  .income-title {
    font-family: var(--serif);
    font-size: 26px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }

  .income-subtitle { font-size: 13px; color: var(--text-3); }

  .income-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
  }

  .income-section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
    margin-bottom: 0.75rem;
  }

  .income-ref-card {
    background: var(--bg-surface);
    border-color: var(--border);
  }

  .income-ref-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
  }

  .income-ref-item {
    padding: 0 1rem 0 0;
    border-right: 0.5px solid var(--border-md);
  }

  .income-ref-item:last-child { border-right: none; }
  .income-ref-item:not(:first-child) { padding-left: 1rem; }

  .income-ref-label,
  .income-stat-label {
    font-size: 11px;
    color: var(--text-3);
    margin-bottom: 4px;
  }

  .income-ref-value,
  .income-stat-value,
  .income-fund-balance {
    font-family: var(--serif);
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.2px;
  }

  .income-ref-value { font-size: 18px; }

  .income-form-title {
    font-size: 18px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 6px;
    letter-spacing: -0.2px;
  }

  .income-form-sub {
    font-size: 13px;
    color: var(--text-3);
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  .income-input-group { margin-bottom: 1rem; }

  .income-amount-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .income-amount-prefix {
    position: absolute;
    left: 16px;
    font-size: 11px;
    color: var(--text-3);
    pointer-events: none;
    font-weight: 700;
  }

  .income-amount-input {
    width: 100%;
    height: 64px;
    padding: 0 16px 0 58px;
    font-family: var(--serif);
    font-size: 32px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.5px;
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    outline: none;
    transition: border-color 0.15s, background 0.15s;
  }

  .income-amount-input:focus {
    border-color: var(--border-focus);
    background: var(--bg-card);
  }

  .income-amount-input:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .income-amount-input::-webkit-outer-spin-button,
  .income-amount-input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .income-amount-input[type=number] { -moz-appearance: textfield; }

  .income-estimate-hint {
    font-size: 12px;
    color: var(--text-3);
    margin-top: 6px;
    text-align: right;
  }

  .income-scenario-badge {
    display: inline-flex;
    align-items: center;
    padding: 5px 12px;
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 1rem;
  }

  .income-scenario-badge.success,
  .income-scenario-badge.full {
    background: var(--success-bg);
    color: var(--success);
  }

  .income-scenario-badge.warning,
  .income-scenario-badge.low {
    background: var(--warning-bg);
    color: var(--warning);
  }

  .income-scenario-badge.error,
  .income-scenario-badge.zero {
    background: var(--error-bg);
    color: var(--error);
  }

  .income-info-box {
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    margin-bottom: 1rem;
  }

  .income-info-box.amber { background: var(--warning-bg); }
  .income-info-box.red { background: var(--error-bg); }

  .income-info-text {
    font-size: 13px;
    line-height: 1.5;
    color: var(--text-2);
  }

  .income-alloc-preview {
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    padding: 1rem;
    margin-bottom: 1.25rem;
  }

  .income-alloc-title {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-3);
    margin-bottom: 0.75rem;
  }

  .income-alloc-list {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .income-alloc-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;
    gap: 1rem;
  }

  .income-alloc-row.cash {
    border-top: 0.5px solid var(--border);
    margin-top: 4px;
    padding-top: 10px;
  }

  .income-alloc-left,
  .income-fund-left {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .income-alloc-connector {
    font-family: monospace;
    font-size: 14px;
    color: var(--text-3);
    width: 12px;
    flex-shrink: 0;
  }

  .income-alloc-icon,
  .income-fund-icon {
    width: 28px;
    height: 28px;
    border-radius: var(--radius-sm);
    background: var(--bg-card);
    color: var(--text-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .income-alloc-name,
  .income-fund-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-1);
  }

  .income-alloc-cash-tag,
  .income-fund-spendable-tag {
    font-size: 10px;
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--bg-card);
    color: var(--text-3);
    border: 0.5px solid var(--border-md);
  }

  .income-alloc-amount {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-1);
    white-space: nowrap;
  }

  .income-preview-note {
    margin-top: 0.75rem;
    font-size: 11px;
    color: var(--text-3);
  }

  .income-error-box {
    padding: 10px 12px;
    background: var(--error-bg);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--error);
    margin-bottom: 1rem;
    line-height: 1.5;
  }

  .income-btn-primary {
    width: 100%;
    height: 48px;
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-bottom: 0.75rem;
  }

  .income-btn-primary:hover:not(:disabled) { opacity: 0.85; }
  .income-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .income-btn-secondary {
    height: 40px;
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

  .income-btn-secondary:hover:not(:disabled) { opacity: 0.82; }
  .income-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

  .income-zero-btn {
    width: 100%;
    padding: 8px;
    background: none;
    border: none;
    font-family: var(--sans);
    font-size: 13px;
    color: var(--text-3);
    cursor: pointer;
    text-align: center;
  }

  .income-zero-btn:hover:not(:disabled) { color: var(--error); }
  .income-zero-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .income-btn-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: income-spin 0.7s linear infinite;
  }

  @keyframes income-spin { to { transform: rotate(360deg); } }

  .income-active-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.25rem;
    flex-wrap: wrap;
    gap: 0.75rem;
  }

  .income-active-month {
    font-family: var(--serif);
    font-size: 24px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.3px;
    margin-bottom: 0.5rem;
  }

  .income-active-stats {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
  }

  .income-stat-value { font-size: 20px; }

  .income-fund-list { display: flex; flex-direction: column; }

  .income-fund-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 0.5px solid var(--border);
    gap: 1rem;
  }

  .income-fund-row.last { border-bottom: none; }

  .income-fund-row.income-fund-cash {
    background: var(--bg-surface);
    margin: 0 -1.5rem;
    padding: 10px 1.5rem;
    border-bottom: none;
  }

  .income-fund-spendable-tag {
    background: var(--success-bg);
    color: var(--success);
  }

  .income-fund-balance { font-size: 16px; white-space: nowrap; }

  .income-active-actions {
    margin-top: 1.25rem;
    padding-top: 1rem;
    border-top: 0.5px solid var(--border);
  }

  .income-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1.5rem;
  }

  .income-modal {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    max-width: 440px;
    width: 100%;
    padding: 2rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .income-modal-title {
    font-family: var(--serif);
    font-size: 22px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    text-align: center;
    letter-spacing: -0.3px;
  }

  .income-modal-body {
    font-size: 14px;
    color: var(--text-2);
    text-align: center;
    line-height: 1.6;
  }

  .income-modal-ef-info {
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    padding: 0.875rem 1rem;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .income-modal-ef-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--text-2);
  }

  .income-ef-ok { color: var(--success); font-weight: 500; }
  .income-ef-empty { color: var(--error); font-weight: 500; }

  .income-modal-warning {
    padding: 10px 12px;
    background: var(--warning-bg);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--warning);
    line-height: 1.5;
  }

  .income-modal-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-top: 0.25rem;
  }

  .income-modal-btn-primary,
  .income-modal-btn-secondary {
    width: 100%;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .income-modal-btn-primary {
    height: 46px;
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
    font-size: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
  }

  .income-modal-btn-secondary {
    height: 42px;
    background: none;
    color: var(--text-3);
    border: 0.5px solid var(--border-md);
    font-size: 13px;
  }

  .income-modal-btn-primary:hover:not(:disabled),
  .income-modal-btn-secondary:hover:not(:disabled) { opacity: 0.85; }

  .income-modal-btn-primary:disabled,
  .income-modal-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

  @keyframes income-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .income-skeleton-block {
    border-radius: var(--radius-sm);
    background: linear-gradient(90deg, var(--bg-surface) 25%, var(--border-md) 50%, var(--bg-surface) 75%);
    background-size: 200% 100%;
    animation: income-shimmer 1.5s ease-in-out infinite;
  }

  .income-skeleton-block.title { width: 100px; height: 28px; margin-bottom: 8px; }
  .income-skeleton-block.subtitle { width: 240px; height: 14px; }
  .income-skeleton-block.ref { width: 100%; height: 80px; }
  .income-skeleton-block.form { width: 100%; height: 220px; }

  @media (max-width: 520px) {
    .income-ref-grid,
    .income-active-stats {
      grid-template-columns: 1fr;
    }

    .income-ref-item {
      border-right: none;
      border-bottom: 0.5px solid var(--border-md);
      padding: 0 0 1rem;
    }

    .income-ref-item:not(:first-child) {
      padding-left: 0;
      padding-top: 1rem;
    }

    .income-ref-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }

    .income-amount-input {
      font-size: 24px;
    }

    .income-alloc-row,
    .income-fund-row {
      align-items: flex-start;
      flex-direction: column;
    }
  }
`
