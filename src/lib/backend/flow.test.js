import { describe, it, expect, beforeEach } from 'vitest';

// Browser globals installed by src/test/browser-globals.js (setupFiles).
const { shared, ses } = globalThis.__testStore;

import * as auth from './auth.js';
import * as orders from './orders.js';
import { getRank } from '../rank.js';
import { validateSignup, validateOrder, isFastEmail } from '../validate.js';

beforeEach(() => {
  Object.keys(shared).forEach((k) => delete shared[k]);
  Object.keys(ses).forEach((k) => delete ses[k]);
});

async function newCustomer(name, email) {
  await auth.signup({ name, email, phone: '03331234567', password: 'secret1' });
  await auth.simulateVerification();
  return auth.currentUser();
}

describe('validation', () => {
  it('accepts only FAST emails', () => {
    expect(isFastEmail('a@isb.nu.edu.pk')).toBe(true);
    expect(isFastEmail('a@gmail.com')).toBe(false);
  });
  it('rejects bad signup forms', () => {
    expect(validateSignup({ name: 'A', email: 'a@gmail.com', phone: '03331234567', password: 'secret1' }).ok).toBe(false);
  });
  it('enforces order rules', () => {
    expect(validateOrder({ description: 'hi', shops: ['Cafe Red'], zone: { id: 'a' }, deliveryNote: 'Room 21' }).ok).toBe(false);
    expect(validateOrder({ description: 'a long enough description', shops: [], zone: { id: 'a' }, deliveryNote: 'Room 21' }).ok).toBe(false);
    expect(validateOrder({ description: 'a long enough description', shops: ['Cafe Red'], zone: { id: 'a' }, deliveryNote: '' }).ok).toBe(false);
    expect(validateOrder({ description: 'a long enough description', shops: ['Cafe Red'], zone: { id: 'a' }, deliveryNote: 'Room 21' }).ok).toBe(true);
  });
});

describe('rank tiers', () => {
  it('maps counts to tiers', () => {
    expect(getRank(0).name).toBe('Newcomer');
    expect(getRank(4).name).toBe('Newcomer');
    expect(getRank(5).name).toBe('Regular');
    expect(getRank(15).name).toBe('Trusted');
    expect(getRank(30).name).toBe('Pro');
    expect(getRank(60).name).toBe('Legend');
  });
});

