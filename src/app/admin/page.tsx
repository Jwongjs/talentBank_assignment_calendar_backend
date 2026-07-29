'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  LogOut,
  MapPin,
  Plus,
  Users,
} from 'lucide-react';

import { adminLogout } from '@/app/actions/auth';
import {
  createEvent,
  getEvents,
  updateEventCapacity,
  updateEventDates,
  updateEventStatus,
} from '@/app/actions/events';
import type { CreateEventInput, Event, EventStatus } from '@/app/actions/events';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, formatTimeRange, getStatusBadge } from '@/lib/event-display';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface CreateForm {
  title: string;
  description: string;
  location: string;
  startLocal: string;
  endLocal: string;
  capacity: string;
  status: EventStatus;
}

const EMPTY_CREATE_FORM: CreateForm = {
  title: '',
  description: '',
  location: '',
  startLocal: '',
  endLocal: '',
  capacity: '',
  status: 'Draft',
};

interface PendingConflict {
  conflictingEvent: Event;
  onForce: () => Promise<void>;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function buildMonthGrid(monthDate: Date): Date[] {
  const firstOfMonth = startOfMonth(monthDate);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - firstOfMonth.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const day = new Date(gridStart);
    day.setDate(gridStart.getDate() + i);
    return day;
  });
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function eventOccursOnDay(event: Event, day: Date): boolean {
  const start = new Date(event.start_date);
  const end = new Date(event.end_date);
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999);
  return start <= dayEnd && end >= dayStart;
}

function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

function shiftIsoDate(iso: string, deltaDays: number): string {
  const date = new Date(iso);
  date.setDate(date.getDate() + deltaDays);
  return date.toISOString();
}

const CALENDAR_CHIP_STYLES: Record<string, string> = {
  success: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200',
  warning: 'bg-amber-100 text-amber-800 hover:bg-amber-200',
  destructive: 'bg-red-100 text-red-800 hover:bg-red-200',
  secondary: 'bg-muted text-muted-foreground line-through hover:bg-muted',
};

