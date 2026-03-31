// Types for investments and assets

export interface Investment {
  id: number;
  profile: number;
  name: string;
  type: "stocks" | "crypto" | "real_estate" | "bonds" | "mutual_funds" | "other";
  total_invested: string;
  current_value: string;
  profit_loss: string; // Computed field from backend
  created_at: string;
  updated_at: string;
}

export interface InvestmentCreate {
  name: string;
  type: "stocks" | "crypto" | "real_estate" | "bonds" | "mutual_funds" | "other";
  total_invested: number;
  current_value: number;
}

export interface InvestmentUpdate {
  name?: string;
  type?: "stocks" | "crypto" | "real_estate" | "bonds" | "mutual_funds" | "other";
  total_invested?: number;
  current_value?: number;
}
