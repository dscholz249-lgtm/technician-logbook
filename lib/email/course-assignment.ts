// PRD-436: emailed to a technician when their manager assigns a course by text.
// Same dark card styling as the tech invite (lib/email/tech-invite.ts).

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function buildCourseAssignmentEmail({
  firstName,
  managerName,
  companyName,
  courseName,
  courseLink,
}: {
  firstName: string;
  managerName: string;
  companyName: string;
  courseName: string;
  courseLink: string;
}): string {
  const f = esc(firstName), m = esc(managerName), c = esc(companyName), course = esc(courseName), link = esc(courseLink);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New course assigned: ${course}</title>
</head>
<body style="margin:0; padding:0; background-color:#0a0a0a; font-family:'Fira Sans', Arial, Helvetica, sans-serif;">
  <div style="display:none; max-height:0; overflow:hidden; opacity:0;">${m} has assigned you ${course}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a; padding:40px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px; width:100%; background-color:#141414; border-radius:12px; overflow:hidden; border:1px solid #242424;">
          <tr>
            <td style="padding:36px 40px 0;">
              <span style="border:1px solid #F05523; border-radius:20px; padding:5px 12px; font-size:10.5px; font-weight:700; letter-spacing:0.08em; color:#F05523;">NEW COURSE</span>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 40px 0; color:#f5f5f5; font-size:22px; font-weight:700; line-height:1.3;">
              Hi ${f}, ${m} has assigned you ${course}
            </td>
          </tr>
          <tr>
            <td style="padding:14px 40px 0; color:#a3a3a3; font-size:15px; line-height:1.6;">
              Your manager at ${c} wants you to take this course on SkillCat. Open it with the button below.
            </td>
          </tr>
          <tr>
            <td style="padding:28px 40px 0;">
              <a href="${link}" style="display:inline-block; background-color:#F05523; color:#ffffff; font-size:15px; font-weight:700; text-decoration:none; padding:13px 26px; border-radius:8px;">Start the course</a>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 40px 36px; color:#737373; font-size:12.5px; line-height:1.6;">
              Or paste this link into your browser:<br><a href="${link}" style="color:#a3a3a3;">${link}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
