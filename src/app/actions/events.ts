'use server';

import type {
  Event as PrismaEvent,
  Prisma,
  Registration as PrismaRegistration,
} from '@prisma/client';

import { prisma } from '@/lib/prisma';
import { createClient } from '@/lib/supabase/server';

// ---------- Types ----------

import type {
  AgeRange,
  ArrivalTime,
  BookingMethod,
  CandidateBackground,
  Gender,
  JobExperience,
  ProfileType,
  ReferralSource,
} from '@/lib/registration-options';

export type EventStatus = 'Published' | 'Draft' | 'Cancelled';
export type RegistrationType = 'Candidate' | 'Employer';
export type RegistrationStatus = 'Confirmed' | 'Waitlist';

export interface Event {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  capacity: number;
  current_registrations: number;
  status: EventStatus;
}

export interface Registration {
  id: string;
  event_id: string;
  attendee_name: string;
  attendee_email: string;
  registration_type: RegistrationType;
  status: RegistrationStatus;
  whatsapp_number: string | null;
  age_range: AgeRange | null;
  gender: Gender | null;
  profile_type: ProfileType | null;
  arrival_time: ArrivalTime | null;
  job_experience: JobExperience | null;
  background: CandidateBackground | null;
  linkedin_url: string | null;
  referral_source: ReferralSource | null;
  booking_method: BookingMethod | null;
}

export interface ClashCheckResult {
  hasClash: boolean;
  conflictingEvent: Event | null;
}

export interface UpdateEventDatesResult {
  success: boolean;
  event?: Event;
  error?: string;
  conflict?: Event;
}

export interface UpdateEventStatusResult {
  success: boolean;
  event?: Event;
  error?: string;
}

export interface UpdateEventCapacityResult {
  success: boolean;
  event?: Event;
  error?: string;
}

export interface CreateEventInput {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  location: string;
  capacity: number;
  status: EventStatus;
}

export interface CreateEventResult {
  success: boolean;
  event?: Event;
  error?: string;
  conflict?: Event;
}

export interface CandidateRegistrationDetails {
  whatsapp_number: string;
  age_range: AgeRange;
  gender: Gender;
  profile_type: ProfileType;
  arrival_time: ArrivalTime;
  job_experience: JobExperience;
  background: CandidateBackground;
  referral_source: ReferralSource;
  linkedin_url?: string;
}

export interface EmployerRegistrationDetails {
  booking_method: BookingMethod;
}

export type HandleRegistrationInput =
  | ({ name: string; email: string; type: 'Candidate' } & CandidateRegistrationDetails)
  | ({ name: string; email: string; type: 'Employer' } & EmployerRegistrationDetails);

export interface HandleRegistrationResult {
  success: boolean;
  registration?: Registration;
  error?: string;
}

// ---------- Mapping helpers ----------
// Prisma returns Date objects and its own enum types; the rest of the app
// (page.tsx, admin/page.tsx) is written against plain ISO-string/union-typed
// Event and Registration shapes, so every query result gets normalized here.

function mapEvent(event: PrismaEvent): Event {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    start_date: event.start_date.toISOString(),
    end_date: event.end_date.toISOString(),
    location: event.location,
    capacity: event.capacity,
    current_registrations: event.current_registrations,
    status: event.status as EventStatus,
  };
}

function mapRegistration(registration: PrismaRegistration): Registration {
  return {
    id: registration.id,
    event_id: registration.event_id,
    attendee_name: registration.attendee_name,
    attendee_email: registration.attendee_email,
    registration_type: registration.registration_type as RegistrationType,
    status: registration.status as RegistrationStatus,
    whatsapp_number: registration.whatsapp_number,
    age_range: registration.age_range as AgeRange | null,
    gender: registration.gender as Gender | null,
    profile_type: registration.profile_type as ProfileType | null,
    arrival_time: registration.arrival_time as ArrivalTime | null,
    job_experience: registration.job_experience as JobExperience | null,
    background: registration.background as CandidateBackground | null,
    linkedin_url: registration.linkedin_url,
    referral_source: registration.referral_source as ReferralSource | null,
    booking_method: registration.booking_method as BookingMethod | null,
  };
}

// Stands in for a call to an external notification provider (email/SMS) that
// would normally fire when an event is cancelled.
async function notifyCancellationWebhook(event: Event): Promise<void> {
  console.log('[webhook] POST /notifications/event-cancelled', {
    eventId: event.id,
    title: event.title,
    cancelledAt: new Date().toISOString(),
  });
}

// ---------- Server Actions ----------

export async function getEvents(): Promise<Event[]> {
  const events = await prisma.event.findMany({ orderBy: { start_date: 'asc' } });
  return events.map(mapEvent);
}

export async function checkEventClash(
  startDate: string,
  endDate: string,
  location: string,
  excludeId?: string,
): Promise<ClashCheckResult> {
  const start = new Date(startDate);
  const end = new Date(endDate);

  const conflictingEvent = await prisma.event.findFirst({
    where: {
      id: excludeId ? { not: excludeId } : undefined,
      status: { not: 'Cancelled' },
      location: { equals: location.trim(), mode: 'insensitive' },
      start_date: { lt: end },
      end_date: { gt: start },
    },
  });

  return {
    hasClash: Boolean(conflictingEvent),
    conflictingEvent: conflictingEvent ? mapEvent(conflictingEvent) : null,
  };
}

