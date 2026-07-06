import { useEffect, useState } from "react"
import { useTransferStore } from "../../store/transferStore"
import { useFundStore } from "../../store/fundStore"
import type {
  AddMoneyPayload,
  Fund,
  Transfer,
  TransferCreatePayload,
  TransferType,
} from "../../types"

type FilterKey = "all" | "manual" | "income" | "savings"

interface TransferConfig {
  icon: string
  label: string
  colorClass: string
  amountClass: string
  amountPrefix: string
}

export default function TransferPage() {
  const transferStore = useTransferStore()
  const fundStore = useFundStore()

  const [isLoading, setIsLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all")
  const [showAddMoney, setShowAddMoney] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)

  useEffect(() => {
    let isMounted = true

    async function load() {
      await Promise.all([
        useTransferStore.getState().fetchTransfers({ limit: 100 }),
        useFundStore.getState().fetchFunds(),
      ])

      if (isMounted) setIsLoading(false)
    }

    load()

    return () => {
      isMounted = false
    }
  }, [])

  const displayTransfers = _getFilteredTransfers(
    activeFilter,
    transferStore.transfers,
    transferStore.getManualTransfers(),
    fundStore.getSavingsFund(),
    fundStore.getEmergencyFund()
  )
  const grouped = _groupByDate(displayTransfers)
  const dates = Object.keys(grouped).sort().reverse()
  const activeFunds = fundStore.funds.filter((f) => f.status === "active")

  if (isLoading) return <TransfersPageSkeleton />

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="tr-root">
        <div className="tr-header">
          <div>
            <h1 className="tr-title">Transfers</h1>
            <p className="tr-subtitle">Money movements across your funds</p>
          </div>
          <div className="tr-header-actions">
            <button
              className="tr-btn-secondary"
              onClick={() => setShowAddMoney(true)}
            >
              Add Money
            </button>
            <button
              className="tr-btn-primary"
              onClick={() => setShowTransfer(true)}
              disabled={activeFunds.length < 2}
            >
              Transfer
            </button>
          </div>
        </div>

        <TransferSummaryBar funds={activeFunds} />

        <FilterRow active={activeFilter} onChange={setActiveFilter} />

        {displayTransfers.length === 0 ? (
          <EmptyTransfers
            filter={activeFilter}
            onAddMoney={() => setShowAddMoney(true)}
            onTransfer={() => setShowTransfer(true)}
          />
        ) : (
          <TransferList grouped={grouped} dates={dates} />
        )}

        {showAddMoney && (
          <AddMoneyModal
            onClose={() => setShowAddMoney(false)}
            onAdd={async (payload) => {
              await transferStore.addMoney(payload)
              setShowAddMoney(false)
            }}
          />
        )}

        {showTransfer && (
          <CreateTransferModal
            funds={activeFunds}
            onClose={() => setShowTransfer(false)}
            onTransfer={async (payload) => {
              await transferStore.createTransfer(payload)
              setShowTransfer(false)
            }}
          />
        )}
      </div>
    </>
  )
}

function _getFilteredTransfers(
  filter: FilterKey,
  transfers: Transfer[],
  manualTransfers: Transfer[],
  savingsFund?: Fund,
  emergencyFund?: Fund
): Transfer[] {
  switch (filter) {
    case "manual":
      return manualTransfers
    case "income":
      return transfers.filter(
        (transfer) =>
          transfer.transfer_type === "income_allocation" ||
          transfer.transfer_type === "month_end_carry"
      )
    case "savings": {
      const ids = [savingsFund?.id, emergencyFund?.id].filter(
        (id): id is number => typeof id === "number"
      )
      return transfers.filter(
        (transfer) =>
          (transfer.from_fund_id !== null &&
            ids.includes(transfer.from_fund_id)) ||
          (transfer.to_fund_id !== null && ids.includes(transfer.to_fund_id))
      )
    }
    case "all":
    default:
      return transfers
  }
}

function _groupByDate(transfers: Transfer[]): Record<string, Transfer[]> {
  const groups: Record<string, Transfer[]> = {}
  for (const transfer of transfers) {
    if (!groups[transfer.date]) groups[transfer.date] = []
    groups[transfer.date].push(transfer)
  }
  return groups
}

