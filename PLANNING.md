# SkillCat Technician Logbook — Project Brief

> This document is for handing context to a new Claude instance. It covers architecture, data models, features, conventions, and open questions for planning purposes.

---

## What this is

SkillCat is an SMS-first field team management platform for trade companies (HVAC, plumbing, electrical, etc.). It lets managers assign training and log notes via text message and lets technicians upload job site photos by texting. No app required for either party.

The product is in an **early-access / pilot phase**. The codebase is two services deployed on Railway.

---

## Two services

### 1. `skillcat-technician-logbook` — Next.js 16 (App Router)

The main web application. Hosts the manager dashboard, admin dashboard, technician portal, public-facing pages, and the Supabase-backed data layer.

**Repo:** `github.com/dscholz249-lgtm/technician-logbook`  
**Stack:** Next.js 16.2.9 · TypeScript · Tailwind CSS · shadcn/ui · Supabase (Postgres + Auth) · Resend (email) · Sentry · PostHog

### 2. `skillcat-sms-miniapp` — Express

Handles all SMS/MMS I/O via Twilio webhook. Maintains its own SQLite database. The Next.js app communicates with this service over a shared Bearer secret.

**Repo:** `github.com/dscholz249-lgtm/skillcat-sms-miniapp`  
**Stack:** Express 4 · better-sqlite3 · Twilio SDK · Anthropic Claude API (intent parsing) · Sentry

---

## Deployment

Both services run on **Railway**. Pushing to `main` triggers an automatic deploy on each repo. There is no staging branch — large features should be developed on a `staging` branch before merging to `main`.

---

## User roles

| Role | Table | Portal | Description |
|---|---|---|---|
| Admin | N/A (env var whitelist) | `/dashboard` | SkillCat staff. Manages all companies and users. |
| Director | `managers` (role=director) | `/manager` | Company leadership. Can add managers, view all logbook data. |
| Manager | `managers` (role=manager) | `/manager` | Day-to-day team lead. Sends training requests, views technician logs. |
| Technician | `technicians` | `/tech` | Field workers. Texts in photos/updates. Limited portal view. |

Admins are identified by email address via `ADMIN_EMAILS` env var (comma-separated). There is no admin role in Supabase — it is a Next.js-only check.

---

## Authentication

- **Magic link only** — Supabase Auth sends a one-time email link.
- The sign-in action (`app/auth/sign-in/actions.ts`) checks the user's email against `managers` and `technicians` tables before sending the link. Unknown emails are rejected with an error message.
- After magic link callback (`app/auth/callback/route.ts`), users are redirected based on their role:
  - Admin → `/dashboard`
  - Manager/Director → `/manager`
  - Technician → `/tech`
- **Impersonation:** Admins can impersonate any user via a `skillcat_impersonate` httpOnly cookie set by `startImpersonation()`. The cookie contains `{ email, name, role }`. Both the manager and technician layouts read this cookie when the authenticated user is an admin. An amber banner is shown while impersonating with an Exit button.

---

## Supabase schema (Postgres)

### `companies`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| name | text | |
| industry | text | nullable |
| size | text | nullable |
| created_at / updated_at | timestamptz | |

### `managers`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| name | text | |
| email | text | |
| phone | text | E.164, nullable |
| role | text | `manager` or `director` |
| reminder_preference | text | `never` / `daily` / `weekly` |
| deleted_at | timestamptz | soft delete |
| created_at / updated_at | timestamptz | |

### `technicians`
| column | type | notes |
|---|---|---|
| id | uuid PK | |
| company_id | uuid FK → companies | |
| name | text | |
| email | text | nullable |
| phone | text | E.164, nullable |
| title | text | e.g. "HVAC Tech", nullable |
| created_at | timestamptz | |

### `urgent_requests`
Help requests submitted by managers from the manager portal. Status: `open` / `resolved`.

### `interest_requests`
Public waitlist signups from `/interest`. Fields: `name`, `email`, `company_name`, `team_size`, `status` (`pending` / `contacted` / `created`).

---

## SQLite schema (Express — `skillcat-sms-miniapp`)

All data in a single SQLite file (`data/logbook.db`).

### `employees`
Snapshot of Supabase managers + technicians, synced on every company save via `/api/snapshot/ingest`. Used for phone-number lookups at message time. Technicians have non-Manager titles; managers have `title = 'Manager'`.

### `message_log`
Every inbound/outbound SMS. Column `manager_phone` is misnamed — it stores the phone of any sender (manager or technician). `direction` = `in` / `out`. `created_at` = ISO text string.

