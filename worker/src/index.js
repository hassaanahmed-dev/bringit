// Free, card-less replacement for the Firebase Cloud Function: a Cloudflare
// Worker that sends branded verification emails over SMTP (any provider, e.g.
// Gmail with an app password).
//
// POST /  with  Authorization: Bearer <firebase id token>
//   verifies the token against the project's public JWKS (Web Crypto),
//   generates a real Firebase verify link via the Identity Toolkit API
//   using the service account (JWT grant -> OAuth2 access token), and
//   emails it over SMTP. No Blaze plan, no credit card, no Firebase
//   server component.

import { connect } from 'cloudflare:sockets';
import { createVerificationEmailHtml, createVerificationEmailText } from './email-template';

const RS256_JWK_URL =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPES =
  'https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase';

function b64uDecode(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64uEncode(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function b64uEncodeJson(value) {
  return b64uEncode(new TextEncoder().encode(JSON.stringify(value)));
}

async function verifyIdToken(idToken, env) {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new Error('Malformed token');

  const header = JSON.parse(atob(parts[0].replace(/-/g, '+').replace(/_/g, '/')));
  const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);

  const res = await fetch(RS256_JWK_URL);
  if (!res.ok) throw new Error('Failed to fetch signing keys');
  const { keys } = await res.json();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('Unknown signing key');

  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64uDecode(parts[2]), signed);
  if (!valid) throw new Error('Bad signature');

  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== env.PROJECT_ID) throw new Error('Bad audience');
  if (payload.iss !== `https://securetoken.google.com/${env.PROJECT_ID}`) throw new Error('Bad issuer');
  if (payload.exp < now) throw new Error('Token expired');
  if (!payload.email) throw new Error('No email claim');
  return payload;
}

function pemToPkcs8(pem) {
  const b64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '');
  return b64uDecode(b64);
}

async function getAccessToken(serviceAccountJson) {
  const svc = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1000);

  const signingInput = `${b64uEncodeJson({ alg: 'RS256', typ: 'JWT' })}.${b64uEncodeJson({
    iss: svc.client_email,
    scope: GOOGLE_SCOPES,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  })}`;

  const key = await crypto.subtle.importKey(
    'pkcs8', pemToPkcs8(svc.private_key), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${b64uEncode(new Uint8Array(sig))}`;

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`,
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error('OAuth token exchange failed');
  return json.access_token;
}

