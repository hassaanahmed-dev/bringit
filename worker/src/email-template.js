// Pixel-styled HTML for the verification email, matching the BRINGIT website
// theme (ink/panel/line/brand). Email clients need inline styles and tables —
// no flexbox, no CSS files. Layout is fluid so it scales and stays centered
// on phones.

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function createVerificationEmailHtml({ email, link, name }) {
  const safeEmail = escapeHtml(email);
  const safeLink = escapeHtml(link);
  const firstName = name ? escapeHtml(String(name).split(/\s+/)[0]) : 'Player';

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta http-equiv="X-UA-Compatible" content="IE=edge" />
    <title>BRINGIT — Confirm your email</title>
    <style>
      @media only screen and (max-width: 620px) {
        .email-container { width: 100% !important; }
        .pad { padding: 26px 18px 8px 18px !important; }
        .btn { padding: 13px 22px !important; font-size: 13px !important; }
        .head { font-size: 18px !important; }
        .hi { font-size: 15px !important; }
        .body-copy { font-size: 12px !important; }
      }
      @media only screen and (max-width: 400px) {
        .pad { padding: 22px 12px 8px 12px !important; }
        .btn { padding: 13px 16px !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#0d0d14;font-family:Verdana,Geneva,Tahoma,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0d0d14" style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
      <tr>
        <td align="center" style="padding:40px 12px;">
          <table role="presentation" width="520" class="email-container" cellspacing="0" cellpadding="0" border="0" align="center" style="width:520px;max-width:100%;border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
            <tr>
              <td bgcolor="#171720" style="background:#171720;border:3px solid #34344a;padding:0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;mso-table-lspace:0;mso-table-rspace:0;">
                  <tr>
                    <td class="pad" style="padding:32px 28px 8px 28px;">
                      <p class="head" style="margin:0 0 20px 0;font-size:20px;font-weight:bold;color:#ff2e63;text-align:center;letter-spacing:2px;">
                        BRING<span style="color:#efece1;">IT</span>
                      </p>
                      <p class="hi" style="margin:0 0 6px 0;font-size:16px;font-weight:bold;color:#efece1;text-align:center;line-height:1.6;">
                        HEY ${firstName.toUpperCase()},
                      </p>
                      <p class="body-copy" style="margin:0 0 16px 0;font-size:13px;color:#9aa0b4;text-align:center;line-height:1.6;">
                        Confirm your FAST email to activate your player and enter campus.
                      </p>
                      <p style="margin:16px 0 24px 0;font-size:14px;color:#efece1;text-align:center;background:#1f1f2b;border:2px solid #34344a;padding:12px 8px;font-weight:bold;word-break:break-all;">
                        ${safeEmail}
                      </p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0;border-collapse:collapse;">
                        <tr>
                          <td align="center">
                            <a href="${safeLink}" class="btn" style="display:inline-block;background:#ff2e63;color:#000000;border:3px solid #000000;padding:14px 26px;font-size:14px;font-weight:bold;text-decoration:none;letter-spacing:1px;text-align:center;">
                              VERIFY MY EMAIL
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:24px 0 0 0;font-size:12px;color:#9aa0b4;text-align:center;line-height:1.6;">
                        This link expires in 30 minutes.
                        <br />
                        If you didn't create a BringIt account, you can ignore this email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <p style="margin:20px 0 0 0;font-size:11px;color:#34344a;text-align:center;">
            bringit-82469.web.app
          </p>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function createVerificationEmailText({ email, link, name }) {
  const firstName = name ? String(name).split(/\s+/)[0] : 'Player';
  return [
    `BRINGIT — CONFIRM YOUR EMAIL, ${firstName.toUpperCase()}`,
    '',
    `Hey ${firstName}, confirm your FAST email to enter campus: ${email}`,
    '',
    `Click this link to verify: ${link}`,
    '',
    'This link expires in 30 minutes.',
    'If you did not create a BringIt account, you can ignore this email.',
  ].join('\n');
}
