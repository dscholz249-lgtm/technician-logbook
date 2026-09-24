interface OptOutEmailProps {
  employeeName: string;
  phone: string;
  smsNumber: string;
}

function formatPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

function toE164(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw.startsWith("+") ? raw : `+${digits}`;
}

export function buildOptOutEmail({ employeeName, phone, smsNumber }: OptOutEmailProps): string {
  const firstName = employeeName.split(" ")[0];
  const displayPhone = formatPhone(phone);
  const smsE164 = toE164(smsNumber);
  const displaySmsNumber = formatPhone(smsE164);
  // `?&body=` is the cross-platform form: iOS expects `&body=`, Android `?body=`.
  // Writing both separators keeps one href working on each.
  const startHref = `sms:${smsE164}?&body=START`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You've opted out of SkillCat texts</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:'Fira Sans', Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    You won't receive course recommendations or be able to log notes by text until you opt back in.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a; padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:32px;">
              <span style="font-size:13px; font-weight:700; letter-spacing:0.12em; text-transform:uppercase; color:#f97316;">
                SkillCat Labs
              </span>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background-color:#141414; border:1px solid #262626; border-radius:12px; padding:36px 32px;">

              <p style="margin:0 0 6px; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#f97316;">
                Text messages paused
              </p>
              <h1 style="margin:0 0 20px; font-size:22px; font-weight:700; color:#fafafa; line-height:1.3;">
                You've opted out of SkillCat texts
              </h1>

              <p style="margin:0 0 24px; font-size:15px; color:#a3a3a3; line-height:1.6;">
                Hi ${firstName}, you replied STOP from <span style="color:#fafafa; font-family:monospace;">${displayPhone}</span>, so we've stopped texting that number.
              </p>

              <!-- What this means -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#1a1a1a; border:1px solid #2a2a2a; border-left:3px solid #f97316; border-radius:8px; padding:16px 18px;">
                    <p style="margin:0 0 8px; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#737373;">
                      While you're opted out
                    </p>
                    <p style="margin:0 0 6px; font-size:14px; color:#d4d4d4; line-height:1.6;">
                      You won't get course recommendations by text.
                    </p>
                    <p style="margin:0; font-size:14px; color:#d4d4d4; line-height:1.6;">
                      You can't log notes or send job site photos by text.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 20px; font-size:14px; color:#a3a3a3; line-height:1.6;">
                To turn texts back on, send us a message that says START. Tap the button below and your messages app will open with it ready to send.
              </p>

              <!-- CTA -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td style="background-color:#f97316; border-radius:8px;">
                    <a href="${startHref}"
                       style="display:block; width:100%; padding:14px 0; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; text-align:center; box-sizing:border-box;">
                      Text START to turn texts back on
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0; font-size:12px; color:#525252; line-height:1.5;">
                If the button doesn't open your messages app, text START to
                <span style="color:#a3a3a3; font-family:monospace;">${displaySmsNumber}</span> from ${displayPhone}.
                You'll keep full access to your dashboard either way.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px; text-align:center;">
              <p style="margin:0; font-size:12px; color:#404040;">
                SkillCat Labs · Technician Logbook
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
