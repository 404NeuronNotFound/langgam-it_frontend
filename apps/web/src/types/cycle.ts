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
