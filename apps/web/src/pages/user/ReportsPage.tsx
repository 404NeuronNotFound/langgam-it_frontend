import { useEffect, useState } from "react"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts"
import { useNetWorthStore } from "../../store/netWorthStore"
import { useFundStore } from "../../store/fundStore"
import type { Fund, MonthSummary, NetWorthSnapshot } from "../../types"

type TimeRange = "1M" | "3M" | "6M" | "1Y" | "all"

interface RangeStats {
  current: number
  start: number
  change: number
  changePct: number
  direction: "up" | "down" | "flat"
}

interface ChartPoint {
  date: string
  net_worth: number
  label: string
}

export default function ReportsPage() {
  const netWorthStore = useNetWorthStore()
  const fundStore = useFundStore()

  const [isLoading, setIsLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<TimeRange>("3M")

  useEffect(() => {
    let isMounted = true

    async function loadReports() {
      await Promise.all([
        useNetWorthStore.getState().fetchSnapshots(365),
        useFundStore.getState().fetchFunds(),
      ])

      if (isMounted) {
        setIsLoading(false)
      }
    }

    loadReports()

    return () => {
      isMounted = false
    }
  }, [])

  const filteredSnapshots = _filterByRange(
    netWorthStore.snapshots,
    timeRange
  )
  const chartData = filteredSnapshots
    .slice()
    .reverse()
    .map((snapshot) => ({
      date: snapshot.captured_at.split("T")[0],
      net_worth: parseFloat(snapshot.net_worth),
      label: _formatChartLabel(snapshot.captured_at),
    }))
  const rangeStats = _computeRangeStats(filteredSnapshots)
  const activeFunds = fundStore.funds.filter((fund) => fund.status === "active")
  const totalBalance = fundStore.getTotalBalance()

  if (isLoading) return <ReportsPageSkeleton />

  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="rep-root">
        <div className="rep-header">
          <div>
            <h1 className="rep-title">Reports</h1>
            <p className="rep-subtitle">Your financial history</p>
          </div>
        </div>

        <TimeRangeToggle active={timeRange} onChange={setTimeRange} />

        <NetWorthChartCard
          chartData={chartData}
          stats={rangeStats}
          timeRange={timeRange}
        />

        {activeFunds.length > 0 && (
          <FundSnapshotCard funds={activeFunds} totalBalance={totalBalance} />
        )}

        <MonthSummariesCard summaries={netWorthStore.summaries} />
      </div>
    </>
  )
}

function _filterByRange(
  snapshots: NetWorthSnapshot[],
  range: TimeRange
): NetWorthSnapshot[] {
  if (range === "all") return snapshots

  const days = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365 }[range]
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  return snapshots.filter((snapshot) => new Date(snapshot.captured_at) >= cutoff)
}

function _computeRangeStats(snapshots: NetWorthSnapshot[]): RangeStats {
  if (snapshots.length === 0) {
    return {
      current: 0,
      start: 0,
      change: 0,
      changePct: 0,
      direction: "flat",
    }
  }

  const current = parseFloat(snapshots[0].net_worth)
  const start = parseFloat(snapshots[snapshots.length - 1].net_worth)
  const change = current - start
  const changePct = start !== 0 ? (change / start) * 100 : 0

  return {
    current,
    start,
    change,
    changePct,
    direction: change > 0 ? "up" : change < 0 ? "down" : "flat",
  }
}

function TimeRangeToggle({
  active,
  onChange,
}: {
  active: TimeRange
  onChange: (range: TimeRange) => void
}) {
  const ranges: TimeRange[] = ["1M", "3M", "6M", "1Y", "all"]

  return (
    <div className="rep-range-wrap">
      {ranges.map((range) => (
        <button
          key={range}
          className={`rep-range-btn${active === range ? " active" : ""}`}
          onClick={() => onChange(range)}
        >
          {range === "all" ? "All" : range}
        </button>
      ))}
    </div>
  )
}

