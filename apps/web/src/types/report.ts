// Types for reports and analytics

export interface MonthSummary {
  id: number;
  profile: number;
  month: string; // YYYY-MM
  total_income: string;
  total_expenses: string;
  total_saved: string;
  remaining_carried_over: string;
  created_at: string;
}

export interface ReportData {
  income_vs_expenses: {
    month: string;
    income: number;
    expenses: number;
  }[];
  savings_trend: {
    month: string;
    savings: number;
    cumulative: number;
  }[];
  net_worth_history: {
    month: string;
    net_worth: number;
  }[];
  summary: {
    total_income: string;
    total_expenses: string;
    total_savings: string;
    average_monthly_income: string;
    average_monthly_expenses: string;
    savings_rate: string;
  };
}
