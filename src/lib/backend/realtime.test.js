import { describe, it, expect, beforeEach } from 'vitest';

// Browser globals are installed by src/test/browser-globals.js (vitest
// setupFiles) BEFORE this file's imports, so the backend module sees them at
// evaluation time — just like a real browser tab. Two tabs share localStorage
// but keep separate per-tab sessionStorage.

const { shared, ses, handlers } = globalThis.__testStore;

const DB_KEY = 'bringit.own.db.v1';
const SESSION_KEY = 'bringit.own.session.v1';

import * as auth from './auth.js';
import * as orders from './orders.js';

beforeEach(() => {
  Object.keys(shared).forEach((k) => delete shared[k]);
  Object.keys(ses).forEach((k) => delete ses[k]);
});

describe('multi-tab behaviour', () => {
  it('keeps sessions per-tab in sessionStorage, out of shared localStorage', async () => {
    await auth.signup({ name: 'Alice', email: 'alice@isb.nu.edu.pk', phone: '03331234567', password: 'secret1' });
    expect(localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(Object.keys(JSON.parse(localStorage.getItem(DB_KEY)).users)).toHaveLength(1);
  });

  it('lets two accounts run side by side and share the order pool', async () => {
    await auth.signup({ name: 'Alice', email: 'alice@isb.nu.edu.pk', phone: '03331234567', password: 'secret1' });
    const aliceUid = JSON.parse(sessionStorage.getItem(SESSION_KEY)).uid;

    // A second tab (fresh per-tab session) logs in as Bob.
    sessionStorage.removeItem(SESSION_KEY);
    await auth.signup({ name: 'Bob', email: 'bob@isb.nu.edu.pk', phone: '03331234567', password: 'secret1' });
    const bobUid = JSON.parse(sessionStorage.getItem(SESSION_KEY)).uid;

    expect(aliceUid).not.toBe(bobUid);
    expect(Object.keys(JSON.parse(localStorage.getItem(DB_KEY)).users)).toHaveLength(2);

    // Alice places an order, then Bob's realm subscribes to the open feed.
    await auth.logout();
    await auth.login('alice@isb.nu.edu.pk', 'secret1');
    const oid = await orders.createOrder({
      customerId: aliceUid, customerName: 'Alice', customerPhone: '0',
      customerOrderCount: 0, description: 'fries and a shake from cafe blue',
      shops: ['Cafe Blue'], zoneId: 'c-block', zoneName: 'C-Block', deliveryFee: 20,
      deliveryNote: 'Room 5',
    });

    const seen = [];
    orders.listenOpenOrders((list) => { seen.length = 0; seen.push(...list); });

    // The browser fires a storage event in Bob's tab after Alice's write.
    handlers['storage']?.({ key: DB_KEY });
    expect(seen.some((o) => o.id === oid)).toBe(true);
  });

  it('picks up a live order written by another tab with no local write', () => {
    const seen = [];
    orders.listenOpenOrders((list) => { seen.length = 0; seen.push(...list); });

    // A write lands in the shared DB without this tab doing it locally.
    const db = JSON.parse(shared[DB_KEY] || '{"users":{},"orders":{}}');
    db.orders['ext'] = {
      id: 'ext', customerId: 'someone-else', customerName: 'X', description: 'fresh from another tab',
      shops: ['Donut Shop'], zoneId: 'ground', zoneName: 'Ground', deliveryFee: 30,
      status: 'Open', createdAt: Date.now(), updatedAt: Date.now(),
    };
    shared[DB_KEY] = JSON.stringify(db);

    handlers['storage']?.({ key: DB_KEY });
    expect(seen.some((o) => o.id === 'ext')).toBe(true);
  });

  it('syncs live orders via BroadcastChannel with no storage event', () => {
    const seen = [];
    orders.listenOpenOrders((list) => { seen.length = 0; seen.push(...list); });

    const db = JSON.parse(shared[DB_KEY] || '{"users":{},"orders":{}}');
    db.orders['ext2'] = {
      id: 'ext2', customerId: 'someone-else', customerName: 'Y', description: 'broadcast from another tab',
      shops: ['Cafe Red'], zoneId: 'ground', zoneName: 'Ground', deliveryFee: 25,
      status: 'Open', createdAt: Date.now(), updatedAt: Date.now(),
    };
    shared[DB_KEY] = JSON.stringify(db);

    // A second tab broadcasts the change; this tab's channel listener reacts.
    const remote = new BroadcastChannel(DB_KEY);
    remote.postMessage({ key: DB_KEY });
    expect(seen.some((o) => o.id === 'ext2')).toBe(true);
  });

  it('rechecks the shared DB on focus and emits only when changed', () => {
    const seen = [];
    orders.listenOpenOrders((list) => { seen.length = 0; seen.push(...list); });

    handlers['focus']?.();

    const db = JSON.parse(shared[DB_KEY] || '{"users":{},"orders":{}}');
    db.orders['ext3'] = {
      id: 'ext3', customerId: 'someone-else', customerName: 'Z', description: 'seen on refocus',
      shops: ['Cafe Blue'], zoneId: 'ground', zoneName: 'Ground', deliveryFee: 40,
      status: 'Open', createdAt: Date.now(), updatedAt: Date.now(),
    };
    shared[DB_KEY] = JSON.stringify(db);

    handlers['focus']?.();
    expect(seen.some((o) => o.id === 'ext3')).toBe(true);

    // Firing focus again with no DB change must not emit another update.
    const before = seen.length;
    handlers['focus']?.();
    expect(seen.length).toBe(before);
  });
});
