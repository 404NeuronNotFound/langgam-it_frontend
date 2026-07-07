import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { useAuthStore } from "../store/authStore"
import { useAccountStore } from "../store/accountStore"
import { useFundStore } from "../store/fundStore"
import { useBudgetStore } from "../store/budgetStore"
import type {
  FinancialAccount,
  Fund,
  FundCreatePayload,
  FundUpdatePayload,
  MonthlyBudgetSetup,
  MonthlyBudgetSetupPayload,
  User,
} from "../types"

const ICONS = ["target", "plane", "laptop", "home", "car", "book", "star"]

export default function SettingsPage() {
  const navigate = useNavigate()
  const authStore = useAuthStore()
  const accountStore = useAccountStore()
  const fundStore = useFundStore()
  const budgetStore = useBudgetStore()

  const [isLoading, setIsLoading] = useState(true)
  const [accountName, setAccountName] = useState("")
  const [isSavingName, setIsSavingName] = useState(false)
  const [nameSaved, setNameSaved] = useState(false)
  const [editingFund, setEditingFund] = useState<Fund | null>(null)
  const [showAddFund, setShowAddFund] = useState(false)
  const [showEditBudget, setShowEditBudget] = useState(false)
  const [showReorder, setShowReorder] = useState(false)
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function load() {
      await Promise.all([
        useAccountStore.getState().fetchAccount(),
        useFundStore.getState().fetchFunds(),
        useBudgetStore.getState().fetchSetups(),
      ])

      const account = useAccountStore.getState().account
      if (isMounted) {
        setAccountName(account?.name ?? "")
        setIsLoading(false)
      }
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (accountStore.account && !accountName) {
      setAccountName(accountStore.account.name)
    }
  }, [accountStore.account, accountName])

  async function handleSaveName() {
    if (!accountName.trim()) return
    setIsSavingName(true)
    setGlobalError(null)
    try {
      await accountStore.updateAccountName(accountName.trim())
      setNameSaved(true)
      window.setTimeout(() => setNameSaved(false), 2000)
    } catch {
      setGlobalError("Failed to save account name.")
    } finally {
      setIsSavingName(false)
    }
  }

  async function handleReset() {
    setIsResetting(true)
    setGlobalError(null)
    try {
      await accountStore.resetData()
      setShowResetConfirm(false)
      navigate("/setup")
    } catch {
      setGlobalError("Failed to reset financial data.")
    } finally {
      setIsResetting(false)
    }
  }

  function handleDeleteAccount() {
    setIsDeleting(true)
    // Server-side account deletion is not implemented yet. This clears the
    // current client session as a temporary stand-in until DELETE support lands.
    authStore.logout()
    navigate("/")
    setIsDeleting(false)
  }

  const activeFunds = fundStore.funds.filter((fund) => fund.status === "active")
  const systemFunds = activeFunds.filter(
    (fund) => fund.type === "system_required"
  )
  const goalFunds = activeFunds.filter((fund) => fund.type === "goal")
  const totalAlloc = fundStore.getTotalMonthlyAlloc()

  if (isLoading) return <SettingsPageSkeleton />

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="set-root">
        <div className="set-header">
          <h1 className="set-title">Settings</h1>
          <p className="set-subtitle">Manage your account and preferences</p>
        </div>

        {globalError && (
          <div className="set-global-error" role="alert">
            <span>{globalError}</span>
            <button
              className="set-error-dismiss"
              onClick={() => setGlobalError(null)}
              aria-label="Dismiss error"
            >
              x
            </button>
          </div>
        )}

        <AccountSection
          account={accountStore.account}
          accountName={accountName}
          isSaving={isSavingName}
          isSaved={nameSaved}
          onChange={setAccountName}
          onSave={handleSaveName}
          user={authStore.user}
        />

        <FundsSection
          systemFunds={systemFunds}
          goalFunds={goalFunds}
          onEditFund={setEditingFund}
          onAddFund={() => setShowAddFund(true)}
          onReorder={() => setShowReorder(true)}
        />

        <BudgetSection
          activeSetup={budgetStore.activeSetup}
          totalAlloc={totalAlloc}
          onEditBudget={() => setShowEditBudget(true)}
        />

        <DangerZoneSection
          onReset={() => setShowResetConfirm(true)}
          onDelete={() => setShowDeleteConfirm(true)}
        />

        {editingFund && (
          <EditFundModal
            fund={editingFund}
            onClose={() => setEditingFund(null)}
            onSave={async (payload) => {
              await fundStore.editFund(editingFund.id, payload)
              setEditingFund(null)
            }}
          />
        )}

        {showAddFund && (
          <AddFundModal
            onClose={() => setShowAddFund(false)}
            onAdd={async (payload) => {
              await fundStore.addFund(payload)
              setShowAddFund(false)
            }}
          />
        )}

        {showEditBudget && (
          <EditBudgetModal
            activeSetup={budgetStore.activeSetup}
            totalFundAlloc={totalAlloc}
            onClose={() => setShowEditBudget(false)}
            onSave={async (payload) => {
              await budgetStore.updateSetup(payload)
              setShowEditBudget(false)
            }}
          />
        )}

        {showReorder && (
          <ReorderModal
            funds={activeFunds.filter((fund) => fund.name !== "Cash on Hand")}
            onClose={() => setShowReorder(false)}
            onSave={async (order) => {
              await fundStore.reorderFunds(order)
              setShowReorder(false)
            }}
          />
        )}

        {showResetConfirm && (
          <ConfirmModal
            title="Reset financial data?"
            body="This will zero all fund balances and delete cycles, expenses, transfers, alerts, snapshots, and summaries. Funds and budget setup are preserved."
            confirmLabel="Reset Financial Data"
            confirmClass="set-btn-warning"
            isProcessing={isResetting}
            onConfirm={handleReset}
            onCancel={() => setShowResetConfirm(false)}
          />
        )}

        {showDeleteConfirm && (
          <ConfirmModal
            title="Delete your account?"
            body="Account deletion is not available on the server yet. For now this signs you out and clears the local session."
            confirmLabel="Sign Out"
            confirmClass="set-btn-danger"
            isProcessing={isDeleting}
            onConfirm={handleDeleteAccount}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </div>
    </>
  )
}

