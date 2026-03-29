// Types for expenses and alerts

export interface Expense {
  id: number;
  cycle: number;
  amount: string;
  category: "needs" | "wants";
  date: string;
  description: string;
  created_at: string;
}

export interface ExpenseCreate {
  amount: number;
  category: "needs" | "wants";
  date?: string; // Optional, defaults to today
  description?: string;
}

export interface DailyLimit {
  daily_limit: string;
  remaining_days: number;
  remaining_budget: string;
  today_spent: string;
  remaining_today: string;
}

export interface Alert {
  id: number;
  user: number;
  message: string;
  severity: "info" | "warning" | "error";
  is_read: boolean;
  created_at: string;
}
