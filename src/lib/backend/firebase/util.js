import { getRank } from '../../rank';

export function toMs(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts === 'number') return ts;
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

export function mapOrder(doc) {
  const data = doc.data();
  return {
    ...data,
    id: doc.id,
    createdAt: toMs(data.createdAt),
    updatedAt: toMs(data.updatedAt),
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
