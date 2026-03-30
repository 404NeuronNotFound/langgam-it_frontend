// Types for investments and assets

export interface Investment {
  id: number;
  profile: number;
  name: string;
  type: "stocks" | "crypto" | "real_estate" | "bonds" | "mutual_funds" | "other";
  purchase_price: string;
  current_value: string;
  quantity: string;
  purchase_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvestmentCreate {
  name: string;
  type: "stocks" | "crypto" | "real_estate" | "bonds" | "mutual_funds" | "other";
  purchase_price: number;
  current_value: number;
  quantity: number;
  purchase_date?: string;
  notes?: string;
}

export interface InvestmentUpdate {
  current_value: number;
  notes?: string;
}

export interface InvestmentSummary {
  total_invested: string;
  current_value: string;
  profit_loss: string;
  profit_loss_percentage: string;
  by_type: {
    [key: string]: {
      invested: string;
      current: string;
      pl: string;
    };
  };
}
