// Financial types for net worth tracking

export interface FinancialProfile {
  id: number;
  user: number;
  currency: string;
  emergency_fund: string;
  savings: string;
  rigs_fund: string;
  cash_on_hand: string;
  investments_total: string;
  created_at: string;
  updated_at: string;
}

export interface NetWorthSnapshot {
  id: number;
  profile: number;
  net_worth: string;
  snapshot_date: string;
  created_at: string;
}

export interface FinancialProfileUpdate {
  currency?: string;
  emergency_fund?: number;
  savings?: number;
  rigs_fund?: number;
  cash_on_hand?: number;
  investments_total?: number;
}
