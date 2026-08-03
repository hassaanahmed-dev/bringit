import { readDb, writeDb, uid, on } from './store';
import { ORDER_STATUS } from '../constants';
import { getRank } from '../rank';
import { notify } from './notifications';

const now = () => Date.now();

function orderMap() {
  return readDb().orders;
}

function getOrderSync(orderId) {
  return orderMap()[orderId] || null;
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
  const id = uid();
  const db = readDb();
  db.orders[id] = {
    id,
    customerId,
    customerName,
    customerPhone,
    customerOrderCount: customerOrderCount || 0,
    description: description.trim(),
    deliveryNote: (deliveryNote || '').trim(),
    shops: [...shops],
    zoneId,
    zoneName,
    deliveryFee,
    status: ORDER_STATUS.OPEN,
    riderId: null,
    riderName: null,
    riderPhone: null,
    rated: false,
    rating: null,
    createdAt: now(),
    updatedAt: now(),
  };
  writeDb(db);
  return id;
}

export const getOrder = async (orderId) => getOrderSync(orderId);

export function listenOrder(orderId, cb) {
  cb(getOrderSync(orderId));
  return on('dbchange', () => cb(getOrderSync(orderId)));
}

export function listenOpenOrders(cb) {
  const snapshot = () =>
    Object.values(orderMap())
      .filter((o) => o.status === ORDER_STATUS.OPEN)
      .sort((a, b) => a.createdAt - b.createdAt);
  cb(snapshot());
  return on('dbchange', () => cb(snapshot()));
}

export async function getCustomerOrders(customerId, { page = 0, pageSize = 20 } = {}) {
  const all = Object.values(orderMap())
    .filter((o) => o.customerId === customerId)
    .sort((a, b) => b.createdAt - a.createdAt);
  return {
    orders: all.slice(page * pageSize, (page + 1) * pageSize),
    hasMore: (page + 1) * pageSize < all.length,
  };
}

export async function getRiderEarnings(riderId, { page = 0, pageSize = 20 } = {}) {
  const all = Object.values(orderMap())
    .filter((o) => o.riderId === riderId && o.status === ORDER_STATUS.DELIVERED)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const total = all.reduce((sum, o) => sum + o.deliveryFee, 0);
  return {
    total,
    orders: all.slice(page * pageSize, (page + 1) * pageSize),
    hasMore: (page + 1) * pageSize < all.length,
  };
}

function patchOrder(orderId, patch) {
  const db = readDb();
  if (!db.orders[orderId]) return { ok: false, error: 'NOT_FOUND' };
  db.orders[orderId] = { ...db.orders[orderId], ...patch, updatedAt: now() };
  writeDb(db);
  return { ok: true, order: db.orders[orderId] };
}

export async function acceptOrder(orderId, rider) {
  const db = readDb();
  const order = db.orders[orderId];
  if (!order) return { ok: false, error: 'NOT_FOUND', message: 'ORDER NO LONGER EXISTS' };
  if (order.customerId === rider.uid)
    return {
      ok: false,
      error: 'OWN_ORDER',
      message: 'THAT IS YOUR OWN ORDER — YOU CANNOT DELIVER IT',
    };
  if (order.status !== ORDER_STATUS.OPEN)
    return {
      ok: false,
      error: 'TAKEN',
      message: 'THIS ORDER WAS JUST TAKEN BY ANOTHER RIDER',
    };
  order.status = ORDER_STATUS.ACCEPTED;
  order.riderId = rider.uid;
  order.riderName = rider.name;
  order.riderPhone = rider.phone;
  order.riderOrderCount = rider.orderCount;
  order.updatedAt = now();
  writeDb(db);
  notify(order.customerId, {
    type: 'accept',
    title: 'RIDER FOUND',
    body: `${rider.name} accepted your order #${orderId.slice(0, 6).toUpperCase()}`,
    orderId,
  });
  return { ok: true, order };
}

