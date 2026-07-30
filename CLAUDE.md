# Talentbank Event Calendar — Project Instructions

You are an expert full-stack engineer building an Event Calendar with Easy Editing for Talentbank (career fairs platform).

The deadline is strict, so write highly modular, clean, and complete production code without placeholders or comments like "// implement later".

## Tech Stack

- Next.js 14+ (App Router)
- TypeScript & Tailwind CSS
- shadcn/ui components (Dialog, Card, Button, Input, Select, Badge, use-toast)
- Lucide React for icons
- Postgres hosted on Supabase, accessed via Prisma ORM (`prisma/schema.prisma`), through direct async server actions in `src/app/actions/`. Client singleton in `src/lib/prisma.ts`. See README.md for Supabase/Vercel setup.
- Auth via Supabase Auth (`@supabase/ssr`): admins sign in with real accounts (email+password, checked against `ADMIN_EMAILS`), candidates/employers verify their email with a one-time code at registration time (no persistent attendee accounts). See `src/lib/supabase/`, `src/app/actions/auth.ts`, `src/middleware.ts`.

## Database Fields

**Event**: `id`, `title`, `description`, `start_date`, `end_date`, `location`, `capacity`, `current_registrations`, `status` ('Published', 'Draft', 'Cancelled')

**Registration**: `id`, `event_id`, `attendee_name`, `attendee_email`, `registration_type` ('Candidate', 'Employer'), `status` ('Confirmed', 'Waitlist')

## Core Constraints to Implement

1. **Clash Prevention**:
   - Venue clash: warn or prevent moving/creating an event if another event is in the same location at the same overlapping time.
   - Attendee clash: warn a candidate or employer if they try to register for an event that overlaps in time with another event they're already registered for (Confirmed or Waitlist), letting them confirm anyway if they choose.
2. **Capacity Auto-Waitlist**: When `current_registrations >= capacity`, automatically route registration status to 'Waitlist'.
3. **Cancellation States**: Gray out, disable registration form, and send a real cancellation email to every registered attendee.
