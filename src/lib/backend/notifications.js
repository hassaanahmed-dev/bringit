import { readDb, writeDb, uid, on } from './store';

function notificationsFor(uid) {
  const db = readDb();
  const map = db.notifications || {};
  const list = map[uid] || [];
  return [...list].sort((a, b) => b.createdAt - a.createdAt);
}

export async function notify(targetUid, { type, title, body, orderId = null }) {
  if (!targetUid) return;
  const db = readDb();
  const map = db.notifications || {};
  const list = map[targetUid] || [];
  list.push({
    id: uid(),
    type,
    title,
    body,
    orderId,
    read: false,
    createdAt: Date.now(),
  });
  if (list.length > 100) list.splice(0, list.length - 100);
  map[targetUid] = list;
  db.notifications = map;
  writeDb(db);
}

export function listenNotifications(uid, cb) {
  cb(notificationsFor(uid));
  return on('dbchange', () => cb(notificationsFor(uid)));
}

export async function getNotifications(uid) {
  return notificationsFor(uid);
}

export async function unreadCount(uid) {
  return notificationsFor(uid).filter((n) => !n.read).length;
}

export async function markRead(uid, id) {
  const db = readDb();
  const list = (db.notifications || {})[uid] || [];
  const target = list.find((n) => n.id === id);
  if (target) target.read = true;
  db.notifications = { ...(db.notifications || {}), [uid]: list };
  writeDb(db);
}

export async function markAllRead(uid) {
  const db = readDb();
  const list = (db.notifications || {})[uid] || [];
  list.forEach((n) => { n.read = true; });
  db.notifications = { ...(db.notifications || {}), [uid]: list };
  writeDb(db);
}

export async function clearNotifications(uid) {
  const db = readDb();
  db.notifications = { ...(db.notifications || {}), [uid]: [] };
  writeDb(db);
}
