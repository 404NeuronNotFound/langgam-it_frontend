import { useEffect, useState } from "react"
import { useBudgetStore } from "../../store/budgetStore"
import { useFundStore } from "../../store/fundStore"
import type {
  AllocationSuggestion,
  Fund,
  MonthlyBudgetSetup,
  MonthlyBudgetSetupPayload,
} from "../../types"

export default function BudgetPage() {
  const budgetStore = useBudgetStore()
  const fundStore = useFundStore()

  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      await Promise.all([
        useBudgetStore.getState().fetchSetups(),
        useFundStore.getState().fetchFunds(),
        useFundStore.getState().fetchSuggestion(),
      ])

      if (!cancelled) setIsLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const activeSetup = budgetStore.activeSetup
  const history = budgetStore.setups.slice(1)
  const suggestion = fundStore.suggestion
  const allocationFunds = fundStore.funds.filter(
    (fund) => fund.status === "active" && fund.name !== "Cash on Hand"
  )
  const totalFundAllocation = fundStore.getTotalMonthlyAlloc()

  if (isLoading) return <BudgetPageSkeleton />

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="budget-root">
        <div className="budget-header">
          <div>
            <h1 className="budget-title">Budget</h1>
            <p className="budget-subtitle">Your monthly spending plan</p>
          </div>
          <button
            className="budget-btn-primary"
            type="button"
            onClick={() => setShowEditModal(true)}
          >
            Edit Budget
          </button>
        </div>

        {activeSetup ? (
          <ActiveBudgetCard
            setup={activeSetup}
            totalFundAllocation={totalFundAllocation}
          />
        ) : (
          <NoBudgetCard />
        )}

        {suggestion && activeSetup && (
          <SuggestionPanel
            suggestion={suggestion}
            activeSetup={activeSetup}
            totalFundAllocation={totalFundAllocation}
          />
        )}

        {allocationFunds.length > 0 && (
          <FundAllocationBreakdown
            funds={allocationFunds}
            totalFundAllocation={totalFundAllocation}
          />
        )}

        {history.length > 0 && <BudgetHistory history={history} />}

        {showEditModal && (
          <EditBudgetModal
            activeSetup={activeSetup}
            totalFundAllocation={totalFundAllocation}
            onClose={() => setShowEditModal(false)}
            onSave={async (payload) => {
              await budgetStore.updateSetup(payload)
              await fundStore.fetchSuggestion()
              setShowEditModal(false)
            }}
          />
        )}
      </div>
    </>
  )
}

function ActiveBudgetCard({
  setup,
  totalFundAllocation,
}: {
  setup: MonthlyBudgetSetup
  totalFundAllocation: number
}) {
  const income = parseFloat(setup.estimated_monthly_income)
  const needs = parseFloat(setup.needs_budget)
  const wants = parseFloat(setup.wants_budget)
  const totalExpense = needs + wants
  const remaining = income - totalExpense - totalFundAllocation
  const effectiveDate = _formatFullDate(setup.effective_from)

  return (
    <div className="budget-card">
      <div className="budget-active-tag">Active since {effectiveDate}</div>

      <div className="budget-stats-grid">
        <div className="budget-stat">
          <p className="budget-stat-label">Monthly income</p>
          <p className="budget-stat-value">{_formatCurrency(income)}</p>
          <p className="budget-stat-sub">estimated</p>
        </div>
        <div className="budget-stat">
          <p className="budget-stat-label">Needs budget</p>
          <p className="budget-stat-value">{_formatCurrency(needs)}</p>
          <p className="budget-stat-sub">per month</p>
        </div>
        <div className="budget-stat">
          <p className="budget-stat-label">Wants budget</p>
          <p className="budget-stat-value">{_formatCurrency(wants)}</p>
          <p className="budget-stat-sub">per month</p>
        </div>
      </div>

      <div className="budget-divider" />

      <div className="budget-flow">
        <SummaryRow
          label="Monthly expenses"
          value={totalExpense}
          sub="needs + wants"
        />
        <SummaryRow
          label="Fund allocations"
          value={totalFundAllocation}
          sub="to savings envelopes"
        />
        <div className="budget-summary-divider" />
        <SummaryRow
          label="Remaining to Cash on Hand"
          value={remaining}
          sub="unallocated liquid cash"
          highlight={remaining >= 0 ? "success" : "error"}
        />
      </div>

      {setup.allocation_warning && (
        <div className="budget-warning-banner">{setup.allocation_warning}</div>
      )}
    </div>
  )
}

