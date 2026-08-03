import { describe, it, expect, beforeEach } from 'vitest';

// Browser globals installed by src/test/browser-globals.js (setupFiles).
const { shared, ses } = globalThis.__testStore;

import * as auth from './auth.js';
import * as orders from './orders.js';
import * as notifications from './notifications.js';
import * as chat from './chat.js';
import { getLeaderboard } from './leaderboard.js';

beforeEach(() => {
  Object.keys(shared).forEach((k) => delete shared[k]);
  Object.keys(ses).forEach((k) => delete ses[k]);
});

async function create(name, email) {
  await auth.signup({ name, email, phone: '03331234567', password: 'secret1' });
  await auth.simulateVerification();
  return auth.currentUser();
}

async function placeOrder(customer, overrides = {}) {
  return orders.createOrder({
    customerId: customer.uid,
    customerName: customer.name,
    customerPhone: customer.phone,
    customerOrderCount: customer.customerOrderCount,
    description: 'chicken burger and a cold drink please',
    shops: ['Cafe Red'],
    zoneId: 'b-block',
    zoneName: 'B-Block',
    deliveryFee: 30,
    deliveryNote: 'Room 12',
    ...overrides,
  });
}

describe('notifications', () => {
  it('notifies both sides across the lifecycle', async () => {
    const c = await create('Naveed', 'naveed@isb.nu.edu.pk');
    const r = await create('Maha', 'maha@isb.nu.edu.pk');
    await auth.logout();
    await auth.login('naveed@isb.nu.edu.pk', 'secret1');
    const oid = await placeOrder(c);

    await auth.logout();
    await auth.login('maha@isb.nu.edu.pk', 'secret1');
    await orders.acceptOrder(oid, { uid: r.uid, name: 'Maha', phone: '0', orderCount: 0 });

    const customerNotes = await notifications.getNotifications(c.uid);
    expect(customerNotes.some((n) => n.type === 'accept')).toBe(true);
    expect(await notifications.unreadCount(c.uid)).toBeGreaterThan(0);

    await orders.markPaid(oid);
    await orders.deliver(oid);
    expect((await notifications.getNotifications(c.uid)).some((n) => n.type === 'delivered')).toBe(true);

    await orders.rateOrder(oid, 5);
    expect((await notifications.getNotifications(r.uid)).some((n) => n.type === 'rating')).toBe(true);

    await notifications.markAllRead(c.uid);
    expect(await notifications.unreadCount(c.uid)).toBe(0);
  });

  it('notifies rider when customer cancels', async () => {
    const c = await create('Usman', 'usman@isb.nu.edu.pk');
    const r = await create('Hira', 'hira@isb.nu.edu.pk');
    await auth.logout();
    await auth.login('usman@isb.nu.edu.pk', 'secret1');
    const oid = await placeOrder(c);
    await auth.logout();
    await auth.login('hira@isb.nu.edu.pk', 'secret1');
    await orders.acceptOrder(oid, { uid: r.uid, name: 'Hira', phone: '0', orderCount: 0 });
    await auth.logout();
    await auth.login('usman@isb.nu.edu.pk', 'secret1');
    await orders.cancelByCustomer(oid);
    expect((await notifications.getNotifications(r.uid)).some((n) => n.type === 'customer_cancel')).toBe(true);
  });
});

describe('chat', () => {
  it('allows only the two parties to post', async () => {
    const c = await create('Ali', 'ali@isb.nu.edu.pk');
    const r = await create('Bushra', 'bushra@isb.nu.edu.pk');
    const intruder = await create('Stranger', 'stranger@isb.nu.edu.pk');
    await auth.logout();
    await auth.login('ali@isb.nu.edu.pk', 'secret1');
    const oid = await placeOrder(c);
    await auth.logout();
    await auth.login('bushra@isb.nu.edu.pk', 'secret1');
    await orders.acceptOrder(oid, { uid: r.uid, name: 'Bushra', phone: '0', orderCount: 0 });

    expect(await chat.canAccessThread(oid, c.uid)).toBe(true);
    expect(await chat.canAccessThread(oid, r.uid)).toBe(true);
    expect(await chat.canAccessThread(oid, intruder.uid)).toBe(false);

    expect((await chat.sendMessage(oid, { uid: c.uid, name: 'Ali' }, 'Hey, I am in Room 12')).ok).toBe(true);
    expect((await chat.sendMessage(oid, { uid: intruder.uid, name: 'Stranger' }, 'spam')).ok).toBe(false);

    const msgs = await chat.getMessages(oid);
    expect(msgs.length).toBe(1);
    expect(msgs[0].text).toBe('Hey, I am in Room 12');
  });
});

describe('leaderboard', () => {
  it('ranks customers and riders by count', async () => {
    const a = await create('A', 'a@isb.nu.edu.pk');
    await auth.updateProfile({ customerOrderCount: 2, riderOrderCount: 0 });
    const b = await create('B', 'b@isb.nu.edu.pk');
    await auth.updateProfile({ customerOrderCount: 8, riderOrderCount: 3 });
    const c = await create('C', 'c@isb.nu.edu.pk');
    await auth.updateProfile({ customerOrderCount: 3, riderOrderCount: 1 });

    const eaters = await getLeaderboard({ role: 'customer' });
    expect(eaters[0].uid).toBe(b.uid);
    expect(eaters[0].rank.name).toBe('Regular');
    expect(eaters.map((x) => x.uid)).toEqual([b.uid, c.uid, a.uid]);

    const riders = await getLeaderboard({ role: 'rider' });
    expect(riders[0].uid).toBe(b.uid);
    expect(riders[0].count).toBe(3);
  });
});
