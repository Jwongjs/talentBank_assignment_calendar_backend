# Talentbank Career Fair Calendar

Event calendar and admin dashboard for Talentbank career fairs, built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, and Supabase Postgres via Prisma.

- **`/`** — public event calendar (grid/list views, registration with email verification and automatic waitlisting)
- **`/admin`** — coordinator dashboard (month calendar, inline edit, clash-aware scheduling), gated by a real Supabase Auth login at `/admin/login`

## Tech stack

- Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons
- Postgres hosted on [Supabase](https://supabase.com), accessed via [Prisma ORM](https://www.prisma.io)
- Supabase Auth (`@supabase/ssr`) for admin sign-in and attendee email verification
- Deployed on [Vercel](https://vercel.com)

## 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. **Database connection strings** — Project Settings -> Database -> Connection string:
   - **Transaction pooler** (port `6543`) -> `DATABASE_URL`, used by the app at runtime.
   - **Session pooler** (port `5432`, same host) -> `DIRECT_URL`, used only for migrations.
3. **API keys** — Project Settings -> API:
   - **Project URL** -> `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** -> `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe to expose client-side by design — do not use the `service_role` secret key here)
4. **Enable code-based email verification** — Authentication -> Email Templates -> "Magic Link": make sure the template includes `{{ .Token }}` (the 6-digit code), not just the confirmation link, since the registration form asks attendees to type in a code rather than click a link. Supabase's default template already includes `{{ .Token }}`; if you've customized it, keep that placeholder.
5. **Create admin account(s)** — Authentication -> Users -> Add user. There's no public admin signup page by design; add each admin's email + password here directly.

## 2. Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env`:
- `DATABASE_URL` / `DIRECT_URL` — from step 1.2
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from step 1.3
- `ADMIN_EMAILS` — comma-separated list of the email(s) you added in step 1.5 (e.g. `alice@talentbank.com,bob@talentbank.com`). Only these accounts can sign in to `/admin`.

Apply the schema and load demo data:

```bash
npx prisma migrate deploy   # creates the Event/Registration tables
npx prisma db seed          # loads 3 example career fairs
npm run dev
```

Visit `http://localhost:3000` for the public calendar and `http://localhost:3000/admin` for the dashboard.

> The schema lives in `prisma/schema.prisma`; the initial migration is already committed in `prisma/migrations`, so `migrate deploy` just applies it — no live DB is needed to generate migrations yourself.

## 3. Push to GitHub

The remote is already configured locally (`origin` -> `https://github.com/Jwongjs/talentBank_assignment_calendar_backend.git`). Push when ready:

```bash
git push -u origin main
```

## 4. Deploy to Vercel

Once the code is on GitHub, use this button (or import the repo manually at [vercel.com/new](https://vercel.com/new)):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/Jwongjs/talentBank_assignment_calendar_backend&env=DATABASE_URL,DIRECT_URL,NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY,ADMIN_EMAILS&envDescription=Supabase%20connection%20strings%2C%20API%20keys%2C%20and%20admin%20email%20allowlist%20(see%20.env.example)&project-name=talentbank-event-calendar&repository-name=talentbank-event-calendar)

When prompted, paste in the same five values from your local `.env`. Vercel will install dependencies, run `prisma generate` automatically (wired into the `build` script), and deploy — no separate migration step needed in production, since it's pointed at the same Supabase database you already migrated in step 2.

**Important:** in Supabase Authentication -> URL Configuration, add your Vercel domain (e.g. `https://your-app.vercel.app`) to **Site URL** and **Redirect URLs** — required for auth to work from the deployed app, not just localhost.

After that, every push to `main` redeploys automatically.

## How auth works

- **Admin** (`src/middleware.ts`, `src/app/actions/auth.ts`, `src/lib/admin-auth.ts`): real Supabase Auth accounts, email+password. `middleware.ts` checks for a valid Supabase session on every `/admin/*` request and additionally checks the signed-in email against `ADMIN_EMAILS`. Non-admin Supabase accounts are signed out immediately if they somehow reach the login form. No public signup — accounts are created in the Supabase dashboard.
- **Candidates/employers** (`src/app/actions/auth.ts` `sendRegistrationOtp`/`verifyRegistrationOtp`, wired into `src/app/page.tsx`): registering is a two-step flow — fill in name/email/type, get emailed a 6-digit code, enter it to confirm. This proves the email is real without creating a persistent account: `handleRegistration` in `src/app/actions/events.ts` requires a verified Supabase session matching the submitted email, and signs it out immediately after the registration is created. There's no login, password, or "my registrations" page for attendees — same one-shot flow as before, just with a verified email now.

## Notes

- Event cancellation fires a mock notification webhook (`console.log` in `src/app/actions/events.ts`) — swap in a real provider call when one exists.
