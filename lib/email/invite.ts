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
    You&apos;re in &mdash; assign training, capture job site photos, and keep technician records, all by text.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#141414; border-radius:12px; overflow:hidden; border:1px solid #242424;">

          <!-- Eyebrow pill -->
          <tr>
            <td style="padding:36px 40px 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="border:1px solid #F05523; border-radius:20px; padding:5px 12px; font-size:10.5px; font-weight:700; letter-spacing:0.08em; color:#F05523;">
                    EARLY ACCESS
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Headline -->
          <tr>
            <td style="padding:14px 40px 8px;">
              <h1 style="margin:0; color:#ffffff; font-size:23px; font-weight:700; line-height:1.25; letter-spacing:-0.01em;">
                Welcome to SkillCat Labs, ${firstName}
              </h1>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:0 40px 16px;">
              <p style="margin:0; color:#A8A8A8; font-size:14.5px; line-height:1.65;">
                Most of what you learn about a technician happens on the jobsite. That&apos;s where you decide what course they need next, and where they&apos;re doing the work worth documenting. By the time you&apos;re at a desk, the detail is gone.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 16px;">
              <p style="margin:0; color:#A8A8A8; font-size:14.5px; line-height:1.65;">
                SkillCat Labs puts that workflow in a text message. You assign training from the field. Your techs send photos straight from the job. Everything lands on their record, ready when you need it.
              </p>
            </td>
          </tr>

          <!-- Example SMS -->
          <tr>
            <td style="padding:4px 40px 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="background-color:#1a1a1a; border-left:3px solid #F05523; border-radius:0 8px 8px 0;">
                <tr>
                  <td style="padding:14px 18px; font-size:13.5px; color:#d8d8d8; font-style:italic; line-height:1.6;">
                    &ldquo;Sign up David for the HVAC Level 2 course.&rdquo;
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0; color:#A8A8A8; font-size:14.5px; line-height:1.65;">
                No app to install, no login to remember. Just text your SkillCat number.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 16px;">
              <p style="margin:0; color:#ffffff; font-size:14px; font-weight:600;">
                Here&apos;s what you can do:
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
                    <div style="color:#ffffff; font-size:14px; font-weight:600; margin-bottom:4px;">Assign training by text</div>
                    <div style="color:#A8A8A8; font-size:13px; line-height:1.55;">Tell us who and which course. Not sure what&apos;s available? Ask and we&apos;ll pull up the catalog. We handle the assignment from there.</div>
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
                    <div style="color:#ffffff; font-size:14px; font-weight:600; margin-bottom:4px;">Your techs can log job site photos</div>
                    <div style="color:#A8A8A8; font-size:13px; line-height:1.55;">Technicians text a photo or a note straight from the job. It&apos;s filed against their record, timestamped and you get a notification that they&apos;ve sent something in.</div>
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
                    <div style="color:#ffffff; font-size:14px; font-weight:600; margin-bottom:4px;">See it all in your dashboard</div>
                    <div style="color:#A8A8A8; font-size:13px; line-height:1.55;">Every training request, photo, and note organized by technician. Review, track, and manage your whole crew from one place.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SMS number callout -->
          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0; color:#ffffff; font-size:14.5px; line-height:1.65; font-weight:600;">
                All of that from a quick text to (251) 313-5407. That&apos;s it.
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
