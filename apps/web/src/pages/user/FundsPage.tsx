import { useEffect, useState } from "react"
import { useFundStore } from "../../store/fundStore"
import { useTransferStore } from "../../store/transferStore"
import { useNetWorthStore } from "../../store/netWorthStore"
import type {
  Fund,
  FundCreatePayload,
  FundUpdatePayload,
  TransferCreatePayload,
} from "../../types"

export default function FundsPage() {
  const fundStore = useFundStore()
  const transferStore = useTransferStore()
  const netWorthStore = useNetWorthStore()

  const [isLoading, setIsLoading] = useState(true)
  const [isReordering, setIsReordering] = useState(false)
  const [showClosed, setShowClosed] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingFund, setEditingFund] = useState<Fund | null>(null)
  const [closingFund, setClosingFund] = useState<Fund | null>(null)
  const [movingFund, setMovingFund] = useState<Fund | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      await useFundStore.getState().fetchFunds()
      if (!cancelled) setIsLoading(false)
    }

    load()

    return () => {
      cancelled = true
    }
  }, [])

  const systemFunds = fundStore.funds.filter(
    (f) => f.type === "system_required" && f.status === "active"
  )
  const goalFunds = fundStore.getGoalFunds()
  const closedFunds = fundStore.funds.filter(
    (f) => f.type === "goal" && (f.status === "closed" || f.status === "completed")
  )
  const totalBalance = fundStore.getTotalBalance()

  if (isLoading) return <FundsPageSkeleton />

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="funds-root">
        <PageHeader onAddFund={() => setShowAddModal(true)} />

        <NetWorthSummary
          total={totalBalance}
          fundCount={systemFunds.length + goalFunds.length}
        />

        <SystemFundsSection
          funds={systemFunds}
          onEdit={(fund) => setEditingFund(fund)}
          onMoveMoney={(fund) => setMovingFund(fund)}
        />

        <GoalFundsSection
          funds={goalFunds}
          isReordering={isReordering}
          onToggleReorder={() => setIsReordering((value) => !value)}
          onEdit={(fund) => setEditingFund(fund)}
          onClose={(fund) => setClosingFund(fund)}
          onMoveMoney={(fund) => setMovingFund(fund)}
          onReorder={(order) => fundStore.reorderFunds(order)}
        />

        {closedFunds.length > 0 && (
          <ClosedFundsSection
            funds={closedFunds}
            isExpanded={showClosed}
            onToggle={() => setShowClosed((value) => !value)}
          />
        )}

        {showAddModal && (
          <AddFundModal
            onClose={() => setShowAddModal(false)}
            onAdd={async (payload) => {
              await fundStore.addFund(payload)
              setShowAddModal(false)
            }}
          />
        )}

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

        {closingFund && (
          <CloseFundModal
            fund={closingFund}
            onClose={() => setClosingFund(null)}
            onConfirm={async (note) => {
              await fundStore.closeFund(closingFund.id, note)
              await netWorthStore.fetchCurrentNetWorth()
              setClosingFund(null)
            }}
          />
        )}

        {movingFund && (
          <MoveMoneyModal
            fund={movingFund}
            allFunds={fundStore.funds.filter(
              (f) => f.status === "active" && f.id !== movingFund.id
            )}
            onClose={() => setMovingFund(null)}
            onTransfer={async (payload) => {
              await transferStore.createTransfer(payload)
              await fundStore.fetchFunds()
              await netWorthStore.fetchCurrentNetWorth()
              setMovingFund(null)
            }}
          />
        )}
      </div>
    </>
  )
}

function PageHeader({ onAddFund }: { onAddFund: () => void }) {
  return (
    <div className="funds-header">
      <div>
        <h1 className="funds-title">Funds</h1>
        <p className="funds-subtitle">Manage your financial envelopes</p>
      </div>
      <button className="funds-btn-primary" type="button" onClick={onAddFund}>
        <PlusIcon /> Add Fund
      </button>
    </div>
  )
}

function NetWorthSummary({
  total,
  fundCount,
}: {
  total: number
  fundCount: number
}) {
  return (
    <div className="funds-summary-bar">
      <div>
        <p className="funds-summary-label">Total across all funds</p>
        <p className="funds-summary-value">{_formatCurrency(total)}</p>
      </div>
      <p className="funds-summary-count">{fundCount} active funds</p>
    </div>
  )
}

function SystemFundsSection({
  funds,
  onEdit,
  onMoveMoney,
}: {
  funds: Fund[]
  onEdit: (fund: Fund) => void
  onMoveMoney: (fund: Fund) => void
}) {
  return (
    <div className="funds-section">
      <p className="funds-section-label">System funds</p>
      <div className="funds-card">
        {funds.map((fund, index) => (
          <SystemFundRow
            key={fund.id}
            fund={fund}
            isLast={index === funds.length - 1}
            onEdit={onEdit}
            onMoveMoney={onMoveMoney}
          />
        ))}
      </div>
    </div>
  )
}