function NetWorthChartCard({
  chartData,
  stats,
  timeRange,
}: {
  chartData: ChartPoint[]
  stats: RangeStats
  timeRange: TimeRange
}) {
  const strokeColor = stats.direction === "down" ? "#993C1D" : "#185FA5"
  const rangeLabel = {
    "1M": "past month",
    "3M": "past 3 months",
    "6M": "past 6 months",
    "1Y": "past year",
    all: "all time",
  }[timeRange]

  return (
    <div className="rep-card">
      <p className="rep-section-label">Net worth</p>
      <div className="rep-nw-hero">
        <p className="rep-nw-value">{_formatCurrency(stats.current)}</p>
        <div className={`rep-nw-change ${stats.direction}`}>
          <span className="rep-nw-arrow">
            {stats.direction === "up"
              ? "Up"
              : stats.direction === "down"
                ? "Down"
                : "Flat"}
          </span>
          <span>
            {stats.change > 0 ? "+" : ""}
            {_formatCurrency(stats.change)} ({stats.changePct > 0 ? "+" : ""}
            {stats.changePct.toFixed(1)}%)
          </span>
          <span className="rep-nw-range-label">{rangeLabel}</span>
        </div>
      </div>

      {chartData.length < 2 ? (
        <div className="rep-chart-empty">
          <p>Chart appears after your first transactions</p>
        </div>
      ) : (
        <div className="rep-chart-wrap">
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={chartData}
              margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(0,0,0,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#A1A1AA" }}
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                width={60}
                tick={{ fontSize: 11, fill: "#A1A1AA" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={_formatCompact}
              />
              <Tooltip
                formatter={(value) => [
                  _formatCurrency(Number(value)),
                  "Net Worth",
                ]}
                contentStyle={{
                  background: "var(--bg-card)",
                  border: "0.5px solid var(--border-md)",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              />
              {stats.start > 0 && (
                <ReferenceLine
                  y={stats.start}
                  stroke="rgba(0,0,0,0.1)"
                  strokeDasharray="4 4"
                />
              )}
              <Line
                type="monotone"
                dataKey="net_worth"
                stroke={strokeColor}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {chartData.length >= 2 && (
        <p className="rep-chart-note">
          {chartData.length} snapshots, captured after transactions
        </p>
      )}
    </div>
  )
}

function FundSnapshotCard({
  funds,
  totalBalance,
}: {
  funds: Fund[]
  totalBalance: number
}) {
  return (
    <div className="rep-card">
      <p className="rep-section-label">Current fund balances</p>
      <p className="rep-fund-intro">
        How your net worth is distributed across funds
      </p>

      <div className="rep-fund-list">
        {funds.map((fund) => {
          const balance = parseFloat(fund.current_balance)
          const pct =
            totalBalance > 0 ? Math.round((balance / totalBalance) * 100) : 0

          return (
            <div key={fund.id} className="rep-fund-row">
              <div className="rep-fund-left">
                <span className="rep-fund-icon">{fund.icon || "$"}</span>
                <div>
                  <p className="rep-fund-name">{fund.name}</p>
                  {fund.type === "goal" && fund.target_amount && (
                    <p className="rep-fund-target">
                      Target:{" "}
                      {_formatCurrency(parseFloat(fund.target_amount))}
                    </p>
                  )}
                </div>
              </div>
              <div className="rep-fund-right">
                <p className="rep-fund-balance">{_formatCurrency(balance)}</p>
                <div className="rep-fund-bar-wrap">
                  <div className="rep-fund-track">
                    <div
                      className="rep-fund-fill"
                      style={{
                        width: pct + "%",
                        background:
                          fund.type === "system_required"
                            ? "var(--blue)"
                            : "var(--success)",
                      }}
                    />
                  </div>
                  <span className="rep-fund-pct">{pct}%</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="rep-fund-total">
        <span>Total net worth</span>
        <span className="rep-fund-total-value">
          {_formatCurrency(totalBalance)}
        </span>
      </div>
    </div>
  )
}

function MonthSummariesCard({ summaries }: { summaries: MonthSummary[] }) {
  const [expandedId, setExpandedId] = useState<number | null>(
    summaries[0]?.cycle_id ?? null
  )

  useEffect(() => {
    if (expandedId === null && summaries.length > 0) {
      setExpandedId(summaries[0].cycle_id)
    }
  }, [expandedId, summaries])

  return (
    <div className="rep-card">
      <p className="rep-section-label">Month summaries</p>
      <p className="rep-summaries-sub">Closed months history</p>

      {summaries.length === 0 ? (
        <div className="rep-empty">
          <p className="rep-empty-title">No closed months yet.</p>
          <p className="rep-empty-sub">
            Close a month from the dashboard to build your report history.
          </p>
        </div>
      ) : (
        <div className="rep-summaries-list">
          {summaries.map((summary) => (
            <SummaryAccordion
              key={summary.cycle_id}
              summary={summary}
              isExpanded={expandedId === summary.cycle_id}
              onToggle={() =>
                setExpandedId((current) =>
                  current === summary.cycle_id ? null : summary.cycle_id
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function SummaryAccordion({
  summary,
  isExpanded,
  onToggle,
}: {
  summary: MonthSummary
  isExpanded: boolean
  onToggle: () => void
}) {
  const netWorthChange = parseFloat(summary.net_worth_change)
  const income = parseFloat(summary.total_income)
  const needsSpent = parseFloat(summary.total_needs_spent)
  const wantsSpent = parseFloat(summary.total_wants_spent)
  const totalSaved = parseFloat(summary.total_allocated_to_funds)
  const netWorthEnd = parseFloat(summary.net_worth_end)
  const netWorthStart = parseFloat(summary.net_worth_start)
  const totalSpent = needsSpent + wantsSpent
  const direction =
    netWorthChange > 0 ? "up" : netWorthChange < 0 ? "down" : "flat"
  const monthLabel = _formatMonthLabel(summary.cycle_year, summary.cycle_month)

  return (
    <div className="rep-accordion">
      <button className="rep-accordion-header" onClick={onToggle}>
        <div className="rep-accordion-left">
          <span className="rep-accordion-month">{monthLabel}</span>
          <span className="rep-accordion-income">
            Income: {_formatCurrency(income)}
          </span>
        </div>
        <div className="rep-accordion-right">
          <span className={`rep-accordion-change ${direction}`}>
            {netWorthChange === 0
              ? "No change"
              : `${netWorthChange > 0 ? "+" : ""}${_formatCurrency(
                  netWorthChange
                )}`}
          </span>
          <span
            className={`rep-accordion-chevron${isExpanded ? " open" : ""}`}
          >
            v
          </span>
        </div>
      </button>

      {isExpanded && (
        <div className="rep-accordion-body">
          <div className="rep-stats-grid">
            <StatItem
              label="Income"
              value={_formatCurrency(income)}
              sub="this month"
            />
            <StatItem
              label="Total spent"
              value={_formatCurrency(totalSpent)}
              sub="needs + wants"
            />
            <StatItem
              label="Saved to funds"
              value={_formatCurrency(totalSaved)}
              sub="allocated"
            />
            <StatItem
              label="Net worth end"
              value={_formatCurrency(netWorthEnd)}
              sub={
                netWorthChange >= 0
                  ? `+${_formatCurrency(netWorthChange)}`
                  : _formatCurrency(netWorthChange)
              }
              subColor={direction}
            />
          </div>

          <div className="rep-spending-breakdown">
            <SpendingRow
              label="Needs"
              amount={needsSpent}
              total={income}
              color="var(--success)"
            />
            <SpendingRow
              label="Wants"
              amount={wantsSpent}
              total={income}
              color="var(--warning)"
            />
            <SpendingRow
              label="Saved"
              amount={totalSaved}
              total={income}
              color="var(--blue)"
            />
          </div>

          <div className="rep-nw-comparison">
            <div className="rep-nw-comp-row">
              <span className="rep-nw-comp-label">Net worth at start</span>
              <span className="rep-nw-comp-value">
                {_formatCurrency(netWorthStart)}
              </span>
            </div>
            <div className="rep-nw-comp-row">
              <span className="rep-nw-comp-label">Net worth at end</span>
              <span className={`rep-nw-comp-value ${direction}`}>
                {_formatCurrency(netWorthEnd)}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatItem({
  label,
  value,
  sub,
  subColor,
}: {
  label: string
  value: string
  sub: string
  subColor?: "up" | "down" | "flat"
}) {
  return (
    <div className="rep-stat-item">
      <p className="rep-stat-label">{label}</p>
      <p className="rep-stat-value">{value}</p>
      <p className={`rep-stat-sub${subColor ? ` ${subColor}` : ""}`}>{sub}</p>
    </div>
  )
}

function SpendingRow({
  label,
  amount,
  total,
  color,
}: {
  label: string
  amount: number
  total: number
  color: string
}) {
  const pct = total > 0 ? Math.min(100, (amount / total) * 100) : 0

  return (
    <div className="rep-spending-row">
      <span className="rep-spending-label">{label}</span>
      <div className="rep-spending-track">
        <div
          className="rep-spending-fill"
          style={{ width: pct + "%", background: color }}
        />
      </div>
      <span className="rep-spending-value">{_formatCurrency(amount)}</span>
      <span className="rep-spending-pct">{pct.toFixed(0)}%</span>
    </div>
  )
}

function ReportsPageSkeleton() {
  return (
    <>
      <style>{PAGE_STYLES}</style>
      <div className="rep-root">
        <div className="rep-header">
          <div>
            <div
              className="rep-skeleton-block"
              style={{ width: 90, height: 28, marginBottom: 8 }}
            />
            <div
              className="rep-skeleton-block"
              style={{ width: 200, height: 14 }}
            />
          </div>
        </div>
        <div className="rep-skeleton-block" style={{ height: 44 }} />
        <div className="rep-card">
          <div
            className="rep-skeleton-block"
            style={{ width: 140, height: 14, marginBottom: 16 }}
          />
          <div
            className="rep-skeleton-block"
            style={{ width: "60%", height: 44, marginBottom: 12 }}
          />
          <div className="rep-skeleton-block" style={{ height: 200 }} />
        </div>
        {[140, 200].map((height) => (
          <div key={height} className="rep-card">
            <div className="rep-skeleton-block" style={{ height }} />
          </div>
        ))}
      </div>
    </>
  )
}

function _formatChartLabel(capturedAt: string): string {
  return new Date(capturedAt).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
  })
}

function _formatMonthLabel(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
  })
}

function _formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
    minimumFractionDigits: 2,
  }).format(value)
}

function _formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `PHP ${(value / 1_000_000).toFixed(1)}M`
  }
  if (Math.abs(value) >= 1_000) {
    return `PHP ${(value / 1_000).toFixed(0)}k`
  }
  return _formatCurrency(value)
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
    --sans:  'Plus Jakarta Sans', system-ui, sans-serif;
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
    }
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .rep-root {
    font-family: var(--sans);
    max-width: 800px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 2rem;
  }

  .rep-header { padding-top: 0.25rem; }

  .rep-title {
    font-family: var(--serif);
    font-size: 26px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.4px;
    margin-bottom: 4px;
  }

  .rep-subtitle {
    font-size: 13px;
    color: var(--text-3);
  }

  .rep-card {
    background: var(--bg-card);
    border: 0.5px solid var(--border-md);
    border-radius: var(--radius-lg);
    padding: 1.5rem;
  }

  .rep-section-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text-3);
    margin-bottom: 0.75rem;
  }

  .rep-range-wrap {
    display: flex;
    gap: 6px;
    background: var(--bg-surface);
    border: 0.5px solid var(--border-md);
    border-radius: 24px;
    padding: 4px;
  }

  .rep-range-btn {
    flex: 1;
    height: 36px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 20px;
    font-family: var(--sans);
    font-size: 13px;
    font-weight: 500;
    color: var(--text-3);
    cursor: pointer;
    transition: all 0.15s;
  }

  .rep-range-btn.active {
    background: var(--bg-card);
    color: var(--text-1);
    box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  }

  .rep-range-btn:hover:not(.active) { color: var(--text-1); }

  .rep-nw-hero { margin-bottom: 1.25rem; }

  .rep-nw-value {
    font-family: var(--serif);
    font-size: 40px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.8px;
    line-height: 1;
    margin-bottom: 8px;
  }

  .rep-nw-change {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
    font-weight: 500;
    flex-wrap: wrap;
  }

  .rep-nw-change.up { color: var(--success); }
  .rep-nw-change.down { color: var(--error); }
  .rep-nw-change.flat { color: var(--text-3); }

  .rep-nw-arrow { font-size: 12px; text-transform: uppercase; }

  .rep-nw-range-label {
    font-size: 12px;
    font-weight: 400;
    color: var(--text-3);
    margin-left: 2px;
  }

  .rep-chart-wrap { margin: 0 -0.5rem; }

  .rep-chart-empty {
    height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    font-size: 13px;
    color: var(--text-3);
  }

  .rep-chart-note {
    font-size: 11px;
    color: var(--text-3);
    margin-top: 0.75rem;
    text-align: center;
  }

  .rep-fund-intro {
    font-size: 13px;
    color: var(--text-3);
    margin-bottom: 1rem;
  }

  .rep-fund-list {
    display: flex;
    flex-direction: column;
  }

  .rep-fund-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px 0;
    border-bottom: 0.5px solid var(--border);
    gap: 1rem;
  }

  .rep-fund-row:last-child { border-bottom: none; }

  .rep-fund-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .rep-fund-icon {
    font-size: 16px;
    width: 30px;
    text-align: center;
    flex-shrink: 0;
  }

  .rep-fund-name {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
  }

  .rep-fund-target {
    font-size: 11px;
    color: var(--text-3);
    margin-top: 1px;
  }

  .rep-fund-right {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 5px;
    flex-shrink: 0;
  }

  .rep-fund-balance {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1);
  }

  .rep-fund-bar-wrap {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .rep-fund-track {
    width: 80px;
    height: 4px;
    background: var(--bg-surface);
    border-radius: 2px;
    overflow: hidden;
  }

  .rep-fund-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  .rep-fund-pct {
    font-size: 11px;
    color: var(--text-3);
    min-width: 28px;
    text-align: right;
  }

  .rep-fund-total {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-top: 0.75rem;
    margin-top: 0.5rem;
    border-top: 0.5px solid var(--border-md);
    font-size: 13px;
    font-weight: 600;
    color: var(--text-1);
  }

  .rep-fund-total-value {
    font-family: var(--serif);
    font-size: 20px;
    font-weight: 500;
    letter-spacing: -0.2px;
  }

  .rep-summaries-sub {
    font-size: 12px;
    color: var(--text-3);
    margin-bottom: 1rem;
  }

  .rep-summaries-list {
    display: flex;
    flex-direction: column;
  }

  .rep-accordion {
    border-bottom: 0.5px solid var(--border);
  }

  .rep-accordion:last-child { border-bottom: none; }

  .rep-accordion-header {
    width: 100%;
    background: none;
    border: none;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1rem 0;
    gap: 1rem;
    text-align: left;
  }

  .rep-accordion-header:hover { opacity: 0.8; }

  .rep-accordion-left {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .rep-accordion-month {
    font-family: var(--serif);
    font-size: 17px;
    font-style: italic;
    font-weight: 400;
    color: var(--text-1);
    letter-spacing: -0.2px;
  }

  .rep-accordion-income {
    font-size: 12px;
    color: var(--text-3);
  }

  .rep-accordion-right {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .rep-accordion-change {
    font-size: 14px;
    font-weight: 500;
  }

  .rep-accordion-change.up { color: var(--success); }
  .rep-accordion-change.down { color: var(--error); }
  .rep-accordion-change.flat { color: var(--text-3); }

  .rep-accordion-chevron {
    font-size: 16px;
    color: var(--text-3);
    transition: transform 0.2s;
    display: inline-block;
  }

  .rep-accordion-chevron.open { transform: rotate(180deg); }

  .rep-accordion-body {
    padding-bottom: 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .rep-stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .rep-stat-item {
    background: var(--bg-surface);
    border-radius: var(--radius-md);
    padding: 0.875rem;
  }

  .rep-stat-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-3);
    margin-bottom: 4px;
  }

  .rep-stat-value {
    font-family: var(--serif);
    font-size: 18px;
    font-weight: 500;
    color: var(--text-1);
    letter-spacing: -0.2px;
    margin-bottom: 3px;
  }

  .rep-stat-sub { font-size: 11px; color: var(--text-3); }
  .rep-stat-sub.up { color: var(--success); font-weight: 500; }
  .rep-stat-sub.down { color: var(--error); font-weight: 500; }

  .rep-spending-breakdown {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .rep-spending-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .rep-spending-label {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-2);
    min-width: 44px;
  }

  .rep-spending-track {
    flex: 1;
    height: 6px;
    background: var(--bg-surface);
    border-radius: 3px;
    overflow: hidden;
  }

  .rep-spending-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.4s ease;
  }

  .rep-spending-value {
    font-size: 12px;
    font-weight: 500;
    color: var(--text-1);
    min-width: 80px;
    text-align: right;
    white-space: nowrap;
  }

  .rep-spending-pct {
    font-size: 11px;
    color: var(--text-3);
    min-width: 32px;
    text-align: right;
  }

  .rep-nw-comparison {
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--bg-surface);
    border-radius: var(--radius-sm);
    padding: 0.875rem;
  }

  .rep-nw-comp-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
  }

  .rep-nw-comp-label { color: var(--text-2); }

  .rep-nw-comp-value {
    font-weight: 500;
    color: var(--text-1);
  }

  .rep-nw-comp-value.up { color: var(--success); }
  .rep-nw-comp-value.down { color: var(--error); }

  .rep-empty {
    text-align: center;
    padding: 2.5rem 1.5rem;
  }

  .rep-empty-title {
    font-size: 16px;
    font-weight: 500;
    color: var(--text-1);
    margin-bottom: 6px;
  }

  .rep-empty-sub {
    font-size: 13px;
    color: var(--text-3);
    line-height: 1.5;
  }

  @keyframes rep-shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .rep-skeleton-block {
    border-radius: var(--radius-sm);
    background: linear-gradient(
      90deg,
      var(--bg-surface) 25%,
      var(--border-md) 50%,
      var(--bg-surface) 75%
    );
    background-size: 200% 100%;
    animation: rep-shimmer 1.5s ease-in-out infinite;
  }

  @media (max-width: 480px) {
    .rep-stats-grid { grid-template-columns: 1fr; }
    .rep-nw-value { font-size: 32px; }
    .rep-spending-value {
      min-width: 65px;
      font-size: 11px;
    }
    .rep-fund-row {
      align-items: flex-start;
    }
    .rep-fund-track {
      width: 64px;
    }
  }
`