function NoBudgetCard() {
  return (
    <div className="budget-card budget-empty-card">
      <p className="budget-empty-icon">Budget</p>
      <p className="budget-empty-title">No budget setup yet</p>
      <p className="budget-empty-sub">
        Use Edit Budget to set your monthly income and spending plan.
      </p>
    </div>
  )
}

function SuggestionPanel({
  suggestion,
  activeSetup,
  totalFundAllocation,
}: {
  suggestion: AllocationSuggestion
  activeSetup: MonthlyBudgetSetup
  totalFundAllocation: number
}) {
  const income = parseFloat(suggestion.estimated_income)
  const currentNeeds = parseFloat(activeSetup.needs_budget)
  const currentWants = parseFloat(activeSetup.wants_budget)
  const totalUsed = currentNeeds + currentWants + totalFundAllocation
  const coveragePct = income > 0 ? Math.round((totalUsed / income) * 100) : 0

  return (
    <div className="budget-card">
      <p className="budget-section-label">50/30/20 Rule</p>
      <p className="budget-suggestion-intro">
        Based on your {_formatCurrency(income)}/mo estimated income:
      </p>

      <div className="budget-suggestion-grid">
        <SuggestionItem
          pct="50%"
          label="Needs"
          suggested={parseFloat(suggestion.suggestion_50_30_20.needs)}
          current={currentNeeds}
          tone="success"
        />
        <SuggestionItem
          pct="30%"
          label="Wants"
          suggested={parseFloat(suggestion.suggestion_50_30_20.wants)}
          current={currentWants}
          tone="warning"
        />
        <SuggestionItem
          pct="20%"
          label="Savings"
          suggested={parseFloat(suggestion.suggestion_50_30_20.savings)}
          current={totalFundAllocation}
          tone="blue"
        />
      </div>

      <p className="budget-suggestion-note">
        Your current allocation covers <strong>{coveragePct}%</strong> of
        estimated income.
      </p>
    </div>
  )
}

function SuggestionItem({
  pct,
  label,
  suggested,
  current,
  tone,
}: {
  pct: string
  label: string
  suggested: number
  current: number
  tone: "success" | "warning" | "blue"
}) {
  const diff = current - suggested
  const isOnPoint = Math.abs(diff) < 500

  return (
    <div className="budget-suggestion-item">
      <div className={`budget-sug-pct ${tone}`}>{pct}</div>
      <div className="budget-sug-label">{label}</div>
      <div className="budget-sug-suggested">
        {_formatCurrency(suggested)}
        <span className="budget-sug-sub">suggested</span>
      </div>
      <div className="budget-sug-current">
        {_formatCurrency(current)}
        <span className="budget-sug-sub">current</span>
      </div>
      {!isOnPoint && (
        <div className={`budget-sug-diff${diff > 0 ? " over" : " under"}`}>
          {diff > 0 ? "+" : ""}
          {_formatCurrency(diff)}
        </div>
      )}
    </div>
  )
}

