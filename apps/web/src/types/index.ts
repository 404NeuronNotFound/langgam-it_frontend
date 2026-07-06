// ── Auth ──────────────────────────────────────────────────────────────

interface User {
  id: number
  username: string
  first_name: string
  last_name: string
  email: string
  date_joined: string
}

interface AuthTokens {
  access: string
  refresh: string
  user: User
}

interface LoginPayload {
  username: string
  password: string
}

interface RegisterPayload {
  username: string
  first_name: string
  last_name: string
  email: string
  password: string
  confirm_password: string
}

// ── Financial account ─────────────────────────────────────────────────

interface FinancialAccount {
  id: number
  name: string
  created_at: string
}

// ── Fund ──────────────────────────────────────────────────────────────

type FundType = "system_required" | "goal"
type FundStatus = "active" | "completed" | "closed"

interface Fund {
  id: number
  name: string
  type: FundType
  icon: string
  color: string
  current_balance: string
  monthly_allocation: string
  allocation_priority: number
  skip_on_low_income: boolean
  target_amount: string | null
  target_date: string | null
  status: FundStatus
  created_at: string
  monthly_allocation_needed: string | null
  progress_percentage: number | null
}

interface FundCreatePayload {
  name: string
  type?: FundType
  icon?: string
  color?: string
  monthly_allocation?: number
  allocation_priority?: number
  skip_on_low_income?: boolean
  target_amount?: number | null
  target_date?: string | null
}

interface FundUpdatePayload {
  name?: string
  icon?: string
  color?: string
  monthly_allocation?: number
  allocation_priority?: number
  skip_on_low_income?: boolean
  target_amount?: number | null
  target_date?: string | null
}

// ── Monthly budget setup ──────────────────────────────────────────────

interface MonthlyBudgetSetup {
  id: number
  estimated_monthly_income: string
  needs_budget: string
  wants_budget: string
  effective_from: string
  created_at: string
  total_allocated: string
  allocation_warning: string | null
}

interface MonthlyBudgetSetupPayload {
  estimated_monthly_income: number
  needs_budget: number
  wants_budget: number
  effective_from?: string
}

// ── Month cycle ───────────────────────────────────────────────────────

type IncomeScenario = "full" | "low" | "zero" | ""
type CycleStatus = "active" | "closed"

interface MonthCycle {
  id: number
  year: number
  month: number
  income_entered: string
  income_scenario: IncomeScenario
  needs_budget_used: string
  wants_budget_used: string
  needs_spent: string
  wants_spent: string
  remaining_budget: string
  status: CycleStatus
  created_at: string
  needs_remaining: string
  wants_remaining: string
  total_spent: string
}

interface IncomePayload {
  income: number
  year?: number
  month?: number
}

// ── Transfer ──────────────────────────────────────────────────────────

type TransferType =
  | "income_allocation"
  | "fund_to_cash"
  | "cash_to_fund"
  | "fund_to_fund"
  | "external_add"
  | "goal_completed"
  | "survival_draw"
  | "month_end_carry"

interface Transfer {
  id: number
  from_fund_id: number | null
  to_fund_id: number | null
  from_fund_name: string
  to_fund_name: string
  amount: string
  transfer_type: TransferType
  note: string
  date: string
  created_at: string
}

interface TransferCreatePayload {
  from_fund_id?: number | null
  to_fund_id: number
  amount: number
  transfer_type: TransferType
  note?: string
  date?: string
}

interface AddMoneyPayload {
  amount: number
  note: string
  date?: string
}

// ── Expense ───────────────────────────────────────────────────────────

type ExpenseCategory = "needs" | "wants"

interface Expense {
  id: number
  cycle: number
  amount: string
  category: ExpenseCategory
  description: string
  date: string
  created_at: string
}

interface ExpenseCreatePayload {
  amount: number
  category: ExpenseCategory
  description?: string
  date?: string
}

interface DailyLimit {
  daily_limit: string
  remaining_budget: string
  remaining_days: number
  today_spent: string
  remaining_today?: string
}

// ── Alert ─────────────────────────────────────────────────────────────

type AlertType =
  | "overspend"
  | "daily_limit"
  | "hard_stop"
  | "emergency_low"
  | "goal_behind"

