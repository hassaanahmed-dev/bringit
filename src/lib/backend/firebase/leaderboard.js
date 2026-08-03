import {
  collection,
  query,
  where,
  orderBy,
  limit as limitQuery,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { mapLeaderboard } from './util';

const lbRef = db ? collection(db, 'leaderboard') : null;

function topQuery(role, lim) {
  return query(lbRef, where('role', '==', role), orderBy('count', 'desc'), limitQuery(lim));
}

export async function getLeaderboard({ role = 'customer', limit = 10 } = {}) {
  if (!lbRef) return [];
  const snap = await getDocs(topQuery(role, limit));
  return snap.docs.map(mapLeaderboard);
}

// Fetch every row for a role (docs are tiny: uid, name, count, ratings) so the
// page can compute an exact campus-wide total and the viewer's global rank
// without an artificial cap.
export async function getAllLeaderboard({ role = 'customer' } = {}) {
  if (!lbRef) return [];
  const q = query(lbRef, where('role', '==', role));
  const snap = await getDocs(q);
  return snap.docs.map(mapLeaderboard);
}

export function listenLeaderboard({ role = 'customer', limit = 10 } = {}, cb) {
  if (!lbRef) {
    cb([]);
    return () => {};
  }
  return onSnapshot(topQuery(role, limit), (snap) => cb(snap.docs.map(mapLeaderboard)));
}