function AccountSection({
  account,
  accountName,
  isSaving,
  isSaved,
  onChange,
  onSave,
  user,
}: {
  account: FinancialAccount | null
  accountName: string
  isSaving: boolean
  isSaved: boolean
  onChange: (value: string) => void
  onSave: () => void
  user: User | null
}) {
  const createdDate = account?.created_at
    ? new Date(account.created_at).toLocaleDateString("en-PH", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null

  return (
    <section className="set-section">
      <p className="set-section-label">Financial account</p>
      <div className="set-card">
        {user && (
          <div className="set-user-row">
            <div className="set-user-avatar">
              {(user.first_name?.[0] || user.username[0]).toUpperCase()}
            </div>
            <div>
              <p className="set-user-name">
                {[user.first_name, user.last_name].filter(Boolean).join(" ") ||
                  user.username}
              </p>
              <p className="set-user-email">{user.email}</p>
            </div>
          </div>
        )}

        <div className="set-divider" />

        <div className="set-field">
          <label className="set-label" htmlFor="account-name">
            Account name
          </label>
          <div className="set-input-row">
            <input
              id="account-name"
              type="text"
              className="set-input"
              value={accountName}
              onChange={(event) => onChange(event.target.value)}
              disabled={isSaving}
              maxLength={100}
              placeholder="My Finances"
            />
            <button
              className={`set-btn-save${isSaved ? " saved" : ""}`}
              onClick={onSave}
              disabled={
                isSaving || !accountName.trim() || accountName === account?.name
              }
            >
              {isSaving ? (
                <span className="set-btn-spinner" />
              ) : isSaved ? (
                "Saved"
              ) : (
                "Save"
              )}
            </button>
          </div>
          {createdDate && (
            <p className="set-field-hint">Account created {createdDate}</p>
          )}
        </div>
      </div>
    </section>
  )
}

function FundsSection({
  systemFunds,
  goalFunds,
  onEditFund,
  onAddFund,
  onReorder,
}: {
  systemFunds: Fund[]
  goalFunds: Fund[]
  onEditFund: (fund: Fund) => void
  onAddFund: () => void
  onReorder: () => void
}) {
  const allFunds = [...systemFunds, ...goalFunds]

  return (
    <section className="set-section">
      <div className="set-section-header">
        <p className="set-section-label">Funds and allocations</p>
        {allFunds.length > 2 && (
          <button className="set-link-btn" onClick={onReorder}>
            Reorder priority
          </button>
        )}
      </div>
      <div className="set-card">
        {allFunds.map((fund, idx) => (
          <FundRow
            key={fund.id}
            fund={fund}
            isLast={idx === allFunds.length - 1}
            onEdit={onEditFund}
          />
        ))}

        <button className="set-add-fund-btn" onClick={onAddFund}>
          <span className="set-add-fund-icon">+</span>
          Add goal fund
        </button>
      </div>
    </section>
  )
}

function FundRow({
  fund,
  isLast,
  onEdit,
}: {
  fund: Fund
  isLast: boolean
  onEdit: (fund: Fund) => void
}) {
  const isCashOnHand = fund.name === "Cash on Hand"
  const balance = parseFloat(fund.current_balance)
  const allocation = parseFloat(fund.monthly_allocation)

  return (
    <div className={`set-fund-row${isLast ? " last" : ""}`}>
      <div className="set-fund-left">
        <span className="set-fund-icon">{fund.icon || "$"}</span>
        <div className="set-fund-info">
          <p className="set-fund-name">{fund.name}</p>
          <div className="set-fund-meta">
            <span className="set-fund-balance">{_formatCurrency(balance)}</span>
            <span className="set-fund-alloc">
              {isCashOnHand
                ? "remainder fund"
                : `${_formatCurrency(allocation)}/mo`}
            </span>
            {fund.skip_on_low_income && (
              <span className="set-fund-skip-tag">skip on low</span>
            )}
            {fund.target_amount && (
              <span className="set-fund-target-tag">
                target {_formatCurrency(parseFloat(fund.target_amount))}
              </span>
            )}
          </div>
        </div>
      </div>

      {!isCashOnHand && (
        <button className="set-btn-sm-secondary" onClick={() => onEdit(fund)}>
          Edit
        </button>
      )}
    </div>
  )
}

function BudgetSection({
  activeSetup,
  totalAlloc,
  onEditBudget,
}: {
  activeSetup: MonthlyBudgetSetup | null
  totalAlloc: number
  onEditBudget: () => void
}) {
  if (!activeSetup) {
    return (
      <section className="set-section">
        <p className="set-section-label">Monthly budget</p>
        <div className="set-card">
          <p className="set-budget-empty">No budget setup yet.</p>
          <button className="set-btn-primary-modal" onClick={onEditBudget}>
            Create Budget
          </button>
        </div>
      </section>
    )
  }

  const income = parseFloat(activeSetup.estimated_monthly_income)
  const needs = parseFloat(activeSetup.needs_budget)
  const wants = parseFloat(activeSetup.wants_budget)
  const remaining = income - needs - wants - totalAlloc

  return (
    <section className="set-section">
      <p className="set-section-label">Monthly budget</p>
      <div className="set-card">
        <p className="set-budget-active-tag">
          Active since {_formatDate(activeSetup.effective_from)}
        </p>
        <div className="set-budget-grid">
          <BudgetStat label="Income" value={income} />
          <BudgetStat label="Needs" value={needs} />
          <BudgetStat label="Wants" value={wants} />
          <BudgetStat label="Funds" value={totalAlloc} />
        </div>
        {activeSetup.allocation_warning && (
          <p className="set-alloc-warning">{activeSetup.allocation_warning}</p>
        )}
        <p className={`set-remaining-pill${remaining < 0 ? " over" : ""}`}>
          {remaining >= 0
            ? `${_formatCurrency(remaining)} goes to Cash on Hand`
            : `Over budget by ${_formatCurrency(Math.abs(remaining))}`}
        </p>
        <button className="set-btn-primary-modal" onClick={onEditBudget}>
          Edit Budget
        </button>
      </div>
    </section>
  )
}

function BudgetStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="set-budget-stat">
      <p className="set-budget-stat-label">{label}</p>
      <p className="set-budget-stat-value">{_formatCurrency(value)}</p>
    </div>
  )
}

