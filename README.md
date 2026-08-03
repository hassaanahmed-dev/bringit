# BringIt

**BringIt** is a peer-to-peer campus food delivery app for FAST National
University Islamabad. Students order from the campus shops (Cafe Red, Cafe
Blue, Donut Shop, Stationery Shop) and other students deliver the order for a
fee — live-tracked, rated, and gamified with ranks.

## Quick start

The app ships with a **dual backend**: a zero-setup **demo** backend (browser
`localStorage` + `sessionStorage`) and a real **Firebase/Firestore** backend.
`VITE_BACKEND` in `.env` picks which one runs — `demo` (default) or `firebase`.

```bash
npm install
npm run dev        # http://localhost:5173  (demo backend by default)
```

To try the full flow (demo mode):

1. **Sign up** with any `@isb.nu.edu.pk` email (the app enforces the domain).
2. On the **Check Your Email** screen, tap *Demo: Simulate Opening Link*.
3. **Place an order** (description + shops + zone + exact drop spot).
4. Open a **second browser tab**, log in as a second account, and grab the
   order from the rider feed — the two tabs sync in real time via
   `localStorage` storage events + `BroadcastChannel`.

### Real Firebase backend

The Firebase integration is already wired up and uses the same project as the
original BringIt (`bringit-82469`). To go live with it:

1. Make sure `.env` has the real config (template in `.env.example`).
2. Set `VITE_BACKEND=firebase` in `.env`.
3. Deploy rules + indexes once:
   ```bash
   npm i -g firebase-tools
   firebase login
   firebase deploy --only firestore
   ```
4. Restart the dev server, or deploy the app:
   ```bash
   npm run build
   firebase deploy
   ```
5. In the **Firebase console → Authentication**, enable **Email/Password** and
   email verification links.

In Firebase mode, verification uses the real email link (the *Simulate* button
is replaced by *I Verified — Check Again*), and every screen — orders, chat,
notifications, the global leaderboard — is shared live across all users and
devices via Firestore `onSnapshot`.

## Test

```bash
npm test           # vitest — backend lifecycle, ranks, validation, multi-tab
```

## Screens

| Route            | Purpose                                          |
| ---------------- | ------------------------------------------------ |
| `/`              | Splash                                           |
| `/signup` `/login` `/verify` | Authentication + email verification  |
| `/home`          | Dashboard with role cards and stats              |
| `/new-order`     | Customer order form (desc, shops, zone, summary) |
| `/order/:id`     | Live order tracking, cancel, rating, rank-up     |
| `/order-history` | Customer's order log                             |
| `/feed`          | Rider open feed, client-side shop filters        |
| `/rider/order/:id` | Mission brief + atomic accept                  |
| `/active/:id`    | Active delivery: paid / delivered / cancel       |
| `/earnings`      | Rider earnings history + running total           |
| `/profile`       | Player card: ranks, rating, editable details     |
| `/notifications` | In-app alerts: accept, paid, delivered, cancels, ratings |
| `/chat/:id`      | Real-time rider ↔ customer chat per order        |
| `/leaderboard`   | Campus rankings — eaters and riders              |

## Tech stack

- [Vite](https://vite.dev) + [React 19](https://react.dev)
- [React Router](https://reactrouter.com) v7
- [Tailwind CSS v4](https://tailwindcss.com) (pixel theme in `src/index.css`)
- [Vitest](https://vitest.dev) for tests
- Fonts: [Press Start 2P](https://fonts.google.com/specimen/Press+Start+2P) +
  [VT323](https://fonts.google.com/specimen/VT323)

## Architecture

```
src/
  lib/
    constants.js        # shops, zones, statuses, tiers
    rank.js             # getRank() tier logic (single source of truth)
    validate.js         # signup + order validation
    routes.js
    firebase.js         # guarded Firebase init (null-safe without config)
    backend/
      index.js          # facade — picks demo vs firebase via VITE_BACKEND
      store.js          # demo DB in localStorage + cross-tab realtime
      auth.js           # demo auth services (async interface)
      orders.js         # demo order lifecycle + transactions
      notifications.js  # demo in-app notifications
      chat.js           # demo per-order chat
      leaderboard.js    # demo global leaderboard (live)
      firebase/         # real Firestore implementations
        util.js         # timestamps, doc mapping helpers
        auth.js         # Firebase Auth: signup/login/verify/profile
        orders.js       # orders, accept/deliver/rate via runTransaction
        notifications.js# notifications (targetUid collection)
        chat.js         # messages (participant-only reads)
        leaderboard.js  # leaderboard collection (live onSnapshot)
  context/              # AuthContext, ToastContext
  components/           # pixel UI kit, AppShell, QuestTracker, overlays
  pages/                # one file per screen
```

Every screen talks to `lib/backend/*` through the shared async facade in
`lib/backend/index.js` and never touches storage or Firebase directly. The
facade exports one object:

```js
import { auth, orders, notifications, chat, leaderboard, isFirebase } from '../lib/backend';
```

All one-shot reads and mutations return Promises; live data (`listen*`
functions) stay callback-based. The contract is documented in `docs/schema.md`,
and the Firestore security rules live in `firestore.rules`.

## Demo vs Firebase backend

The demo backend (`src/lib/backend/*`) mirrors the Firestore contract in
`docs/schema.md` so the two are drop-in swappable. The facade switches on
`VITE_BACKEND`:

| Mode      | Auth                | Data                        | Realtime                    |
| --------- | ------------------- | --------------------------- | --------------------------- |
| `demo`    | localStorage session | `localStorage` per browser | `storage` events + `BroadcastChannel` (cross-tab, same device) |
| `firebase`| Firebase Auth + email verification | Cloud Firestore    | Firestore `onSnapshot` (cross-device) |

Firebase mode requires the real `.env` config and a one-time
`firebase deploy --only firestore` to push `firestore.rules` and
`firestore.indexes.json`.

## Known limitations / out of scope (post-MVP)

- Demo mode stores data locally per-browser; only Firebase mode shares a
  production DB.
- No digital payment — cash on delivery only.
- Single campus (FAST ISB) — no multi-campus support.
- Browser push notifications (real FCM) are a post-MVP add-on on top of the
  in-app notification center.
- No admin panel.
- `getRank` tier names: Newcomer → Regular → Trusted → Pro → Legend.
