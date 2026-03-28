// Types for monthly cycle and allocation system

export interface MonthCycle {
  id: number;
  profile: number;
  month: string; // YYYY-MM format
  income: string;
  expenses_budget: string;
  wants_budget: string;
  remaining_budget: string;
  status: "active" | "closed";
  created_at: string;
  updated_at: string;
}

export interface AllocationLog {
  id: number;
  cycle: number;
  from_bucket: string;
  to_bucket: string;
  amount: string;
  timestamp: string;
}

export interface IncomeSubmission {
  amount: number;
}

export interface InvestmentSubmission {
  amount: number;
}

export interface AllocationResult {
  cycle: MonthCycle;
  logs: AllocationLog[];
  survival_mode: boolean;
}

// Expense types
export interface Expense {
  id: number;
  cycle: number;
  amount: string;
  category: "needs" | "wants";
  date: string;
  description: string;
  created_at: string;
}

export interface ExpenseSubmission {
  amount: number;
  category: "needs" | "wants";
  date?: string; // Optional, defaults to today
  description?: string;
}

export interface DailyLimit {
  daily_limit: string;
  remaining_days: number;
  remaining_budget: string;
}
