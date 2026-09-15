// Pure loyalty-math helpers, kept separate from React so they're directly
// testable. The actual earned_rewards/redeemed_rewards values are computed
// server-side (netlify/functions/admin-mutate.js and stripe-webhook.js,
// which can't import this ES module — same CJS/ESM split as pricing.js) —
// this is the client's read-side math for displaying progress, plus the
// formula both server copies are expected to match.
export function earnedRewards(totalShirts, shirtsPerReward = 10) {
  return Math.floor((totalShirts || 0) / shirtsPerReward);
}

export function availableRewards(customer, shirtsPerReward = 10) {
  const earned = customer ? earnedRewards(customer.total_shirts, shirtsPerReward) : 0;
  const redeemed = (customer && customer.redeemed_rewards) || 0;
  return Math.max(0, earned - redeemed);
}

export function shirtsUntilNextReward(totalShirts, shirtsPerReward = 10) {
  const rem = (totalShirts || 0) % shirtsPerReward;
  return rem === 0 ? shirtsPerReward : shirtsPerReward - rem;
}
