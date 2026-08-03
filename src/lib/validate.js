import { FAST_EMAIL_SUFFIX, MIN_DESCRIPTION_LEN } from './constants';

export const isFastEmail = (email) =>
  typeof email === 'string' && email.trim().toLowerCase().endsWith(FAST_EMAIL_SUFFIX);

export function validateSignup({ name, email, phone, password }) {
  if (!name || !name.trim()) return { ok: false, field: 'name', message: 'ENTER YOUR NAME' };
  if (name.trim().length < 2) return { ok: false, field: 'name', message: 'NAME TOO SHORT' };
  if (!email || !email.trim()) return { ok: false, field: 'email', message: 'ENTER YOUR FAST EMAIL' };
  if (!/^\S+@\S+\.\S+$/.test(email.trim()))
    return { ok: false, field: 'email', message: 'EMAIL LOOKS WRONG' };
  if (!isFastEmail(email.trim()))
    return { ok: false, field: 'email', message: 'USE YOUR @isb.nu.edu.pk EMAIL' };
  if (!phone || phone.trim().length < 10)
    return { ok: false, field: 'phone', message: 'ENTER A VALID PHONE (10+ DIGITS)' };
  if (!/^[\d\s+-]+$/.test(phone.trim()))
    return { ok: false, field: 'phone', message: 'PHONE CAN ONLY HAVE DIGITS' };
  if (!password || password.length < 6)
    return { ok: false, field: 'password', message: 'PASSWORD NEEDS 6+ CHARACTERS' };
  return { ok: true };
}

export function validateOrder({ description, shops, zone, deliveryNote }) {
  if (!description || description.trim().length < MIN_DESCRIPTION_LEN)
    return {
      ok: false,
      field: 'description',
      message: `DESCRIBE YOUR ORDER (${MIN_DESCRIPTION_LEN}+ CHARACTERS)`,
    };
  if (!shops.length)
    return { ok: false, field: 'shops', message: 'PICK AT LEAST ONE SHOP' };
  if (!zone) return { ok: false, field: 'zone', message: 'PICK A DELIVERY ZONE' };
  if (!deliveryNote || deliveryNote.trim().length < 3)
    return {
      ok: false,
      field: 'deliveryNote',
      message: 'GIVE AN EXACT SPOT (ROOM NO, LAB NO...)',
    };
  return { ok: true };
}

export const toTitleCase = (s) =>
  String(s).replace(/\w\S*/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase());