function SystemFundRow({
  fund,
  isLast,
  onEdit,
  onMoveMoney,
}: {
  fund: Fund
  isLast: boolean
  onEdit: (fund: Fund) => void
  onMoveMoney: (fund: Fund) => void
}) {
  const balance = parseFloat(fund.current_balance)
  const monthlyAllocation = parseFloat(fund.monthly_allocation)
  const isCashOnHand = fund.name === "Cash on Hand"

  return (
    <div className={`funds-fund-row${isLast ? " last" : ""}`}>
      <div className="funds-fund-left">
        <span className="funds-fund-icon">{_fundIcon(fund)}</span>
        <div className="funds-fund-info">
          <div className="funds-fund-name-row">
            <span className="funds-fund-name">{fund.name}</span>
            <span className="funds-fund-system-tag">System</span>
          </div>
          <span className="funds-fund-alloc">
            {isCashOnHand
              ? "Available to spend"
              : monthlyAllocation > 0
                ? `${_formatCurrency(monthlyAllocation)}/mo allocation`
                : "No allocation set"}
          </span>
        </div>
      </div>
      <div className="funds-fund-right">
        <p className="funds-fund-balance">{_formatCurrency(balance)}</p>
        <div className="funds-fund-actions">
          {!isCashOnHand && (
            <button
              className="funds-btn-sm secondary"
              type="button"
              onClick={() => onEdit(fund)}
            >
              Edit
            </button>
          )}
          <button
            className="funds-btn-sm secondary"
            type="button"
            onClick={() => onMoveMoney(fund)}
          >
            Move Money
          </button>
        </div>
      </div>
    </div>
  )
}

function GoalFundsSection({
  funds,
  isReordering,
  onToggleReorder,
  onEdit,
  onClose,
  onMoveMoney,
  onReorder,
}: {
  funds: Fund[]
  isReordering: boolean
  onToggleReorder: () => void
  onEdit: (fund: Fund) => void
  onClose: (fund: Fund) => void
  onMoveMoney: (fund: Fund) => void
  onReorder: (order: number[]) => Promise<void>
}) {
  return (
    <div className="funds-section">
      <div className="funds-section-header">
        <p className="funds-section-label">Goal funds</p>
        {funds.length > 1 && (
          <button className="funds-link-btn" type="button" onClick={onToggleReorder}>
            {isReordering ? "Done" : "Reorder priority"}
          </button>
        )}
      </div>

      {funds.length === 0 ? (
        <div className="funds-card">
          <div className="funds-empty">
            <p>No goal funds yet.</p>
            <p className="funds-empty-sub">
              Add a goal fund like Travel, Rigs, or Clothes.
            </p>
          </div>
        </div>
      ) : (
        <div className="funds-card">
          {funds.map((fund, index) => (
            <GoalFundRow
              key={fund.id}
              fund={fund}
              isLast={index === funds.length - 1}
              isReordering={isReordering}
              onEdit={onEdit}
              onClose={onClose}
              onMoveMoney={onMoveMoney}
            />
          ))}
        </div>
      )}

      {isReordering && funds.length > 1 && (
        <ReorderPanel
          funds={funds}
          onSave={async (order) => {
            await onReorder(order)
            onToggleReorder()
          }}
        />
      )}
    </div>
  )
}

