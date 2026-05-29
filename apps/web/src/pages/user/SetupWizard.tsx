"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../../store/authStore"
import { useAccountStore } from "../../store/accountStore"
import { useFundStore } from "../../store/fundStore"
import { useBudgetStore } from "../../store/budgetStore"
import type {
  Fund,
  FundCreatePayload,
  MonthlyBudgetSetupPayload,
} from "../../types"

export default function SetupWizard() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const accountStore = useAccountStore()
  const fundStore = useFundStore()
  const budgetStore = useBudgetStore()

  const [currentScreen, setCurrentScreen] = useState<2 | 3 | 4>(2)
  const [showScreen1, setShowScreen1] = useState(true)
  const [isInitializing, setIsInitializing] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Screen 1
  const [accountName, setAccountName] = useState("")

  // Screen 2
  const [addingFund, setAddingFund] = useState(false)
  const [newFundName, setNewFundName] = useState("")
  const [newFundIcon, setNewFundIcon] = useState("🎯")
  const [newFundTarget, setNewFundTarget] = useState("")
  const [newFundTargetDate, setNewFundTargetDate] = useState("")

  // Screen 3
  const [balances, setBalances] = useState<Record<number, string>>({})

  // Screen 4
  const [income, setIncome] = useState("")
  const [needs, setNeeds] = useState("")
  const [wants, setWants] = useState("")
  const [fundAllocs, setFundAllocs] = useState<Record<number, string>>({})

  // Screen determination on mount
  useEffect(() => {
    async function init() {
      setIsInitializing(true)
      await fundStore.fetchFunds()
      const status = await accountStore.fetchSetupStatus()

      if (status.setup_complete) {
        navigate("/dashboard")
        return
      }

      const screen = accountStore.getFirstIncompleteScreen()
      if (status.has_account) {
        setShowScreen1(false)
        setCurrentScreen(screen ?? 2)
      } else {
        setShowScreen1(true)
        setCurrentScreen(2)
      }
      setIsInitializing(false)
    }
    init()
  }, [])

  // Pre-fill account name from user
  useEffect(() => {
    if (user) {
      setAccountName(`${user.first_name || user.username}'s Finances`)
    }
  }, [user])

  // Initialize balances when funds load for Screen 3
  useEffect(() => {
    if (fundStore.funds.length > 0 && currentScreen === 3) {
      const initial: Record<number, string> = {}
      fundStore.funds.forEach((f) => {
        initial[f.id] = f.current_balance !== "0.00" ? f.current_balance : ""
      })
      setBalances(initial)
    }
  }, [fundStore.funds, currentScreen])

  // Initialize fund allocs when Screen 4 becomes active
  useEffect(() => {
    if (currentScreen === 4 && fundStore.funds.length > 0) {
      const allocs: Record<number, string> = {}
      fundStore.funds
        .filter((f) => f.name !== "Cash on Hand" && (f.type === "system_required" || (f.type === "goal" && f.status === "active")))
        .forEach((f) => {
          allocs[f.id] = f.monthly_allocation !== "0.00" ? f.monthly_allocation : ""
        })
      setFundAllocs(allocs)
    }
  }, [currentScreen, fundStore.funds])

  // Handlers
  async function handleScreen1Submit(e: React.FormEvent) {
    e.preventDefault()
    if (!accountName.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      await accountStore.updateAccountName(accountName.trim())
      setShowScreen1(false)
    } catch (err: any) {
      setError(err?.message || "Failed to update financial account name.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAddFund(e: React.FormEvent) {
    e.preventDefault()
    if (!newFundName.trim()) return

    setIsSubmitting(true)
    setError(null)
    try {
      await fundStore.addFund({
        name: newFundName.trim(),
        icon: newFundIcon,
        target_amount: newFundTarget ? parseFloat(newFundTarget) : null,
        target_date: newFundTargetDate || null,
      })
      setNewFundName("")
      setNewFundIcon("🎯")
      setNewFundTarget("")
      setNewFundTargetDate("")
      setAddingFund(false)
    } catch (err: any) {
      setError(err?.message || "Failed to add goal fund.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleRemoveFund(id: number) {
    setIsSubmitting(true)
    setError(null)
    try {
      await fundStore.closeFund(id, "Removed during setup")
    } catch (err: any) {
      setError(err?.message || "Failed to remove fund.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleScreen2Continue() {
    setCurrentScreen(3)
  }

  async function handleScreen3Submit(e: React.FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    try {
      const parsed: Record<number, number> = {}
      Object.entries(balances).forEach(([id, val]) => {
        parsed[parseInt(id)] = parseFloat(val) || 0
      })
      await fundStore.saveSetupBalances(parsed)
      setCurrentScreen(4)
    } catch (err: any) {
      setError(err?.message || "Failed to save current balances.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleScreen4Submit(e: React.FormEvent) {
    e.preventDefault()
    const incVal = parseFloat(income) || 0
    const needsVal = parseFloat(needs) || 0
    const wantsVal = parseFloat(wants) || 0

    if (incVal <= 0) {
      setError("Please enter an estimated monthly income greater than 0.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    try {
      // 1. Save budget setup
      await budgetStore.createInitialSetup({
        estimated_monthly_income: incVal,
        needs_budget: needsVal,
        wants_budget: wantsVal,
      })

      // 2. Save fund allocations
      const fundsToUpdate = fundStore.funds.filter(
        (f) => f.name !== "Cash on Hand" && (f.type === "system_required" || (f.type === "goal" && f.status === "active"))
      )
      await Promise.all(
        fundsToUpdate.map((f) => {
          const allocStr = fundAllocs[f.id] || "0"
          const allocVal = parseFloat(allocStr) || 0
          return fundStore.editFund(f.id, {
            monthly_allocation: allocVal,
          })
        })
      )

      // 3. Complete and navigate
      await accountStore.fetchSetupStatus()
      navigate("/dashboard")
    } catch (err: any) {
      setError(err?.message || "Failed to save budget configuration.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleApply503020() {
    const incVal = parseFloat(income) || 0
    if (incVal > 0) {
      setNeeds((incVal * 0.5).toFixed(2))
      setWants((incVal * 0.3).toFixed(2))
    }
  }

  // Computed state
  const liveNetWorth = Object.values(balances).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0
  )

  const totalFundAllocs = Object.values(fundAllocs).reduce(
    (sum, v) => sum + (parseFloat(v) || 0),
    0
  )

  const remaining =
    (parseFloat(income) || 0) -
    (parseFloat(needs) || 0) -
    (parseFloat(wants) || 0) -
    totalFundAllocs

  if (isInitializing) return <LoadingScreen />

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="wiz-root">
        <div className="wiz-brand">
          <h1 className="wiz-brand-name">Langgam-It</h1>
          <p className="wiz-brand-sub">Let's set up your finances</p>
        </div>

        <div className="wiz-card">
          <ProgressDots currentScreen={currentScreen} showScreen1={showScreen1} />

          {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}

          {/* SCREEN 1: Account Name */}
          {showScreen1 && (
            <form onSubmit={handleScreen1Submit} noValidate>
              <h2 className="wiz-screen-title">What do you want to call your financial setup?</h2>
              <p className="wiz-screen-sub">This name will appear on your dashboard.</p>

              <div className="wiz-field">
                <label className="wiz-label" htmlFor="accountName">
                  Financial account name
                </label>
                <input
                  id="accountName"
                  type="text"
                  className="wiz-input"
                  placeholder="My 2026 Budget"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  autoFocus
                  disabled={isSubmitting}
                />
                <span className="wiz-helper">You can always change this in Settings</span>
              </div>

              <button
                type="submit"
                className="wiz-btn-primary"
                disabled={isSubmitting || !accountName.trim()}
              >
                {isSubmitting ? (
                  <>
                    <span className="wiz-btn-spinner" />
                    Saving…
                  </>
                ) : (
                  "Continue"
                )}
              </button>

              <p className="wiz-skip" style={{ marginTop: "1rem" }}>
                This is your personal finance workspace.
              </p>
            </form>
          )}

          {/* SCREEN 2: Goal Funds */}
          {!showScreen1 && currentScreen === 2 && (
            <div>
              <h2 className="wiz-screen-title">Add goal funds</h2>
              <p className="wiz-screen-sub">
                Emergency and Savings are created automatically. Add custom funds for goals.
              </p>

              <p className="wiz-section-label">System funds</p>
              <div className="wiz-fund-list">
                {fundStore.funds
                  .filter((f) => f.type === "system_required")
                  .map((f) => (
                    <div className="wiz-fund-item" key={f.id}>
                      <span className="wiz-fund-icon">{f.icon || "👛"}</span>
                      <span className="wiz-fund-name">{f.name}</span>
                      <span className="wiz-fund-tag">System</span>
                    </div>
                  ))}
              </div>

              <p className="wiz-section-label">Your goal funds</p>
              <div className="wiz-fund-list" style={{ marginBottom: "1rem" }}>
                {fundStore.getGoalFunds().map((f) => (
                  <div className="wiz-fund-item" key={f.id}>
                    <span className="wiz-fund-icon">{f.icon || "🎯"}</span>
                    <span className="wiz-fund-name">{f.name}</span>
                    {f.target_amount && (
                      <span className="wiz-fund-meta">
                        Target: {formatCurrency(parseFloat(f.target_amount))}
                      </span>
                    )}
                    <button
                      type="button"
                      className="wiz-fund-remove"
                      onClick={() => handleRemoveFund(f.id)}
                      disabled={isSubmitting}
                      aria-label="Remove goal fund"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              {addingFund ? (
                <form onSubmit={handleAddFund} className="wiz-add-fund-form" noValidate>
                  <div className="wiz-field" style={{ marginBottom: 0 }}>
                    <label className="wiz-label" htmlFor="newFundName">
                      Fund name
                    </label>
                    <input
                      id="newFundName"
                      type="text"
                      className="wiz-input"
                      placeholder="e.g. Dream Vacation"
                      value={newFundName}
                      onChange={(e) => setNewFundName(e.target.value)}
                      required
                      disabled={isSubmitting}
                      autoFocus
                    />
                  </div>

                  <div className="wiz-field" style={{ marginBottom: 0 }}>
                    <label className="wiz-label">Icon</label>
                    <div className="wiz-icon-picker">
                      {FUND_ICONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          className={`wiz-icon-btn${newFundIcon === emoji ? " selected" : ""}`}
                          onClick={() => setNewFundIcon(emoji)}
                          disabled={isSubmitting}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="wiz-add-fund-row">
                    <div className="wiz-field" style={{ marginBottom: 0 }}>
                      <label className="wiz-label" htmlFor="newFundTarget">
                        Target amount (optional)
                      </label>
                      <div className="wiz-currency-wrap">
                        <span className="wiz-currency-prefix">₱</span>
                        <input
                          id="newFundTarget"
                          type="number"
                          min="0"
                          step="0.01"
                          className="wiz-input wiz-currency-input"
                          placeholder="0.00"
                          value={newFundTarget}
                          onChange={(e) => setNewFundTarget(e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                    <div className="wiz-field" style={{ marginBottom: 0 }}>
                      <label className="wiz-label" htmlFor="newFundTargetDate">
                        Target date (optional)
                      </label>
                      <input
                        id="newFundTargetDate"
                        type="date"
                        className="wiz-input"
                        value={newFundTargetDate}
                        onChange={(e) => setNewFundTargetDate(e.target.value)}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="wiz-add-fund-actions">
                    <button
                      type="submit"
                      className="wiz-btn-sm primary"
                      disabled={isSubmitting || !newFundName.trim()}
                    >
                      {isSubmitting ? "Adding…" : "Add Fund"}
                    </button>
                    <button
                      type="button"
                      className="wiz-btn-sm secondary"
                      onClick={() => setAddingFund(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="wiz-add-fund-btn"
                  onClick={() => setAddingFund(true)}
                  disabled={isSubmitting}
                >
                  + Add a custom goal fund
                </button>
              )}

              <button
                type="button"
                className="wiz-btn-primary"
                onClick={handleScreen2Continue}
                disabled={isSubmitting || addingFund}
              >
                Continue →
              </button>

              <button
                type="button"
                className="wiz-btn-secondary"
                onClick={handleScreen2Continue}
                disabled={isSubmitting || addingFund}
              >
                Skip for now
              </button>

              <p className="wiz-skip" style={{ marginTop: "1rem" }}>
                You can add more goal funds anytime from Settings.
              </p>
            </div>
          )}

          {/* SCREEN 3: Current Balances */}
          {!showScreen1 && currentScreen === 3 && (
            <form onSubmit={handleScreen3Submit} noValidate>
              <h2 className="wiz-screen-title">Current balances</h2>
              <p className="wiz-screen-sub">
                Enter what you currently have in each fund to set your net worth.
              </p>

              <div className="wiz-fund-list" style={{ borderBottom: "0.5px solid var(--border)", paddingBottom: "1rem" }}>
                {fundStore.funds
                  .filter((f) => f.type === "system_required")
                  .map((f) => (
                    <div className="wiz-balance-row" key={f.id}>
                      <div className="wiz-balance-label">
                        <span className="wiz-fund-icon">{f.icon || "👛"}</span>
                        <span className="wiz-balance-name">{f.name}</span>
                      </div>
                      <div className="wiz-currency-wrap wiz-balance-input">
                        <span className="wiz-currency-prefix">₱</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="wiz-input wiz-currency-input"
                          placeholder="0.00"
                          value={balances[f.id] ?? ""}
                          onChange={(e) => handleChangeBalance(f.id, e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  ))}
              </div>

              {fundStore.getGoalFunds().length > 0 && (
                <>
                  <p className="wiz-section-label">Goal funds</p>
                  <div className="wiz-fund-list" style={{ borderBottom: "0.5px solid var(--border)", paddingBottom: "1rem" }}>
                    {fundStore.getGoalFunds().map((f) => (
                      <div className="wiz-balance-row" key={f.id}>
                        <div className="wiz-balance-label">
                          <span className="wiz-fund-icon">{f.icon || "🎯"}</span>
                          <span className="wiz-balance-name">{f.name}</span>
                        </div>
                        <div className="wiz-currency-wrap wiz-balance-input">
                          <span className="wiz-currency-prefix">₱</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="wiz-input wiz-currency-input"
                            placeholder="0.00"
                            value={balances[f.id] ?? ""}
                            onChange={(e) => handleChangeBalance(f.id, e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="wiz-networth-preview">
                <span className="wiz-networth-label">Current net worth</span>
                <span className="wiz-networth-value">{formatCurrency(liveNetWorth)}</span>
              </div>

              <button
                type="submit"
                className="wiz-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="wiz-btn-spinner" />
                    Saving Balances…
                  </>
                ) : (
                  "Continue →"
                )}
              </button>

              <p className="wiz-skip" style={{ marginTop: "1rem" }}>
                All balances can be 0 — set them when you're ready.
              </p>
            </form>
          )}

          {/* SCREEN 4: Monthly Budget */}
          {!showScreen1 && currentScreen === 4 && (
            <form onSubmit={handleScreen4Submit} noValidate>
              <h2 className="wiz-screen-title">Monthly budget</h2>
              <p className="wiz-screen-sub">
                Configure your estimated monthly income, spending limits, and savings goals.
              </p>

              {/* Monthly Income */}
              <div className="wiz-field">
                <label className="wiz-label" htmlFor="income">
                  Estimated monthly income
                </label>
                <div className="wiz-currency-wrap">
                  <span className="wiz-currency-prefix">₱</span>
                  <input
                    id="income"
                    type="number"
                    min="0"
                    step="0.01"
                    className="wiz-input wiz-currency-input"
                    placeholder="0.00"
                    value={income}
                    onChange={(e) => setIncome(e.target.value)}
                    required
                    disabled={isSubmitting}
                    autoFocus
                  />
                </div>
              </div>

              {/* 50/30/20 suggestion panel */}
              {parseFloat(income) > 0 && (
                <div className="wiz-suggestion">
                  <div className="wiz-suggestion-title">50/30/20 Rule Suggestion</div>
                  <div className="wiz-suggestion-row">
                    <span>50% Needs:</span>
                    <strong>{formatCurrency((parseFloat(income) || 0) * 0.5)}</strong>
                  </div>
                  <div className="wiz-suggestion-row">
                    <span>30% Wants:</span>
                    <strong>{formatCurrency((parseFloat(income) || 0) * 0.3)}</strong>
                  </div>
                  <div className="wiz-suggestion-row">
                    <span>20% Savings / Funds:</span>
                    <strong>{formatCurrency((parseFloat(income) || 0) * 0.2)}</strong>
                  </div>
                  <button
                    type="button"
                    className="wiz-suggestion-apply"
                    onClick={handleApply503020}
                    disabled={isSubmitting}
                  >
                    Apply Needs & Wants Fills
                  </button>
                </div>
              )}

              {/* Needs & Wants Inputs */}
              <div className="wiz-add-fund-row" style={{ marginBottom: "1rem" }}>
                <div className="wiz-field" style={{ marginBottom: 0 }}>
                  <label className="wiz-label" htmlFor="needs">
                    Needs budget
                  </label>
                  <div className="wiz-currency-wrap">
                    <span className="wiz-currency-prefix">₱</span>
                    <input
                      id="needs"
                      type="number"
                      min="0"
                      step="0.01"
                      className="wiz-input wiz-currency-input"
                      placeholder="0.00"
                      value={needs}
                      onChange={(e) => setNeeds(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
                <div className="wiz-field" style={{ marginBottom: 0 }}>
                  <label className="wiz-label" htmlFor="wants">
                    Wants budget
                  </label>
                  <div className="wiz-currency-wrap">
                    <span className="wiz-currency-prefix">₱</span>
                    <input
                      id="wants"
                      type="number"
                      min="0"
                      step="0.01"
                      className="wiz-input wiz-currency-input"
                      placeholder="0.00"
                      value={wants}
                      onChange={(e) => setWants(e.target.value)}
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              {/* Fund Allocations */}
              <p className="wiz-section-label">Monthly allocations per fund</p>
              <div className="wiz-fund-list" style={{ borderBottom: "0.5px solid var(--border)", paddingBottom: "1rem" }}>
                {fundStore.funds
                  .filter(
                    (f) => f.name !== "Cash on Hand" && (f.type === "system_required" || (f.type === "goal" && f.status === "active"))
                  )
                  .map((f) => (
                    <div className="wiz-alloc-row" key={f.id}>
                      <div className="wiz-balance-label">
                        <span className="wiz-fund-icon">{f.icon || (f.type === "system_required" ? "👛" : "🎯")}</span>
                        <span className="wiz-balance-name">{f.name}</span>
                      </div>
                      <div className="wiz-currency-wrap wiz-balance-input">
                        <span className="wiz-currency-prefix">₱</span>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          className="wiz-input wiz-currency-input"
                          placeholder="0.00"
                          value={fundAllocs[f.id] ?? ""}
                          onChange={(e) => handleChangeAlloc(f.id, e.target.value)}
                          disabled={isSubmitting}
                        />
                      </div>
                    </div>
                  ))}
              </div>

              {/* Live allocation summary pill */}
              <div className={`wiz-remaining ${remaining >= 0 ? "ok" : "over"}`}>
                {remaining >= 0 ? (
                  `${formatCurrency(remaining)} goes to Cash on Hand each month ✓`
                ) : (
                  `Over budget by ${formatCurrency(Math.abs(remaining))}`
                )}
              </div>

              <button
                type="submit"
                className="wiz-btn-primary"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <span className="wiz-btn-spinner" />
                    Finishing Setup…
                  </>
                ) : (
                  "Finish Setup →"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Helper components
// ─────────────────────────────────────────────────────────────────────

function ProgressDots({ currentScreen, showScreen1 }: { currentScreen: number; showScreen1: boolean }) {
  const getStepState = (stepIndex: number) => {
    if (showScreen1) {
      if (stepIndex === 0) return "active"
      return ""
    }
    if (stepIndex === 0) return "done"

    if (currentScreen === 2) {
      if (stepIndex === 1) return "active"
      return ""
    }
    if (currentScreen === 3) {
      if (stepIndex === 1) return "done"
      if (stepIndex === 2) return "active"
      return ""
    }
    if (currentScreen === 4) {
      if (stepIndex === 1 || stepIndex === 2) return "done"
      if (stepIndex === 3) return "active"
      return ""
    }
    return ""
  }

  return (
    <div className="wiz-dots">
      {[0, 1, 2, 3].map((i) => {
        const state = getStepState(i)
        return <div key={i} className={`wiz-dot ${state}`} />
      })}
    </div>
  )
}

function ErrorBanner({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  return (
    <div className="wiz-error-banner" role="alert">
      <span style={{ flex: 1 }}>{message}</span>
      <button
        onClick={onDismiss}
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          padding: 0,
          fontSize: 16,
          lineHeight: 1,
        }}
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}

function LoadingScreen() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="wiz-root">
        <div className="wiz-brand">
          <h1 className="wiz-brand-name">Langgam-It</h1>
        </div>
        <div className="wiz-card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <div className="wiz-spinner" />
          <p style={{ marginTop: "1rem", fontSize: 14, color: "var(--text-3)" }}>
            Loading your setup…
          </p>
        </div>
      </div>
    </>
  )
}

function SuccessScreen({ onGoToDashboard }: { onGoToDashboard: () => void }) {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="wiz-root">
        <div className="wiz-card" style={{ textAlign: "center", padding: "3rem 2rem" }}>
          <h2 className="wiz-screen-title" style={{ marginBottom: "1rem" }}>Setup Completed!</h2>
          <p style={{ marginBottom: "1.5rem", fontSize: 14, color: "var(--text-2)" }}>
            Welcome to Langgam-It. Let's head to your dashboard.
          </p>
          <button className="wiz-btn-primary" onClick={onGoToDashboard}>
            Go to Dashboard
          </button>
        </div>
      </div>
    </>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value)
}

// ─────────────────────────────────────────────────────────────────────
// Icons & Preset Constants
// ─────────────────────────────────────────────────────────────────────

const FUND_ICONS = ["🎯", "✈️", "💻", "👗", "🏠", "⭐", "🚗", "📚", "🎮", "💊"]

function LogoIcon({ color }: { color: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
      <path
        d="M4 15L10 5L16 15"
        stroke={color}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.5 11H13.5"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────

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
    --sans:  'Plus Jakarta Sans', system-ui, sans-serif;
    --serif: 'Lora', Georgia, serif;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 20px;
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
      --error-bg:   #4A1B0C;
      --success:      #97C459;
      --success-bg:   #173404;
      --warning:      #EF9F27;
      --warning-bg:   #412402;
    }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .wiz-root {
    min-height: 100vh;
    background: var(--bg-page);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 2rem 1.5rem 4rem;
    font-family: var(--sans);
  }

  .wiz-brand {
    text-align: center;
    margin-bottom: 1.75rem;
    margin-top: 1rem;
  }

  .wiz-brand-name {
    font-family: var(--serif);
    font-size: 28px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }

  .wiz-brand-sub {
    font-size: 13px;
    color: var(--text-3);
  }

  .wiz-card {
    width: 100%;
    max-width: 520px;
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 2rem;
  }

  /* Progress dots */
  .wiz-dots {
    display: flex;
    gap: 8px;
    justify-content: center;
    margin-bottom: 1.75rem;
  }

  .wiz-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border-md);
    transition: background 0.2s;
  }

  .wiz-dot.active,
  .wiz-dot.done {
    background: var(--text-1);
  }

  /* Screen title */
  .wiz-screen-title {
    font-size: 20px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.3px;
    margin-bottom: 4.5px;
  }

  .wiz-screen-sub {
    font-size: 13px;
    color: var(--text-3);
    margin-bottom: 1.5rem;
    line-height: 1.5;
  }

  /* Field */
  .wiz-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 1rem;
  }

  .wiz-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
  }

  .wiz-input {
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
    transition: border-color 0.15s, background 0.15s;
  }

  .wiz-input:focus {
    border-color: var(--border-focus);
    background: var(--bg-card);
  }

  .wiz-input.error { border-color: var(--error); }

  .wiz-helper {
    font-size: 11px;
    color: var(--text-3);
  }

  /* Currency input wrapper */
  .wiz-currency-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .wiz-currency-prefix {
    position: absolute;
    left: 14px;
    font-size: 14px;
    color: var(--text-3);
    pointer-events: none;
    font-weight: 500;
  }

  .wiz-currency-input {
    padding-left: 28px;
  }

  /* System fund tag */
  .wiz-fund-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    margin-bottom: 1.25rem;
  }

  .wiz-fund-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    font-size: 14px;
  }

  .wiz-fund-icon {
    font-size: 18px;
    width: 28px;
    text-align: center;
    flex-shrink: 0;
  }

  .wiz-fund-name {
    flex: 1;
    font-weight: 500;
    color: var(--text-1);
  }

  .wiz-fund-meta {
    font-size: 11px;
    color: var(--text-3);
  }

  .wiz-fund-tag {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 8px;
    border-radius: 20px;
    background: var(--bg-page);
    color: var(--text-3);
    border: 0.5px solid var(--border-md);
  }

  .wiz-fund-remove {
    background: none;
    border: none;
    color: var(--text-3);
    cursor: pointer;
    padding: 4px;
    display: flex;
    align-items: center;
    border-radius: 4px;
    transition: color 0.15s;
  }

  .wiz-fund-remove:hover { color: var(--error); }

  /* Add fund form */
  .wiz-add-fund-form {
    padding: 14px;
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    margin-bottom: 1rem;
    display: flex;
    flex-direction: column;
    gap: 10px;
    border: 0.5px solid var(--border-md);
  }

  .wiz-icon-picker {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }

  .wiz-icon-btn {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    border: 0.5px solid var(--border-md);
    background: var(--bg-card);
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s;
  }

  .wiz-icon-btn.selected {
    border-color: var(--text-1);
    background: var(--bg-surface);
    outline: 2px solid var(--text-1);
    outline-offset: 1px;
  }

  .wiz-add-fund-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .wiz-add-fund-actions {
    display: flex;
    gap: 8px;
    margin-top: 4px;
  }

  /* Balance rows */
  .wiz-balance-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 0;
    border-bottom: 0.5px solid var(--border);
  }

  .wiz-balance-row:last-child { border-bottom: none; }

  .wiz-balance-label {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1;
    min-width: 0;
  }

  .wiz-balance-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .wiz-balance-input {
    width: 140px;
    flex-shrink: 0;
  }

  /* Net worth preview */
  .wiz-networth-preview {
    margin-top: 1.25rem;
    padding: 14px;
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .wiz-networth-label {
    font-size: 12px;
    color: var(--text-3);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .wiz-networth-value {
    font-family: var(--serif);
    font-size: 22px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.3px;
  }

  /* Suggestion panel */
  .wiz-suggestion {
    padding: 14px;
    background: var(--success-bg);
    border-radius: var(--radius-md);
    margin-bottom: 1.25rem;
    border: 0.5px solid rgba(59,109,17,0.2);
  }

  .wiz-suggestion-title {
    font-size: 12px;
    font-weight: 500;
    color: var(--success);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 8px;
  }

  .wiz-suggestion-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--text-2);
    margin-bottom: 4px;
  }

  .wiz-suggestion-apply {
    margin-top: 10px;
    padding: 6px 14px;
    background: var(--success);
    color: #fff;
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .wiz-suggestion-apply:hover { opacity: 0.85; }

  /* Remaining budget pill */
  .wiz-remaining {
    margin-top: 1rem;
    padding: 10px 14px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
  }

  .wiz-remaining.ok {
    background: var(--success-bg);
    color: var(--success);
  }

  .wiz-remaining.over {
    background: var(--error-bg);
    color: var(--error);
  }

  /* Alloc rows */
  .wiz-alloc-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 0;
    border-bottom: 0.5px solid var(--border);
  }

  .wiz-alloc-row:last-child { border-bottom: none; }

  /* Buttons */
  .wiz-btn-primary {
    width: 100%;
    height: 46px;
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 1.25rem;
  }

  .wiz-btn-primary:hover:not(:disabled) { opacity: 0.85; }
  .wiz-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

  .wiz-btn-secondary {
    width: 100%;
    height: 44px;
    background: transparent;
    color: var(--text-2);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
    margin-top: 0.5rem;
  }

  .wiz-btn-secondary:hover { opacity: 0.7; }

  .wiz-btn-sm {
    height: 36px;
    padding: 0 14px;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
    border: none;
  }

  .wiz-btn-sm.primary {
    background: var(--text-1);
    color: var(--bg-card);
  }

  .wiz-btn-sm.secondary {
    background: var(--bg-surface);
    color: var(--text-2);
    border: 0.5px solid var(--border-md);
  }

  .wiz-btn-sm:hover:not(:disabled) { opacity: 0.82; }
  .wiz-btn-sm:disabled { opacity: 0.5; cursor: not-allowed; }

  .wiz-add-fund-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--bg-surface);
    border: 0.5px dashed var(--border-md);
    border-radius: var(--radius-sm);
    color: var(--text-2);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    width: 100%;
    transition: border-color 0.15s, color 0.15s;
    margin-bottom: 1rem;
  }

  .wiz-add-fund-btn:hover {
    border-color: var(--text-2);
    color: var(--text-1);
  }

  /* Spinner */
  .wiz-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid var(--border-md);
    border-top-color: var(--text-1);
    border-radius: 50%;
    animation: wiz-spin 0.7s linear infinite;
    margin: 0 auto;
  }

  .wiz-btn-spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: wiz-spin 0.7s linear infinite;
  }

  @keyframes wiz-spin { to { transform: rotate(360deg); } }

  /* Error / warning banners */
  .wiz-error-banner {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px;
    background: var(--error-bg);
    border-radius: var(--radius-sm);
    margin-bottom: 1rem;
    font-size: 13px;
    color: var(--error);
    line-height: 1.5;
  }

  .wiz-section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-3);
    margin-bottom: 0.625rem;
    margin-top: 1.25rem;
  }

  .wiz-section-label:first-child { margin-top: 0; }

  @media (min-width: 480px) {
    .wiz-card { padding: 2.5rem; }
    .wiz-brand-name { font-size: 32px; }
  }
`
