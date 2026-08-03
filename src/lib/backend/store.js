const DB_KEY = 'bringit.own.db.v1';
const SESSION_KEY = 'bringit.own.session.v1';
const PENDING_KEY = 'bringit.own.pending.v1';

const bus = new Map();

// Last DB snapshot we told listeners about. Used to dedupe the several
// cross-tab paths below so a change only ever produces one `dbchange`.
let lastDbJson = null;

function emit(event, payload) {
  (bus.get(event) || []).forEach((cb) => {
    try {
      cb(payload);
    } catch (e) {
      console.error('[store] listener error', e);
    }
  });
}

export function on(event, cb) {
  if (!bus.has(event)) bus.set(event, []);
  bus.get(event).push(cb);
  return () => {
    const arr = bus.get(event) || [];
    const i = arr.indexOf(cb);
    if (i >= 0) arr.splice(i, 1);
  };
}

export function readDb() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    const db = raw ? JSON.parse(raw) : { users: {}, orders: {} };
    return db;
  } catch {
    return { users: {}, orders: {} };
  }
}

export function writeDb(db) {
  lastDbJson = JSON.stringify(db);
  localStorage.setItem(DB_KEY, lastDbJson);
  emit('dbchange', db);
  broadcast({ key: DB_KEY });
}

// --- Cross-tab sync ---------------------------------------------------------
// Sessions live in sessionStorage (per-tab), so the only thing we push across
// tabs is the shared database. We use every reliable channel: BroadcastChannel
// (instant, preferred), the `storage` event (standard fallback), and a recheck
// when the tab regains focus (covers events missed while backgrounded).

function emitDbIfChanged() {
  const cur = JSON.stringify(readDb());
  if (cur === lastDbJson) return;
  lastDbJson = cur;
  emit('dbchange', readDb());
}

let channel = null;

function broadcast(msg) {
  if (!channel) return;
  try {
    channel.postMessage(msg);
  } catch (e) {
    console.error('[store] broadcast failed', e);
  }
}

function setupCrossTabSync() {
  if (typeof window === 'undefined') return;

  window.addEventListener('storage', (e) => {
    if (e.key === DB_KEY) emitDbIfChanged();
  });

  if (typeof BroadcastChannel !== 'undefined') {
    try {
      channel = new BroadcastChannel(DB_KEY);
      channel.onmessage = (msg) => {
        if (msg && msg.data && msg.data.key === DB_KEY) emitDbIfChanged();
      };
    } catch (e) {
      channel = null;
    }
  }

  const recheck = () => emitDbIfChanged();
  window.addEventListener('focus', recheck);
  window.addEventListener('visibilitychange', () => {
    if (typeof document !== 'undefined' && document.visibilityState === 'visible') recheck();
  });
}

setupCrossTabSync();
lastDbJson = JSON.stringify(readDb());

export const uid = () =>
  Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

export function readSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export function writeSession(session) {
  if (session === null) sessionStorage.removeItem(SESSION_KEY);
  else sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  emit('session', session);
}

export function onSession(cb) {
  return on('session', cb);
}

export function readPending() {
  try {
    return JSON.parse(localStorage.getItem(PENDING_KEY)) || {};
  } catch {
    return {};
  }
}

export function writePending(pending) {
  localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
}
