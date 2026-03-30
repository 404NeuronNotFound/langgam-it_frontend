// Types for reports and analytics

export interface MonthlyReport {
  month: string; // YYYY-MM
  income: string;
  expenses: string;
  savings: string;
  net_worth: string;
}

export interface IncomeVsExpenses {
  month: string;
  income: number;
  expenses: number;
}

export interface SavingsTrend {
  month: string;
  savings: number;
  cumulative: number;
}

export interface NetWorthHistory {
  month: string;
  net_worth: number;
}

export interface CategoryBreakdown {
  category: string;
  amount: number;
  percentage: number;
}

export interface ReportSummary {
  total_income: string;
  total_expenses: string;
  total_savings: string;
  average_monthly_income: string;
  average_monthly_expenses: string;
  savings_rate: string;
  income_vs_expenses: IncomeVsExpenses[];
  savings_trend: SavingsTrend[];
  net_worth_history: NetWorthHistory[];
  expense_breakdown: CategoryBreakdown[];
}
