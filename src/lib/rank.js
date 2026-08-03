import { TIERS } from './constants';

export function getRank(orderCount) {
  let tier = TIERS[0];
  for (const t of TIERS) {
    if (orderCount >= t.min) tier = t;
  }
  return tier;
}

export function formatMoney(n) {
  return `Rs ${n.toLocaleString()}`;
}

export function formatTime(ts) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