export async function markPaid(orderId) {
  const order = getOrderSync(orderId);
  if (!order || order.status !== ORDER_STATUS.ACCEPTED) return { ok: false, error: 'INVALID' };
  const res = patchOrder(orderId, { status: ORDER_STATUS.PAID_AT_SHOP });
  if (res.ok) {
    notify(order.customerId, {
      type: 'paid',
      title: 'PAID AT SHOP',
      body: 'Your rider has paid and is on the way to you.',
      orderId,
    });
  }
  return res;
}

export async function deliver(orderId) {
  const db = readDb();
  const order = db.orders[orderId];
  if (!order) return { ok: false, error: 'NOT_FOUND' };
  if (order.status !== ORDER_STATUS.PAID_AT_SHOP)
    return { ok: false, error: 'INVALID', message: 'ORDER IS NOT READY TO DELIVER' };

  const prevCustomerCount = order.customerOrderCount;
  const prevRiderCount = order.riderOrderCount;
  order.status = ORDER_STATUS.DELIVERED;
  order.updatedAt = now();
  writeDb(db);

  const customer = db.users[order.customerId];
  const rider = db.users[order.riderId];
  if (customer) customer.customerOrderCount = (customer.customerOrderCount || 0) + 1;
  if (rider) rider.riderOrderCount = (rider.riderOrderCount || 0) + 1;
  writeDb(db);

  notify(order.customerId, {
    type: 'delivered',
    title: 'DELIVERED!',
    body: 'Quest complete. Tap to rate your rider.',
    orderId,
  });

  return {
    ok: true,
    order: getOrderSync(orderId),
    prevCustomerRank: getRank(prevCustomerCount),
    newCustomerRank: getRank(customer ? customer.customerOrderCount : prevCustomerCount),
    prevCustomerCount,
  };
}

export async function cancelByCustomer(orderId) {
  const order = getOrderSync(orderId);
  if (!order) return { ok: false, error: 'NOT_FOUND' };
  if (order.status !== ORDER_STATUS.OPEN && order.status !== ORDER_STATUS.ACCEPTED)
    return { ok: false, error: 'INVALID', message: 'TOO LATE TO CANCEL' };
  const res = patchOrder(orderId, { status: ORDER_STATUS.CANCELLED, riderId: null });
  if (res.ok && order.riderId) {
    notify(order.riderId, {
      type: 'customer_cancel',
      title: 'CUSTOMER CANCELLED',
      body: `Order #${orderId.slice(0, 6).toUpperCase()} was cancelled. Back to the feed.`,
      orderId,
    });
  }
  return res;
}

export async function cancelByRider(orderId) {
  const order = getOrderSync(orderId);
  if (!order) return { ok: false, error: 'NOT_FOUND' };
  if (order.status !== ORDER_STATUS.ACCEPTED)
    return { ok: false, error: 'INVALID', message: 'TOO LATE TO CANCEL' };
  const res = patchOrder(orderId, {
    status: ORDER_STATUS.OPEN,
    riderId: null,
    riderName: null,
    riderPhone: null,
  });
  if (res.ok) {
    notify(order.customerId, {
      type: 'rider_cancel',
      title: 'RIDER BACKED OUT',
      body: 'Your order is back in the pool. A new rider will pick it up.',
      orderId,
    });
  }
  return res;
}

export async function rateOrder(orderId, score) {
  const db = readDb();
  const order = db.orders[orderId];
  if (!order) return { ok: false, error: 'NOT_FOUND' };
  if (order.rated) return { ok: false, error: 'ALREADY_RATED' };
  if (order.status !== ORDER_STATUS.DELIVERED) return { ok: false, error: 'INVALID' };

  const rider = db.users[order.riderId];
  if (!rider) return { ok: false, error: 'NO_RIDER' };

  const { riderRatingAvg = 0, riderRatingCount = 0 } = rider;
  rider.riderRatingAvg =
    riderRatingCount > 0
      ? (riderRatingAvg * riderRatingCount + score) / (riderRatingCount + 1)
      : score;
  rider.riderRatingCount = riderRatingCount + 1;

  order.rated = true;
  order.rating = score;
  order.updatedAt = now();
  writeDb(db);
  if (order.riderId) {
    notify(order.riderId, {
      type: 'rating',
      title: 'NEW RATING',
      body: `You received a ${score}-star rating from a customer.`,
      orderId,
    });
  }
  return { ok: true };
}
