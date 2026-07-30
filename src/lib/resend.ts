import { Resend } from 'resend';

let client: Resend | null = null;

function getClient(): Resend {
  if (!client) {
    client = new Resend(process.env.RESEND_API_KEY);
  }
  return client;
}

export interface CancellationEmailParams {
  eventTitle: string;
  eventLocation: string;
  startDate: string;
  attendeeEmails: string[];
}

export async function sendCancellationEmails({
  eventTitle,
  eventLocation,
  startDate,
  attendeeEmails,
}: CancellationEmailParams): Promise<void> {
  if (attendeeEmails.length === 0) return;

  const from = process.env.RESEND_FROM_EMAIL ?? 'Talentbank <onboarding@resend.dev>';
  const formattedDate = new Date(startDate).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const html = `
    <div style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
      <p style="color: #2563eb; font-size: 13px; font-weight: 600; letter-spacing: 0.05em; text-transform: uppercase; margin: 0 0 8px;">
        Talentbank
      </p>
      <h1 style="font-size: 20px; margin: 0 0 16px; color: #111827;">
        ${eventTitle} has been cancelled
      </h1>
      <p style="color: #4b5563; font-size: 14px; line-height: 1.5; margin: 0 0 16px;">
        This career fair, originally scheduled for <strong>${formattedDate}</strong> at
        <strong>${eventLocation}</strong>, has been cancelled by the organizers. You do not need to take
        any further action — your registration has been closed automatically.
      </p>
      <p style="color: #6b7280; font-size: 13px; line-height: 1.5; margin: 0;">
        We apologize for any inconvenience. Keep an eye on the Talentbank calendar for upcoming fairs.
      </p>
    </div>
  `;

  await Promise.all(
    attendeeEmails.map((email) =>
      getClient().emails.send({
        from,
        to: email,
        subject: `${eventTitle} has been cancelled`,
        html,
      }),
    ),
  );
}
