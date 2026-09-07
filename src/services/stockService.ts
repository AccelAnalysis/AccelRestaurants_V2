
// Simple in-memory cache
const CACHE_DURATION = 60 * 1000; // 1 minute
const cache = new Map<string, { data: StockQuote; timestamp: number }>();

 let warnedMissingFinnhubKey = false;

export interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  percentChange: number;
}

export const StockService = {
  getQuote: async (symbol: string): Promise<StockQuote | null> => {
    const cleanSymbol = symbol.toUpperCase().trim();
    
    // Check cache
    const cached = cache.get(cleanSymbol);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      return cached.data;
    }

    try {
      const apiKey = (import.meta as { env?: Record<string, string | undefined> }).env?.VITE_FINNHUB_API_KEY;
      if (!apiKey) {
        if (!warnedMissingFinnhubKey) {
          console.warn('StockService: Missing VITE_FINNHUB_API_KEY environment variable. Stock quotes are disabled. Configure this in your .env file.');
          warnedMissingFinnhubKey = true;
        }
        return null;
      }

      const response = await fetch(`https://finnhub.io/api/v1/quote?symbol=${cleanSymbol}&token=${apiKey}`);
      
      if (!response.ok) {
        throw new Error(`API Error (${response.status})`);
      }

      const data = await response.json();
      
      // Finnhub API response format: { c: Current price, d: Change, dp: Percent change }
      if (data.c === 0 && data.d === null) return null;

      const quote: StockQuote = {
        symbol: cleanSymbol,
        price: data.c,
        change: data.d,
        percentChange: data.dp
      };

      cache.set(cleanSymbol, { data: quote, timestamp: Date.now() });
      return quote;

    } catch (error) {
      console.warn(`StockService: Failed to fetch ${symbol}`, error);
      return null;
    }
  },

  getQuotes: async (symbols: string[]): Promise<StockQuote[]> => {
    const promises = symbols.map(s => StockService.getQuote(s));
    const results = await Promise.all(promises);
    return results.filter((q): q is StockQuote => q !== null);
  }
};
