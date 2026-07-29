# Talentbank Career Fair Calendar

Event calendar and admin dashboard for Talentbank career fairs, built with Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui, and Supabase Postgres via Prisma.

- **`/`** — public event calendar (grid/list views, registration with automatic waitlisting)
- **`/admin`** — coordinator dashboard (month calendar, inline edit, clash-aware scheduling), gated by a password at `/admin/login`

## Tech stack

- Next.js 14 App Router, TypeScript, Tailwind CSS, shadcn/ui, Lucide icons
- Postgres hosted on [Supabase](https://supabase.com), accessed via [Prisma ORM](https://www.prisma.io)
- Deployed on [Vercel](https://vercel.com)

## 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com/dashboard).
2. In the dashboard, go to **Project Settings -> Database -> Connection string**.
3. You need two connection strings:
   - **Transaction pooler** (port `6543`) -> this is `DATABASE_URL`, used by the app at runtime.
   - **Direct connection** (port `5432`) -> this is `DIRECT_URL`, used only for running migrations.

## 2. Local setup

```bash
npm install
cp .env.example .env
```

Fill in `.env` with the two Supabase connection strings from step 1, plus an `ADMIN_PASSWORD` of your choice (defaults to `talentbank2026` if left blank).

Apply the schema and load demo data:

```bash
npx prisma migrate deploy   # creates the Event/Registration tables
npx prisma db seed          # loads 3 example career fairs
npm run dev
```

Visit `http://localhost:3000` for the public calendar and `http://localhost:3000/admin` for the dashboard.

> The schema lives in `prisma/schema.prisma`; the initial migration is already committed in `prisma/migrations`, so `migrate deploy` just applies it — no live DB is needed to generate migrations yourself.

## 3. Push to GitHub

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

(Create the empty repo on GitHub first if you haven't — no README/license/gitignore, since this project already has them.)

## 4. Deploy to Vercel

Once the code is on GitHub, replace `<your-username>/<your-repo>` below with your repo path and use this button (or import the repo manually at [vercel.com/new](https://vercel.com/new)):

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/<your-username>/<your-repo>&env=DATABASE_URL,DIRECT_URL,ADMIN_PASSWORD&envDescription=Supabase%20connection%20strings%20(see%20.env.example)%20and%20an%20admin%20password&project-name=talentbank-event-calendar&repository-name=talentbank-event-calendar)

When prompted, paste in the same `DATABASE_URL`, `DIRECT_URL`, and `ADMIN_PASSWORD` values from your local `.env`. Vercel will install dependencies, run `prisma generate` automatically (wired into the `build` script), and deploy — no separate migration step needed in production, since it's pointed at the same Supabase database you already migrated in step 2.

After that, every push to `main` redeploys automatically.

## Notes

- `ADMIN_PASSWORD` gates `/admin` via `src/middleware.ts` with a signed session cookie — see `src/app/actions/auth.ts`. It's a single shared password, not per-user accounts (there's no user table in the schema).
- Event cancellation fires a mock notification webhook (`console.log` in `src/app/actions/events.ts`) — swap in a real provider call when one exists.
