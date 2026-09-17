// Central loyalty rules. ALL points/tier logic lives here (single source of truth).

// Earning: 1 point per ₹10 spent (rounded down).
const POINTS_PER_RUPEE = 1 / 10;

// Redemption: 100 points = ₹10 off.
const POINTS_PER_REDEEM_UNIT = 100;
const RUPEES_PER_REDEEM_UNIT = 10;

// Tier thresholds based on LIFETIME points.
function tierForPoints(lifetimePoints) {
  if (lifetimePoints >= 2000) return "Gold";
  if (lifetimePoints >= 500) return "Silver";
  return "Bronze";
}

function pointsForPurchase(amount) {
  return Math.floor(amount * POINTS_PER_RUPEE);
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