function DangerZoneSection({
  onReset,
  onDelete,
}: {
  onReset: () => void
  onDelete: () => void
}) {
  return (
    <section className="set-section">
      <p className="set-section-label set-danger-label">Danger zone</p>
      <div className="set-card set-danger-card">
        <div className="set-danger-row">
          <div>
            <p className="set-danger-item-title">Reset financial data</p>
            <p className="set-danger-item-sub">
              Zeros balances and clears activity. Funds and budget setup stay.
            </p>
          </div>
          <button className="set-btn-warning" onClick={onReset}>
            Reset Financial Data
          </button>
        </div>
        <div className="set-divider" />
        <div className="set-danger-row">
          <div>
            <p className="set-danger-item-title">Delete account</p>
            <p className="set-danger-item-sub">
              Server-side deletion is not implemented yet.
            </p>
          </div>
          <button className="set-btn-danger" onClick={onDelete}>
            Sign Out
          </button>
        </div>
      </div>
    </section>
  )
}

function EditFundModal({
  fund,
  onClose,
  onSave,
}: {
  fund: Fund
  onClose: () => void
  onSave: (payload: FundUpdatePayload) => Promise<void>
}) {
  const isSystem = fund.type === "system_required"
  const isCashOnHand = fund.name === "Cash on Hand"
  const [name, setName] = useState(fund.name)
  const [icon, setIcon] = useState(fund.icon || "target")
  const [monthlyAlloc, setMonthlyAlloc] = useState(
    fund.monthly_allocation !== "0.00" ? fund.monthly_allocation : ""
  )
  const [targetAmount, setTargetAmount] = useState(fund.target_amount ?? "")
  const [targetDate, setTargetDate] = useState(fund.target_date ?? "")
  const [skipLowIncome, setSkipLowIncome] = useState(fund.skip_on_low_income)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setIsSubmitting(true)
    setError("")

    try {
      const payload: FundUpdatePayload = {}
      if (!isCashOnHand) {
        payload.monthly_allocation = monthlyAlloc ? parseFloat(monthlyAlloc) : 0
      }
      if (!isSystem) {
        payload.name = name.trim()
        payload.icon = icon
        payload.target_amount = targetAmount ? parseFloat(targetAmount) : null
        payload.target_date = targetDate || null
        payload.skip_on_low_income = skipLowIncome
      }
      await onSave(payload)
    } catch (err) {
      setError(_errorMessage(err, "Failed to save fund."))
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="set-modal">
        <ModalHeader title={`Edit ${fund.name}`} onClose={onClose} />
        <form className="set-modal-body" onSubmit={handleSubmit}>
          {!isSystem && (
            <>
              <TextField
                id="fund-name"
                label="Fund name"
                value={name}
                onChange={setName}
                disabled={isSubmitting}
              />
              <IconPicker value={icon} onChange={setIcon} />
            </>
          )}

          {!isCashOnHand && (
            <CurrencyField
              id="fund-allocation"
              label="Monthly allocation"
              value={monthlyAlloc}
              onChange={setMonthlyAlloc}
              disabled={isSubmitting}
            />
          )}

          {!isSystem && (
            <>
              <div className="set-row-2">
                <CurrencyField
                  id="fund-target"
                  label="Target amount"
                  value={targetAmount}
                  onChange={setTargetAmount}
                  disabled={isSubmitting}
                />
                <DateField
                  id="fund-target-date"
                  label="Target date"
                  value={targetDate}
                  onChange={setTargetDate}
                  disabled={isSubmitting}
                />
              </div>
              <ToggleRow
                enabled={skipLowIncome}
                onToggle={() => setSkipLowIncome((value) => !value)}
                disabled={isSubmitting}
              />
            </>
          )}

          {error && <p className="set-field-error">{error}</p>}
          <ModalActions
            onCancel={onClose}
            submitLabel="Save Changes"
            isSubmitting={isSubmitting}
          />
        </form>
      </div>
    </ModalOverlay>
  )
}

function AddFundModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (payload: FundCreatePayload) => Promise<void>
}) {
  const [name, setName] = useState("")
  const [icon, setIcon] = useState("target")
  const [monthlyAlloc, setMonthlyAlloc] = useState("")
  const [targetAmount, setTargetAmount] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim()) {
      setError("Fund name is required.")
      return
    }
    setIsSubmitting(true)
    setError("")
    try {
      await onAdd({
        name: name.trim(),
        icon,
        monthly_allocation: monthlyAlloc ? parseFloat(monthlyAlloc) : undefined,
        target_amount: targetAmount ? parseFloat(targetAmount) : undefined,
        target_date: targetDate || undefined,
      })
    } catch (err) {
      setError(_errorMessage(err, "Failed to add fund."))
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="set-modal">
        <ModalHeader title="Add goal fund" onClose={onClose} />
        <form className="set-modal-body" onSubmit={handleSubmit}>
          <TextField
            id="new-fund-name"
            label="Fund name"
            value={name}
            onChange={setName}
            disabled={isSubmitting}
          />
          <IconPicker value={icon} onChange={setIcon} />
          <CurrencyField
            id="new-fund-allocation"
            label="Monthly allocation"
            value={monthlyAlloc}
            onChange={setMonthlyAlloc}
            disabled={isSubmitting}
          />
          <div className="set-row-2">
            <CurrencyField
              id="new-fund-target"
              label="Target amount"
              value={targetAmount}
              onChange={setTargetAmount}
              disabled={isSubmitting}
            />
            <DateField
              id="new-fund-target-date"
              label="Target date"
              value={targetDate}
              onChange={setTargetDate}
              disabled={isSubmitting}
            />
          </div>
          {error && <p className="set-field-error">{error}</p>}
          <ModalActions
            onCancel={onClose}
            submitLabel="Add Fund"
            isSubmitting={isSubmitting}
          />
        </form>
      </div>
    </ModalOverlay>
  )
}

