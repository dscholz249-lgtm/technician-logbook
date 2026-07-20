import { env } from "@/lib/env";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get("url");
  if (!url) return new Response("url required", { status: 400 });

  const expressUrl = `${env.EXPRESS_API_URL}/api/media-proxy?url=${encodeURIComponent(url)}`;
  const upstream = await fetch(expressUrl, {
    headers: { Authorization: `Bearer ${env.EXPRESS_API_SECRET}` },
    cache: "no-store",
  });

  if (!upstream.ok) return new Response("upstream error", { status: upstream.status });

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
  const buf = await upstream.arrayBuffer();
  return new Response(buf, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "private, max-age=86400",
    },
  });
}
