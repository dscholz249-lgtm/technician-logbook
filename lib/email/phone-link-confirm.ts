interface PhoneLinkEmailProps {
  employeeName: string;
  phone: string;
  email: string;
  confirmUrl: string;
  denyUrl: string;
}

function formatPhone(e164: string): string {
  const m = e164.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : e164;
}

export function buildPhoneLinkEmail({ employeeName, phone, email, confirmUrl, denyUrl }: PhoneLinkEmailProps): string {
  const firstName = employeeName.split(" ")[0];
  const displayPhone = formatPhone(phone);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Confirm your phone number — SkillCat Logbook</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:'Fira Sans', Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    Was this you? Confirm to link your phone to your SkillCat logbook.
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

              <!-- Heading -->
              <p style="margin:0 0 6px; font-size:11px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; color:#f97316;">
                Phone Verification
              </p>
              <h1 style="margin:0 0 20px; font-size:22px; font-weight:700; color:#fafafa; line-height:1.3;">
                Was this you?
              </h1>

              <p style="margin:0 0 24px; font-size:15px; color:#a3a3a3; line-height:1.6;">
                Hi ${firstName}, we received a request to link the following phone number to your SkillCat Logbook account at <span style="color:#fafafa;">${email}</span>.
              </p>

              <!-- Phone callout -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:#1a1a1a; border:1px solid #2a2a2a; border-left:3px solid #f97316; border-radius:8px; padding:14px 18px;">
                    <p style="margin:0 0 2px; font-size:11px; font-weight:600; letter-spacing:0.08em; text-transform:uppercase; color:#737373;">
                      Phone number
                    </p>
                    <p style="margin:0; font-size:18px; font-weight:700; color:#fafafa; font-family:monospace;">
                      ${displayPhone}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px; font-size:14px; color:#a3a3a3; line-height:1.6;">
                Once linked, texts from this number will be logged to your SkillCat Logbook automatically.
              </p>

              <!-- CTA buttons -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="padding-right:8px; width:50%;">
                    <a href="${confirmUrl}"
                       style="display:block; text-align:center; background-color:#f97316; color:#ffffff; font-size:14px; font-weight:700; text-decoration:none; padding:13px 20px; border-radius:8px;">
                      Yes, this is me
                    </a>
                  </td>
                  <td style="padding-left:8px; width:50%;">
                    <a href="${denyUrl}"
                       style="display:block; text-align:center; background-color:#1a1a1a; color:#a3a3a3; font-size:14px; font-weight:600; text-decoration:none; padding:13px 20px; border-radius:8px; border:1px solid #2a2a2a;">
                      This is not me
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0; font-size:12px; color:#525252; line-height:1.5;">
                This link expires in 24 hours. If you did not request this, click "This is not me" and we'll alert your administrator.
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