function FundAllocationBreakdown({
  funds,
  totalFundAllocation,
}: {
  funds: Fund[]
  totalFundAllocation: number
}) {
  return (
    <div className="budget-card">
      <p className="budget-section-label">Fund allocations</p>
      <p className="budget-alloc-intro">
        Monthly income distributed to your savings envelopes
      </p>

      <div className="budget-alloc-list">
        {funds.map((fund) => {
          const allocation = parseFloat(fund.monthly_allocation)
          const pct =
            totalFundAllocation > 0
              ? Math.round((allocation / totalFundAllocation) * 100)
              : 0

          return (
            <div key={fund.id} className="budget-alloc-row">
              <div className="budget-alloc-left">
                <span className="budget-alloc-icon">{_fundIcon(fund)}</span>
                <div>
                  <p className="budget-alloc-name">{fund.name}</p>
                  {fund.type === "system_required" && (
                    <p className="budget-alloc-tag">System</p>
                  )}
                </div>
              </div>
              <div className="budget-alloc-right">
                <p className="budget-alloc-value">
                  {allocation > 0 ? `${_formatCurrency(allocation)}/mo` : "-"}
                </p>
                {allocation > 0 && totalFundAllocation > 0 && (
                  <div className="budget-alloc-bar-wrap">
                    <div className="budget-alloc-track">
                      <div
                        className="budget-alloc-fill"
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                    <span className="budget-alloc-pct">{pct}%</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="budget-alloc-total">
        <span>Total fund allocations</span>
        <span>{_formatCurrency(totalFundAllocation)}/mo</span>
      </div>
    </div>
  )
}

function BudgetHistory({ history }: { history: MonthlyBudgetSetup[] }) {
  const [isExpanded, setIsExpanded] = useState(false)
  const visible = isExpanded ? history : history.slice(0, 3)

  return (
    <div className="budget-card">
      <div className="budget-history-header">
        <p className="budget-section-label">Budget history</p>
        <p className="budget-history-sub">
          Previous configurations are preserved for reference
        </p>
      </div>

      <div className="budget-history-list">
        {visible.map((setup, index) => (
          <HistoryRow
            key={setup.id}
            setup={setup}
            isLast={index === visible.length - 1}
          />
        ))}
      </div>

      {history.length > 3 && (
        <button
          className="budget-show-more"
          type="button"
          onClick={() => setIsExpanded((value) => !value)}
        >
          {isExpanded ? "Show less" : `Show ${history.length - 3} more`}
        </button>
      )}
    </div>
  )
}

function HistoryRow({
  setup,
  isLast,
}: {
  setup: MonthlyBudgetSetup
  isLast: boolean
}) {
  const income = parseFloat(setup.estimated_monthly_income)
  const needs = parseFloat(setup.needs_budget)
  const wants = parseFloat(setup.wants_budget)

  return (
    <div className={`budget-history-row${isLast ? " last" : ""}`}>
      <div className="budget-history-date">
        <p className="budget-history-date-label">{_formatMonthYear(setup.effective_from)}</p>
        <p className="budget-history-id">Setup #{setup.id}</p>
      </div>
      <div className="budget-history-values">
        <span className="budget-history-income">{_formatCurrency(income)}/mo</span>
        <span className="budget-history-breakdown">
          {_formatCurrency(needs)} needs - {_formatCurrency(wants)} wants
        </span>
      </div>
    </div>
  )
}

function EditBudgetModal({
  activeSetup,
  totalFundAllocation,
  onClose,
  onSave,
}: {
  activeSetup: MonthlyBudgetSetup | null
  totalFundAllocation: number
  onClose: () => void
  onSave: (payload: MonthlyBudgetSetupPayload) => Promise<void>
}) {
  const [income, setIncome] = useState(activeSetup?.estimated_monthly_income ?? "")
  const [needs, setNeeds] = useState(activeSetup?.needs_budget ?? "")
  const [wants, setWants] = useState(activeSetup?.wants_budget ?? "")
  const [effectiveFrom, setEffectiveFrom] = useState(_todayIso())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const incomeValue = parseFloat(income) || 0
  const needsValue = parseFloat(needs) || 0
  const wantsValue = parseFloat(wants) || 0
  const totalExpense = needsValue + wantsValue
  const totalUsed = totalExpense + totalFundAllocation
  const remaining = incomeValue - totalUsed

  function apply503020() {
    if (incomeValue <= 0) return
    setNeeds((incomeValue * 0.5).toFixed(2))
    setWants((incomeValue * 0.3).toFixed(2))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()

    if (incomeValue <= 0) {
      setError("Estimated monthly income must be greater than zero.")
      return
    }
    if (needsValue < 0 || wantsValue < 0) {
      setError("Needs and wants budgets cannot be negative.")
      return
    }
    if (!effectiveFrom) {
      setError("Effective from date is required.")
      return
    }

    setIsSubmitting(true)
    setError("")
    try {
      await onSave({
        estimated_monthly_income: incomeValue,
        needs_budget: needsValue,
        wants_budget: wantsValue,
        effective_from: effectiveFrom,
      })
    } catch (err) {
      setError(_errorMessage(err, "Failed to save budget."))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="budget-overlay" onClick={onClose}>
      <div className="budget-modal" onClick={(event) => event.stopPropagation()}>
        <div className="budget-modal-header">
          <h3 className="budget-modal-title">Edit budget</h3>
          <button
            className="budget-modal-close"
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            x
          </button>
        </div>

        <form className="budget-modal-body" onSubmit={handleSubmit}>
          <div className="budget-field">
            <label className="budget-label">Estimated monthly income</label>
            <CurrencyInput
              value={income}
              onChange={setIncome}
              disabled={isSubmitting}
              min="0.01"
            />
          </div>

          <div className="budget-row-2">
            <div className="budget-field">
              <label className="budget-label">Needs budget</label>
              <CurrencyInput
                value={needs}
                onChange={setNeeds}
                disabled={isSubmitting}
              />
            </div>
            <div className="budget-field">
              <label className="budget-label">Wants budget</label>
              <CurrencyInput
                value={wants}
                onChange={setWants}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="budget-field">
            <label className="budget-label">Effective from</label>
            <input
              className="budget-input"
              type="date"
              value={effectiveFrom}
              min={_todayIso()}
              onChange={(event) => setEffectiveFrom(event.target.value)}
              disabled={isSubmitting}
            />
            <span className="budget-helper">
              Budget updates create a new setup row and preserve history.
            </span>
          </div>

          <button
            className="budget-503020-btn"
            type="button"
            onClick={apply503020}
            disabled={isSubmitting || incomeValue <= 0}
          >
            Apply 50/30/20
          </button>

          <div className="budget-alloc-summary">
            <p className="budget-alloc-summary-title">Allocation summary</p>
            <div className="budget-alloc-summary-rows">
              <SummaryRow label="Total expenses" value={totalExpense} />
              <SummaryRow label="Total fund allocs" value={totalFundAllocation} />
              <div className="budget-summary-divider" />
              <SummaryRow label="Total" value={totalUsed} />
              <SummaryRow
                label={remaining >= 0 ? "Remaining to Cash" : "Over by"}
                value={remaining >= 0 ? remaining : Math.abs(remaining)}
                highlight={remaining >= 0 ? "success" : "error"}
              />
            </div>
          </div>

          {error && <p className="budget-field-error">{error}</p>}

          <div className="budget-modal-actions">
            <button
              className="budget-btn-secondary"
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="budget-btn-primary"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="budget-btn-spinner" /> Saving...
                </>
              ) : (
                "Save Budget"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CurrencyInput({
  value,
  onChange,
  disabled,
  min = "0",
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
  min?: string
}) {
  return (
    <div className="budget-currency-wrap">
      <span className="budget-currency-prefix">PHP</span>
      <input
        className="budget-input budget-currency-input"
        type="number"
        min={min}
        step="0.01"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  )
}

function SummaryRow({
  label,
  value,
  sub,
  highlight,
}: {
  label: string
  value: number
  sub?: string
  highlight?: "success" | "error"
}) {
  return (
    <div className="budget-summary-row">
      <div>
        <span className={`budget-summary-label${highlight ? ` ${highlight}` : ""}`}>
          {label}
        </span>
        {sub && <span className="budget-summary-sub"> {sub}</span>}
      </div>
      <span className={`budget-summary-value${highlight ? ` ${highlight}` : ""}`}>
        {_formatCurrency(value)}
      </span>
    </div>
  )
}

function BudgetPageSkeleton() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="budget-root">
        <div className="budget-header">
          <div>
            <div className="budget-skeleton-block title" />
            <div className="budget-skeleton-block subtitle" />
          </div>
          <div className="budget-skeleton-block button" />
        </div>
        {[180, 160, 200].map((height) => (
          <div key={height} className="budget-card">
            <div className="budget-skeleton-block body" style={{ height }} />
          </div>
        ))}
      </div>
    </>
  )
}

function _formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0)
}

function _formatFullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function _formatMonthYear(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    year: "numeric",
  })
}

function _todayIso(): string {
  return new Date().toISOString().split("T")[0]
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
    --blue-bg:      #E6F1FB;
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
    }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .budget-root {
    font-family: var(--sans);
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 2rem;
  }

  .budget-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1rem;
    padding-top: 0.25rem;
  }

  .budget-title {
    font-family: var(--serif);
    font-size: 26px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }

  .budget-subtitle { font-size: 13px; color: var(--text-3); }

  .budget-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
  }

  .budget-active-tag {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--success);
    margin-bottom: 1.25rem;
  }

  .budget-stats-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0;
  }

  .budget-stat {
    padding: 0 1rem 0 0;
    border-right: 0.5px solid var(--border);
  }

  .budget-stat:last-child { border-right: none; padding-right: 0; }
  .budget-stat:not(:first-child) { padding-left: 1rem; }

  .budget-stat-label,
  .budget-section-label,
  .budget-alloc-summary-title {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
  }

  .budget-section-label { margin-bottom: 0.75rem; }

  .budget-stat-value {
    font-family: var(--serif);
    font-size: 22px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.3px;
    margin: 6px 0 3px;
  }

  .budget-stat-sub,
  .budget-summary-sub,
  .budget-sug-sub,
  .budget-history-id,
  .budget-history-breakdown,
  .budget-alloc-tag {
    font-size: 11px;
    color: var(--text-3);
  }

  .budget-divider {
    height: 0.5px;
    background: var(--border);
    margin: 1.25rem 0;
  }

  .budget-flow,
  .budget-alloc-summary-rows {
    display: flex;
    flex-direction: column;
  }

  .budget-summary-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 1rem;
    padding: 7px 0;
    border-bottom: 0.5px solid var(--border);
    font-size: 13px;
  }

  .budget-summary-row:last-child { border-bottom: none; }

  .budget-summary-label {
    color: var(--text-2);
    font-weight: 500;
  }

  .budget-summary-label.success,
  .budget-summary-value.success { color: var(--success); }
  .budget-summary-label.error,
  .budget-summary-value.error { color: var(--error); }

  .budget-summary-value {
    font-weight: 500;
    color: var(--text-1);
    text-align: right;
    flex-shrink: 0;
  }

  .budget-summary-divider {
    height: 0.5px;
    background: var(--border-md);
    margin: 4px 0;
  }

  .budget-warning-banner {
    margin-top: 1rem;
    padding: 10px 12px;
    background: var(--warning-bg);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--warning);
    line-height: 1.5;
  }

  .budget-suggestion-intro,
  .budget-alloc-intro,
  .budget-history-sub,
  .budget-empty-sub,
  .budget-helper {
    font-size: 13px;
    color: var(--text-3);
    line-height: 1.5;
  }

  .budget-suggestion-intro,
  .budget-alloc-intro { margin-bottom: 1rem; }

  .budget-suggestion-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.75rem;
    margin-bottom: 1rem;
  }

  .budget-suggestion-item {
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    padding: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .budget-sug-pct {
    font-size: 18px;
    font-weight: 600;
    letter-spacing: -0.3px;
  }

  .budget-sug-pct.success { color: var(--success); }
  .budget-sug-pct.warning { color: var(--warning); }
  .budget-sug-pct.blue { color: var(--blue); }

  .budget-sug-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-3);
    margin-bottom: 4px;
  }

  .budget-sug-suggested {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    display: flex;
    flex-direction: column;
  }

  .budget-sug-current {
    font-size: 12px;
    color: var(--text-2);
    display: flex;
    flex-direction: column;
  }

  .budget-sug-diff {
    font-size: 11px;
    font-weight: 600;
    margin-top: 2px;
  }

  .budget-sug-diff.over { color: var(--warning); }
  .budget-sug-diff.under { color: var(--success); }

  .budget-suggestion-note {
    font-size: 12px;
    color: var(--text-3);
  }

  .budget-alloc-list,
  .budget-history-list {
    display: flex;
    flex-direction: column;
  }

  .budget-alloc-row,
  .budget-history-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 10px 0;
    border-bottom: 0.5px solid var(--border);
  }

  .budget-alloc-row:last-child,
  .budget-history-row.last { border-bottom: none; }

  .budget-alloc-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .budget-alloc-icon {
    width: 30px;
    height: 30px;
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .budget-alloc-name,
  .budget-history-income {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
  }

  .budget-alloc-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
  }

  .budget-alloc-value {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
  }

  .budget-alloc-bar-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .budget-alloc-track {
    width: 80px;
    height: 4px;
    background: var(--bg-surface);
    border-radius: 2px;
    overflow: hidden;
  }

  .budget-alloc-fill {
    height: 100%;
    border-radius: 2px;
    background: var(--blue);
    transition: width 0.4s ease;
  }

  .budget-alloc-pct {
    font-size: 10px;
    color: var(--text-3);
    min-width: 28px;
    text-align: right;
  }

  .budget-alloc-total {
    display: flex;
    justify-content: space-between;
    padding-top: 0.75rem;
    margin-top: 0.5rem;
    border-top: 0.5px solid var(--border-md);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-1);
  }

  .budget-history-header { margin-bottom: 1rem; }
  .budget-history-date { flex-shrink: 0; }
  .budget-history-date-label { font-size: 13px; font-weight: 500; color: var(--text-2); }
  .budget-history-values { text-align: right; }
  .budget-history-breakdown { margin-top: 2px; display: block; }

  .budget-show-more {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-3);
    font-family: var(--sans);
    padding: 0.75rem 0 0;
  }

  .budget-show-more:hover { color: var(--text-1); }

  .budget-empty-card {
    text-align: center;
    padding: 2.5rem;
  }

  .budget-empty-icon {
    font-family: var(--serif);
    font-size: 28px;
    color: var(--text-1);
    margin-bottom: 0.75rem;
  }

  .budget-empty-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 6px;
  }

  .budget-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1.5rem;
  }

  .budget-modal {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    border: 0.5px solid var(--border-md);
    max-width: 500px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .budget-modal-header {
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

  .budget-modal-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
  }

  .budget-modal-close {
    background: none;
    border: none;
    font-size: 18px;
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

  .budget-modal-close:hover { color: var(--text-1); }

  .budget-modal-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .budget-modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 1.25rem;
    justify-content: flex-end;
  }

  .budget-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 1rem;
  }

  .budget-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
  }

  .budget-input {
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

  .budget-input:focus { border-color: var(--border-focus); }

  .budget-currency-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .budget-currency-prefix {
    position: absolute;
    left: 12px;
    font-size: 11px;
    color: var(--text-3);
    pointer-events: none;
    font-weight: 600;
  }

  .budget-currency-input { padding-left: 44px; }

  .budget-row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .budget-helper,
  .budget-field-error {
    font-size: 11px;
    line-height: 1.4;
  }

  .budget-helper { color: var(--text-3); }
  .budget-field-error { color: var(--error); margin-bottom: 0.5rem; }

  .budget-503020-btn {
    height: 36px;
    padding: 0 14px;
    background: var(--success-bg);
    color: var(--success);
    border: 0.5px solid rgba(59,109,17,0.2);
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    margin-bottom: 1rem;
    align-self: flex-start;
  }

  .budget-503020-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .budget-alloc-summary {
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    padding: 1rem;
    margin-bottom: 0.75rem;
  }

  .budget-alloc-summary-title { margin-bottom: 0.75rem; }

  .budget-btn-primary,
  .budget-btn-secondary {
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

  .budget-btn-primary {
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
  }

  .budget-btn-secondary {
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
  }

  .budget-btn-primary:hover:not(:disabled),
  .budget-btn-secondary:hover:not(:disabled) { opacity: 0.85; }

  .budget-btn-primary:disabled,
  .budget-btn-secondary:disabled { opacity: 0.5; cursor: not-allowed; }

  .budget-btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: budget-spin 0.7s linear infinite;
  }

  @keyframes budget-spin { to { transform: rotate(360deg); } }

  @keyframes budget-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .budget-skeleton-block {
    border-radius: var(--radius-sm);
    background: linear-gradient(90deg, var(--bg-surface) 25%, var(--border-md) 50%, var(--bg-surface) 75%);
    background-size: 200% 100%;
    animation: budget-shimmer 1.5s ease-in-out infinite;
  }

  .budget-skeleton-block.title { width: 90px; height: 28px; margin-bottom: 8px; }
  .budget-skeleton-block.subtitle { width: 220px; height: 14px; }
  .budget-skeleton-block.button { width: 110px; height: 40px; }
  .budget-skeleton-block.body { width: 100%; }

  @media (max-width: 560px) {
    .budget-stats-grid,
    .budget-suggestion-grid,
    .budget-row-2 { grid-template-columns: 1fr; }

    .budget-stat {
      border-right: none;
      border-bottom: 0.5px solid var(--border);
      padding: 0 0 1rem;
    }

    .budget-stat:not(:first-child) { padding-left: 0; padding-top: 1rem; }
    .budget-stat:last-child { border-bottom: none; padding-bottom: 0; }

    .budget-alloc-row,
    .budget-history-row,
    .budget-summary-row {
      align-items: flex-start;
      flex-direction: column;
    }

    .budget-alloc-right,
    .budget-history-values {
      align-items: flex-start;
      text-align: left;
    }

    .budget-modal-actions {
      flex-direction: column-reverse;
    }

    .budget-modal-actions button {
      width: 100%;
    }
  }
`
