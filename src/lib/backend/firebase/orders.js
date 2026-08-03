import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { ORDER_STATUS } from '../../constants';
import { getRank } from '../../rank';
import { notify } from './notifications';
import { mapOrder } from './util';

const ordersRef = db ? collection(db, 'orders') : null;
const usersRef = db ? collection(db, 'users') : null;
const leaderboardRef = db ? collection(db, 'leaderboard') : null;

const CONFIG_ERR = { ok: false, error: 'CONFIG', message: 'FIREBASE NOT CONFIGURED' };

function codeError(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

async function safeNotify(targetUid, payload) {
  try {
    await notify(targetUid, payload);
  } catch (e) {
    console.warn('[orders] notify failed', e);
  }
}

export async function createOrder({
  customerId,
  customerName,
  customerPhone,
  customerOrderCount,
  description,
  shops,
  zoneId,
  zoneName,
  deliveryFee,
  deliveryNote,
}) {
  const docRef = await addDoc(ordersRef, {
    customerId,
    customerName,
    customerPhone,
    customerOrderCount: customerOrderCount || 0,
    description: (description || '').trim(),
    deliveryNote: (deliveryNote || '').trim(),
    shops: [...shops],
    zoneId,
    zoneName,
    deliveryFee,
    status: ORDER_STATUS.OPEN,
    riderId: null,
    riderName: null,
    riderPhone: null,
    riderOrderCount: 0,
    rated: false,
    rating: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

export async function getOrder(orderId) {
  const snap = await getDoc(doc(ordersRef, orderId));
  return snap.exists() ? mapOrder(snap) : null;
}

export function listenOrder(orderId, cb, onError) {
  return onSnapshot(
    doc(ordersRef, orderId),
    (snap) => {
      cb(snap.exists() ? mapOrder(snap) : null);
    },
    (err) => {
      console.warn('[orders] listen failed', err?.code);
      onError?.(err);
    },
  );
}

export function listenOpenOrders(cb) {
  const q = query(ordersRef, where('status', '==', ORDER_STATUS.OPEN), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => cb(snap.docs.map(mapOrder)));
}

export async function getCustomerOrders(customerId, { page = 0, pageSize = 20 } = {}) {
  const q = query(
    ordersRef,
    where('customerId', '==', customerId),
    orderBy('createdAt', 'desc'),
    limit((page + 1) * pageSize),
  );
  const snap = await getDocs(q);
  const all = snap.docs.map(mapOrder);
  return {
    orders: all.slice(page * pageSize, (page + 1) * pageSize),
    hasMore: snap.size >= (page + 1) * pageSize,
  };
}

export async function getRiderEarnings(riderId, { page = 0, pageSize = 20 } = {}) {
  const q = query(
    ordersRef,
    where('riderId', '==', riderId),
    where('status', '==', ORDER_STATUS.DELIVERED),
    orderBy('updatedAt', 'desc'),
  );
  const snap = await getDocs(q);
  const all = snap.docs.map(mapOrder);
  // Total must sum EVERY delivered order, not just the current page slice.
  const total = all.reduce((sum, o) => sum + (o.deliveryFee || 0), 0);
  return {
    total,
    orders: all.slice(page * pageSize, (page + 1) * pageSize),
    hasMore: (page + 1) * pageSize < all.length,
  };
}

export async function acceptOrder(orderId, rider) {
  if (!db) return CONFIG_ERR;
  const orderRef = doc(ordersRef, orderId);
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) throw codeError('NOT_FOUND', 'ORDER NO LONGER EXISTS');
      const order = snap.data();
      if (order.customerId === rider.uid)
        throw codeError('OWN_ORDER', 'THAT IS YOUR OWN ORDER — YOU CANNOT DELIVER IT');
      if (order.status !== ORDER_STATUS.OPEN)
        throw codeError('TAKEN', 'THIS ORDER WAS JUST TAKEN BY ANOTHER RIDER');
      tx.update(orderRef, {
        status: ORDER_STATUS.ACCEPTED,
        riderId: rider.uid,
        riderName: rider.name,
        riderPhone: rider.phone,
        riderOrderCount: rider.orderCount || 0,
        updatedAt: serverTimestamp(),
      });
    });
  } catch (e) {
    return { ok: false, error: e.code || 'FAILED', message: e.message };
  }
  const order = await getOrder(orderId);
  if (order) {
    await safeNotify(order.customerId, {
      type: 'accept',
      title: 'RIDER FOUND',
      body: `${rider.name} accepted your order #${orderId.slice(0, 6).toUpperCase()}`,
      orderId,
    });
  }
  return { ok: true, order };
}

