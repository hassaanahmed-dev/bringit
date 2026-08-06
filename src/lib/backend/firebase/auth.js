import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  reload,
  onIdTokenChanged,
  fetchSignInMethodsForEmail,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { isFastEmail, toTitleCase } from '../../validate';

const profileRef = (uid) => doc(db, 'users', uid);

// Branded verification emails are sent by a Cloudflare Worker (see worker/).
// Firebase's built-in email is intentionally never used — the worker is the
// only path, so a failure surfaces to the caller instead of silently sending
// the default template.
const VERIFY_EMAIL_WORKER_URL = import.meta.env.VITE_VERIFY_EMAIL_URL;

async function sendBrandedVerificationEmail(fbUser, name = '') {
  if (!VERIFY_EMAIL_WORKER_URL || !fbUser) {
    throw new Error('Verification worker not configured');
  }
  const idToken = await fbUser.getIdToken();
  const response = await fetch(VERIFY_EMAIL_WORKER_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${idToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    throw new Error(`Verification worker failed (${response.status})`);
  }
}

// Codes that mean the account itself is gone (deleted/disabled/expired).
const SESSION_DEAD = [
  'auth/user-not-found',
  'auth/user-disabled',
  'auth/user-token-expired',
  'auth/invalid-user-token',
];

async function clearSession() {
  try {
    await signOut(auth);
  } catch {
    // ignore — clearing an already-dead session
  }
}

export function getAuthErrorMessage(error) {
  const code = error?.code || '';
  const messages = {
    'auth/email-already-in-use': 'ACCOUNT ALREADY EXISTS',
    'auth/invalid-email': 'THAT EMAIL LOOKS INVALID',
    'auth/weak-password': 'PASSWORD MUST BE AT LEAST 6 CHARACTERS',
    'auth/user-not-found': 'NO ACCOUNT WITH THAT EMAIL',
    'auth/wrong-password': 'WRONG PASSWORD',
    'auth/invalid-credential': 'INCORRECT EMAIL OR PASSWORD',
    'auth/too-many-requests': 'TOO MANY ATTEMPTS. WAIT AND RETRY',
    'auth/network-request-failed': 'NETWORK ERROR. CHECK CONNECTION',
  };
  return messages[code] || 'SOMETHING WENT WRONG. TRY AGAIN';
}

async function fetchProfile(uid) {
  const snap = await getDoc(profileRef(uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() };
}

function toAuthUser(fbUser, profile) {
  if (!fbUser) return null;
  return {
    uid: fbUser.uid,
    email: fbUser.email,
    emailVerified: !!fbUser.emailVerified,
    name: profile?.name || fbUser.displayName || '',
    phone: profile?.phone || '',
    customerOrderCount: profile?.customerOrderCount || 0,
    riderOrderCount: profile?.riderOrderCount || 0,
    riderRatingAvg: profile?.riderRatingAvg || 0,
    riderRatingCount: profile?.riderRatingCount || 0,
    createdAt: profile?.createdAt || null,
  };
}

export async function getCurrentUser() {
  const u = auth?.currentUser;
  if (!u) return null;
  // Force a server round-trip so an account deleted in the console is detected
  // immediately on the next visit (the local session alone survives deletion).
  try {
    await reload(u);
  } catch (e) {
    if (SESSION_DEAD.includes(e?.code)) {
      await clearSession();
      return null;
    }
  }
  const profile = await fetchProfile(u.uid);
  return toAuthUser(u, profile);
}

export function onAuthStateChange(cb, onError) {
  if (!auth) {
    cb(null);
    return () => {};
  }
  // onIdTokenChanged re-fires whenever the token refreshes, and surfaces an
  // error when that refresh fails because the account was deleted or disabled —
  // so live sessions get revoked instead of silently persisting.
  return onIdTokenChanged(
    auth,
    async (u) => {
      if (!u) {
        cb(null);
        return;
      }
      try {
        const profile = await fetchProfile(u.uid);
        cb(toAuthUser(u, profile));
      } catch (e) {
        // A transient profile-read failure must not block startup — without
        // this the app would sit on the BOOTING... spinner forever.
        console.warn('[auth] profile fetch failed', e?.code || e);
        cb(toAuthUser(u, null));
      }
    },
    async (error) => {
      console.warn('[auth] session revoked', error?.code);
      await clearSession();
      cb(null);
      onError?.();
    },
  );
}

export async function signup({ name, email, phone, password }) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!isFastEmail(cleanEmail))
    return { user: null, error: { field: 'email', message: 'USE YOUR @isb.nu.edu.pk EMAIL' } };
  if (!auth || !db)
    return { user: null, error: { field: 'email', message: 'FIREBASE NOT CONFIGURED' } };

  try {
    const { user } = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const profile = {
      name: toTitleCase((name || '').trim()),
      email: cleanEmail,
      phone: (phone || '').trim(),
      customerOrderCount: 0,
      riderOrderCount: 0,
      riderRatingAvg: 0,
      riderRatingCount: 0,
      createdAt: new Date(),
    };

    let profileWriteFailed = false;
    try {
      await setDoc(profileRef(user.uid), profile);
      // Seed empty leaderboard entries so new players appear campus-wide.
      const lb = collection(db, 'leaderboard');
      await Promise.allSettled([
        setDoc(doc(lb, `${user.uid}_customer`), {
          uid: user.uid, name: profile.name, role: 'customer',
          count: 0, riderRatingAvg: 0, riderRatingCount: 0,
        }),
        setDoc(doc(lb, `${user.uid}_rider`), {
          uid: user.uid, name: profile.name, role: 'rider',
          count: 0, riderRatingAvg: 0, riderRatingCount: 0,
        }),
      ]);
    } catch (e) {
      profileWriteFailed = true;
      console.warn('[auth] profile write failed', e);
    }

    let verificationEmailSent = true;
    try {
      await sendBrandedVerificationEmail(user, profile.name);
    } catch (e) {
      verificationEmailSent = false;
      console.warn('[auth] verification email failed', e);
    }

    return { user: toAuthUser(user, profile), profileWriteFailed, verificationEmailSent };
  } catch (error) {
    return { user: null, error: { field: 'email', message: getAuthErrorMessage(error) } };
  }
}