function GoalFundRow({
  fund,
  isLast,
  isReordering,
  onEdit,
  onClose,
  onMoveMoney,
}: {
  fund: Fund
  isLast: boolean
  isReordering: boolean
  onEdit: (fund: Fund) => void
  onClose: (fund: Fund) => void
  onMoveMoney: (fund: Fund) => void
}) {
  const balance = parseFloat(fund.current_balance)
  const target = fund.target_amount ? parseFloat(fund.target_amount) : null
  const progress = fund.progress_percentage ?? null
  const allocationNeeded = fund.monthly_allocation_needed
    ? parseFloat(fund.monthly_allocation_needed)
    : null
  const currentAllocation = parseFloat(fund.monthly_allocation)
  const isBehind =
    allocationNeeded !== null &&
    allocationNeeded > currentAllocation &&
    currentAllocation > 0

  return (
    <div className={`funds-fund-row${isLast ? " last" : ""}`}>
      <div className="funds-fund-left">
        <span className="funds-fund-icon">{_fundIcon(fund)}</span>
        <div className="funds-fund-info">
          <div className="funds-fund-name-row">
            <span className="funds-fund-name">{fund.name}</span>
            {isBehind && <span className="funds-behind-badge">Behind pace</span>}
          </div>

          {target !== null && progress !== null && (
            <div className="funds-goal-progress">
              <div className="funds-goal-track">
                <div
                  className={`funds-goal-fill${progress >= 100 ? " complete" : ""}`}
                  style={{ width: `${Math.min(100, progress)}%` }}
                />
              </div>
              <span className="funds-goal-pct">{progress.toFixed(0)}%</span>
            </div>
          )}

          <span className="funds-fund-alloc">
            {currentAllocation > 0
              ? `${_formatCurrency(currentAllocation)}/mo`
              : "No allocation"}
            {fund.target_date ? ` - Target: ${_formatDate(fund.target_date)}` : ""}
          </span>

          {isBehind && allocationNeeded !== null && (
            <span className="funds-fund-needed">
              Need {_formatCurrency(allocationNeeded)}/mo to stay on track
            </span>
          )}
        </div>
      </div>

      <div className="funds-fund-right">
        <p className="funds-fund-balance">{_formatCurrency(balance)}</p>
        {target !== null && (
          <p className="funds-fund-target">of {_formatCurrency(target)}</p>
        )}
        {!isReordering && (
          <div className="funds-fund-actions">
            <button
              className="funds-btn-sm secondary"
              type="button"
              onClick={() => onEdit(fund)}
            >
              Edit
            </button>
            <button
              className="funds-btn-sm secondary"
              type="button"
              onClick={() => onMoveMoney(fund)}
            >
              Move
            </button>
            <button
              className="funds-btn-sm danger"
              type="button"
              onClick={() => onClose(fund)}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function ReorderPanel({
  funds,
  onSave,
}: {
  funds: Fund[]
  onSave: (order: number[]) => Promise<void>
}) {
  const [order, setOrder] = useState(funds.map((fund) => fund.id))
  const [isSaving, setIsSaving] = useState(false)

  function moveUp(index: number) {
    if (index === 0) return
    const nextOrder = [...order]
    ;[nextOrder[index - 1], nextOrder[index]] = [
      nextOrder[index],
      nextOrder[index - 1],
    ]
    setOrder(nextOrder)
  }

  function moveDown(index: number) {
    if (index === order.length - 1) return
    const nextOrder = [...order]
    ;[nextOrder[index], nextOrder[index + 1]] = [
      nextOrder[index + 1],
      nextOrder[index],
    ]
    setOrder(nextOrder)
  }

  const orderedFunds = order
    .map((id) => funds.find((fund) => fund.id === id))
    .filter((fund): fund is Fund => Boolean(fund))

  return (
    <div className="funds-reorder-panel">
      <p className="funds-reorder-title">
        Priority order controls which funds fill first during low-income months.
      </p>
      {orderedFunds.map((fund, index) => (
        <div key={fund.id} className="funds-reorder-row">
          <span className="funds-reorder-num">{index + 1}</span>
          <span className="funds-fund-icon small">{_fundIcon(fund)}</span>
          <span className="funds-reorder-name">{fund.name}</span>
          <div className="funds-reorder-btns">
            <button
              className="funds-reorder-arrow"
              type="button"
              onClick={() => moveUp(index)}
              disabled={index === 0}
              aria-label="Move up"
            >
              up
            </button>
            <button
              className="funds-reorder-arrow"
              type="button"
              onClick={() => moveDown(index)}
              disabled={index === order.length - 1}
              aria-label="Move down"
            >
              down
            </button>
          </div>
        </div>
      ))}
      <button
        className="funds-btn-primary full"
        type="button"
        disabled={isSaving}
        onClick={async () => {
          setIsSaving(true)
          await onSave(order)
          setIsSaving(false)
        }}
      >
        {isSaving ? (
          <>
            <span className="funds-btn-spinner" /> Saving...
          </>
        ) : (
          "Save Order"
        )}
      </button>
    </div>
  )
}

function ClosedFundsSection({
  funds,
  isExpanded,
  onToggle,
}: {
  funds: Fund[]
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="funds-section">
      <button className="funds-closed-toggle" type="button" onClick={onToggle}>
        {isExpanded ? "v" : ">"} {funds.length} closed fund
        {funds.length > 1 ? "s" : ""}
      </button>
      {isExpanded && (
        <div className="funds-card closed">
          {funds.map((fund, index) => (
            <div
              key={fund.id}
              className={`funds-fund-row${index === funds.length - 1 ? " last" : ""}`}
            >
              <div className="funds-fund-left">
                <span className="funds-fund-icon">{_fundIcon(fund)}</span>
                <div className="funds-fund-info">
                  <span className="funds-fund-name closed-name">{fund.name}</span>
                  <span className="funds-fund-alloc">{fund.status}</span>
                </div>
              </div>
              <div className="funds-fund-right">
                <p className="funds-fund-balance">{_formatCurrency(0)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
  const [targetAmount, setTargetAmount] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [monthlyAllocation, setMonthlyAllocation] = useState("")
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
        target_amount: targetAmount ? parseFloat(targetAmount) : undefined,
        target_date: targetDate || undefined,
        monthly_allocation: monthlyAllocation
          ? parseFloat(monthlyAllocation)
          : undefined,
      })
    } catch (err) {
      setError(_errorMessage(err, "Failed to add fund."))
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="funds-modal">
        <ModalHeader title="Add goal fund" onClose={onClose} />
        <form onSubmit={handleSubmit} className="funds-modal-body">
          <div className="funds-field">
            <label className="funds-label">Fund name *</label>
            <input
              className="funds-input"
              placeholder="Travel Fund, Rigs, Clothes"
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoFocus
              disabled={isSubmitting}
            />
          </div>

          <IconPicker value={icon} onChange={setIcon} disabled={isSubmitting} />

          <div className="funds-field">
            <label className="funds-label">Monthly allocation</label>
            <div className="funds-currency-wrap">
              <span className="funds-currency-prefix">PHP</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="funds-input funds-currency-input"
                placeholder="0.00"
                value={monthlyAllocation}
                onChange={(event) => setMonthlyAllocation(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
            <span className="funds-helper">
              How much of your monthly income goes here
            </span>
          </div>

          <div className="funds-row-2">
            <div className="funds-field">
              <label className="funds-label">Target amount</label>
              <div className="funds-currency-wrap">
                <span className="funds-currency-prefix">PHP</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="funds-input funds-currency-input"
                  placeholder="50000"
                  value={targetAmount}
                  onChange={(event) => setTargetAmount(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="funds-field">
              <label className="funds-label">Target date</label>
              <input
                type="date"
                className="funds-input"
                value={targetDate}
                onChange={(event) => setTargetDate(event.target.value)}
                min={_tomorrowIso()}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {targetAmount && targetDate && (
            <AllocationSuggestion
              targetAmount={parseFloat(targetAmount) || 0}
              targetDate={targetDate}
              currentBalance={0}
              monthlyAllocation={parseFloat(monthlyAllocation) || 0}
            />
          )}

          {error && <p className="funds-field-error modal-error">{error}</p>}

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
  const [name, setName] = useState(fund.name)
  const [icon, setIcon] = useState(fund.icon || "target")
  const [monthlyAllocation, setMonthlyAllocation] = useState(
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
      const payload: FundUpdatePayload = {
        monthly_allocation: monthlyAllocation ? parseFloat(monthlyAllocation) : 0,
        skip_on_low_income: skipLowIncome,
      }

      if (!isSystem) {
        payload.name = name.trim()
        payload.icon = icon
        payload.target_amount = targetAmount ? parseFloat(targetAmount) : null
        payload.target_date = targetDate || null
      }

      await onSave(payload)
    } catch (err) {
      setError(_errorMessage(err, "Failed to save fund."))
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="funds-modal">
        <ModalHeader title={`Edit ${fund.name}`} onClose={onClose} />
        <form onSubmit={handleSubmit} className="funds-modal-body">
          {!isSystem && (
            <div className="funds-field">
              <label className="funds-label">Fund name</label>
              <input
                className="funds-input"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          )}

          {!isSystem && (
            <IconPicker value={icon} onChange={setIcon} disabled={isSubmitting} />
          )}

          <div className="funds-field">
            <label className="funds-label">Monthly allocation</label>
            <div className="funds-currency-wrap">
              <span className="funds-currency-prefix">PHP</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="funds-input funds-currency-input"
                placeholder="0.00"
                value={monthlyAllocation}
                onChange={(event) => setMonthlyAllocation(event.target.value)}
                disabled={isSubmitting}
              />
            </div>
          </div>

          {!isSystem && (
            <div className="funds-row-2">
              <div className="funds-field">
                <label className="funds-label">Target amount</label>
                <div className="funds-currency-wrap">
                  <span className="funds-currency-prefix">PHP</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="funds-input funds-currency-input"
                    value={targetAmount}
                    onChange={(event) => setTargetAmount(event.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              <div className="funds-field">
                <label className="funds-label">Target date</label>
                <input
                  type="date"
                  className="funds-input"
                  value={targetDate}
                  min={_tomorrowIso()}
                  onChange={(event) => setTargetDate(event.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          )}

          {!isSystem && (
            <div className="funds-toggle-row">
              <div>
                <p className="funds-toggle-label">Skip on low income months</p>
                <p className="funds-toggle-sub">
                  This fund will not receive allocation if income is below estimate.
                </p>
              </div>
              <button
                type="button"
                className={`funds-toggle${skipLowIncome ? " on" : ""}`}
                onClick={() => setSkipLowIncome((value) => !value)}
                aria-pressed={skipLowIncome}
                disabled={isSubmitting}
              >
                <span className="funds-toggle-knob" />
              </button>
            </div>
          )}

          {error && <p className="funds-field-error modal-error">{error}</p>}

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

function CloseFundModal({
  fund,
  onClose,
  onConfirm,
}: {
  fund: Fund
  onClose: () => void
  onConfirm: (note: string) => Promise<void>
}) {
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const balance = parseFloat(fund.current_balance)

  async function handleConfirm() {
    if (!note.trim()) {
      setError("A note is required.")
      return
    }

    setIsSubmitting(true)
    setError("")
    try {
      await onConfirm(note.trim())
    } catch (err) {
      setError(_errorMessage(err, "Failed to close fund."))
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="funds-modal">
        <ModalHeader title={`Close ${fund.name}`} onClose={onClose} />
        <div className="funds-modal-body">
          <div className="funds-close-info">
            <p className="funds-close-balance">
              Current balance: <strong>{_formatCurrency(balance)}</strong>
            </p>
            {balance > 0 && (
              <p className="funds-close-note-info">
                This amount will be transferred to Cash on Hand.
              </p>
            )}
          </div>

          <div className="funds-field spaced">
            <label className="funds-label">Note required</label>
            <input
              className={`funds-input${error ? " error" : ""}`}
              placeholder="Goal completed or no longer needed"
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                setError("")
              }}
              disabled={isSubmitting}
              autoFocus
            />
            {error && <p className="funds-field-error">{error}</p>}
          </div>

          <div className="funds-warning-box">
            This action cannot be undone. The fund will move to your closed list.
          </div>

          <ModalActions
            onCancel={onClose}
            submitLabel={
              balance > 0
                ? `Close and transfer ${_formatCurrency(balance)}`
                : "Close Fund"
            }
            isSubmitting={isSubmitting}
            isDanger
            onSubmit={handleConfirm}
          />
        </div>
      </div>
    </ModalOverlay>
  )
}

function MoveMoneyModal({
  fund,
  allFunds,
  onClose,
  onTransfer,
}: {
  fund: Fund
  allFunds: Fund[]
  onClose: () => void
  onTransfer: (payload: TransferCreatePayload) => Promise<void>
}) {
  const cashOnHand = allFunds.find((candidate) => candidate.name === "Cash on Hand")
  const [direction, setDirection] = useState<"in" | "out">("out")
  const [targetFundId, setTargetFundId] = useState<number>(
    cashOnHand?.id ?? allFunds[0]?.id ?? 0
  )
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const selectedFund = allFunds.find((candidate) => candidate.id === targetFundId)
  const fromFund = direction === "out" ? fund : selectedFund
  const toFund = direction === "out" ? selectedFund : fund
  const availableBalance = fromFund ? parseFloat(fromFund.current_balance) : 0

  function getTransferType(): TransferCreatePayload["transfer_type"] {
    if (fromFund?.name === "Cash on Hand") return "cash_to_fund"
    if (toFund?.name === "Cash on Hand") return "fund_to_cash"
    return "fund_to_fund"
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const transferAmount = parseFloat(amount)

    if (!toFund || !fromFund) {
      setError("Select a fund to transfer with.")
      return
    }
    if (!transferAmount || transferAmount <= 0) {
      setError("Enter a valid amount.")
      return
    }
    if (transferAmount > availableBalance) {
      setError(`Insufficient balance. Available: ${_formatCurrency(availableBalance)}`)
      return
    }
    if (getTransferType() === "fund_to_cash" && !note.trim()) {
      setError("A note is required when withdrawing to Cash on Hand.")
      return
    }

    setIsSubmitting(true)
    setError("")
    try {
      await onTransfer({
        from_fund_id: fromFund.id,
        to_fund_id: toFund.id,
        amount: transferAmount,
        transfer_type: getTransferType(),
        note: note.trim(),
      })
    } catch (err) {
      setError(_errorMessage(err, "Transfer failed."))
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="funds-modal">
        <ModalHeader title={`Move Money - ${fund.name}`} onClose={onClose} />
        <form onSubmit={handleSubmit} className="funds-modal-body">
          <div className="funds-field">
            <label className="funds-label">Direction</label>
            <div className="funds-direction-btns">
              <button
                type="button"
                className={`funds-direction-btn${direction === "out" ? " active" : ""}`}
                onClick={() => setDirection("out")}
                disabled={isSubmitting}
              >
                {fund.name} to other fund
              </button>
              <button
                type="button"
                className={`funds-direction-btn${direction === "in" ? " active" : ""}`}
                onClick={() => setDirection("in")}
                disabled={isSubmitting}
              >
                other fund to {fund.name}
              </button>
            </div>
          </div>

          <div className="funds-field">
            <label className="funds-label">
              {direction === "out" ? "Transfer to" : "Transfer from"}
            </label>
            <select
              className="funds-input"
              value={targetFundId}
              onChange={(event) => setTargetFundId(parseInt(event.target.value, 10))}
              disabled={isSubmitting || allFunds.length === 0}
            >
              {allFunds.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {_fundIcon(candidate)} {candidate.name} -{" "}
                  {_formatCurrency(parseFloat(candidate.current_balance))}
                </option>
              ))}
            </select>
          </div>

          <div className="funds-field">
            <label className="funds-label">Amount</label>
            <div className="funds-currency-wrap">
              <span className="funds-currency-prefix">PHP</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                className="funds-input funds-currency-input"
                placeholder="0.00"
                value={amount}
                onChange={(event) => {
                  setAmount(event.target.value)
                  setError("")
                }}
                disabled={isSubmitting}
              />
            </div>
            <span className="funds-helper">
              Available: {_formatCurrency(availableBalance)}
            </span>
          </div>

          <div className="funds-field">
            <label className="funds-label">
              Note{getTransferType() === "fund_to_cash" ? " required" : " optional"}
            </label>
            <input
              className="funds-input"
              placeholder="Moving extra savings"
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                setError("")
              }}
              disabled={isSubmitting}
            />
          </div>

          {error && <p className="funds-field-error modal-error">{error}</p>}

          <ModalActions
            onCancel={onClose}
            submitLabel="Transfer"
            isSubmitting={isSubmitting}
          />
        </form>
      </div>
    </ModalOverlay>
  )
}

function AllocationSuggestion({
  targetAmount,
  targetDate,
  currentBalance,
  monthlyAllocation,
}: {
  targetAmount: number
  targetDate: string
  currentBalance: number
  monthlyAllocation: number
}) {
  const today = new Date()
  const target = new Date(targetDate)
  const months = Math.max(
    1,
    (target.getFullYear() - today.getFullYear()) * 12 +
      (target.getMonth() - today.getMonth())
  )
  const needed = Math.max(0, (targetAmount - currentBalance) / months)
  const isOnTrack = monthlyAllocation >= needed

  return (
    <div
      className={`funds-alloc-suggestion ${isOnTrack ? "ok" : "warn"}`}
    >
      {isOnTrack
        ? `On track. You need ${_formatCurrency(needed)}/mo.`
        : `Need ${_formatCurrency(needed)}/mo to reach target by ${_formatDate(
            targetDate
          )}.`}
    </div>
  )
}

function IconPicker({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  const icons = [
    "target",
    "plane",
    "laptop",
    "clothes",
    "home",
    "star",
    "car",
    "books",
    "game",
    "medical",
    "music",
    "shield",
  ]

  return (
    <div className="funds-field">
      <label className="funds-label">Icon</label>
      <div className="funds-icon-grid">
        {icons.map((candidate) => (
          <button
            key={candidate}
            type="button"
            className={`funds-icon-btn${value === candidate ? " selected" : ""}`}
            onClick={() => onChange(candidate)}
            disabled={disabled}
          >
            {_iconLabel(candidate)}
          </button>
        ))}
      </div>
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
    <div className="funds-overlay" onClick={onClose}>
      <div onClick={(event) => event.stopPropagation()}>{children}</div>
    </div>
  )
}

function ModalHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="funds-modal-header">
      <h3 className="funds-modal-title">{title}</h3>
      <button
        type="button"
        className="funds-modal-close"
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
  onSubmit,
  submitLabel,
  isSubmitting,
  isDanger = false,
}: {
  onCancel: () => void
  onSubmit?: () => void
  submitLabel: string
  isSubmitting: boolean
  isDanger?: boolean
}) {
  return (
    <div className="funds-modal-actions">
      <button
        type="button"
        className="funds-btn-secondary"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </button>
      <button
        type={onSubmit ? "button" : "submit"}
        className={isDanger ? "funds-btn-danger" : "funds-btn-primary"}
        onClick={onSubmit}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <>
            <span className="funds-btn-spinner" /> Processing...
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  )
}

function FundsPageSkeleton() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="funds-root">
        <div className="funds-header">
          <div>
            <div className="funds-skeleton-block title" />
            <div className="funds-skeleton-block subtitle" />
          </div>
          <div className="funds-skeleton-block button" />
        </div>
        {[1, 2, 3].map((section) => (
          <div key={section} className="funds-card skeleton-card">
            {[1, 2].map((row) => (
              <div key={row} className="funds-fund-row">
                <div className="funds-skeleton-block avatar" />
                <div className="funds-skeleton-stack">
                  <div className="funds-skeleton-block line-lg" />
                  <div className="funds-skeleton-block line-sm" />
                </div>
                <div className="funds-skeleton-block amount" />
              </div>
            ))}
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

function _formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-PH", {
    month: "short",
    year: "numeric",
  })
}

function _tomorrowIso(): string {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().split("T")[0]
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
  return _iconLabel(fund.icon || "target")
}

function _iconLabel(icon: string): string {
  const labels: Record<string, string> = {
    target: "TG",
    plane: "TR",
    laptop: "PC",
    clothes: "CL",
    home: "HM",
    star: "ST",
    car: "CR",
    books: "BK",
    game: "GM",
    medical: "MD",
    music: "MS",
    shield: "EF",
    "piggy-bank": "SV",
    wallet: "CH",
  }
  return labels[icon] ?? icon.slice(0, 2).toUpperCase()
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
    --purple:     #534AB7;
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
      --purple:     #AFA9EC;
    }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .funds-root {
    font-family: var(--sans);
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 2rem;
  }

  .funds-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1rem;
    padding-top: 0.25rem;
  }

  .funds-title {
    font-family: var(--serif);
    font-size: 26px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }

  .funds-subtitle { font-size: 13px; color: var(--text-3); }

  .funds-summary-bar {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1rem 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
  }

  .funds-summary-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.07em;
    color: var(--text-3);
    margin-bottom: 4px;
  }

  .funds-summary-value {
    font-family: var(--serif);
    font-size: 28px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.4px;
  }

  .funds-summary-count { font-size: 13px; color: var(--text-3); white-space: nowrap; }

  .funds-section { display: flex; flex-direction: column; gap: 0.625rem; }

  .funds-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .funds-section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
  }

  .funds-link-btn,
  .funds-closed-toggle {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-3);
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    transition: color 0.15s;
    font-family: var(--sans);
  }

  .funds-link-btn:hover,
  .funds-closed-toggle:hover { color: var(--text-1); }

  .funds-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  .funds-card.closed { margin-top: 0.5rem; opacity: 0.65; }

  .funds-fund-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 1rem 1.25rem;
    border-bottom: 0.5px solid var(--border);
  }

  .funds-fund-row.last { border-bottom: none; }

  .funds-fund-left {
    display: flex;
    gap: 12px;
    align-items: flex-start;
    flex: 1;
    min-width: 0;
  }

  .funds-fund-icon {
    width: 36px;
    height: 36px;
    border-radius: var(--radius-sm);
    background: var(--bg-surface);
    color: var(--text-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .funds-fund-icon.small {
    width: 28px;
    height: 28px;
    font-size: 10px;
  }

  .funds-fund-info {
    display: flex;
    flex-direction: column;
    gap: 3px;
    min-width: 0;
    flex: 1;
  }

  .funds-fund-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .funds-fund-name {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-1);
  }

  .funds-fund-name.closed-name { text-decoration: line-through; }

  .funds-fund-system-tag,
  .funds-behind-badge {
    font-size: 10px;
    font-weight: 500;
    padding: 2px 7px;
    border-radius: 20px;
    flex-shrink: 0;
  }

  .funds-fund-system-tag {
    background: var(--bg-surface);
    color: var(--text-3);
    border: 0.5px solid var(--border-md);
  }

  .funds-behind-badge {
    background: var(--warning-bg);
    color: var(--warning);
  }

  .funds-fund-alloc,
  .funds-fund-target {
    font-size: 12px;
    color: var(--text-3);
  }

  .funds-fund-needed {
    font-size: 11px;
    color: var(--warning);
  }

  .funds-goal-progress {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 3px 0;
  }

  .funds-goal-track {
    flex: 1;
    max-width: 160px;
    height: 6px;
    background: var(--bg-surface);
    border-radius: 3px;
    overflow: hidden;
  }

  .funds-goal-fill {
    height: 100%;
    border-radius: 3px;
    background: var(--blue);
    transition: width 0.4s ease;
  }

  .funds-goal-fill.complete { background: var(--success); }

  .funds-goal-pct {
    font-size: 11px;
    color: var(--text-3);
    flex-shrink: 0;
  }

  .funds-fund-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    flex-shrink: 0;
  }

  .funds-fund-balance {
    font-family: var(--serif);
    font-size: 18px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.2px;
  }

  .funds-fund-actions {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    justify-content: flex-end;
    margin-top: 2px;
  }

  .funds-btn-primary,
  .funds-btn-secondary,
  .funds-btn-danger {
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

  .funds-btn-primary {
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
  }

  .funds-btn-primary.full {
    width: 100%;
    margin-top: 1rem;
  }

  .funds-btn-secondary {
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
  }

  .funds-btn-danger {
    background: var(--error);
    color: #fff;
    border: none;
  }

  .funds-btn-primary:hover:not(:disabled),
  .funds-btn-secondary:hover:not(:disabled),
  .funds-btn-danger:hover:not(:disabled) { opacity: 0.85; }

  .funds-btn-primary:disabled,
  .funds-btn-secondary:disabled,
  .funds-btn-danger:disabled { opacity: 0.5; cursor: not-allowed; }

  .funds-btn-sm {
    height: 30px;
    padding: 0 10px;
    border-radius: 6px;
    font-family: var(--sans);
    font-size: 11px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
    border: none;
    display: inline-flex;
    align-items: center;
  }

  .funds-btn-sm.secondary {
    background: var(--bg-surface);
    color: var(--text-2);
    border: 0.5px solid var(--border-md);
  }

  .funds-btn-sm.danger {
    background: var(--error-bg);
    color: var(--error);
  }

  .funds-btn-sm:hover:not(:disabled) { opacity: 0.82; }

  .funds-btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: funds-spin 0.7s linear infinite;
  }

  @keyframes funds-spin { to { transform: rotate(360deg); } }

  .funds-empty {
    padding: 2rem;
    text-align: center;
    font-size: 13px;
    color: var(--text-3);
  }

  .funds-empty-sub { margin-top: 4px; font-size: 12px; }

  .funds-reorder-panel {
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    padding: 1rem;
    margin-top: 0.75rem;
  }

  .funds-reorder-title {
    font-size: 12px;
    color: var(--text-3);
    margin-bottom: 0.75rem;
  }

  .funds-reorder-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 0;
    border-bottom: 0.5px solid var(--border);
  }

  .funds-reorder-row:last-of-type { border-bottom: none; }

  .funds-reorder-num {
    font-size: 12px;
    color: var(--text-3);
    width: 16px;
    text-align: center;
  }

  .funds-reorder-name {
    flex: 1;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
  }

  .funds-reorder-btns { display: flex; gap: 4px; }

  .funds-reorder-arrow {
    min-width: 46px;
    height: 28px;
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: 6px;
    cursor: pointer;
    font-size: 11px;
    color: var(--text-2);
  }

  .funds-reorder-arrow:disabled { opacity: 0.3; cursor: not-allowed; }

  .funds-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1.5rem;
  }

  .funds-modal {
    background: var(--bg-card);
    border-radius: var(--radius-lg);
    border: 0.5px solid var(--border-md);
    max-width: 480px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .funds-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.25rem 1.5rem;
    border-bottom: 0.5px solid var(--border);
  }

  .funds-modal-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
  }

  .funds-modal-close {
    background: none;
    border: none;
    font-size: 18px;
    color: var(--text-3);
    cursor: pointer;
    padding: 0;
    line-height: 1;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
  }

  .funds-modal-close:hover { color: var(--text-1); }

  .funds-modal-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .funds-modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 1.25rem;
    justify-content: flex-end;
  }

  .funds-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 1rem;
  }

  .funds-field.spaced { margin-top: 1rem; }

  .funds-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
  }

  .funds-input {
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

  .funds-input:focus { border-color: var(--border-focus); }
  .funds-input.error { border-color: var(--error); }

  .funds-currency-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .funds-currency-prefix {
    position: absolute;
    left: 12px;
    font-size: 11px;
    color: var(--text-3);
    pointer-events: none;
    font-weight: 600;
  }

  .funds-currency-input { padding-left: 44px; }

  .funds-row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .funds-helper,
  .funds-field-error {
    font-size: 11px;
  }

  .funds-helper { color: var(--text-3); }
  .funds-field-error { color: var(--error); }
  .funds-field-error.modal-error { margin-bottom: 8px; }

  .funds-icon-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .funds-icon-btn {
    width: 40px;
    height: 40px;
    border-radius: var(--radius-sm);
    border: 0.5px solid var(--border-md);
    background: var(--bg-surface);
    color: var(--text-2);
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: border-color 0.15s;
  }

  .funds-icon-btn.selected {
    border-color: var(--text-1);
    outline: 2px solid var(--text-1);
    outline-offset: 1px;
  }

  .funds-direction-btns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .funds-direction-btn {
    min-height: 40px;
    padding: 0 10px;
    background: var(--bg-surface);
    color: var(--text-2);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-sm);
    font-family: var(--sans);
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
  }

  .funds-direction-btn.active {
    background: var(--text-1);
    color: var(--bg-card);
    border-color: var(--text-1);
  }

  .funds-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 12px;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
  }

  .funds-toggle-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 2px;
  }

  .funds-toggle-sub {
    font-size: 11px;
    color: var(--text-3);
    line-height: 1.4;
  }

  .funds-toggle {
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

  .funds-toggle.on { background: var(--success); }

  .funds-toggle-knob {
    position: absolute;
    top: 2px;
    left: 2px;
    width: 18px;
    height: 18px;
    background: white;
    border-radius: 50%;
    transition: transform 0.2s;
  }

  .funds-toggle.on .funds-toggle-knob { transform: translateX(18px); }

  .funds-warning-box {
    padding: 10px 12px;
    background: var(--warning-bg);
    border-radius: var(--radius-sm);
    font-size: 12px;
    color: var(--warning);
    line-height: 1.5;
    margin-bottom: 0.25rem;
  }

  .funds-close-info {
    padding: 12px;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    margin-bottom: 0.5rem;
  }

  .funds-close-balance {
    font-size: 14px;
    color: var(--text-1);
    margin-bottom: 4px;
  }

  .funds-close-note-info {
    font-size: 12px;
    color: var(--text-3);
  }

  .funds-alloc-suggestion {
    padding: 10px 12px;
    border-radius: var(--radius-sm);
    font-size: 12px;
    font-weight: 500;
    margin-bottom: 0.75rem;
  }

  .funds-alloc-suggestion.ok {
    background: var(--success-bg);
    color: var(--success);
  }

  .funds-alloc-suggestion.warn {
    background: var(--warning-bg);
    color: var(--warning);
  }

  @keyframes funds-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .funds-skeleton-block {
    border-radius: var(--radius-sm);
    background: linear-gradient(90deg, var(--bg-surface) 25%, var(--border-md) 50%, var(--bg-surface) 75%);
    background-size: 200% 100%;
    animation: funds-shimmer 1.5s ease-in-out infinite;
  }

  .funds-skeleton-block.title { width: 80px; height: 28px; margin-bottom: 8px; }
  .funds-skeleton-block.subtitle { width: 200px; height: 14px; }
  .funds-skeleton-block.button { width: 100px; height: 38px; }
  .funds-skeleton-block.avatar { width: 36px; height: 36px; }
  .funds-skeleton-block.line-lg { width: 50%; height: 14px; margin-bottom: 6px; }
  .funds-skeleton-block.line-sm { width: 30%; height: 11px; }
  .funds-skeleton-block.amount { width: 80px; height: 18px; }
  .funds-skeleton-stack { flex: 1; }
  .skeleton-card { margin-bottom: 1rem; }

  @media (max-width: 560px) {
    .funds-summary-bar,
    .funds-fund-row {
      flex-direction: column;
      align-items: stretch;
    }

    .funds-fund-right {
      align-items: flex-start;
      padding-left: 48px;
    }

    .funds-direction-btns,
    .funds-row-2 { grid-template-columns: 1fr; }

    .funds-modal-actions {
      flex-direction: column-reverse;
    }

    .funds-modal-actions button {
      width: 100%;
    }
  }
`
