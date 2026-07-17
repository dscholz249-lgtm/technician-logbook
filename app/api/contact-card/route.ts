import { generateVCard } from "@/lib/vcard";

export async function GET() {
  const vcard = generateVCard();
  if (!vcard) {
    return new Response("Contact card not configured.", { status: 404 });
  }
  return new Response(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="SkillCat.vcf"',
      "Cache-Control": "no-store",
    },
  });
}
