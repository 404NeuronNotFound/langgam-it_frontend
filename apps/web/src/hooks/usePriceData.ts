// hooks/usePriceData.ts
// Hook for fetching real-time price data

import { useState, useCallback } from "react";
import { getInvestmentPrice, type PriceData } from "@/api/priceData";

interface UsePriceDataState {
  price: PriceData | null;
  isLoading: boolean;
  error: string | null;
}

export function usePriceData() {
  const [state, setState] = useState<UsePriceDataState>({
    price: null,
    isLoading: false,
    error: null,
  });

  const fetchPrice = useCallback(async (symbol: string, type: string) => {
    setState({ price: null, isLoading: true, error: null });
    try {
      const priceData = await getInvestmentPrice(symbol, type);
      if (priceData) {
        setState({ price: priceData, isLoading: false, error: null });
      } else {
        setState({
          price: null,
          isLoading: false,
          error: `Price data not available for ${symbol}`,
        });
      }
    } catch (err: any) {
      setState({
        price: null,
        isLoading: false,
        error: err.message || "Failed to fetch price",
      });
    }
  }, []);

  return {
    ...state,
    fetchPrice,
  };
}
