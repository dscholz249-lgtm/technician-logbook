import "server-only";
import { env } from "./env";

export function generateVCard(): string | null {
  const phone = env.SKILLCAT_SMS_PHONE;
  if (!phone) return null;

  return [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "FN:SkillCat",
    "N:;SkillCat;;;",
    "ORG:SkillCat",
    `TEL;TYPE=CELL,PREF:${phone}`,
    "NOTE:Text this number to manage training requests\\, log technician notes\\, and more — no app required.",
    "URL:https://tryskillcat.com",
    "END:VCARD",
  ].join("\r\n");
}