function EditBudgetModal({
  activeSetup,
  totalFundAlloc,
  onClose,
  onSave,
}: {
  activeSetup: MonthlyBudgetSetup | null
  totalFundAlloc: number
  onClose: () => void
  onSave: (payload: MonthlyBudgetSetupPayload) => Promise<void>
}) {
  const [income, setIncome] = useState(
    activeSetup?.estimated_monthly_income ?? ""
  )
  const [needs, setNeeds] = useState(activeSetup?.needs_budget ?? "")
  const [wants, setWants] = useState(activeSetup?.wants_budget ?? "")
  const [effectiveFrom, setEffectiveFrom] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const incomeNum = parseFloat(income) || 0
  const remaining =
    incomeNum - (parseFloat(needs) || 0) - (parseFloat(wants) || 0) - totalFundAlloc

  function apply503020() {
    if (incomeNum <= 0) return
    setNeeds(String((incomeNum * 0.5).toFixed(2)))
    setWants(String((incomeNum * 0.3).toFixed(2)))
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (incomeNum <= 0) {
      setError("Estimated income must be greater than 0.")
      return
    }
    setIsSubmitting(true)
    setError("")
    try {
      await onSave({
        estimated_monthly_income: incomeNum,
        needs_budget: parseFloat(needs) || 0,
        wants_budget: parseFloat(wants) || 0,
        ...(effectiveFrom && { effective_from: effectiveFrom }),
      })
    } catch (err) {
      setError(_errorMessage(err, "Failed to update budget."))
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="set-modal">
        <ModalHeader title="Edit monthly budget" onClose={onClose} />
        <form className="set-modal-body" onSubmit={handleSubmit}>
          <CurrencyField
            id="budget-income"
            label="Estimated monthly income"
            value={income}
            onChange={setIncome}
            disabled={isSubmitting}
          />
          <button
            type="button"
            className="set-503020-btn"
            onClick={apply503020}
            disabled={incomeNum <= 0}
          >
            Apply 50/30/20 needs and wants
          </button>
          <div className="set-row-2">
            <CurrencyField
              id="budget-needs"
              label="Needs budget"
              value={needs}
              onChange={setNeeds}
              disabled={isSubmitting}
            />
            <CurrencyField
              id="budget-wants"
              label="Wants budget"
              value={wants}
              onChange={setWants}
              disabled={isSubmitting}
            />
          </div>
          <DateField
            id="budget-effective"
            label="Effective from"
            value={effectiveFrom}
            onChange={setEffectiveFrom}
            disabled={isSubmitting}
          />
          <p className={`set-remaining-pill${remaining < 0 ? " over" : ""}`}>
            {remaining >= 0
              ? `${_formatCurrency(remaining)} remaining after allocations`
              : `Over budget by ${_formatCurrency(Math.abs(remaining))}`}
          </p>
          {error && <p className="set-field-error">{error}</p>}
          <ModalActions
            onCancel={onClose}
            submitLabel="Save Budget"
            isSubmitting={isSubmitting}
          />
        </form>
      </div>
    </ModalOverlay>
  )
}

function ReorderModal({
  funds,
  onClose,
  onSave,
}: {
  funds: Fund[]
  onClose: () => void
  onSave: (order: number[]) => Promise<void>
}) {
  const [order, setOrder] = useState(
    funds
      .slice()
      .sort((a, b) => a.allocation_priority - b.allocation_priority)
      .map((fund) => fund.id)
  )
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const orderedFunds = order
    .map((id) => funds.find((fund) => fund.id === id))
    .filter((fund): fund is Fund => Boolean(fund))

  function move(index: number, direction: -1 | 1) {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= order.length) return
    const next = [...order]
    ;[next[index], next[nextIndex]] = [next[nextIndex], next[index]]
    setOrder(next)
  }

  async function handleSave() {
    setIsSubmitting(true)
    setError("")
    try {
      await onSave(order)
    } catch (err) {
      setError(_errorMessage(err, "Failed to reorder funds."))
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="set-modal">
        <ModalHeader title="Reorder priority" onClose={onClose} />
        <div className="set-modal-body">
          <p className="set-reorder-info">
            Funds at the top receive allocations first during low-income months.
            Cash on Hand always receives the remainder.
          </p>
          <div className="set-reorder-list">
            {orderedFunds.map((fund, index) => (
              <div key={fund.id} className="set-reorder-row">
                <span className="set-reorder-num">{index + 1}</span>
                <span className="set-reorder-icon">{fund.icon || "$"}</span>
                <span className="set-reorder-name">{fund.name}</span>
                {fund.skip_on_low_income && (
                  <span className="set-reorder-skip">skip</span>
                )}
                <div className="set-reorder-btns">
                  <button
                    className="set-reorder-arrow"
                    onClick={() => move(index, -1)}
                    disabled={index === 0}
                    aria-label="Move up"
                  >
                    Up
                  </button>
                  <button
                    className="set-reorder-arrow"
                    onClick={() => move(index, 1)}
                    disabled={index === orderedFunds.length - 1}
                    aria-label="Move down"
                  >
                    Down
                  </button>
                </div>
              </div>
            ))}
          </div>
          {error && <p className="set-field-error">{error}</p>}
          <ModalActions
            onCancel={onClose}
            submitLabel="Save Order"
            isSubmitting={isSubmitting}
            onSubmit={handleSave}
          />
        </div>
      </div>
    </ModalOverlay>
  )
}

function ConfirmModal({
  title,
  body,
  confirmLabel,
  confirmClass,
  isProcessing,
  onConfirm,
  onCancel,
}: {
  title: string
  body: string
  confirmLabel: string
  confirmClass: "set-btn-warning" | "set-btn-danger"
  isProcessing: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <ModalOverlay onClose={onCancel}>
      <div className="set-modal set-confirm-modal">
        <div className="set-confirm-body">
          <h3 className="set-confirm-title">{title}</h3>
          <p className="set-confirm-text">{body}</p>
          <div className="set-modal-actions">
            <button
              className="set-btn-secondary-modal"
              onClick={onCancel}
              disabled={isProcessing}
            >
              Cancel
            </button>
            <button
              className={confirmClass}
              onClick={onConfirm}
              disabled={isProcessing}
            >
              {isProcessing ? <span className="set-btn-spinner" /> : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </ModalOverlay>
  )
}

function TextField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="set-field">
      <label className="set-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="set-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  )
}

