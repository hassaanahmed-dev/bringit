# BringIt — Data Contract

This is the agreed data contract for BringIt, a peer-to-peer campus food
delivery app for FAST National University Islamabad. Every screen reads and
writes through these shapes.

> The app ships with two interchangeable backends behind `src/lib/backend/`:
> a **demo** backend that mirrors this contract in `localStorage`, and the
> **real Firestore** implementation in `src/lib/backend/firebase/`. The live
> security rules live in `firestore.rules` at the repo root (deployed with
> `firebase deploy --only firestore`).

## Collections

### `users`

| Field               | Type    | Notes                                              |
| ------------------- | ------- | -------------------------------------------------- |
| `uid`               | string  | Auth UID (primary key)                             |
| `name`              | string  | Display name (title-cased)                         |
| `email`             | string  | FAST email, must end `@isb.nu.edu.pk`              |
| `phone`             | string  | Contact number shown to the other party            |
| `password`          | string  | Demo backend only — never store in real Firestore  |
| `customerOrderCount`| number  | Completed orders as a customer (rank source)       |
| `riderOrderCount`   | number  | Completed deliveries as a rider (rank source)      |
| `riderRatingAvg`    | number  | Rolling average rating (0 if no ratings)           |
| `riderRatingCount`  | number  | Number of ratings received                         |
| `createdAt`         | number  | Epoch ms                                          |

### `orders`

| Field               | Type     | Notes                                              |
| ------------------- | -------- | -------------------------------------------------- |
| `id`                | string   | Auto id                                            |
| `customerId`        | string   | Owner uid                                          |
| `customerName`      | string   | Denormalized for the feed                          |
| `customerPhone`     | string   | Denormalized for the rider                         |
| `customerOrderCount`| number   | Snapshot at creation (drives rank badges + rank-up)|
| `description`       | string   | Free text, min 10 chars                            |
| `deliveryNote`      | string   | Exact drop spot — room no, floor, lab (min 3 chars)|
| `shops`             | string[] | 1..4 of the fixed shop names                       |
| `zoneId`            | string   | Fixed zone id                                      |
| `zoneName`          | string   | Denormalized zone label                            |
| `deliveryFee`       | number   | Rs amount from the zone                            |
| `status`            | string   | `Open` / `Accepted` / `Paid at Shop` / `Delivered` / `Cancelled` |
| `riderId`           | string?  | Assigned rider, `null` while Open                  |
| `riderName`         | string?  | Assigned rider's name                              |
| `riderPhone`        | string?  | Assigned rider's phone                             |
| `riderOrderCount`   | number?  | Rider's delivery count snapshot at acceptance      |
| `rated`             | boolean  | Rating lock — prevents double rating               |
| `rating`            | number?  | 1..5, set once                                    |
| `createdAt`         | number   | Epoch ms                                          |
| `updatedAt`         | number   | Epoch ms, bumped on every status change            |

### `messages` (chat threads — one per order)

| Field       | Type   | Notes                                     |
| ----------- | ------ | ----------------------------------------- |
| `orderId`   | string | Thread key                                |
| `senderId`  | string | customerId or riderId of that order       |
| `senderName`| string | Denormalized                              |
| `text`      | string | Max 300 chars                             |
| `createdAt` | number | Epoch ms                                  |

Access is restricted to the order's `customerId` and `riderId` only.

### `notifications` (per user)

| Field       | Type    | Notes                                         |
| ----------- | ------- | --------------------------------------------- |
| `id`        | string  | Auto id (doc id)                              |
| `targetUid` | string  | Owner uid (indexed with `createdAt` DESC)     |
| `type`      | string  | `accept` `paid` `delivered` `customer_cancel` `rider_cancel` `rating` |
| `title`     | string  | Short heading                                 |
| `body`      | string  | Message text                                  |
| `orderId`   | string? | Deep link target                              |
| `read`      | boolean | Read state                                    |
| `createdAt` | number  | Epoch ms                                      |

