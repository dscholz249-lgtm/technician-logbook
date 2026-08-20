interface TechInviteEmailProps {
  firstName: string;
  companyName: string;
  managerName: string;
  loginLink: string;
  preferencesLink: string;
  smsNumber: string;
}

export function buildTechInviteEmail({
  firstName,
  companyName,
  managerName,
  loginLink,
  preferencesLink,
  smsNumber,
}: TechInviteEmailProps): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>You've been added to SkillCat Labs</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:'Fira Sans', Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
    Text photos and notes from the job — they go straight to your record.
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
                ${companyName} has added you to SkillCat Labs
              </h1>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:0 40px 16px;">
              <p style="margin:0; color:#A8A8A8; font-size:14.5px; line-height:1.65;">
                ${firstName}, ${managerName} has set you up on SkillCat Labs. From now on you can send job site photos and notes straight from your phone &mdash; no app needed, just a text message.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0; color:#A8A8A8; font-size:14.5px; line-height:1.65;">
                Everything you send lands on your record in the SkillCat dashboard, where your manager can review it. The number to text is below.
              </p>
            </td>
          </tr>

          <!-- NEW pill -->
          <tr>
            <td style="padding:0 40px 10px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#F05523; border-radius:4px; padding:3px 9px; font-size:10px; font-weight:700; letter-spacing:0.08em; color:#ffffff;">NEW</td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Phone link heading -->
          <tr>
            <td style="padding:0 40px 10px;">
              <p style="margin:0; color:#ffffff; font-size:16px; font-weight:700; line-height:1.3;">
                Link your account in 60 seconds &mdash; no login needed
              </p>
            </td>
          </tr>

          <!-- Phone link copy -->
          <tr>
            <td style="padding:0 40px 10px;">
              <p style="margin:0; color:#A8A8A8; font-size:14px; line-height:1.65;">
                Now it&apos;s even easier to sync your account with the Technician&apos;s Logbook. Simply send a text message to <span style="color:#ffffff; font-weight:600;">${smsNumber}</span> with the email address you use to log in to SkillCat and we&apos;ll take care of the rest. You&apos;ll receive an email to confirm &mdash; one click and your phone is linked.
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding:0 40px 24px;">
              <p style="margin:0; color:#A8A8A8; font-size:14px; line-height:1.65;">
                Your dashboard is still there and ready for you to review, but now you can link your account without ever needing to log in.
              </p>
            </td>
          </tr>

          <!-- Text SkillCat — primary CTA -->
          <tr>
            <td style="padding:0 40px 32px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="center" style="border-radius:8px; background-color:#F05523;">
                    <a href="sms:+12513135407" style="display:block; padding:14px 0; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; text-align:center;">
                      Text SkillCat &mdash; ${smsNumber}
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px 24px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #242424;">
                <tr><td></td></tr>
              </table>
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
                    <div style="color:#ffffff; font-size:14px; font-weight:600; margin-bottom:4px;">Send job site photos</div>
                    <div style="color:#A8A8A8; font-size:13px; line-height:1.55;">Text any photo to the SkillCat number from wherever you are. It&apos;s timestamped and filed to your record &mdash; nothing to install or log in to.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Feature 2 -->
          <tr>
            <td style="padding:0 40px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#1c1c1c; border-radius:10px; border:1px solid #242424;">
                <tr>
                  <td style="padding:18px 20px; width:40px; vertical-align:top; font-size:14px; color:#F05523; font-weight:700;">02</td>
                  <td style="padding:18px 20px 18px 0; vertical-align:top;">
                    <div style="color:#ffffff; font-size:14px; font-weight:600; margin-bottom:4px;">Log a note</div>
                    <div style="color:#A8A8A8; font-size:13px; line-height:1.55;">Site condition, job status, anything worth flagging &mdash; send it as a text and it&apos;s saved to your logbook straight away.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- SMS number callout -->
          <tr>
            <td style="padding:0 40px 28px;">
              <p style="margin:0; color:#ffffff; font-size:14.5px; line-height:1.65; font-weight:600;">
                Text ${smsNumber} from your phone. That&apos;s all it takes.
              </p>
            </td>
          </tr>

          <!-- Sign in text link -->
          <tr>
            <td style="padding:0 40px 36px; text-align:center;">
              <a href="${loginLink}" target="_blank" style="color:#5a5a5a; font-size:13px; text-decoration:underline;">
                Sign in to your profile
              </a>
            </td>
          </tr>

        </table>

        <!-- Footer -->
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; padding:20px 40px;">
          <tr>
            <td style="color:#5a5a5a; font-size:11.5px; line-height:1.6; text-align:center;">
              SkillCat Inc. &middot; Sent to technicians at ${companyName}<br>
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