function CurrencyField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="set-field">
      <label className="set-label" htmlFor={id}>
        {label}
      </label>
      <div className="set-currency-wrap">
        <span className="set-currency-prefix">P</span>
        <input
          id={id}
          type="number"
          min="0"
          step="0.01"
          className="set-input set-currency-input"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          placeholder="0.00"
        />
      </div>
    </div>
  )
}

function DateField({
  id,
  label,
  value,
  onChange,
  disabled,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="set-field">
      <label className="set-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        type="date"
        className="set-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  )
}

function IconPicker({
  value,
  onChange,
}: {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="set-field">
      <span className="set-label">Icon</span>
      <div className="set-icon-grid">
        {ICONS.map((icon) => (
          <button
            key={icon}
            type="button"
            className={`set-icon-btn${value === icon ? " selected" : ""}`}
            onClick={() => onChange(icon)}
          >
            {icon.slice(0, 2).toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  )
}

function ToggleRow({
  enabled,
  onToggle,
  disabled,
}: {
  enabled: boolean
  onToggle: () => void
  disabled: boolean
}) {
  return (
    <div className="set-toggle-row">
      <div>
        <p className="set-toggle-label">Skip on low income months</p>
        <p className="set-toggle-sub">
          This fund will not receive allocations when income is low.
        </p>
      </div>
      <button
        type="button"
        className={`set-toggle${enabled ? " on" : ""}`}
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={enabled}
      >
        <span className="set-toggle-knob" />
      </button>
    </div>
  )
}

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="set-overlay" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
  )
}

function ModalHeader({
  title,
  onClose,
}: {
  title: string
  onClose: () => void
}) {
  return (
    <div className="set-modal-header">
      <h3 className="set-modal-title">{title}</h3>
      <button
        type="button"
        className="set-modal-close"
        onClick={onClose}
        aria-label="Close"
      >
        x
      </button>
    </div>
  )
}

function ModalActions({
  onCancel,
  submitLabel,
  isSubmitting,
  onSubmit,
}: {
  onCancel: () => void
  submitLabel: string
  isSubmitting: boolean
  onSubmit?: () => void
}) {
  return (
    <div className="set-modal-actions">
      <button
        type="button"
        className="set-btn-secondary-modal"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </button>
      <button
        type={onSubmit ? "button" : "submit"}
        className="set-btn-primary-modal"
        onClick={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="set-btn-spinner" />
            Saving...
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  )
}

function SettingsPageSkeleton() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="set-root">
        <div className="set-header">
          <div
            className="set-skeleton-block"
            style={{ width: 120, height: 30, marginBottom: 8 }}
          />
          <div className="set-skeleton-block" style={{ width: 260, height: 14 }} />
        </div>
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="set-section">
            <div
              className="set-skeleton-block"
              style={{ width: 160, height: 12, marginBottom: 8 }}
            />
            <div className="set-card">
              <div className="set-skeleton-block" style={{ height: 92 }} />
            </div>
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
  }).format(value)
}

function _formatDate(value: string): string {
  return new Date(value + "T00:00:00").toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  })
}

function _errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "response" in error) {
    const data = (error as any).response?.data
    if (typeof data?.detail === "string") return data.detail
    if (typeof data?.error === "string") return data.error
    if (data && typeof data === "object") {
      const first = Object.values(data)[0]
      if (Array.isArray(first)) return String(first[0])
      if (typeof first === "string") return first
    }
  }
  if (error instanceof Error) return error.message
  return fallback
}

