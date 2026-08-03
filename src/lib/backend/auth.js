import {
  readDb,
  writeDb,
  readSession,
  writeSession,
  onSession,
  on,
  uid,
  readPending,
  writePending,
} from './store';
import { isFastEmail, toTitleCase } from '../validate';

function toAuthUser(session, user) {
  if (!session) return null;
  const { password, ...profile } = user || {};
  return {
    uid: session.uid,
    email: session.email,
    emailVerified: session.emailVerified,
    ...profile,
  };
}

function currentUser() {
  const session = readSession();
  if (!session) return null;
  const db = readDb();
  return toAuthUser(session, db.users[session.uid] || null);
}

export const getCurrentUser = async () => currentUser();

export async function signup({ name, email, phone, password }) {
  const cleanEmail = email.trim().toLowerCase();
  if (!isFastEmail(cleanEmail))
    return { user: null, error: { field: 'email', message: 'USE YOUR @isb.nu.edu.pk EMAIL' } };

  const db = readDb();
  const existing = Object.values(db.users).find((u) => u.email === cleanEmail);
  if (existing) return { user: null, error: { field: 'email', message: 'ACCOUNT ALREADY EXISTS' } };

  const now = Date.now();
  const userId = uid();
  const profile = {
    uid: userId,
    name: toTitleCase(name.trim()),
    email: cleanEmail,
    phone: phone.trim(),
    password,
    customerOrderCount: 0,
    riderOrderCount: 0,
    riderRatingAvg: 0,
    riderRatingCount: 0,
    createdAt: now,
  };
  db.users[userId] = profile;
  writeDb(db);

  const session = { uid: userId, email: cleanEmail, emailVerified: false, password };
  writeSession(session);
  return { user: toAuthUser(session, profile) };
}

export async function login(email, password) {
  const cleanEmail = email.trim().toLowerCase();
  const db = readDb();
  const match = Object.values(db.users).find((u) => u.email === cleanEmail);
  if (!match) return { user: null, error: { field: 'email', message: 'NO ACCOUNT WITH THAT EMAIL' } };
  if (match.password !== password)
    return { user: null, error: { field: 'password', message: 'WRONG PASSWORD' } };

  const session = { uid: match.uid, email: match.email, emailVerified: !!match.emailVerified };
  writeSession(session);
  return { user: toAuthUser(session, match) };
}

export async function logout() {
  writeSession(null);
}

export function onAuthStateChange(cb) {
  const refresh = () => cb(currentUser());
  refresh();
  const off1 = onSession(refresh);
  const off2 = on('dbchange', refresh);
  return () => {
    off1();
    off2();
  };
}

export async function sendVerificationEmail() {
  const session = readSession();
  if (!session) return { ok: false, error: 'NOT_LOGGED_IN' };
  const pending = readPending();
  pending[session.uid] = Date.now();
  writePending(pending);
  return { ok: true };
}

export async function simulateVerification() {
  const session = readSession();
  if (!session) return { ok: false, error: 'NOT_LOGGED_IN' };
  const db = readDb();
  const user = db.users[session.uid];
  if (user) user.emailVerified = true;
  db.users[session.uid] = user;
  writeDb(db);
  writeSession({ ...session, emailVerified: true });
  return { ok: true };
}

export async function refreshVerificationStatus() {
  return !!(currentUser() && currentUser().emailVerified);
}

export async function updateProfile(patch) {
  const session = readSession();
  if (!session) return null;
  const db = readDb();
  db.users[session.uid] = { ...db.users[session.uid], ...patch };
  writeDb(db);
  return currentUser();
}

export const getUser = async (uid) => readDb().users[uid] || null;

export { currentUser };