export default function AdminDashboard() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE_FORM);
  const [isCreating, setIsCreating] = useState(false);
  const [busyEventId, setBusyEventId] = useState<string | null>(null);
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const [pendingConflict, setPendingConflict] = useState<PendingConflict | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  async function handleLogout() {
    setIsLoggingOut(true);
    await adminLogout();
    router.push('/admin/login');
    router.refresh();
  }

  useEffect(() => {
    refreshEvents();
  }, []);

  useEffect(() => {
    if (!highlightedEventId) return;
    document.getElementById(`event-row-${highlightedEventId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
    const timeout = setTimeout(() => setHighlightedEventId(null), 2000);
    return () => clearTimeout(timeout);
  }, [highlightedEventId]);

  async function refreshEvents() {
    setIsLoading(true);
    try {
      const data = await getEvents();
      const sorted = [...data].sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      );
      setEvents(sorted);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Could not load career fairs',
        description: 'Showing the last known data. Pull to refresh or try again shortly.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  function openConflict(conflictingEvent: Event, onForce: () => Promise<void>) {
    setPendingConflict({ conflictingEvent, onForce });
  }

  async function handleCreateSubmit(formEvent: FormEvent) {
    formEvent.preventDefault();

    if (!createForm.title.trim() || !createForm.location.trim() || !createForm.startLocal || !createForm.endLocal || !createForm.capacity) {
      toast({ variant: 'destructive', title: 'Missing information', description: 'Please fill in all required fields.' });
      return;
    }

    const capacityNumber = Number(createForm.capacity);
    if (!Number.isInteger(capacityNumber) || capacityNumber <= 0) {
      toast({ variant: 'destructive', title: 'Invalid capacity', description: 'Capacity must be a positive whole number.' });
      return;
    }

    const input: CreateEventInput = {
      title: createForm.title.trim(),
      description: createForm.description.trim(),
      location: createForm.location.trim(),
      start_date: fromDateTimeLocalValue(createForm.startLocal),
      end_date: fromDateTimeLocalValue(createForm.endLocal),
      capacity: capacityNumber,
      status: createForm.status,
    };

    if (new Date(input.start_date) >= new Date(input.end_date)) {
      toast({ variant: 'destructive', title: 'Invalid dates', description: 'Start time must be before end time.' });
      return;
    }

    await submitCreate(input, false);
  }

  async function submitCreate(input: CreateEventInput, force: boolean) {
    setIsCreating(true);
    const result = await createEvent(input, force);
    setIsCreating(false);

    if (!result.success) {
      if (result.conflict) {
        openConflict(result.conflict, () => submitCreate(input, true));
        return;
      }
      toast({ variant: 'destructive', title: 'Could not create event', description: result.error });
      return;
    }

    toast({ variant: 'success', title: 'Career fair created', description: `"${input.title}" is on the calendar.` });
    setCreateForm(EMPTY_CREATE_FORM);
    setCreateOpen(false);
    await refreshEvents();
  }

  async function handleStatusChange(event: Event, status: EventStatus) {
    setBusyEventId(event.id);
    const result = await updateEventStatus(event.id, status);
    setBusyEventId(null);

    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not update status', description: result.error });
      return;
    }

    toast({
      title: `${event.title} marked ${status}`,
      description: status === 'Cancelled' ? 'Attendees are being notified automatically.' : undefined,
    });
    await refreshEvents();
  }

  async function handleCapacitySave(event: Event, nextCapacity: number) {
    setBusyEventId(event.id);
    const result = await updateEventCapacity(event.id, nextCapacity);
    setBusyEventId(null);

    if (!result.success) {
      toast({ variant: 'destructive', title: 'Could not update capacity', description: result.error });
      return;
    }

    toast({ variant: 'success', title: 'Capacity updated', description: `${event.title} now holds ${nextCapacity} attendees.` });
    await refreshEvents();
  }

  async function attemptDateChange(event: Event, newStart: string, newEnd: string, force: boolean) {
    setBusyEventId(event.id);
    const result = await updateEventDates(event.id, newStart, newEnd, force);
    setBusyEventId(null);

    if (!result.success) {
      if (result.conflict) {
        openConflict(result.conflict, () => attemptDateChange(event, newStart, newEnd, true));
        return;
      }
      toast({ variant: 'destructive', title: 'Could not shift date', description: result.error });
      return;
    }

    toast({ variant: 'success', title: 'Date updated', description: `${event.title} now starts ${formatDate(newStart)}.` });
    await refreshEvents();
  }

  function handleShiftDate(event: Event, deltaDays: number) {
    const newStart = shiftIsoDate(event.start_date, deltaDays);
    const newEnd = shiftIsoDate(event.end_date, deltaDays);
    attemptDateChange(event, newStart, newEnd, false);
  }

  const monthGrid = buildMonthGrid(currentMonth);
  const today = new Date();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-primary">Talentbank Admin</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">Career Fair Command Center</h1>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Schedule, edit, and manage every career fair from one place.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" disabled={isLoggingOut} onClick={handleLogout}>
              {isLoggingOut ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Log out
            </Button>
            <Sheet
            open={createOpen}
            onOpenChange={(open) => {
              setCreateOpen(open);
              if (!open) setCreateForm(EMPTY_CREATE_FORM);
            }}
          >
            <SheetTrigger asChild>
              <Button size="lg" className="shrink-0">
                <Plus className="mr-2 h-4 w-4" />
                Create New Career Fair
              </Button>
            </SheetTrigger>
            <SheetContent className="overflow-y-auto sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Create New Career Fair</SheetTitle>
                <SheetDescription>
                  Fill in the details below. We&apos;ll automatically check for scheduling conflicts before saving.
                </SheetDescription>
              </SheetHeader>
              <form onSubmit={handleCreateSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="create-title">Event title</Label>
                  <Input
                    id="create-title"
                    value={createForm.title}
                    onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Fall Tech Career Fair"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-description">Description</Label>
                  <Textarea
                    id="create-description"
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="What should attendees know?"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="create-location">Location</Label>
                  <Input
                    id="create-location"
                    value={createForm.location}
                    onChange={(e) => setCreateForm((f) => ({ ...f, location: e.target.value }))}
                    placeholder="Main Hall"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="create-start">Starts</Label>
                    <Input
                      id="create-start"
                      type="datetime-local"
                      value={createForm.startLocal}
                      onChange={(e) => setCreateForm((f) => ({ ...f, startLocal: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-end">Ends</Label>
                    <Input
                      id="create-end"
                      type="datetime-local"
                      value={createForm.endLocal}
                      onChange={(e) => setCreateForm((f) => ({ ...f, endLocal: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="create-capacity">Capacity</Label>
                    <Input
                      id="create-capacity"
                      type="number"
                      min={1}
                      value={createForm.capacity}
                      onChange={(e) => setCreateForm((f) => ({ ...f, capacity: e.target.value }))}
                      placeholder="150"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="create-status">Status</Label>
                    <Select
                      value={createForm.status}
                      onValueChange={(value) => setCreateForm((f) => ({ ...f, status: value as EventStatus }))}
                    >
                      <SelectTrigger id="create-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Published">Published</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <SheetFooter className="mt-2">
                  <Button type="submit" className="w-full" disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Career Fair
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading dashboard...
          </div>
        ) : (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <CardTitle>{currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Previous month"
                    onClick={() => setCurrentMonth((m) => addMonths(m, -1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="h-8" onClick={() => setCurrentMonth(startOfMonth(new Date()))}>
                    Today
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Next month"
                    onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-7 gap-px overflow-hidden rounded-t-lg border border-b-0 bg-border text-center text-xs font-medium text-muted-foreground">
                  {WEEKDAY_LABELS.map((label) => (
                    <div key={label} className="bg-muted/40 py-2">
                      {label}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-lg border bg-border">
                  {monthGrid.map((day) => {
                    const inMonth = day.getMonth() === currentMonth.getMonth();
                    const dayEvents = events.filter((event) => eventOccursOnDay(event, day));
                    const isToday = isSameDay(day, today);
                    return (
                      <div
                        key={day.toISOString()}
                        className={cn('min-h-[92px] bg-background p-1.5 text-left', !inMonth && 'bg-muted/20')}
                      >
                        <span
                          className={cn(
                            'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                            isToday && 'bg-primary font-semibold text-primary-foreground',
                            !inMonth && 'text-muted-foreground',
                          )}
                        >
                          {day.getDate()}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayEvents.slice(0, 2).map((event) => {
                            const badge = getStatusBadge(event);
                            return (
                              <button
                                key={event.id}
                                type="button"
                                onClick={() => setHighlightedEventId(event.id)}
                                className={cn(
                                  'block w-full truncate rounded px-1.5 py-0.5 text-left text-[11px] font-medium transition',
                                  CALENDAR_CHIP_STYLES[badge.variant],
                                )}
                              >
                                {event.title}
                              </button>
                            );
                          })}
                          {dayEvents.length > 2 && (
                            <p className="px-1.5 text-[11px] text-muted-foreground">+{dayEvents.length - 2} more</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>All Career Fairs</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {events.length === 0 ? (
                  <div className="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
                    <CalendarIcon className="h-8 w-8" />
                    <p className="text-sm">No career fairs yet. Create your first one to get started.</p>
                  </div>
                ) : (
                  events.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      isHighlighted={highlightedEventId === event.id}
                      isBusy={busyEventId === event.id}
                      onStatusChange={(status) => handleStatusChange(event, status)}
                      onCapacitySave={(capacity) => handleCapacitySave(event, capacity)}
                      onShiftDate={(deltaDays) => handleShiftDate(event, deltaDays)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      <Dialog open={Boolean(pendingConflict)} onOpenChange={(open) => !open && setPendingConflict(null)}>
        <DialogContent className="border-2 border-amber-400 sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <DialogTitle className="text-amber-700">Scheduling Conflict Detected!</DialogTitle>
            </div>
            <DialogDescription className="pt-2 text-foreground">
              This overlaps with <strong>{pendingConflict?.conflictingEvent.title}</strong> at{' '}
              <strong>{pendingConflict?.conflictingEvent.location}</strong>. Do you want to force this change
              anyway?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingConflict(null)}>
              Cancel
            </Button>
            <Button
              className="bg-amber-500 text-white hover:bg-amber-600"
              onClick={async () => {
                const conflict = pendingConflict;
                setPendingConflict(null);
                if (conflict) await conflict.onForce();
              }}
            >
              Force This Change
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface EventRowProps {
  event: Event;
  isHighlighted: boolean;
  isBusy: boolean;
  onStatusChange: (status: EventStatus) => void;
  onCapacitySave: (capacity: number) => void;
  onShiftDate: (deltaDays: number) => void;
}

function EventRow({ event, isHighlighted, isBusy, onStatusChange, onCapacitySave, onShiftDate }: EventRowProps) {
  const [capacityDraft, setCapacityDraft] = useState(String(event.capacity));

  useEffect(() => {
    setCapacityDraft(String(event.capacity));
  }, [event.capacity]);

  const badge = getStatusBadge(event);
  const parsedCapacity = Number(capacityDraft);
  const isValidCapacity = Number.isInteger(parsedCapacity) && parsedCapacity > 0;
  const capacityChanged = capacityDraft !== String(event.capacity);

  return (
    <div
      id={`event-row-${event.id}`}
      className={cn(
        'flex flex-col gap-4 border-b p-4 transition last:border-b-0 lg:flex-row lg:items-center lg:justify-between',
        isHighlighted && 'bg-primary/5 ring-2 ring-inset ring-primary',
        event.status === 'Cancelled' && 'opacity-70',
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-medium">{event.title}</p>
          <Badge variant={badge.variant}>{badge.label}</Badge>
        </div>
        <p className="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarIcon className="h-3.5 w-3.5" />
            {formatDate(event.start_date)} &middot; {formatTimeRange(event.start_date, event.end_date)}
          </span>
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {event.location}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {event.current_registrations}/{event.capacity} registered
          </span>
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Shift date</p>
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={isBusy}
              onClick={() => onShiftDate(-1)}
            >
              <ChevronLeft className="mr-1 h-3.5 w-3.5" />1 Day
            </Button>
            <div className="h-4 w-px bg-border" />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs"
              disabled={isBusy}
              onClick={() => onShiftDate(1)}
            >
              1 Day
              <ChevronRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Capacity</p>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              min={1}
              value={capacityDraft}
              onChange={(e) => setCapacityDraft(e.target.value)}
              disabled={isBusy}
              className="h-8 w-20"
            />
            {capacityChanged && (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="h-8 w-8 shrink-0"
                aria-label="Save new capacity"
                disabled={isBusy || !isValidCapacity}
                onClick={() => onCapacitySave(parsedCapacity)}
              >
                <Check className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>

        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</p>
          <Select value={event.status} onValueChange={(value) => onStatusChange(value as EventStatus)} disabled={isBusy}>
            <SelectTrigger className="h-8 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
              <SelectItem value="Cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>
    </div>
  );
}