export async function login(email, password) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (!auth || !db)
    return { user: null, error: { field: 'email', message: 'FIREBASE NOT CONFIGURED' } };
  try {
    const { user } = await signInWithEmailAndPassword(auth, cleanEmail, password);
    let profile = await fetchProfile(user.uid);
    if (!profile) {
      await setDoc(profileRef(user.uid), {
        name: user.displayName || '', email: cleanEmail, phone: '',
        customerOrderCount: 0, riderOrderCount: 0, riderRatingAvg: 0, riderRatingCount: 0,
        createdAt: new Date(),
      });
      profile = await fetchProfile(user.uid);
    }
    return { user: toAuthUser(user, profile) };
  } catch (error) {
    const code = error?.code || '';
    // Firebase often collapses "no such user" and "wrong password" into
    // auth/invalid-credential. Probe for the account so we can tell the two
    // apart and point the player at signup when no account exists.
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      try {
        const methods = await fetchSignInMethodsForEmail(auth, cleanEmail);
        if (!methods || methods.length === 0) {
          return {
            user: null,
            error: { field: 'email', message: 'NO ACCOUNT WITH THAT EMAIL — CREATE ONE FIRST' },
          };
        }
      } catch (e) {
        // probe failed (network etc.) — fall back to the code-based message
      }
      return { user: null, error: { field: 'password', message: 'WRONG PASSWORD' } };
    }
    const field = code === 'auth/wrong-password' ? 'password' : 'email';
    return { user: null, error: { field, message: getAuthErrorMessage(error) } };
  }
}

export async function logout() {
  if (auth) await signOut(auth);
}

export async function sendVerificationEmail() {
  if (!auth?.currentUser) return { ok: false, error: 'NOT_LOGGED_IN' };
  try {
    const profile = await fetchProfile(auth.currentUser.uid);
    await sendBrandedVerificationEmail(auth.currentUser, profile?.name || '');
    return { ok: true };
  } catch {
    return { ok: false, error: 'SEND_FAILED' };
  }
}

export async function simulateVerification() {
  return { ok: false, error: 'REAL_EMAIL_REQUIRED', message: 'In the live build you verify via the email link.' };
}

export async function refreshVerificationStatus() {
  if (!auth?.currentUser) return false;
  try {
    await reload(auth.currentUser);
    return auth.currentUser.emailVerified;
  } catch {
    return false;
  }
}

export async function updateProfile(patch) {
  if (!auth?.currentUser) return null;
  const uid = auth.currentUser.uid;
  await updateDoc(profileRef(uid), patch);
  // Keep the denormalized leaderboard names in sync when a player renames.
  if (patch.name) {
    const lb = collection(db, 'leaderboard');
    await Promise.allSettled([
      updateDoc(doc(lb, `${uid}_customer`), { name: patch.name }),
      updateDoc(doc(lb, `${uid}_rider`), { name: patch.name }),
    ]);
  }
  return getCurrentUser();
}

export async function getUser(uid) {
  return fetchProfile(uid);
}
