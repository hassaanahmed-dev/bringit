import { readDb, on } from './store';
import { getRank } from '../rank';

function leaderboardRows({ role = 'customer', limit = 10 } = {}) {
  const db = readDb();
  const users = Object.values(db.users || {}).filter((u) => u && u.name);
  const key = role === 'rider' ? 'riderOrderCount' : 'customerOrderCount';
  return users
    .map((u) => ({
      uid: u.uid,
      name: u.name,
      email: u.email,
      count: u[key] || 0,
      rank: getRank(u[key] || 0),
      riderRatingAvg: u.riderRatingAvg || 0,
      riderRatingCount: u.riderRatingCount || 0,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export async function getLeaderboard({ role = 'customer', limit = 10 } = {}) {
  return leaderboardRows({ role, limit });
}

export async function getAllLeaderboard({ role = 'customer' } = {}) {
  return leaderboardRows({ role, limit: Infinity });
}

export function listenLeaderboard({ role = 'customer', limit = 10 } = {}, cb) {
  const refresh = () => cb(leaderboardRows({ role, limit }));
  refresh();
  return on('dbchange', refresh);
}
