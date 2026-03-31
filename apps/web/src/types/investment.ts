// types/investment.ts

export interface Investment {
  id: number;
  name: string;
  type: "stocks" | "crypto" | "real_estate" | "bonds" | "mutual_funds" | "other";
  total_invested: string;        // decimal string from DRF
  current_value: string;         // decimal string from DRF
  profit_loss: string;           // computed: current_value - total_invested
  profit_loss_percentage: string;// computed: (profit_loss / total_invested) * 100
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