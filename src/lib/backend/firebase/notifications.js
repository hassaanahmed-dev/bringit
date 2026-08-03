import {
  collection,
  doc,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { mapNotification } from './util';

const notifRef = db ? collection(db, 'notifications') : null;

function byUser(uid) {
  return query(notifRef, where('targetUid', '==', uid), orderBy('createdAt', 'desc'));
}

export async function notify(targetUid, { type, title, body, orderId = null }) {
  if (!targetUid || !notifRef) return;
  try {
    await addDoc(notifRef, {
      targetUid, type, title, body, orderId, read: false, createdAt: serverTimestamp(),
    });
  } catch (e) {
    console.warn('[notifications] notify failed', e);
  }
}

export function listenNotifications(uid, cb) {
  if (!notifRef) {
    cb([]);
    return () => {};
  }
  return onSnapshot(byUser(uid), (snap) => cb(snap.docs.map(mapNotification)));
}

export async function getNotifications(uid) {
  if (!notifRef) return [];
  const snap = await getDocs(byUser(uid));
  return snap.docs.map(mapNotification);
}

export async function unreadCount(uid) {
  return (await getNotifications(uid)).filter((n) => !n.read).length;
}

export async function markRead(uid, id) {
  if (!notifRef) return;
  await updateDoc(doc(notifRef, id), { read: true });
}

export async function markAllRead(uid) {
  if (!notifRef) return;
  const snap = await getDocs(
    query(notifRef, where('targetUid', '==', uid), where('read', '==', false)),
  );
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.update(d.ref, { read: true }));
  await batch.commit();
}

export async function clearNotifications(uid) {
  if (!notifRef) return;
  const snap = await getDocs(byUser(uid));
  if (snap.empty) return;
  const batch = writeBatch(db);
  snap.docs.forEach((d) => batch.delete(d.ref));
  await batch.commit();
}
