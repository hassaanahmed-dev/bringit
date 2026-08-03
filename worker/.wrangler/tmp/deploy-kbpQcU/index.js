var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/email-template.js
function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
__name(escapeHtml, "escapeHtml");
function createVerificationEmailHtml({ email, link }) {
  const safeEmail = escapeHtml(email);
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BRINGIT \u2014 Verify your email</title>
  </head>
  <body style="margin:0;padding:0;background:#1A1A2E;font-family:Verdana,Geneva,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#1A1A2E">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="520" cellspacing="0" cellpadding="0" border="3" style="width:520px;max-width:100%;background:#16213E;border:3px solid #E8E8F0;">
            <tr>
              <td style="padding:28px 24px 8px 24px;">
                <p style="margin:0 0 18px 0;font-size:20px;font-weight:bold;color:#CC2D5A;text-align:center;letter-spacing:2px;">
                  BRING<span style="color:#E8E8F0;">IT</span>
                </p>
                <p style="margin:0 0 20px 0;font-size:14px;color:#E8E8F0;text-align:center;line-height:1.6;">
                  HEY PLAYER,<br />
                  Confirm your FAST email to enter campus.
                </p>
                <p style="margin:0 0 24px 0;font-size:13px;color:#E8E8F0;text-align:center;background:#2A2A4A;border:2px solid #E8E8F0;padding:10px 8px;">
                  ${safeEmail}
                </p>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(link)}" style="display:inline-block;background:#CC2D5A;color:#FFFFFF;border:3px solid #000000;padding:14px 26px;font-size:14px;font-weight:bold;text-decoration:none;letter-spacing:1px;">
                        VERIFY MY EMAIL
                      </a>
                    </td>
                  </tr>
                </table>
                <p style="margin:24px 0 0 0;font-size:12px;color:#8E93AE;text-align:center;line-height:1.6;">
                  If you didn't create a BringIt account, you can ignore this email.
                  <br />
                  The link expires in a few hours.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
__name(createVerificationEmailHtml, "createVerificationEmailHtml");
function createVerificationEmailText({ email, link }) {
  return [
    "BRINGIT \u2014 VERIFY YOUR EMAIL",
    "",
    `Hey player, confirm your FAST email to enter campus: ${email}`,
    "",
    `Click this link to verify: ${link}`,
    "",
    "If you did not create a BringIt account, you can ignore this email."
  ].join("\n");
}
__name(createVerificationEmailText, "createVerificationEmailText");

// src/index.js
var RS256_JWK_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
var TOKEN_URL = "https://oauth2.googleapis.com/token";
var SEND_OOB_URL = "https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode";
var RESEND_URL = "https://api.resend.com/emails";
var GOOGLE_SCOPES = "https://www.googleapis.com/auth/cloud-platform https://www.googleapis.com/auth/firebase";
function b64uDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
__name(b64uDecode, "b64uDecode");
function b64uEncode(bytes) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
__name(b64uEncode, "b64uEncode");
function b64uEncodeJson(value) {
  return b64uEncode(new TextEncoder().encode(JSON.stringify(value)));
}
__name(b64uEncodeJson, "b64uEncodeJson");
async function verifyIdToken(idToken, env) {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const header = JSON.parse(atob(parts[0].replace(/-/g, "+").replace(/_/g, "/")));
  const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const res = await fetch(RS256_JWK_URL);
  if (!res.ok) throw new Error("Failed to fetch signing keys");
  const { keys } = await res.json();
  const jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new Error("Unknown signing key");
  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, b64uDecode(parts[2]), signed);
  if (!valid) throw new Error("Bad signature");
  const now = Math.floor(Date.now() / 1e3);
  if (payload.aud !== env.PROJECT_ID) throw new Error("Bad audience");
  if (payload.iss !== `https://securetoken.google.com/${env.PROJECT_ID}`) throw new Error("Bad issuer");
  if (payload.exp < now) throw new Error("Token expired");
  if (!payload.email) throw new Error("No email claim");
  return payload;
}
__name(verifyIdToken, "verifyIdToken");
function pemToPkcs8(pem) {
  const b64 = pem.replace(/-----BEGIN PRIVATE KEY-----/, "").replace(/-----END PRIVATE KEY-----/, "").replace(/\s+/g, "");
  return b64uDecode(b64);
}
__name(pemToPkcs8, "pemToPkcs8");
async function getAccessToken(serviceAccountJson) {
  const svc = JSON.parse(serviceAccountJson);
  const now = Math.floor(Date.now() / 1e3);
  const signingInput = `${b64uEncodeJson({ alg: "RS256", typ: "JWT" })}.${b64uEncodeJson({
    iss: svc.client_email,
    scope: GOOGLE_SCOPES,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  })}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToPkcs8(svc.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(signingInput));
  const assertion = `${signingInput}.${b64uEncode(new Uint8Array(sig))}`;
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${encodeURIComponent(assertion)}`
  });
  const json = await res.json();
  if (!res.ok || !json.access_token) throw new Error("OAuth token exchange failed");
  return json.access_token;
}
__name(getAccessToken, "getAccessToken");
async function generateVerificationLink(accessToken, idToken, env) {
  const res = await fetch(SEND_OOB_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requestType: "VERIFY_EMAIL",
      idToken,
      continueUrl: env.CONTINUE_URL,
      targetProjectId: env.PROJECT_ID
    })
  });
  const json = await res.json();
  if (!res.ok || !json.oobCode) throw new Error("Could not generate verification link");
  return `https://${env.AUTH_DOMAIN}/__/auth/action?mode=verifyEmail&oobCode=${json.oobCode}&apiKey=${env.WEB_API_KEY}&continueUrl=${encodeURIComponent(env.CONTINUE_URL)}`;
}
__name(generateVerificationLink, "generateVerificationLink");
async function sendEmail(env, to, link) {
  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: env.SENDER_EMAIL,
      to: [to],
      subject: "BRINGIT \u25B6 VERIFY YOUR EMAIL",
      html: createVerificationEmailHtml({ email: to, link }),
      text: createVerificationEmailText({ email: to, link })
    })
  });
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${await res.text()}`);
}
__name(sendEmail, "sendEmail");
var CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type"
};
function respond(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS }
  });
}
__name(respond, "respond");
var index_default = {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (request.method !== "POST") return respond({ error: "Method not allowed" }, 405);
    const idToken = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    try {
      const payload = await verifyIdToken(idToken, env);
      const accessToken = await getAccessToken(env.FIREBASE_SERVICE_ACCOUNT);
      const link = await generateVerificationLink(accessToken, idToken, env);
      await sendEmail(env, payload.email, link);
      return respond({ ok: true }, 200);
    } catch (err) {
      console.error(err);
      return respond({ error: err.message || "Verification email failed" }, 400);
    }
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
