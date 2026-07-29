import type { Event } from '@/app/actions/events';
import type { BadgeProps } from '@/components/ui/badge';

export interface StatusBadge {
  label: string;
  variant: NonNullable<BadgeProps['variant']>;
}

export function getStatusBadge(event: Event): StatusBadge {
  if (event.status === 'Cancelled') {
    return { label: 'Cancelled', variant: 'secondary' };
  }
  if (event.current_registrations >= event.capacity) {
    return { label: 'Sold Out', variant: 'destructive' };
  }
  if (event.current_registrations / event.capacity > 0.8) {
    return { label: 'Filling Fast', variant: 'warning' };
  }
  return { label: 'Open', variant: 'success' };
}

export function spotsRemaining(event: Event): number {
  return Math.max(event.capacity - event.current_registrations, 0);
}

export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatTimeRange(startDate: string, endDate: string): string {
  const formatter = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' });
  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`;
}