### `logbook_entries`
Structured records written when managers request training or technicians send updates. `manager_phone = ''` marks technician-originated entries. `employee_id` links to `employees.id`. `body` can be plain text or JSON (`{ text, media: [{url, contentType}] }` for MMS).

### `technician_media`
Secondary index of media sent by technicians. `technician_id` + `technician_phone` for lookup. `media_url` is a Twilio-signed URL.

### `action_queue`
Pending manager requests awaiting human review. Status: `pending` / `actioned` / `failed`.

### `sessions`
Tracks the multi-step conversation state for managers (e.g. mid-flow training request). Keyed on `manager_phone`.

---

## Key data flows

### Inbound SMS/MMS
```
Twilio → POST /twilio/inbound (Express)
  → validateSignature middleware (403 if invalid)
  → checkRateLimit (10 msg/min per sender, in-memory)
  → handleInbound()
      if technician → handleTechnicianInbound() → logbook entry + Twilio notify manager
      if manager    → conversation state machine (parse intent → assign training / add employee / etc.)
      if unknown    → silent drop (no reply, no cost)
```

### Manager dashboard data
```
Next.js page (server component)
  → Supabase: companies + managers + technicians
  → Express API (/api/queue, /api/logbook, /api/analytics, /api/last-active)
  → merged and rendered server-side
```

### Media proxy
Twilio media URLs require HTTP Basic Auth. The Next.js `/api/media` route proxies requests to Express `/api/media-proxy`, which adds the Twilio credentials. Plain `<img src="/api/media?url=...">` is used everywhere — **never** Next.js `<Image>` component for Twilio URLs (the Next.js image optimizer self-fetches internally which fails on Railway).

### Company sync
When a company is saved in the admin dashboard, `syncCompanyToExpress()` posts the full employee snapshot to `/api/snapshot/ingest`. This keeps the Express `employees` table in sync for phone-based lookups.

---

## Route map

### Next.js

| Path | Auth | Description |
|---|---|---|
| `/` | None | Redirect to sign-in |
| `/auth/sign-in` | None | Magic link form |
| `/auth/callback` | None | Supabase callback, role-based redirect |
| `/auth/sign-out` | None | Clears session |
| `/manager` | Manager/Director | Logbook dashboard — action queue, tech cards |
| `/manager/technician/[id]` | Manager/Director | Technician detail page with photo grid + activity log |
| `/tech` | Technician | Technician portal — phone, contact card, message history |
| `/dashboard` | Admin | Pending requests (global queue) |
| `/dashboard/companies` | Admin | Company list + create/edit |
| `/dashboard/companies/[id]` | Admin | Single company detail |
| `/dashboard/managers` | Admin | All users table with last-active |
| `/dashboard/logbook` | Admin | Global logbook entries |
| `/dashboard/analytics` | Admin | Per-company + global analytics |
| `/dashboard/urgent-requests` | Admin | Help requests from managers |
| `/dashboard/interest` | Admin | Waitlist/interest signups |
| `/join/[companyId]` | None | Manager self-signup for a company |
| `/interest` | None | Public interest/waitlist page |
| `/api/media` | None | Twilio media proxy |
| `/api/health` | None | Health check |

### Express (`/api/*` all require Bearer token)

| Path | Description |
|---|---|
| `POST /twilio/inbound` | Twilio webhook (no Bearer, uses X-Twilio-Signature) |
| `GET /api/queue` | Action queue (filter by company, manager phone, status) |
| `POST /api/queue/:id/action` | Mark queue item actioned |
| `GET /api/logbook` | Logbook entries (filter by company, manager, technician_id) |
| `GET /api/analytics` | Per-company analytics (messages, DAU, MAU, retention) |
| `GET /api/analytics/global` | Global aggregate analytics |
| `GET /api/last-active` | Last inbound message timestamp per phone list |
| `POST /api/snapshot/ingest` | Sync company employee data from Supabase |
| `GET /api/technician-media` | Media sent by a specific technician |
| `GET /api/media-proxy` | Proxies Twilio media URLs with Basic Auth credentials |
| `GET /health` | Health check |

---

## Admin features

- **Company management:** Create companies with directors, managers, and technicians. Supports manual entry or CSV import (auto-detects single-role vs multi-role `role,name,email` format).
- **User management:** Unified edit modal — all fields (Name, Email, Phone, Role, Company, Title) for all user types. Cross-table role changes supported (Technician ↔ Manager/Director).
- **Impersonation:** Admin can view the app as any user from the Users table (eye icon on hover).
- **Last active:** Users table shows when each user last interacted via SMS.
- **Interest requests:** Waitlist signups from `/interest` with status tracking.
- **Urgent requests:** Help requests from managers in the field.