export async function markPaid(orderId) {
  if (!db) return CONFIG_ERR;
  const orderRef = doc(ordersRef, orderId);
  try {
    await updateDoc(orderRef, { status: ORDER_STATUS.PAID_AT_SHOP, updatedAt: serverTimestamp() });
  } catch (e) {
    return { ok: false, error: 'INVALID', message: 'ORDER IS NOT READY' };
  }
  const order = await getOrder(orderId);
  if (order) {
    await safeNotify(order.customerId, {
      type: 'paid',
      title: 'PAID AT SHOP',
      body: 'Your rider has paid and is on the way to you.',
      orderId,
    });
  }
  return { ok: true };
}

export async function deliver(orderId) {
  if (!db) return CONFIG_ERR;
  const orderRef = doc(ordersRef, orderId);
  let info = null;
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) throw codeError('NOT_FOUND', '');
      const order = snap.data();
      if (order.status !== ORDER_STATUS.PAID_AT_SHOP)
        throw codeError('INVALID', 'ORDER IS NOT READY TO DELIVER');

      const prevCustomerCount = order.customerOrderCount || 0;
      const prevRiderCount = order.riderOrderCount || 0;

      const cSnap = await tx.get(doc(usersRef, order.customerId));
      const rSnap = await tx.get(doc(usersRef, order.riderId));
      const customer = cSnap.exists() ? cSnap.data() : null;
      const rider = rSnap.exists() ? rSnap.data() : null;
      const newCustomerCount = (customer?.customerOrderCount || 0) + 1;
      const newRiderCount = (rider?.riderOrderCount || 0) + 1;

      tx.update(orderRef, { status: ORDER_STATUS.DELIVERED, updatedAt: serverTimestamp() });
      tx.update(doc(usersRef, order.customerId), { customerOrderCount: newCustomerCount });
      tx.update(doc(usersRef, order.riderId), { riderOrderCount: newRiderCount });

      // Mirror into the public leaderboard (denormalized so reads stay cheap).
      tx.set(doc(leaderboardRef, `${order.customerId}_customer`), {
        uid: order.customerId, name: order.customerName || '?', role: 'customer',
        count: newCustomerCount, riderRatingAvg: 0, riderRatingCount: 0,
      }, { merge: true });
      tx.set(doc(leaderboardRef, `${order.riderId}_rider`), {
        uid: order.riderId, name: order.riderName || '?', role: 'rider',
        count: newRiderCount,
        riderRatingAvg: rider?.riderRatingAvg || 0,
        riderRatingCount: rider?.riderRatingCount || 0,
      }, { merge: true });

      info = {
        customerId: order.customerId,
        prevCustomerCount,
        prevCustomerRank: getRank(prevCustomerCount),
        newCustomerRank: getRank(newCustomerCount),
      };
    });
  } catch (e) {
    return { ok: false, error: e.code || 'FAILED', message: e.message };
  }

  if (info) {
    await safeNotify(info.customerId, {
      type: 'delivered',
      title: 'DELIVERED!',
      body: 'Quest complete. Tap to rate your rider.',
      orderId,
    });
    return {
      ok: true,
      order: await getOrder(orderId),
      prevCustomerRank: info.prevCustomerRank,
      newCustomerRank: info.newCustomerRank,
      prevCustomerCount: info.prevCustomerCount,
    };
  }
  return { ok: false, error: 'FAILED', message: 'TRANSACTION FAILED' };
}