function TransferSummaryBar({ funds }: { funds: Fund[] }) {
  const cashOnHand = funds.find((fund) => fund.name === "Cash on Hand")
  const savings = funds.find((fund) => fund.name === "Savings")
  const emergency = funds.find((fund) => fund.name === "Emergency Fund")
  const items = [
    { label: "Cash on Hand", fund: cashOnHand },
    { label: "Savings", fund: savings },
    { label: "Emergency", fund: emergency },
  ].filter((item): item is { label: string; fund: Fund } => Boolean(item.fund))

  return (
    <div className="tr-summary-bar">
      {items.map((item) => (
        <div key={item.label} className="tr-summary-item">
          <span className="tr-summary-dot" />
          <div>
            <p className="tr-summary-label">{item.label}</p>
            <p className="tr-summary-value">
              {_formatCurrency(parseFloat(item.fund.current_balance))}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

function FilterRow({
  active,
  onChange,
}: {
  active: FilterKey
  onChange: (filter: FilterKey) => void
}) {
  const filters: Array<{ key: FilterKey; label: string }> = [
    { key: "all", label: "All" },
    { key: "manual", label: "Manual" },
    { key: "income", label: "Income" },
    { key: "savings", label: "Savings" },
  ]

  return (
    <div className="tr-filter-row">
      {filters.map((filter) => (
        <button
          key={filter.key}
          className={`tr-filter-btn${active === filter.key ? " active" : ""}`}
          onClick={() => onChange(filter.key)}
        >
          {filter.label}
        </button>
      ))}
    </div>
  )
}

function TransferList({
  grouped,
  dates,
}: {
  grouped: Record<string, Transfer[]>
  dates: string[]
}) {
  return (
    <div className="tr-list-wrap">
      {dates.map((date) => (
        <div key={date}>
          <p className="tr-date-header">{_formatDateHeader(date)}</p>
          <div className="tr-card tr-list-card">
            {grouped[date].map((transfer, idx) => (
              <TransferRow
                key={transfer.id}
                transfer={transfer}
                isLast={idx === grouped[date].length - 1}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TransferRow({
  transfer,
  isLast,
}: {
  transfer: Transfer
  isLast: boolean
}) {
  const cfg = _getTransferConfig(transfer.transfer_type)
  const amount = parseFloat(transfer.amount)
  const time = new Date(transfer.created_at).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  })

  return (
    <div className={`tr-row${isLast ? " last" : ""}`}>
      <div className={`tr-row-icon-wrap ${cfg.colorClass}`}>
        <span className="tr-row-icon">{cfg.icon}</span>
      </div>
      <div className="tr-row-info">
        <p className="tr-row-route">
          <span className="tr-row-from">{transfer.from_fund_name}</span>
          <span className="tr-row-arrow"> to </span>
          <span className="tr-row-to">{transfer.to_fund_name}</span>
        </p>
        {transfer.note && (
          <p className="tr-row-note">
            {transfer.note.length > 44
              ? `${transfer.note.slice(0, 44)}...`
              : transfer.note}
          </p>
        )}
        <p className="tr-row-type">
          {cfg.label}
          <span className="tr-row-time"> - {time}</span>
        </p>
      </div>
      <div className="tr-row-right">
        <p className={`tr-row-amount ${cfg.amountClass}`}>
          {cfg.amountPrefix}
          {_formatCurrency(amount)}
        </p>
      </div>
    </div>
  )
}

function _getTransferConfig(type: TransferType): TransferConfig {
  const map: Record<TransferType, TransferConfig> = {
    income_allocation: {
      icon: "$",
      label: "Income allocation",
      colorClass: "success",
      amountClass: "positive",
      amountPrefix: "+",
    },
    month_end_carry: {
      icon: "R",
      label: "Carry over",
      colorClass: "neutral",
      amountClass: "neutral",
      amountPrefix: "",
    },
    fund_to_cash: {
      icon: "O",
      label: "Withdrawal",
      colorClass: "warning",
      amountClass: "neutral",
      amountPrefix: "",
    },
    cash_to_fund: {
      icon: "I",
      label: "Saved to fund",
      colorClass: "success",
      amountClass: "positive",
      amountPrefix: "+",
    },
    fund_to_fund: {
      icon: "T",
      label: "Fund transfer",
      colorClass: "blue",
      amountClass: "neutral",
      amountPrefix: "",
    },
    external_add: {
      icon: "+",
      label: "External addition",
      colorClass: "success",
      amountClass: "positive",
      amountPrefix: "+",
    },
    goal_completed: {
      icon: "G",
      label: "Goal completed",
      colorClass: "success",
      amountClass: "positive",
      amountPrefix: "+",
    },
    survival_draw: {
      icon: "S",
      label: "Survival draw",
      colorClass: "warning",
      amountClass: "neutral",
      amountPrefix: "",
    },
  }
  return map[type]
}

function EmptyTransfers({
  filter,
  onAddMoney,
  onTransfer,
}: {
  filter: FilterKey
  onAddMoney: () => void
  onTransfer: () => void
}) {
  const messages: Record<FilterKey, string> = {
    all: "No transfers yet.",
    manual: "No manual transfers yet.",
    income: "No income allocations yet.",
    savings: "No savings transfers yet.",
  }

  return (
    <div className="tr-card tr-empty">
      <p className="tr-empty-title">{messages[filter]}</p>
      {filter === "all" && (
        <>
          <p className="tr-empty-sub">
            Add money to Cash on Hand or move money between funds.
          </p>
          <div className="tr-empty-actions">
            <button className="tr-btn-secondary" onClick={onAddMoney}>
              Add Money
            </button>
            <button className="tr-btn-primary" onClick={onTransfer}>
              Transfer
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function AddMoneyModal({
  onClose,
  onAdd,
}: {
  onClose: () => void
  onAdd: (payload: AddMoneyPayload) => Promise<void>
}) {
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [date, setDate] = useState(_todayIso())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const amountNum = parseFloat(amount)

    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount.")
      return
    }
    if (!note.trim()) {
      setError("A note is required. Describe where this money came from.")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      await onAdd({ amount: amountNum, note: note.trim(), date })
    } catch (err) {
      setError(_errorMessage(err, "Failed to add money."))
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="tr-modal">
        <ModalHeader title="Add Money to Cash on Hand" onClose={onClose} />
        <form onSubmit={handleSubmit} className="tr-modal-body">
          <div className="tr-modal-info-box">
            <p className="tr-modal-info-text">
              Money will be added directly to Cash on Hand. Use this for sold
              items, bonuses, gifts, or any money received outside regular
              income.
            </p>
          </div>

          <AmountField
            value={amount}
            onChange={(value) => {
              setAmount(value)
              setError("")
            }}
            disabled={isSubmitting}
          />

          <div className="tr-field">
            <label className="tr-label" htmlFor="add-money-note">
              Note <span className="tr-required">(required)</span>
            </label>
            <input
              id="add-money-note"
              className="tr-input"
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                setError("")
              }}
              placeholder="Sold old laptop, birthday gift, bonus..."
              disabled={isSubmitting}
            />
          </div>

          <DateField
            id="add-money-date"
            value={date}
            onChange={setDate}
            disabled={isSubmitting}
          />

          {error && <p className="tr-field-error">{error}</p>}

          <ModalActions
            onCancel={onClose}
            submitLabel="Add Money"
            isSubmitting={isSubmitting}
          />
        </form>
      </div>
    </ModalOverlay>
  )
}

function CreateTransferModal({
  funds,
  onClose,
  onTransfer,
}: {
  funds: Fund[]
  onClose: () => void
  onTransfer: (payload: TransferCreatePayload) => Promise<void>
}) {
  const cashOnHand = funds.find((fund) => fund.name === "Cash on Hand")
  const defaultFromId = cashOnHand?.id ?? funds[0]?.id ?? 0
  const defaultToId =
    funds.find((fund) => fund.id !== defaultFromId)?.id ?? funds[0]?.id ?? 0

  const [fromFundId, setFromFundId] = useState(defaultFromId)
  const [toFundId, setToFundId] = useState(defaultToId)
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [date, setDate] = useState(_todayIso())
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const fromFund = funds.find((fund) => fund.id === fromFundId)
  const toFund = funds.find((fund) => fund.id === toFundId)
  const transferType = _getManualTransferType(fromFund, toFund)
  const noteRequired = transferType === "fund_to_cash"
  const availableBalance = parseFloat(fromFund?.current_balance ?? "0")

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    const amountNum = parseFloat(amount)

    if (!fromFund || !toFund || fromFund.id === toFund.id) {
      setError("Choose two different funds.")
      return
    }
    if (!amountNum || amountNum <= 0) {
      setError("Enter a valid amount.")
      return
    }
    if (amountNum > availableBalance) {
      setError(`Insufficient balance. Available: ${_formatCurrency(availableBalance)}.`)
      return
    }
    if (noteRequired && !note.trim()) {
      setError("A note is required when withdrawing to Cash on Hand.")
      return
    }

    setIsSubmitting(true)
    setError("")

    try {
      await onTransfer({
        from_fund_id: fromFund.id,
        to_fund_id: toFund.id,
        amount: amountNum,
        transfer_type: transferType,
        note: note.trim(),
        date,
      })
    } catch (err) {
      setError(_errorMessage(err, "Transfer failed."))
      setIsSubmitting(false)
    }
  }

  return (
    <ModalOverlay onClose={onClose}>
      <div className="tr-modal">
        <ModalHeader title="Move money between funds" onClose={onClose} />
        <form onSubmit={handleSubmit} className="tr-modal-body">
          <FundSelect
            id="from-fund"
            label="From fund"
            value={fromFundId}
            funds={funds}
            disabled={isSubmitting}
            onChange={(value) => {
              setFromFundId(value)
              setError("")
            }}
          />

          <div className="tr-transfer-arrow">to</div>

          <FundSelect
            id="to-fund"
            label="To fund"
            value={toFundId}
            funds={funds}
            disabled={isSubmitting}
            onChange={(value) => {
              setToFundId(value)
              setError("")
            }}
          />

          <TransferTypeBadge type={transferType} />

          <AmountField
            value={amount}
            onChange={(value) => {
              setAmount(value)
              setError("")
            }}
            disabled={isSubmitting}
            helper={`Available: ${_formatCurrency(availableBalance)}`}
          />

          <div className="tr-field">
            <label className="tr-label" htmlFor="transfer-note">
              Note{" "}
              {noteRequired ? (
                <span className="tr-required">(required)</span>
              ) : (
                <span className="tr-optional">(optional)</span>
              )}
            </label>
            <input
              id="transfer-note"
              className="tr-input"
              value={note}
              onChange={(event) => {
                setNote(event.target.value)
                setError("")
              }}
              placeholder="Moving extra savings..."
              disabled={isSubmitting}
            />
          </div>

          <DateField
            id="transfer-date"
            value={date}
            onChange={setDate}
            disabled={isSubmitting}
          />

          {error && <p className="tr-field-error">{error}</p>}

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

function FundSelect({
  id,
  label,
  value,
  funds,
  disabled,
  onChange,
}: {
  id: string
  label: string
  value: number
  funds: Fund[]
  disabled: boolean
  onChange: (value: number) => void
}) {
  return (
    <div className="tr-field">
      <label className="tr-label" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className="tr-input tr-select"
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        disabled={disabled}
      >
        {funds.map((fund) => (
          <option key={fund.id} value={fund.id}>
            {fund.name} - {_formatCurrency(parseFloat(fund.current_balance))}
          </option>
        ))}
      </select>
    </div>
  )
}

function AmountField({
  value,
  onChange,
  disabled,
  helper,
}: {
  value: string
  onChange: (value: string) => void
  disabled: boolean
  helper?: string
}) {
  return (
    <div className="tr-field">
      <label className="tr-label" htmlFor="transfer-amount">
        Amount
      </label>
      <div className="tr-amount-wrap">
        <span className="tr-amount-prefix">PHP</span>
        <input
          id="transfer-amount"
          type="number"
          min="0.01"
          step="0.01"
          className="tr-amount-input"
          placeholder="0.00"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
        />
      </div>
      {helper && <span className="tr-helper">{helper}</span>}
    </div>
  )
}

function DateField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: string
  onChange: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="tr-field">
      <label className="tr-label" htmlFor={id}>
        Date
      </label>
      <input
        id={id}
        type="date"
        className="tr-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        max={_todayIso()}
        disabled={disabled}
      />
    </div>
  )
}

function _getManualTransferType(fromFund?: Fund, toFund?: Fund): TransferType {
  const fromCash = fromFund?.name === "Cash on Hand"
  const toCash = toFund?.name === "Cash on Hand"
  if (fromCash) return "cash_to_fund"
  if (toCash) return "fund_to_cash"
  return "fund_to_fund"
}

function TransferTypeBadge({ type }: { type: TransferType }) {
  const labels: Partial<Record<TransferType, string>> = {
    cash_to_fund: "Saving extra cash to a fund",
    fund_to_cash: "Withdrawing from a fund to spend",
    fund_to_fund: "Moving between funds",
  }
  const label = labels[type]
  if (!label) return null

  return <div className="tr-type-badge">{label}</div>
}

function ModalOverlay({
  children,
  onClose,
}: {
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="tr-overlay" onClick={onClose}>
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
    <div className="tr-modal-header">
      <h3 className="tr-modal-title">{title}</h3>
      <button
        type="button"
        className="tr-modal-close"
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
}: {
  onCancel: () => void
  submitLabel: string
  isSubmitting: boolean
}) {
  return (
    <div className="tr-modal-actions">
      <button
        type="button"
        className="tr-btn-secondary"
        onClick={onCancel}
        disabled={isSubmitting}
      >
        Cancel
      </button>
      <button type="submit" className="tr-btn-primary" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <span className="tr-btn-spinner" />
            Processing...
          </>
        ) : (
          submitLabel
        )}
      </button>
    </div>
  )
}

function TransfersPageSkeleton() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="tr-root">
        <div className="tr-header">
          <div>
            <div
              className="tr-skeleton-block"
              style={{ width: 120, height: 30, marginBottom: 8 }}
            />
            <div
              className="tr-skeleton-block"
              style={{ width: 240, height: 14 }}
            />
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <div
              className="tr-skeleton-block"
              style={{ width: 104, height: 40 }}
            />
            <div
              className="tr-skeleton-block"
              style={{ width: 92, height: 40 }}
            />
          </div>
        </div>
        <div className="tr-skeleton-block" style={{ height: 80 }} />
        {[1, 2].map((item) => (
          <div key={item}>
            <div
              className="tr-skeleton-block"
              style={{ width: 140, height: 12, marginBottom: 8 }}
            />
            <div className="tr-card tr-list-card">
              {[1, 2, 3].map((row) => (
                <div key={row} className="tr-row">
                  <div
                    className="tr-skeleton-block"
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      className="tr-skeleton-block"
                      style={{ width: "60%", height: 14, marginBottom: 6 }}
                    />
                    <div
                      className="tr-skeleton-block"
                      style={{ width: "40%", height: 11 }}
                    />
                  </div>
                  <div
                    className="tr-skeleton-block"
                    style={{ width: 80, height: 16 }}
                  />
                </div>
              ))}
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
    if (typeof data?.note === "string") return data.note
    if (Array.isArray(data?.note)) return data.note[0]
    if (typeof data?.transfer_type === "string") return data.transfer_type
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
    --text-1: #18181B;
    --text-2: #52525B;
    --text-3: #A1A1AA;
    --error: #993C1D;
    --error-bg: #FAECE7;
    --success: #3B6D11;
    --success-bg: #EAF3DE;
    --warning: #854F0B;
    --warning-bg: #FAEEDA;
    --blue: #185FA5;
    --blue-bg: #E6F1FB;
    --purple: #534AB7;
    --purple-bg: #EEEDFE;
    --sans: 'Plus Jakarta Sans', system-ui, sans-serif;
    --serif: 'Lora', Georgia, serif;
    --radius-sm: 8px;
    --radius-md: 12px;
    --radius-lg: 18px;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --bg-page: #0F0F11;
      --bg-card: #18181B;
      --bg-surface: #1F1F23;
      --border: rgba(255,255,255,0.08);
      --border-md: rgba(255,255,255,0.14);
      --border-focus: rgba(255,255,255,0.4);
      --text-1: #FAFAFA;
      --text-2: #A1A1AA;
      --text-3: #52525B;
      --error: #F0997B;
      --error-bg: #4A1B0C;
      --success: #97C459;
      --success-bg: #173404;
      --warning: #EF9F27;
      --warning-bg: #412402;
      --blue: #85B7EB;
      --blue-bg: #042C53;
      --purple: #AFA9EC;
      --purple-bg: #26215C;
    }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .tr-root {
    font-family: var(--sans);
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 2rem;
  }

  .tr-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    flex-wrap: wrap;
    gap: 1rem;
    padding-top: 0.25rem;
  }

  .tr-title {
    font-family: var(--serif);
    font-size: 26px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }

  .tr-subtitle { font-size: 13px; color: var(--text-3); }

  .tr-header-actions {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .tr-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 1.25rem 1.5rem;
  }

  .tr-summary-bar {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-md);
    display: flex;
    overflow: hidden;
  }

  .tr-summary-item {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 0.875rem 1rem;
    border-right: 0.5px solid var(--border);
  }

  .tr-summary-item:last-child { border-right: none; }

  .tr-summary-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--success);
    flex-shrink: 0;
  }

  .tr-summary-label {
    font-size: 11px;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
  }

  .tr-summary-value {
    font-family: var(--serif);
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.2px;
  }

  .tr-filter-row {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
  }

  .tr-filter-btn {
    height: 34px;
    padding: 0 14px;
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: 20px;
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
  }

  .tr-filter-btn.active {
    background: var(--text-1);
    color: var(--bg-card);
    border-color: var(--text-1);
  }

  .tr-filter-btn:hover:not(.active) { color: var(--text-1); }

  .tr-list-wrap {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  .tr-date-header {
    font-size: 11px;
    font-weight: 600;
    color: var(--text-3);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin-bottom: 0.5rem;
    padding-left: 4px;
  }

  .tr-list-card {
    padding: 0;
    overflow: hidden;
  }

  .tr-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 1.25rem;
    border-bottom: 0.5px solid var(--border);
    transition: background 0.1s;
  }

  .tr-row:hover { background: var(--bg-surface); }
  .tr-row.last { border-bottom: none; }

  .tr-row-icon-wrap {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;
  }

  .tr-row-icon-wrap.success { background: var(--success-bg); color: var(--success); }
  .tr-row-icon-wrap.warning { background: var(--warning-bg); color: var(--warning); }
  .tr-row-icon-wrap.blue { background: var(--blue-bg); color: var(--blue); }
  .tr-row-icon-wrap.neutral { background: var(--bg-surface); color: var(--text-2); }

  .tr-row-info { flex: 1; min-width: 0; }

  .tr-row-route {
    font-size: 14px;
    color: var(--text-1);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }

  .tr-row-from,
  .tr-row-to { font-weight: 500; }

  .tr-row-arrow {
    color: var(--text-3);
    font-size: 12px;
  }

  .tr-row-note {
    font-size: 12px;
    color: var(--text-3);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    margin-bottom: 2px;
  }

  .tr-row-type {
    font-size: 11px;
    color: var(--text-3);
  }

  .tr-row-time { opacity: 0.7; }

  .tr-row-right {
    text-align: right;
    flex-shrink: 0;
  }

  .tr-row-amount {
    font-size: 14px;
    font-weight: 600;
    white-space: nowrap;
  }

  .tr-row-amount.positive { color: var(--success); }
  .tr-row-amount.neutral { color: var(--text-1); }

  .tr-transfer-arrow {
    text-align: center;
    font-size: 13px;
    color: var(--text-3);
    margin: -0.25rem 0 0.75rem;
  }

  .tr-type-badge {
    padding: 8px 12px;
    background: var(--blue-bg);
    border-radius: var(--radius-sm);
    font-size: 13px;
    color: var(--blue);
    font-weight: 500;
    margin-bottom: 1rem;
    text-align: center;
  }

  .tr-empty {
    text-align: center;
    padding: 2.5rem 1.5rem;
  }

  .tr-empty-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 6px;
  }

  .tr-empty-sub {
    font-size: 13px;
    color: var(--text-3);
    line-height: 1.5;
    margin-bottom: 1.25rem;
  }

  .tr-empty-actions {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .tr-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 100;
    padding: 1.5rem;
  }

  .tr-modal {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    max-width: 480px;
    width: 100%;
    max-height: 90vh;
    overflow-y: auto;
  }

  .tr-modal-header {
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

  .tr-modal-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
  }

  .tr-modal-close {
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

  .tr-modal-close:hover { color: var(--text-1); }

  .tr-modal-body {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .tr-modal-info-box {
    padding: 12px;
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    margin-bottom: 1rem;
  }

  .tr-modal-info-text {
    font-size: 13px;
    color: var(--text-2);
    line-height: 1.5;
  }

  .tr-modal-actions {
    display: flex;
    gap: 10px;
    margin-top: 1.25rem;
  }

  .tr-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-bottom: 1rem;
  }

  .tr-label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-2);
  }

  .tr-required {
    font-size: 12px;
    color: var(--error);
    font-weight: 400;
  }

  .tr-optional {
    font-size: 12px;
    color: var(--text-3);
    font-weight: 400;
  }

  .tr-input {
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

  .tr-input:focus { border-color: var(--border-focus); }
  .tr-select { cursor: pointer; }

  .tr-amount-wrap {
    position: relative;
    display: flex;
    align-items: center;
  }

  .tr-amount-prefix {
    position: absolute;
    left: 14px;
    font-size: 12px;
    color: var(--text-3);
    pointer-events: none;
    font-weight: 600;
  }

  .tr-amount-input {
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

  .tr-amount-input:focus {
    border-color: var(--border-focus);
    background: var(--bg-card);
  }

  .tr-amount-input::-webkit-outer-spin-button,
  .tr-amount-input::-webkit-inner-spin-button { -webkit-appearance: none; }
  .tr-amount-input[type=number] { -moz-appearance: textfield; }

  .tr-helper {
    font-size: 11px;
    color: var(--text-3);
  }

  .tr-field-error {
    font-size: 12px;
    color: var(--error);
    margin-bottom: 0.5rem;
  }

  .tr-btn-primary,
  .tr-btn-secondary {
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

  .tr-btn-primary {
    background: var(--text-1);
    color: var(--bg-card);
    border: none;
  }

  .tr-btn-secondary {
    background: var(--bg-surface);
    color: var(--text-1);
    border: 0.5px solid var(--border-md);
  }

  .tr-btn-primary:hover:not(:disabled),
  .tr-btn-secondary:hover:not(:disabled) { opacity: 0.85; }

  .tr-btn-primary:disabled,
  .tr-btn-secondary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .tr-modal-actions .tr-btn-primary,
  .tr-modal-actions .tr-btn-secondary {
    flex: 1;
  }

  .tr-btn-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: currentColor;
    border-radius: 50%;
    animation: tr-spin 0.7s linear infinite;
  }

  @keyframes tr-spin { to { transform: rotate(360deg); } }

  @keyframes tr-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .tr-skeleton-block {
    border-radius: var(--radius-sm);
    background: linear-gradient(
      90deg,
      var(--bg-surface) 25%,
      var(--border-md) 50%,
      var(--bg-surface) 75%
    );
    background-size: 200% 100%;
    animation: tr-shimmer 1.5s ease-in-out infinite;
  }

  @media (max-width: 500px) {
    .tr-summary-bar { flex-direction: column; }
    .tr-summary-item {
      border-right: none;
      border-bottom: 0.5px solid var(--border);
    }
    .tr-summary-item:last-child { border-bottom: none; }
    .tr-header-actions { width: 100%; }
    .tr-header-actions .tr-btn-primary,
    .tr-header-actions .tr-btn-secondary { flex: 1; }
    .tr-filter-btn {
      font-size: 12px;
      padding: 0 10px;
      height: 32px;
    }
    .tr-row {
      align-items: flex-start;
      padding: 12px 1rem;
    }
    .tr-row-right { margin-top: 2px; }
    .tr-overlay {
      align-items: flex-end;
      padding: 0;
    }
    .tr-modal {
      border-radius: var(--radius-lg) var(--radius-lg) 0 0;
      max-height: 92vh;
    }
  }
`