---

## SMS / conversation engine

The Express app includes a multi-step conversation state machine (`lib/conversation.js`) and an LLM intent parser (`lib/parse.js` via Anthropic API) for manager flows. Key intents:

- `assign_training` — assigns a certification/course to a technician
- `add_employee` — registers a new technician
- `query_catalog` — lists available training courses
- `human_review` — escalates unclear messages to the admin queue

The Anthropic model and key are configured via env vars (`ANTHROPIC_MODEL`, `ANTHROPIC_API_KEY`).

---

## Environment variables

### Next.js (`skillcat-technician-logbook`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key for admin DB ops |
| `EXPRESS_API_URL` | Yes | Internal URL of Express service |
| `EXPRESS_API_SECRET` | Yes | Shared Bearer token |
| `ADMIN_EMAILS` | Yes | Comma-separated admin email list |
| `SKILLCAT_SMS_PHONE` | Yes | The Twilio number shown in the UI |
| `SLACK_WEBHOOK_URL` | No | Webhook for Slack notifications |
| `RESEND_API_KEY` | No | Transactional email |
| `SENTRY_DSN` | No | Error tracking |
| `NEXT_PUBLIC_POSTHOG_KEY` | No | Analytics |
| `NEXT_PUBLIC_POSTHOG_HOST` | No | PostHog instance URL |

### Express (`skillcat-sms-miniapp`)

| Variable | Required | Description |
|---|---|---|
| `API_SECRET` | Yes | Bearer token for `/api/*` routes |
| `TWILIO_ACCOUNT_SID` | Yes | Twilio credentials |
| `TWILIO_AUTH_TOKEN` | Yes | Used for signature validation |
| `TWILIO_MESSAGING_SERVICE_SID` | Yes | Twilio messaging service |
| `PUBLIC_BASE_URL` | Yes | Public URL of this service (for signature validation) |
| `NEXTJS_URL` | Yes | URL of Next.js app (for deep links in SMS) |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | For direct DB writes (if needed) |
| `ANTHROPIC_API_KEY` | Yes | Intent parsing |
| `ANTHROPIC_MODEL` | No | Defaults to a Claude model |
| `SYNC_SECRET` | Yes | Guards `/api/snapshot/ingest` |
| `SENTRY_DSN` | No | Error tracking |

---

## Security

- Twilio webhook signature validated on every inbound request (`lib/twilio.js`)
- Per-sender rate limit: 10 messages/min per phone (in-memory, resets on restart)
- Unknown phone numbers silently dropped — no reply, no Twilio cost
- All Express `/api/*` routes require `Authorization: Bearer <API_SECRET>`
- Admin gating is email-based (`ADMIN_EMAILS` env var), checked server-side on every admin action

---

## Important conventions

- **Next.js 16:** `params` in route segments is a `Promise<{...}>` — always `await params` before using.
- **Media:** Use plain `<img>` (not Next.js `<Image>`) for any URL going through `/api/media`. The Next.js optimizer breaks Twilio proxy fetches in production.
- **Server actions** are used for all form submissions throughout the app. They follow the pattern of `requireAdmin()` / `requireManager()` at the top and return `{ error?: string }`.
- **DB access:** All Supabase operations use the admin client (`createAdminClient()`) for writes, and the user client (`createClient()`) only for reading the current session.
- **Impersonation** is implemented as a cookie, never by modifying the Supabase session. Both layout and page components must read the cookie independently — the layout validates it but does not pass the resolved user down to the page.
- **Company sync:** After any change to managers or technicians, call `syncCompanyToExpress()` to keep the Express `employees` table in sync.

---

## Known limitations / open items

- Technicians cannot be soft-deleted (no `deleted_at` column) — deletion is hard delete.
- The `employees` table in SQLite is a snapshot — it can drift if a Railway deploy restarts before a sync occurs (rare; sync happens on every company save).
- Reminders (daily/weekly digests to managers) run via the Express cron in `lib/reminders.js` — these depend on managers having phone numbers set.
- The LLM intent parser (`lib/parse.js`) runs on every inbound manager message. If Anthropic API is down, messages fall back to the `human_review` queue.
- There is no pagination on any dashboard table — this will become a concern at larger company counts.
- The `/interest` page is public and unprotected. The form has basic email validation but no CAPTCHA.
