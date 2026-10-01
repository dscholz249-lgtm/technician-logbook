import { redirect } from "next/navigation";

/**
 * /interest is now the site root.
 *
 * Kept as a redirect rather than deleted because the path has been handed out
 * in email and is the obvious candidate for the product's public_invite_url
 * in the Labs Console, which appends `?ref=<invite_ref>`. Nothing reads `ref`
 * today, so forwarding the query string buys nothing yet — it costs one line
 * and means wiring attribution up later does not start with a bug report.
 *
 * Temporary, not permanent: a 308 is cached hard by browsers and this product
 * is still moving its own furniture around. Worth revisiting once the URL has
 * settled.
 */
export default async function InterestRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
    else if (value !== undefined) params.set(key, value);
  }

  const query = params.toString();
  redirect(query ? `/?${query}` : "/");
}
