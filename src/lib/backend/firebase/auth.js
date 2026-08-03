import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  reload,
  onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { isFastEmail, toTitleCase } from '../../validate';

const profileRef = (uid) => doc(db, 'users', uid);

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
  const profile = await fetchProfile(u.uid);
  return toAuthUser(u, profile);
}

export function onAuthStateChange(cb) {
  if (!auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, async (u) => {
    if (!u) {
      cb(null);
      return;
    }
    const profile = await fetchProfile(u.uid);
    cb(toAuthUser(u, profile));
  });
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

    try {
      await sendEmailVerification(user);
    } catch (e) {
      console.warn('[auth] verification email failed', e);
    }

    return { user: toAuthUser(user, profile) };
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
    const field = ['auth/user-not-found', 'auth/wrong-password', 'auth/invalid-credential'].includes(code)
      ? 'password'
      : 'email';
    return { user: null, error: { field, message: getAuthErrorMessage(error) } };
  }
}

export async function logout() {
  if (auth) await signOut(auth);
}

export async function sendVerificationEmail() {
  if (!auth?.currentUser) return { ok: false, error: 'NOT_LOGGED_IN' };
  await sendEmailVerification(auth.currentUser);
  return { ok: true };
}

export async function simulateVerification() {
  return { ok: false, error: 'REAL_EMAIL_REQUIRED', message: 'In the live build you verify via the email link.' };
}

export async function refreshVerificationStatus() {
  if (!auth?.currentUser) return false;
  await reload(auth.currentUser);
  return auth.currentUser.emailVerified;
}

export async function updateProfile(patch) {
  if (!auth?.currentUser) return null;
  await updateDoc(profileRef(auth.currentUser.uid), patch);
  return getCurrentUser();
}

export async function getUser(uid) {
  return fetchProfile(uid);
}