describe('full lifecycle', () => {
  it('runs a complete order end to end', async () => {
    const customer = await newCustomer('Ahmed Khan', 'ahmed@isb.nu.edu.pk');
    expect(customer.emailVerified).toBe(true);
    expect((await auth.login('ahmed@isb.nu.edu.pk', 'nope')).error.message).toBe('WRONG PASSWORD');

    const rider = await newCustomer('Sara', 'sara@isb.nu.edu.pk');
    await auth.logout();
    await auth.login('ahmed@isb.nu.edu.pk', 'secret1');
    await auth.updateProfile({ customerOrderCount: 4 });

    const oid = await orders.createOrder({
      customerId: customer.uid, customerName: 'Ahmed Khan', customerPhone: '03331234567',
      customerOrderCount: 4, description: 'Two cheeseburgers and a sprite please',
      shops: ['Cafe Red'], zoneId: 'a-block', zoneName: 'A-Block', deliveryFee: 50,
      deliveryNote: 'Room 219, 2nd floor',
    });
    expect((await orders.getOrder(oid)).status).toBe('Open');
    expect((await orders.getOrder(oid)).deliveryNote).toBe('Room 219, 2nd floor');

    // A rider can never take their own order.
    expect((await orders.acceptOrder(oid, { uid: customer.uid, name: 'Ahmed', phone: '0', orderCount: 0 })).ok).toBe(false);

    const accept = await orders.acceptOrder(oid, { uid: rider.uid, name: 'Sara', phone: '0', orderCount: 0 });
    expect(accept.ok).toBe(true);
    expect((await orders.acceptOrder(oid, { uid: 'x', name: 'X', phone: '0', orderCount: 0 })).ok).toBe(false);

    expect((await orders.markPaid(oid)).ok).toBe(true);
    const dres = await orders.deliver(oid);
    expect(dres.ok).toBe(true);
    expect(dres.prevCustomerRank.name).toBe('Newcomer');
    expect(dres.newCustomerRank.name).toBe('Regular');

    expect((await auth.getUser(customer.uid)).customerOrderCount).toBe(5);
    expect((await auth.getUser(rider.uid)).riderOrderCount).toBe(1);

    expect((await orders.rateOrder(oid, 5)).ok).toBe(true);
    expect((await orders.rateOrder(oid, 1)).ok).toBe(false);
    expect((await auth.getUser(rider.uid)).riderRatingCount).toBe(1);
    expect((await auth.getUser(rider.uid)).riderRatingAvg).toBe(5);
  });

  it('handles customer and rider cancellations', async () => {
    const customer = await newCustomer('Bilal', 'bilal@isb.nu.edu.pk');
    const rider = await newCustomer('Zoya', 'zoya@isb.nu.edu.pk');
    await auth.logout();
    await auth.login('bilal@isb.nu.edu.pk', 'secret1');

    const o1 = await orders.createOrder({ customerId: customer.uid, customerName: 'Bilal', customerPhone: '0', customerOrderCount: 1, description: 'pens and a notebook from stationery', shops: ['Stationery Shop'], zoneId: 'c-block', zoneName: 'C-Block', deliveryFee: 20 });
    await orders.acceptOrder(o1, { uid: rider.uid, name: 'Zoya', phone: '0', orderCount: 0 });
    expect((await orders.cancelByCustomer(o1)).ok).toBe(true);
    expect((await orders.getOrder(o1)).status).toBe('Cancelled');

    const o2 = await orders.createOrder({ customerId: customer.uid, customerName: 'Bilal', customerPhone: '0', customerOrderCount: 1, description: 'donuts for the whole lab group now', shops: ['Donut Shop'], zoneId: 'ground', zoneName: 'Ground', deliveryFee: 30 });
    await orders.acceptOrder(o2, { uid: rider.uid, name: 'Zoya', phone: '0', orderCount: 0 });
    expect((await orders.cancelByRider(o2)).ok).toBe(true);
    expect((await orders.getOrder(o2)).status).toBe('Open');
    expect((await orders.getOrder(o2)).riderId).toBe(null);
  });

  it('aggregates earnings from delivered orders only', async () => {
    const customer = await newCustomer('Ayesha', 'ayesha@isb.nu.edu.pk');
    const rider = await newCustomer('Hamza', 'hamza@isb.nu.edu.pk');
    await auth.logout();
    await auth.login('ayesha@isb.nu.edu.pk', 'secret1');

    const done = await orders.createOrder({ customerId: customer.uid, customerName: 'A', customerPhone: '0', customerOrderCount: 0, description: 'coffee and a muffin from cafe blue', shops: ['Cafe Blue'], zoneId: 'b-block', zoneName: 'B-Block', deliveryFee: 30 });
    const cancelled = await orders.createOrder({ customerId: customer.uid, customerName: 'A', customerPhone: '0', customerOrderCount: 0, description: 'sweets from the donut shop area', shops: ['Donut Shop'], zoneId: 'd-block', zoneName: 'D-Block', deliveryFee: 30 });

    await orders.acceptOrder(done, { uid: rider.uid, name: 'H', phone: '0', orderCount: 0 });
    await orders.markPaid(done);
    await orders.deliver(done);
    await orders.acceptOrder(cancelled, { uid: rider.uid, name: 'H', phone: '0', orderCount: 1 });
    await orders.cancelByRider(cancelled);

    const { total, orders: list } = await orders.getRiderEarnings(rider.uid);
    expect(list.length).toBe(1);
    expect(total).toBe(30);
  });
});
