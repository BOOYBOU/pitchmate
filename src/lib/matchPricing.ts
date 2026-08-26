/**
 * PitchMate Unified Match Pricing & Cost Split Utility
 * Handles consistent parsing, splitting, formatting, and balance tracking
 * across match creation, match details, payment tracking, and admin tables.
 */

export interface MatchPricingBreakdown {
  totalPitchCost: number;
  pricePerPlayer: number;
  rosterCount: number;
  paidCount: number;
  unpaidCount: number;
  totalCollected: number;
  remainingBalance: number;
  collectionPercentage: number;
  isFreeMatch: boolean;
}

/**
 * Parse any price or fee safely, allowing 0 (free matches) and micro-amounts.
 */
export function parsePrice(val: number | string | null | undefined, fallback = 0): number {
  if (val === null || val === undefined || val === '') {
    return fallback;
  }
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : Math.max(0, parsed);
}

/**
 * Calculate the exact financial breakdown of a match.
 */
export function calculateMatchPricing(
  totalPitchCostVal: number | string | null | undefined,
  pricePerPlayerVal: number | string | null | undefined,
  maxPlayers: number = 14,
  rosterCount: number = 0,
  paidPlayerIds: string[] = [],
  rosterPlayerIds: string[] = []
): MatchPricingBreakdown {
  const parsedPlayerPrice = parsePrice(pricePerPlayerVal, 50);
  const parsedTotalCost = totalPitchCostVal !== undefined && totalPitchCostVal !== null && totalPitchCostVal !== ''
    ? parsePrice(totalPitchCostVal, parsedPlayerPrice * (maxPlayers || 14))
    : parsedPlayerPrice * (maxPlayers || 14);

  const activeRosterCount = Math.max(0, rosterCount);
  
  // Count verified paid players who are currently in the roster
  const validPaidCount = paidPlayerIds.filter((id) =>
    rosterPlayerIds.length > 0 ? rosterPlayerIds.includes(id) : true
  ).length;

  const unpaidCount = Math.max(0, activeRosterCount - validPaidCount);
  const totalCollected = validPaidCount * parsedPlayerPrice;
  const remainingBalance = Math.max(0, parsedTotalCost - totalCollected);
  const collectionPercentage = parsedTotalCost > 0
    ? Math.min(100, Math.round((totalCollected / parsedTotalCost) * 100))
    : (validPaidCount > 0 ? 100 : 0);

  return {
    totalPitchCost: parsedTotalCost,
    pricePerPlayer: parsedPlayerPrice,
    rosterCount: activeRosterCount,
    paidCount: validPaidCount,
    unpaidCount,
    totalCollected,
    remainingBalance,
    collectionPercentage,
    isFreeMatch: parsedPlayerPrice === 0 && parsedTotalCost === 0,
  };
}

/**
 * Calculate per-player fee from total pitch booking cost and target roster capacity.
 */
export function derivePlayerPriceFromTotal(totalCost: number, maxCapacity: number): number {
  if (!maxCapacity || maxCapacity <= 0) return 0;
  return parseFloat((totalCost / maxCapacity).toFixed(2));
}

/**
 * Calculate total pitch cost from per-player fee and target roster capacity.
 */
export function deriveTotalFromPlayerPrice(pricePerPlayer: number, maxCapacity: number): number {
  if (!maxCapacity || maxCapacity <= 0) return 0;
  return parseFloat((pricePerPlayer * maxCapacity).toFixed(2));
}
