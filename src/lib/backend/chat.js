import { readDb, writeDb, uid, on } from './store';
import { getOrder } from './orders';

function messagesFor(orderId) {
  const db = readDb();
  const map = db.messages || {};
  return (map[orderId] || []).sort((a, b) => a.createdAt - b.createdAt);
}

export async function canAccessThread(orderId, uid) {
  const order = await getOrder(orderId);
  if (!order) return false;
  return order.customerId === uid || order.riderId === uid;
}

export async function sendMessage(orderId, sender, text) {
  const clean = String(text || '').trim();
  if (!clean || !(await canAccessThread(orderId, sender.uid))) return { ok: false };
  const db = readDb();
  const map = db.messages || {};
  const list = map[orderId] || [];
  list.push({
    id: uid(),
    orderId,
    senderId: sender.uid,
    senderName: sender.name,
    text: clean,
    createdAt: Date.now(),
  });
  map[orderId] = list;
  db.messages = map;
  writeDb(db);
  return { ok: true };
}

export function listenMessages(orderId, cb, onError) {
  cb(messagesFor(orderId));
  return on('dbchange', () => cb(messagesFor(orderId)));
}

export async function getMessages(orderId) {
  return messagesFor(orderId);
}
