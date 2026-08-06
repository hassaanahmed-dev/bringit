// Normalize a phone number into WhatsApp international format (no +, no spaces).
// Handles local Pakistani format (03xx...) and already-international (+92...).
export function toWhatsApp(phone) {
  let d = String(phone || '').replace(/\D/g, '');
  if (!d) return null;
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '92' + d.slice(1);
  if (d.length === 10 && d.startsWith('9')) d = '92' + d;
  return d;
}

export function waLink(phone) {
  const n = toWhatsApp(phone);
  return n ? `https://wa.me/${n}` : null;
}
