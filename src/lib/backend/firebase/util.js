import { getRank } from '../../rank';
import { ORDER_EXPIRY_MS } from '../../constants';

export function toMs(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts === 'number') return ts;
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

export function mapOrder(doc) {
  const data = doc.data();
  const createdAt = toMs(data.createdAt);
  // Base expiry on the SERVER timestamp so every device (customer, rider, feed)
  // shows the same countdown regardless of local clock skew. The stored
  // expiresAt field is only used as a fallback for legacy docs.
  const storedExpiry = toMs(data.expiresAt);
  return {
    ...data,
    id: doc.id,
    createdAt,
    updatedAt: toMs(data.updatedAt),
    expiresAt: createdAt ? createdAt + ORDER_EXPIRY_MS : storedExpiry,
  };
}

export function mapMessage(doc) {
  const data = doc.data();
  return { ...data, id: doc.id, createdAt: toMs(data.createdAt) };
}

export function mapNotification(doc) {
  const data = doc.data();
  return { ...data, id: doc.id, createdAt: toMs(data.createdAt) };
}

export function mapLeaderboard(doc) {
  const data = doc.data();
  return {
    uid: data.uid,
    name: data.name || '',
    count: data.count || 0,
    rank: getRank(data.count || 0),
    riderRatingAvg: data.riderRatingAvg || 0,
    riderRatingCount: data.riderRatingCount || 0,
  };
}
