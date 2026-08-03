import {
  collection,
  doc,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { getOrder } from './orders';
import { mapMessage } from './util';

const messagesRef = db ? collection(db, 'messages') : null;

function threadQuery(orderId) {
  return query(messagesRef, where('orderId', '==', orderId), orderBy('createdAt', 'asc'));
}

export async function canAccessThread(orderId, uid) {
  const order = await getOrder(orderId);
  if (!order) return false;
  return order.customerId === uid || order.riderId === uid;
}

export async function sendMessage(orderId, sender, text) {
  const clean = String(text || '').trim();
  if (!clean || !messagesRef) return { ok: false };
  if (!(await canAccessThread(orderId, sender.uid))) return { ok: false };
  try {
    await addDoc(messagesRef, {
      orderId,
      senderId: sender.uid,
      senderName: sender.name,
      text: clean,
      createdAt: serverTimestamp(),
    });
    return { ok: true };
  } catch (e) {
    console.warn('[chat] send failed', e);
    return { ok: false };
  }
}

export function listenMessages(orderId, cb) {
  if (!messagesRef) {
    cb([]);
    return () => {};
  }
  return onSnapshot(threadQuery(orderId), (snap) => cb(snap.docs.map(mapMessage)));
}

export async function getMessages(orderId) {
  if (!messagesRef) return [];
  const snap = await getDocs(threadQuery(orderId));
  return snap.docs.map(mapMessage);
}