export async function cancelByCustomer(orderId) {
  if (!db) return CONFIG_ERR;
  const orderRef = doc(ordersRef, orderId);
  try {
    const snap = await getDoc(orderRef);
    if (!snap.exists()) return { ok: false, error: 'NOT_FOUND' };
    const order = snap.data();
    if (order.status !== ORDER_STATUS.OPEN && order.status !== ORDER_STATUS.ACCEPTED)
      return { ok: false, error: 'INVALID', message: 'TOO LATE TO CANCEL' };
    await updateDoc(orderRef, { status: ORDER_STATUS.CANCELLED, riderId: null, updatedAt: serverTimestamp() });
    if (order.riderId) {
      await safeNotify(order.riderId, {
        type: 'customer_cancel',
        title: 'CUSTOMER CANCELLED',
        body: `Order #${orderId.slice(0, 6).toUpperCase()} was cancelled. Back to the feed.`,
        orderId,
      });
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.code || 'FAILED', message: e.message };
  }
}

export async function cancelByRider(orderId) {
  if (!db) return CONFIG_ERR;
  const orderRef = doc(ordersRef, orderId);
  try {
    const snap = await getDoc(orderRef);
    if (!snap.exists()) return { ok: false, error: 'NOT_FOUND' };
    const order = snap.data();
    if (order.status !== ORDER_STATUS.ACCEPTED)
      return { ok: false, error: 'INVALID', message: 'TOO LATE TO CANCEL' };
    await updateDoc(orderRef, {
      status: ORDER_STATUS.OPEN,
      riderId: null,
      riderName: null,
      riderPhone: null,
      riderOrderCount: 0,
      updatedAt: serverTimestamp(),
    });
    await safeNotify(order.customerId, {
      type: 'rider_cancel',
      title: 'RIDER BACKED OUT',
      body: 'Your order is back in the pool. A new rider will pick it up.',
      orderId,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.code || 'FAILED', message: e.message };
  }
}

export async function rateOrder(orderId, score) {
  if (!db) return CONFIG_ERR;
  const orderRef = doc(ordersRef, orderId);
  let riderId = null;
  try {
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists()) throw codeError('NOT_FOUND', '');
      const order = snap.data();
      if (order.rated) throw codeError('ALREADY_RATED', '');
      if (order.status !== ORDER_STATUS.DELIVERED) throw codeError('INVALID', '');
      if (!order.riderId) throw codeError('NO_RIDER', '');

      const riderRef = doc(usersRef, order.riderId);
      const rSnap = await tx.get(riderRef);
      const rider = rSnap.exists() ? rSnap.data() : {};
      const { riderRatingAvg = 0, riderRatingCount = 0 } = rider;
      const nextAvg = riderRatingCount > 0
        ? (riderRatingAvg * riderRatingCount + score) / (riderRatingCount + 1)
        : score;
      const nextCount = riderRatingCount + 1;

      tx.update(orderRef, { rated: true, rating: score, updatedAt: serverTimestamp() });
      tx.update(riderRef, { riderRatingAvg: nextAvg, riderRatingCount: nextCount });
      tx.set(doc(leaderboardRef, `${order.riderId}_rider`), {
        riderRatingAvg: nextAvg, riderRatingCount: nextCount,
      }, { merge: true });

      riderId = order.riderId;
    });
  } catch (e) {
    return { ok: false, error: e.code || 'FAILED' };
  }
  if (riderId) {
    await safeNotify(riderId, {
      type: 'rating',
      title: 'NEW RATING',
      body: `You received a ${score}-star rating from a customer.`,
      orderId,
    });
  }
  return { ok: true };
}
