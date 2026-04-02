// api/priceData.ts
// Fetch real-time price data from external APIs

// CoinGecko API - Free, no key required
const COINGECKO_API = "https://api.coingecko.com/api/v3";

// Mapping of common symbols to CoinGecko IDs
const CRYPTO_SYMBOLS: { [key: string]: string } = {
  BTC: "bitcoin",
  BITCOIN: "bitcoin",
  ETH: "ethereum",
  ETHEREUM: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  SOL: "solana",
  DOGE: "dogecoin",
  SHIB: "shiba-inu",
};

const STOCK_SYMBOLS: { [key: string]: string } = {
  AAPL: "Apple",
  MSFT: "Microsoft",
  GOOGL: "Alphabet",
  AMZN: "Amazon",
  TSLA: "Tesla",
  META: "Meta",
  NVDA: "NVIDIA",
  JPM: "JPMorgan",
};

const COMMODITY_SYMBOLS: { [key: string]: string } = {
  GOLD: "gold",
  SILVER: "silver",
  OIL: "oil",
  CRUDE: "crude-oil",
};

export interface PriceData {
  symbol: string;
  name: string;
  currentPrice: number;
  currency: string;
  timestamp: number;
  change24h?: number;
  changePercent24h?: number;
}

// Get crypto price from CoinGecko
export async function getCryptoPrice(symbol: string): Promise<PriceData | null> {
  try {
    const coinId = CRYPTO_SYMBOLS[symbol.toUpperCase()];
    if (!coinId) {
      console.warn(`Crypto symbol ${symbol} not found`);
      return null;
    }

    const response = await fetch(
      `${COINGECKO_API}/simple/price?ids=${coinId}&vs_currencies=php&include_24hr_change=true`
    );

    if (!response.ok) throw new Error("Failed to fetch crypto price");

    const data = await response.json();
    const priceData = data[coinId];

    if (!priceData || !priceData.php) {
      return null;
    }

    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      currentPrice: priceData.php,
      currency: "PHP",
      timestamp: Date.now(),
      change24h: priceData.php_24h_change,
      changePercent24h: priceData.php_24h_change,
    };
  } catch (error) {
    console.error(`Error fetching crypto price for ${symbol}:`, error);
    return null;
  }
}

// Get stock price (mock for now - requires API key)
// In production, use Alpha Vantage, IEX Cloud, or similar
export async function getStockPrice(symbol: string): Promise<PriceData | null> {
  try {
    // For now, return null - requires paid API or backend integration
    // In production, you would call your backend which has the API key
    console.warn(`Stock price fetching requires backend integration for ${symbol}`);
    return null;
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error);
    return null;
  }
}

// Get commodity price (mock for now)
export async function getCommodityPrice(symbol: string): Promise<PriceData | null> {
  try {
    // For now, return null - requires paid API or backend integration
    console.warn(`Commodity price fetching requires backend integration for ${symbol}`);
    return null;
  } catch (error) {
    console.error(`Error fetching commodity price for ${symbol}:`, error);
    return null;
  }
}

// Get price for any investment (auto-detect type)
export async function getInvestmentPrice(symbol: string, type: string): Promise<PriceData | null> {
  const upperSymbol = symbol.toUpperCase();

  if (type === "crypto" || CRYPTO_SYMBOLS[upperSymbol]) {
    return getCryptoPrice(symbol);
  } else if (type === "stocks" || STOCK_SYMBOLS[upperSymbol]) {
    return getStockPrice(symbol);
  } else if (type === "commodities" || COMMODITY_SYMBOLS[upperSymbol]) {
    return getCommodityPrice(symbol);
  }

  return null;
}

// Get multiple prices at once
export async function getMultiplePrices(
  investments: Array<{ symbol: string; type: string }>
): Promise<PriceData[]> {
  const prices = await Promise.all(
    investments.map((inv) => getInvestmentPrice(inv.symbol, inv.type))
  );
  return prices.filter((p) => p !== null) as PriceData[];
}