async function generateVerificationLink(accessToken, email, env) {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${env.PROJECT_ID}/accounts:sendOobCode`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requestType: 'VERIFY_EMAIL',
      email,
      returnOobLink: true,
      continueUrl: env.CONTINUE_URL,
    }),
  });
  const raw = await res.text();
  if (!res.ok || !raw.includes('oobLink')) {
    throw new Error(`LINKGEN-v2 FAILED (${res.status}): ${raw.slice(0, 300)}`);
  }
  return JSON.parse(raw).oobLink;
}

// ── 30-minute expiry wrapper ──────────────────────────────────────────────
// Firebase action codes have a fixed TTL (an hour). We wrap the real link in
// an HMAC-signed URL on this worker (`/go?t=...`) that enforces a 30-minute
// window before redirecting to the Firebase action. The signing key is derived
// from the service account already in the environment.
const LINK_TTL_SECONDS = 30 * 60;

async function getLinkSigningKey(env) {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(env.FIREBASE_SERVICE_ACCOUNT)
  );
  return crypto.subtle.importKey(
    'raw', digest, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']
  );
}

function b64uDecodeText(value) {
  return new TextDecoder().decode(b64uDecode(value));
}

async function makeGoLink(env, oobLink, origin) {
  const key = await getLinkSigningKey(env);
  const payload = b64uEncodeJson({
    l: oobLink,
    x: Math.floor(Date.now() / 1000) + LINK_TTL_SECONDS,
  });
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return `${origin}/go?t=${payload}.${b64uEncode(new Uint8Array(sig))}`;
}

async function resolveGoToken(env, token) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const key = await getLinkSigningKey(env);
  const valid = await crypto.subtle.verify(
    'HMAC', key, b64uDecode(parts[1]), new TextEncoder().encode(parts[0])
  );
  if (!valid) return null;
  const data = JSON.parse(b64uDecodeText(parts[0]));
  if (typeof data.l !== 'string' || typeof data.x !== 'number') return null;
  if (data.x < Math.floor(Date.now() / 1000)) return null;
  return data.l;
}

const EXPIRED_HTML = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Link expired — BRINGIT</title>
  </head>
  <body style="margin:0;padding:0;background:#0d0d14;font-family:Verdana,Geneva,Tahoma,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0d0d14" style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
      <tr>
        <td align="center" style="padding:48px 12px;">
          <table role="presentation" width="420" cellspacing="0" cellpadding="0" border="0" align="center" style="width:420px;max-width:100%;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
            <tr>
              <td bgcolor="#171720" style="background:#171720;border:3px solid #34344a;padding:0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td style="padding:28px 20px;text-align:center;">
                      <p style="margin:0 0 16px 0;font-size:20px;font-weight:bold;color:#ff2e63;letter-spacing:2px;">
                        BRING<span style="color:#efece1;">IT</span>
                      </p>
                      <p style="margin:0 0 8px 0;font-size:16px;font-weight:bold;color:#efece1;">
                        THIS VERIFICATION LINK HAS EXPIRED
                      </p>
                      <p style="margin:0 0 20px 0;font-size:13px;color:#9aa0b4;line-height:1.6;">
                        Verification links only last 30 minutes. Log back in to BRINGIT and
                        tap "Resend Email" to get a fresh one.
                      </p>
                      <p style="margin:0;font-size:12px;color:#34344a;">
                        bringit-82469.web.app
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

// ── Minimal SMTP client over Cloudflare Sockets ──────────────────────────
const TEXT = new TextEncoder();
const DECODER = new TextDecoder();

function appendBytes(buffer, bytes) {
  const merged = new Uint8Array(buffer.length + bytes.length);
  merged.set(buffer, 0);
  merged.set(bytes, buffer.length);
  return merged;
}

async function readResponse(reader, buffer) {
  let code = null;
  const lines = [];
  while (true) {
    const nl = buffer.indexOf(10);
    if (nl === -1) {
      const { done, value } = await reader.read();
      if (done) throw new Error('SMTP connection closed unexpectedly');
      buffer = appendBytes(buffer, value);
      continue;
    }
    const raw = DECODER.decode(buffer.slice(0, nl)).replace(/\r$/, '');
    buffer = buffer.slice(nl + 1);
    code = parseInt(raw.slice(0, 3), 10);
    lines.push(raw);
    if (raw.length >= 4 && raw[3] === ' ') break;
  }
  return { code, lines, buffer };
}

async function sendEmail(env, to, subject, html, text) {
  const secure = env.SMTP_SECURE !== 'false';
  const socket = connect(`${env.SMTP_HOST}:${env.SMTP_PORT}`, {
    secureTransport: secure ? 'on' : 'starttls',
    tls: { servername: env.SMTP_HOST },
  });
  const writer = socket.writable.getWriter();
  const reader = socket.readable.getReader();
  let buffer = new Uint8Array();

  const send = async (line) => {
    await writer.write(TEXT.encode(`${line}\r\n`));
    const r = await readResponse(reader, buffer);
    buffer = r.buffer;
    return r;
  };
  const expect = (r, wanted, what) => {
    if (!wanted.includes(r.code)) {
      throw new Error(`${what} failed (${r.code}): ${r.lines.join(' | ')}`);
    }
  };

  try {
    let r = await readResponse(reader, buffer);
    buffer = r.buffer;
    expect(r, [220], 'SMTP greeting');

    r = await send('EHLO bringit.workers.dev');
    expect(r, [250], 'EHLO');

    r = await send('AUTH LOGIN');
    expect(r, [334], 'AUTH LOGIN');
    r = await send(btoa(env.SMTP_USER));
    expect(r, [334], 'AUTH username');
    r = await send(btoa(env.SMTP_PASS));
    expect(r, [235], 'AUTH password');

    r = await send(`MAIL FROM:<${env.SMTP_USER}>`);
    expect(r, [250], 'MAIL FROM');
    r = await send(`RCPT TO:<${to}>`);
    expect(r, [250, 251], 'RCPT TO');
    r = await send('DATA');
    expect(r, [354], 'DATA');

    const message = [
      `From: ${env.SENDER_NAME || 'BRINGIT'} <${env.SMTP_USER}>`,
      `To: <${to}>`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      html,
    ].join('\r\n');

    await writer.write(TEXT.encode(`${message}\r\n.\r\n`));
    r = await readResponse(reader, buffer);
    buffer = r.buffer;
    expect(r, [250], 'message body');

    await send('QUIT');
  } finally {
    try {
      await writer.close();
    } catch {
      // already closed
    }
    socket.close();
  }
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
};

function respond(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    if (request.method === 'GET') {
      const url = new URL(request.url);
      if (url.pathname === '/go') {
        const token = url.searchParams.get('t') || '';
        try {
          const target = await resolveGoToken(env, token);
          if (target) return Response.redirect(target, 302);
        } catch {
          // fall through to expired page
        }
        return new Response(EXPIRED_HTML, {
          status: 410,
          headers: { 'Content-Type': 'text/html; charset=UTF-8' },
        });
      }
      return respond({ error: 'Not found' }, 404);
    }

    if (request.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);

    const idToken = (request.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    try {
      const payload = await verifyIdToken(idToken, env);

      let name = '';
      try {
        const body = await request.json();
        name = String(body?.name || '').trim().slice(0, 80);
      } catch {
        // no body / not JSON — greet as Player
      }
      const firstName = name.split(/\s+/)[0] || 'Player';

      const origin = new URL(request.url).origin;
      const accessToken = await getAccessToken(env.FIREBASE_SERVICE_ACCOUNT);
      const oobLink = await generateVerificationLink(accessToken, payload.email, env);
      const link = await makeGoLink(env, oobLink, origin);
      await sendEmail(
        env,
        payload.email,
        `Confirm your BRINGIT email, ${firstName}`,
        createVerificationEmailHtml({ email: payload.email, link, name: firstName }),
        createVerificationEmailText({ email: payload.email, link, name: firstName })
      );
      return respond({ ok: true }, 200);
    } catch (err) {
      console.error(err);
      return respond({ error: err.message || 'Verification email failed' }, 400);
    }
  },
};
