// Central loyalty rules. ALL points/tier logic lives here (single source of truth).

// Base earning rate and tier-specific rates, applied before rounding down.
const POINTS_PER_RUPEE = 1 / 10;
const TIER_POINTS_PER_RUPEE = {
  Bronze: POINTS_PER_RUPEE,
  Silver: 1.5 / 10,
  Gold: 2 / 10,
  Platinum: 0.3,
};

// Redemption: 100 points = ₹10 off.
const POINTS_PER_REDEEM_UNIT = 100;
const RUPEES_PER_REDEEM_UNIT = 10;

// Tier thresholds based on LIFETIME points.
function tierForPoints(lifetimePoints) {
  if (lifetimePoints >= 5000) return "Platinum";
  if (lifetimePoints >= 2000) return "Gold";
  if (lifetimePoints >= 500) return "Silver";
  return "Bronze";
}

function pointsForPurchase(amount, tier) {
  return Math.floor(amount * TIER_POINTS_PER_RUPEE[tier]);
}

// Convert a points redemption into rupees discount. Returns null if invalid.
function redeemValue(points) {
  if (points <= 0 || points % POINTS_PER_REDEEM_UNIT !== 0) return null;
  return (points / POINTS_PER_REDEEM_UNIT) * RUPEES_PER_REDEEM_UNIT;
}

module.exports = {
  POINTS_PER_RUPEE,
  POINTS_PER_REDEEM_UNIT,
  RUPEES_PER_REDEEM_UNIT,
  tierForPoints,
  pointsForPurchase,
  redeemValue,
};
