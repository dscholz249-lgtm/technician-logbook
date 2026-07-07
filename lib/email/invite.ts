interface InviteEmailProps {
  firstName: string;
  companyName: string;
  loginLink: string;
  preferencesLink: string;
  origin: string;
}

export function buildInviteEmail({
  firstName,
  companyName,
  loginLink,
  preferencesLink,
  origin,
}: InviteEmailProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Welcome to SkillCat Labs</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:'Fira Sans', Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    You&apos;re in &mdash; here&apos;s how to request updates over text.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#141414; border-radius:12px; overflow:hidden; border:1px solid #242424;">

          <!-- Header -->
          <tr>
            <td style="padding:32px 40px 8px;">
              <img src="${origin}/images/skillcat-labs-logo.png" alt="SkillCat Labs" width="120" style="display:block; max-width:120px;" />
            </td>
          </tr>

          <tr>
            <td style="padding:16px 40px 8px;">
              <h1 style="margin:0; color:#ffffff; font-size:23px; font-weight:700; letter-spacing:-0.01em;">
                Welcome to SkillCat Labs, ${firstName}
              </h1>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 16px;">
              <p style="margin:0; color:#A8A8A8; font-size:14.5px; line-height:1.65;">
                We appreciate your dedication to helping develop the future of SkillCat.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 16px;">
              <p style="margin:0; color:#A8A8A8; font-size:14.5px; line-height:1.65;">
                The experiment you&apos;ve signed up for is to request updates to your technicians over text. No app, no login to remember. When someone on your crew needs a new certification, or you want to flag that they&apos;re ready for more responsibility, just send a text to your SkillCat number:
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:4px 40px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a; border-left:3px solid #F05523; border-radius:0 8px 8px 0;">
                <tr>
                  <td style="padding:14px 18px; font-size:13.5px; color:#d8d8d8; font-style:italic; line-height:1.6;">
                    &ldquo;Sign up David for the Onboarding course.&rdquo;
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0; color:#A8A8A8; font-size:14.5px; line-height:1.65;">
                No need to write it down for later on a scrap of paper &mdash; now you can make your request right from the field.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 16px;">
              <p style="margin:0; color:#ffffff; font-size:14px; font-weight:600;">
                For now we&apos;ll be supporting the following actions via text:
              </p>
            </td>
          </tr>

          <!-- Feature 1 -->
          <tr>
            <td style="padding:0 40px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1c1c1c; border-radius:10px; border:1px solid #242424;">
                <tr>
                  <td style="padding:18px 20px; width:40px; vertical-align:top; font-size:14px; color:#F05523; font-weight:700;">01</td>
                  <td style="padding:18px 20px 18px 0; vertical-align:top;">
                    <div style="color:#ffffff; font-size:14px; font-weight:600; margin-bottom:4px;">Lookup and Assign courses</div>
                    <div style="color:#A8A8A8; font-size:13px; line-height:1.55;">Just let us know who you want to assign and which course you want to assign them to. Don&apos;t know which course? Just ask. We&apos;ll take care of the rest.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Feature 2 -->
          <tr>
            <td style="padding:0 40px 14px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1c1c1c; border-radius:10px; border:1px solid #242424;">
                <tr>
                  <td style="padding:18px 20px; width:40px; vertical-align:top; font-size:14px; color:#F05523; font-weight:700;">02</td>
                  <td style="padding:18px 20px 18px 0; vertical-align:top;">
                    <div style="color:#ffffff; font-size:14px; font-weight:600; margin-bottom:4px;">Add new technicians</div>
                    <div style="color:#A8A8A8; font-size:13px; line-height:1.55;">Tell us the new tech&apos;s name and email address and we&apos;ll add them to your roster so they&apos;re ready to assign.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Feature 3 -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1c1c1c; border-radius:10px; border:1px solid #242424;">
                <tr>
                  <td style="padding:18px 20px; width:40px; vertical-align:top; font-size:14px; color:#F05523; font-weight:700;">03</td>
                  <td style="padding:18px 20px 18px 0; vertical-align:top;">
                    <div style="color:#ffffff; font-size:14px; font-weight:600; margin-bottom:4px;">Leave a note</div>
                    <div style="color:#A8A8A8; font-size:13px; line-height:1.55;">Want to leave a note about a technician for later? Let SkillCat know and we&apos;ll save it to their record in your Labs Dashboard.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SMS screenshot -->
          <tr>
            <td style="padding:0 40px 28px;">
              <img src="${origin}/images/sms-example.png" alt="Example SMS conversation" width="520" style="display:block; max-width:100%; border-radius:10px;" />
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 8px;">
              <p style="margin:0; color:#ffffff; font-size:14.5px; line-height:1.65; font-weight:600;">
                All of that from just a quick text message to (251) 313-5407. That&apos;s it.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0; color:#A8A8A8; font-size:14.5px; line-height:1.65;">
                Your dashboard gives you a full view of every request your team has made, and lets you action them in one place.
              </p>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td style="padding:0 40px 36px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="border-radius:8px; background-color:#F05523;">
                    <a href="${loginLink}" target="_blank" style="display:block; padding:14px 0; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; text-align:center;">
                      View your Labs Dashboard
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; padding:20px 40px;">
          <tr>
            <td style="color:#5a5a5a; font-size:11.5px; line-height:1.6; text-align:center;">
              SkillCat Inc. &middot; Sent to Field Managers of ${companyName}<br>
              <a href="${preferencesLink}" style="color:#5a5a5a; text-decoration:underline;">Manage preferences</a>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;
}
