# Technician Logbook — Agent Instructions

This is a Next.js 16 App Router app. Key conventions that differ from older Next.js:

- Middleware lives in `proxy.ts`, not `middleware.ts`. Export `proxy`, not `middleware`.
- `cookies()` is async — always `await cookies()`.
- shadcn components use the `base-nova` style (Base UI under the hood). No `asChild` — use the `render` prop for polymorphism.
- Tailwind v4 — theme tokens live in `globals.css` under `@theme inline`, not `tailwind.config.js`.

## Architecture

- **This app** (Next.js) is the dashboard UI only. It does NOT own any data.
- **Express server** (separate Railway service at `EXPRESS_API_URL`) owns the SQLite DB, handles Twilio/SMS, and exposes the REST API this app calls.
- All Express API calls are server-side only (`lib/api.ts` is `server-only`). Never call the Express API from client components.

## Data flow

- Dashboard page fetches queue and logbook via `lib/api.ts` on every request (`cache: "no-store"`).
- "Mark actioned" button triggers a Server Action (`app/(dashboard)/dashboard/actions.ts`) which calls the Express API and revalidates `/dashboard`.
- Auth is Supabase magic link. Session cookies are refreshed by `proxy.ts` on every request.

## Env vars required

See `.env.local.example`. The two new vars vs. other SkillCat projects:
- `EXPRESS_API_URL` — base URL of the Express SMS server (no trailing slash).
- `NEXT_PUBLIC_APP_ORIGIN` — canonical URL of this app (used in auth callbacks).
