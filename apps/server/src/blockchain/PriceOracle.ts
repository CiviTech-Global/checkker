import { parseEther } from "ethers";

let cachedPrice: { bnbUsd: number; fetchedAt: number } | null = null;
const CACHE_TTL_MS = 60_000; // 60 seconds

/**
 * Fetches the current BNB/USD price from CoinGecko.
 * Caches the result for 60 seconds.
 */
export async function getBnbUsdPrice(): Promise<number> {
  if (cachedPrice && Date.now() - cachedPrice.fetchedAt < CACHE_TTL_MS) {
    return cachedPrice.bnbUsd;
  }

  try {
    const res = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd"
    );
    const data: any = await res.json();
    const price = data?.binancecoin?.usd;

    if (typeof price === "number" && price > 0) {
      cachedPrice = { bnbUsd: price, fetchedAt: Date.now() };
      return price;
    }
  } catch (err) {
    console.error("[PriceOracle] Failed to fetch BNB price:", err);
  }

  // Fallback: use cached price if available, or a default
  if (cachedPrice) return cachedPrice.bnbUsd;
  return 300; // Fallback default ~$300/BNB
}

/**
 * Convert a USD amount to wei (BNB smallest unit).
 * @param usdAmount Amount in USD (e.g., 10 for $10)
 * @returns Amount in wei as a bigint-compatible string
 */
export async function usdToWei(usdAmount: number): Promise<string> {
  const bnbPrice = await getBnbUsdPrice();
  const bnbAmount = usdAmount / bnbPrice;
  // Round to 6 decimal places to avoid precision issues
  const rounded = Math.round(bnbAmount * 1e6) / 1e6;
  return parseEther(rounded.toString()).toString();
}