interface Alert {
  id: number
  type: AlertType
  type_display: string
  message: string
  is_read: boolean
  created_at: string
}

// ── Net worth snapshot ────────────────────────────────────────────────

interface NetWorthSnapshot {
  id: number
  net_worth: string
  snapshot_data: Record<string, string>
  captured_at: string
}

// ── Month summary ─────────────────────────────────────────────────────

interface MonthSummary {
  id: number
  cycle_id: number
  cycle_year: number
  cycle_month: number
  total_income: string
  total_needs_spent: string
  total_wants_spent: string
  total_allocated_to_funds: string
  net_worth_start: string
  net_worth_end: string
  net_worth_change: string
  created_at: string
}

// ── API response wrappers ─────────────────────────────────────────────

interface AccountProfile {
  net_worth: string
  funds: Fund[]
  active_cycle: MonthCycle | null
}

interface IncomeResponse {
  cycle: MonthCycle
  profile: AccountProfile
  survival_mode: boolean
  survival_prompt?: string
}

interface ExpenseResponse {
  expense: Expense
  cycle: MonthCycle
  profile: AccountProfile
  alerts: Alert[]
}

interface TransferResponse {
  transfer: Transfer
  profile: AccountProfile
}

interface SurvivalDrawResponse {
  message: string
  transfer: Transfer
  profile: AccountProfile
}

interface SetupStatus {
  has_account: boolean
  has_custom_funds: boolean
  has_balances: boolean
  has_budget: boolean
  setup_complete: boolean
  active_cycle?: MonthCycle | null
}

interface AllocationSuggestion {
  estimated_income: string
  suggestion_50_30_20: {
    needs: string
    wants: string
    savings: string
  }
  current: {
    needs: string
    wants: string
    funds_total: string
  }
}

interface APIError {
  detail?: string
  [field: string]: string | string[] | undefined
}

// ── Store state shapes (used by Zustand stores) ───────────────────────

interface AuthState {
  user: User | null
  accessToken: string | null
  refreshToken: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AccountState {
  account: FinancialAccount | null
  isLoading: boolean
  error: string | null
}

interface FundState {
  funds: Fund[]
  isLoading: boolean
  error: string | null
}

interface BudgetState {
  setups: MonthlyBudgetSetup[]
  activeSetup: MonthlyBudgetSetup | null
  isLoading: boolean
  error: string | null
}

interface CycleState {
  activeCycle: MonthCycle | null
  isLoading: boolean
  error: string | null
  survivalMode: boolean
  survivalPrompt: string | null
}

interface TransferState {
  transfers: Transfer[]
  isLoading: boolean
  error: string | null
}

interface ExpenseState {
  expenses: Expense[]
  dailyLimit: DailyLimit | null
  isLoading: boolean
  error: string | null
}

interface AlertState {
  alerts: Alert[]
  unreadCount: number
  isLoading: boolean
  error: string | null
}

interface NetWorthState {
  snapshots: NetWorthSnapshot[]
  currentNetWorth: string
  isLoading: boolean
  error: string | null
}

interface SetupState {
  status: SetupStatus | null
  isLoading: boolean
  error: string | null
}

export type {
  AccountProfile,
  AccountState,
  AddMoneyPayload,
  Alert,
  AlertState,
  AlertType,
  AllocationSuggestion,
  APIError,
  AuthState,
  AuthTokens,
  BudgetState,
  CycleState,
  CycleStatus,
  DailyLimit,
  Expense,
  ExpenseCategory,
  ExpenseCreatePayload,
  ExpenseResponse,
  ExpenseState,
  FinancialAccount,
  Fund,
  FundCreatePayload,
  FundState,
  FundStatus,
  FundType,
  FundUpdatePayload,
  IncomePayload,
  IncomeResponse,
  IncomeScenario,
  LoginPayload,
  MonthCycle,
  MonthlyBudgetSetup,
  MonthlyBudgetSetupPayload,
  MonthSummary,
  NetWorthSnapshot,
  NetWorthState,
  RegisterPayload,
  SetupState,
  SetupStatus,
  SurvivalDrawResponse,
  Transfer,
  TransferCreatePayload,
  TransferResponse,
  TransferState,
  TransferType,
  User,
}