Fired automatically from the order lifecycle: accept → customer, paid → customer,
delivered → customer, customer cancel → rider, rider cancel → customer,
rating → rider. Read/update/delete is restricted to `targetUid`; creates are
allowed for any authenticated user (the lifecycle methods write them).

## Leaderboard

**Demo backend:** derived on read from the `users` collection — top N by
`customerOrderCount` (eaters) or `riderOrderCount` (riders), using `getRank`
for the tier chip.

**Firestore backend:** a denormalized `leaderboard` collection (public read,
authenticated create/update) so the page stays live with a single `onSnapshot`:

| Field   | Type   | Notes                                              |
| ------- | ------ | -------------------------------------------------- |
| `uid`   | string | User uid (doc id)                                  |
| `name`  | string | Display name                                       |
| `role`  | string | `customer` or `rider` (indexed with `count` DESC)  |
| `count` | number | `customerOrderCount` or `riderOrderCount`          |
| `ratingAvg` | number | Rider's average rating (0 for eaters)          |
| `ratingCount` | number | Number of ratings received                    |

Seeded on signup (both roles at count 0) and mirrored from the `deliver`/`rate`
transactions. Query by `role` + `orderBy('count', 'desc')`.

## Status lifecycle

```
Place → Open → Accepted → Paid at Shop → Delivered
         │         │
         └─Cancelled┘  (customer, only while Open/Accepted)
         Open ←── rider cancel (Accepted only, order returns to pool)
```

- Cancelled orders **never** increment counts.
- Only `Delivered` orders count toward rank and earnings.

## Fixed domain data

**Shops:** `Cafe Red`, `Cafe Blue`, `Donut Shop`, `Stationery Shop`

**Zones:** C-Block Rs 20 · B-Block Rs 30 · D-Block Rs 30 · Ground Rs 30 · A-Block Rs 50

**Ranks** (derived from count via `getRank`, never stored):

| Count    | Tier     | Color  |
| -------- | -------- | ------ |
| 0–4      | Newcomer | grey   |
| 5–14     | Regular  | green  |
| 15–29    | Trusted  | blue   |
| 30–59    | Pro      | purple |
| 60+      | Legend   | gold   |

## Security rules

The authoritative, deployable rules live in **`firestore.rules`** at the repo
root (with the required indexes in `firestore.indexes.json`). Summary:

- `users`: create/read/update only your own doc; aggregate counters may be
  written by other authenticated users so delivery/rating transactions can bump
  them.
- `orders`: open orders are readable by any signed-in user; customers can
  cancel while Open/Accepted; the assigned rider advances status past
  acceptance (rider-cancel returns the order to the pool); nobody deletes.
- `messages`: read/write only for the order's `customerId`/`riderId`, checked
  via `get()` on the linked order.
- `notifications`: read/update/delete for `targetUid` only; authenticated
  creates.
- `leaderboard`: public read, authenticated create/update.

```firestore
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isOwner(uid) { return signedIn() && request.auth.uid == uid; }

    match /users/{uid} {
      allow read, write: if isOwner(uid);
      allow create: if isOwner(uid);
    }

    match /orders/{id} {
      allow read: if signedIn() && (resource == null || resource.data.status == 'Open' || request.auth.uid == resource.data.customerId || request.auth.uid == resource.data.riderId);

      allow create: if signedIn()
        && request.resource.data.customerId == request.auth.uid
        && request.resource.data.status == 'Open'
        && request.resource.data.riderId == null;

      // Only the owning customer can cancel, and only while Open/Accepted.
      allow update: if signedIn()
        && (request.auth.uid == resource.data.customerId
            && request.resource.data.status == 'Cancelled'
            && resource.data.status in ['Open', 'Accepted'])
        || (request.auth.uid == resource.data.riderId
            && request.resource.data.status in ['Paid at Shop', 'Delivered']
            && request.resource.data.status >= resource.data.status);

      allow delete: if false;
    }
  }
}
```