export async function updateEventDates(
  eventId: string,
  startDate: string,
  endDate: string,
  force = false,
): Promise<UpdateEventDatesResult> {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) {
    return { success: false, error: `Event with id "${eventId}" was not found.` };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { success: false, error: 'Start date and end date must be valid dates.' };
  }

  if (start >= end) {
    return { success: false, error: 'Start date must be before end date.' };
  }

  if (!force) {
    const clash = await checkEventClash(startDate, endDate, existing.location, eventId);

    if (clash.hasClash && clash.conflictingEvent) {
      return {
        success: false,
        error: `Cannot move "${existing.title}": it clashes with "${clash.conflictingEvent.title}" at ${clash.conflictingEvent.location} (${clash.conflictingEvent.start_date} - ${clash.conflictingEvent.end_date}).`,
        conflict: clash.conflictingEvent,
      };
    }
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: { start_date: start, end_date: end },
  });

  return { success: true, event: mapEvent(updated) };
}

export async function updateEventStatus(
  eventId: string,
  status: EventStatus,
): Promise<UpdateEventStatusResult> {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) {
    return { success: false, error: `Event with id "${eventId}" was not found.` };
  }

  const updated = await prisma.event.update({ where: { id: eventId }, data: { status } });

  if (status === 'Cancelled' && existing.status !== 'Cancelled') {
    await notifyCancellationWebhook(mapEvent(updated));
  }

  return { success: true, event: mapEvent(updated) };
}

export async function updateEventCapacity(
  eventId: string,
  capacity: number,
): Promise<UpdateEventCapacityResult> {
  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) {
    return { success: false, error: `Event with id "${eventId}" was not found.` };
  }

  if (!Number.isInteger(capacity) || capacity <= 0) {
    return { success: false, error: 'Capacity must be a positive whole number.' };
  }

  if (capacity < existing.current_registrations) {
    return {
      success: false,
      error: `Capacity can't be less than the ${existing.current_registrations} attendees already registered.`,
    };
  }

  const updated = await prisma.event.update({ where: { id: eventId }, data: { capacity } });

  return { success: true, event: mapEvent(updated) };
}

export async function createEvent(input: CreateEventInput, force = false): Promise<CreateEventResult> {
  if (!input.title.trim()) {
    return { success: false, error: 'Title is required.' };
  }

  if (!input.location.trim()) {
    return { success: false, error: 'Location is required.' };
  }

  const start = new Date(input.start_date);
  const end = new Date(input.end_date);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { success: false, error: 'Start date and end date must be valid dates.' };
  }

  if (start >= end) {
    return { success: false, error: 'Start date must be before end date.' };
  }

  if (!Number.isInteger(input.capacity) || input.capacity <= 0) {
    return { success: false, error: 'Capacity must be a positive whole number.' };
  }

  if (!force) {
    const clash = await checkEventClash(input.start_date, input.end_date, input.location);

    if (clash.hasClash && clash.conflictingEvent) {
      return {
        success: false,
        error: `"${input.title}" clashes with "${clash.conflictingEvent.title}" at ${clash.conflictingEvent.location} (${clash.conflictingEvent.start_date} - ${clash.conflictingEvent.end_date}).`,
        conflict: clash.conflictingEvent,
      };
    }
  }

  const created = await prisma.event.create({
    data: {
      title: input.title.trim(),
      description: input.description.trim(),
      start_date: start,
      end_date: end,
      location: input.location.trim(),
      capacity: input.capacity,
      current_registrations: 0,
      status: input.status,
    },
  });

  return { success: true, event: mapEvent(created) };
}

export async function handleRegistration(
  eventId: string,
  data: HandleRegistrationInput,
): Promise<HandleRegistrationResult> {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) {
    return { success: false, error: `Event with id "${eventId}" was not found.` };
  }

  if (event.status === 'Cancelled') {
    return {
      success: false,
      error: `"${event.title}" has been cancelled and is no longer accepting registrations.`,
    };
  }

  if (!data.name.trim() || !data.email.trim()) {
    return { success: false, error: 'Attendee name and email are required.' };
  }

  if (data.type === 'Candidate') {
    if (
      !data.whatsapp_number.trim() ||
      !data.age_range ||
      !data.gender ||
      !data.profile_type ||
      !data.arrival_time ||
      !data.job_experience ||
      !data.background ||
      !data.referral_source
    ) {
      return { success: false, error: 'Please fill in all the required candidate details.' };
    }
  } else if (!data.booking_method) {
    return { success: false, error: 'Please choose how you would like to secure your slot.' };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email?.toLowerCase() !== data.email.trim().toLowerCase()) {
    return { success: false, error: 'Please verify your email before registering.' };
  }

  const registration = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // A conditional UPDATE only affects a row while there's still room, so
    // concurrent registrations for the same event can't both slip in over
    // capacity the way a read-then-write check would allow.
    const confirmedRows = await tx.$queryRaw<{ id: string }[]>`
      UPDATE "Event"
      SET current_registrations = current_registrations + 1
      WHERE id = ${eventId} AND current_registrations < capacity
      RETURNING id
    `;
    const status: RegistrationStatus = confirmedRows.length > 0 ? 'Confirmed' : 'Waitlist';

    return tx.registration.create({
      data: {
        event_id: eventId,
        attendee_name: data.name,
        attendee_email: data.email,
        registration_type: data.type,
        status,
        ...(data.type === 'Candidate'
          ? {
              whatsapp_number: data.whatsapp_number.trim(),
              age_range: data.age_range,
              gender: data.gender,
              profile_type: data.profile_type,
              arrival_time: data.arrival_time,
              job_experience: data.job_experience,
              background: data.background,
              linkedin_url: data.linkedin_url?.trim() || null,
              referral_source: data.referral_source,
            }
          : {
              booking_method: data.booking_method,
            }),
      },
    });
  });

  // The verified session only exists to prove email ownership for this one
  // registration - there's no persistent attendee account, so discard it.
  await supabase.auth.signOut();

  return { success: true, registration: mapRegistration(registration) };
}