const PAGE_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600&family=Lora:ital,wght@0,500;1,400&display=swap');

  :root {
    --bg-page:    #F5F4F1;
    --bg-card:    #FFFFFF;
    --bg-surface: #F0EFEB;
    --border:     rgba(0,0,0,0.09);
    --border-md:  rgba(0,0,0,0.14);
    --border-focus: rgba(0,0,0,0.35);
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
      --border-focus: rgba(255,255,255,0.4);
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
    }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .set-root {
    font-family: var(--sans);
    max-width: 680px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding-bottom: 3rem;
  }

  .set-header { padding-top: 0.25rem; }

  .set-title {
    font-family: var(--serif);
    font-size: 26px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }

  .set-subtitle { font-size: 13px; color: var(--text-3); }

  .set-global-error {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: var(--error-bg);
    border-radius: var(--radius-md);
    font-size: 13px;
    color: var(--error);
  }

  .set-error-dismiss {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    font-size: 16px;
    padding: 0;
    opacity: 0.7;
  }

  .set-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .set-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .set-section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
  }

  .set-danger-label { color: var(--error); }

  .set-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 1.25rem 1.5rem;
  }

  .set-danger-card { border-color: rgba(153,60,29,0.2); }

  .set-divider {
    height: 0.5px;
    background: var(--border);
    margin: 0.875rem 0;
  }

  .set-user-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 1rem;
  }

  .set-user-avatar {
    width: 44px;
    height: 44px;
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: 50%;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1);
  }

  .set-user-name {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 2px;
  }

  .set-user-email { font-size: 12px; color: var(--text-3); }

  .set-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 1rem;
  }

  .set-field:last-child { margin-bottom: 0; }

  .set-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
  }

  .set-input-row {
    display: flex;
    gap: 8px;
    align-items: stretch;
  }

  .set-input {
    flex: 1;
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

  .set-input:focus { border-color: var(--border-focus); }

  .set-field-hint,
  .set-helper {
    font-size: 11px;
    color: var(--text-3);
  }

  .set-field-error {
    font-size: 12px;
    color: var(--error);
    margin-bottom: 0.5rem;
  }

  .set-currency-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .set-currency-prefix {
    position: absolute;
    left: 12px;
    font-size: 14px;
    color: var(--text-3);
    pointer-events: none;
    font-weight: 500;
  }

  .set-currency-input { padding-left: 28px; }

  .set-row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .set-btn-save {
    height: 42px;
    padding: 0 16px;
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    display: flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .set-btn-save.saved { background: var(--success); color: #fff; }
  .set-btn-save:hover:not(:disabled) { opacity: 0.85; }
  .set-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }

  .set-fund-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 0.5px solid var(--border);
    gap: 1rem;
  }

  .set-fund-row.last { border-bottom: none; }

  .set-fund-left {
    display: flex;
    align-items: center;
    gap: 10px;
    flex: 1;
    min-width: 0;
  }

  .set-fund-icon {
    font-size: 16px;
    width: 28px;
    text-align: center;
    flex-shrink: 0;
  }

  .set-fund-info { min-width: 0; }

  .set-fund-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 2px;
  }

  .set-fund-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }

  .set-fund-balance { font-size: 12px; color: var(--text-2); }
  .set-fund-alloc { font-size: 12px; color: var(--text-3); }

  .set-fund-skip-tag,
  .set-fund-target-tag {
    font-size: 10px;
    color: var(--text-3);
  }

  .set-fund-skip-tag {
    padding: 1px 6px;
    border-radius: 10px;
    background: var(--warning-bg);
    color: var(--warning);
    font-weight: 500;
  }

  .set-add-fund-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 10px 0 0;
    background: none;
    border: none;
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-3);
    cursor: pointer;
    transition: color 0.15s;
  }

  .set-add-fund-btn:hover { color: var(--text-1); }

  .set-add-fund-icon {
    width: 24px;
    height: 24px;
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .set-link-btn {
    background: none;
    border: none;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: var(--text-3);
    font-family: var(--sans);
    padding: 0;
    transition: color 0.15s;
  }

  .set-link-btn:hover { color: var(--text-1); }

  .set-budget-active-tag {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--success);
    margin-bottom: 1rem;
  }

  .set-budget-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .set-budget-stat {
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    padding: 0.75rem;
  }

  .set-budget-stat-label {
    font-size: 11px;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 4px;
  }

  .set-budget-stat-value {
    font-family: var(--serif);
    font-size: 18px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.2px;
  }

  .set-budget-empty { font-size: 13px; color: var(--text-3); margin-bottom: 1rem; }

  .set-alloc-warning {
    padding: 9px 12px;
    background: var(--warning-bg);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--warning);
    line-height: 1.5;
    margin-bottom: 0.5rem;
  }

  .set-remaining-pill {
    padding: 8px 12px;
    border-radius: var(--radius-sm);
    font-size: 13px;
    font-weight: 500;
    background: var(--success-bg);
    color: var(--success);
    margin-bottom: 0.75rem;
  }

  .set-remaining-pill.over {
    background: var(--error-bg);
    color: var(--error);
  }

  .set-danger-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .set-danger-item-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 4px;
  }

  .set-danger-item-sub {
    font-size: 12px;
    color: var(--text-3);
    line-height: 1.5;
    max-width: 320px;
  }

  .set-btn-sm-secondary,
  .set-btn-warning,
  .set-btn-danger,
  .set-btn-primary-modal,
  .set-btn-secondary-modal,
  .set-503020-btn {
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

  .set-btn-sm-secondary {
    height: 34px;
    padding: 0 12px;
    background: var(--bg-surface);
    color: var(--text-2);
    border: 0.5px solid var(--border-md);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .set-btn-warning {
    height: 38px;
    padding: 0 14px;
    background: var(--warning-bg);
    color: var(--warning);
    border: 0.5px solid rgba(133,79,11,0.3);
    white-space: nowrap;
    flex-shrink: 0;
  }

  .set-btn-danger {
    height: 38px;
    padding: 0 14px;
    background: var(--error);
    color: #fff;
    border: none;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .set-btn-primary-modal {
    height: 40px;
    padding: 0 16px;
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
  }

  .set-btn-secondary-modal {
    height: 40px;
    padding: 0 16px;
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
  }

  .set-503020-btn {
    height: 34px;
    padding: 0 12px;
    background: var(--success-bg);
    color: var(--success);
    border: 0.5px solid rgba(59,109,17,0.2);
    margin-bottom: 1rem;
    align-self: flex-start;
  }

  button:hover:not(:disabled) { opacity: 0.85; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }

  .set-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1.5rem;
  }

  .set-modal {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    max-width: 480px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .set-confirm-modal { max-width: 420px; }

  .set-modal-header {
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

  .set-modal-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
  }

  .set-modal-close {
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

  .set-modal-body,
  .set-confirm-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .set-modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 1.25rem;
    justify-content: flex-end;
  }

  .set-confirm-title {
    font-size: 18px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 0.75rem;
    letter-spacing: -0.2px;
  }

  .set-confirm-text {
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.6;
  }

  .set-icon-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .set-icon-btn {
    min-width: 46px;
    height: 38px;
    border-radius: var(--radius-sm);
    border: 0.5px solid var(--border-md);
    background: var(--bg-surface);
    color: var(--text-1);
    font-size: 11px;
    cursor: pointer;
  }

  .set-icon-btn.selected {
    border-color: var(--text-1);
    outline: 2px solid var(--text-1);
    outline-offset: 1px;
  }

  .set-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 10px 12px;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    margin-bottom: 1rem;
  }

  .set-toggle-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 2px;
  }

  .set-toggle-sub {
    font-size: 11px;
    color: var(--text-3);
    line-height: 1.4;
  }

  .set-toggle {
    position: relative;
    width: 40px;
    height: 22px;
    background: var(--border-md);
    border: none;
    border-radius: 11px;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
  }

  .set-toggle.on { background: var(--success); }

  .set-toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .set-toggle.on .set-toggle-knob { transform: translateX(18px); }

  .set-reorder-info {
    font-size: 12px;
    color: var(--text-3);
    line-height: 1.5;
    margin-bottom: 1rem;
  }

  .set-reorder-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 10px 0;
    border-bottom: 0.5px solid var(--border);
  }

  .set-reorder-row:last-child { border-bottom: none; }

  .set-reorder-num {
    font-size: 12px;
    color: var(--text-3);
    width: 16px;
    text-align: center;
    flex-shrink: 0;
  }

  .set-reorder-icon {
    font-size: 16px;
    flex-shrink: 0;
  }

  .set-reorder-name {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
  }

  .set-reorder-skip {
    font-size: 10px;
    padding: 2px 6px;
    border-radius: 10px;
    background: var(--warning-bg);
    color: var(--warning);
    font-weight: 500;
    flex-shrink: 0;
  }

  .set-reorder-btns { display: flex; gap: 4px; }

  .set-reorder-arrow {
    min-width: 42px;
    height: 28px;
    padding: 0 6px;
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: 6px;
    cursor: pointer;
    font-size: 11px;
    color: var(--text-1);
  }

  .set-btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: set-spin 0.7s linear infinite;
  }

  @keyframes set-spin { to { transform: rotate(360deg); } }

  @keyframes set-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .set-skeleton-block {
    border-radius: var(--radius-sm);
    background: linear-gradient(
      90deg,
      var(--bg-surface) 25%,
      var(--border-md) 50%,
      var(--bg-surface) 75%
    );
    background-size: 200% 100%;
    animation: set-shimmer 1.5s ease-in-out infinite;
  }

  @media (max-width: 480px) {
    .set-budget-grid,
    .set-row-2 {
      grid-template-columns: 1fr;
    }
    .set-danger-row {
      flex-direction: column;
    }
    .set-input-row {
      flex-direction: column;
    }
    .set-btn-save {
      width: 100%;
      justify-content: center;
    }
    .set-overlay {
      align-items: flex-end;
      padding: 0;
    }
    .set-modal {
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
    }
  }
`
