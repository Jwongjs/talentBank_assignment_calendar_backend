'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Calendar, Clock, LayoutGrid, List, Loader2, Mail, MapPin, Users } from 'lucide-react';

import { sendRegistrationOtp, verifyRegistrationOtp } from '@/app/actions/auth';
import { getEvents, handleRegistration } from '@/app/actions/events';
import type { Event, RegistrationType } from '@/app/actions/events';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { formatDate, formatTimeRange, getStatusBadge, spotsRemaining } from '@/lib/event-display';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

interface RegistrationForm {
  name: string;
  email: string;
  type: RegistrationType | '';
}

type RegistrationStep = 'details' | 'code';

const EMPTY_FORM: RegistrationForm = { name: '', email: '', type: '' };

function groupByMonth(events: Event[]): Array<[string, Event[]]> {
  const groups = new Map<string, Event[]>();
  for (const event of events) {
    const key = new Date(event.start_date).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
    const existing = groups.get(key);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(key, [event]);
    }
  }
  return Array.from(groups.entries());
}

export default function Home() {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<ViewMode>('grid');
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<RegistrationForm>(EMPTY_FORM);
  const [step, setStep] = useState<RegistrationStep>('details');
  const [otpCode, setOtpCode] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadEvents();
  }, []);

  async function loadEvents() {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await getEvents();
      const sorted = [...data].sort(
        (a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime(),
      );
      setEvents(sorted);
    } catch {
      setLoadError('Could not load events. Please refresh the page or try again shortly.');
    } finally {
      setIsLoading(false);
    }
  }

  function openEvent(event: Event) {
    setSelectedEvent(event);
    setForm(EMPTY_FORM);
    setStep('details');
    setOtpCode('');
    setDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) {
      setSelectedEvent(null);
      setForm(EMPTY_FORM);
      setStep('details');
      setOtpCode('');
    }
  }

  async function handleSendCode(formEvent: FormEvent) {
    formEvent.preventDefault();

    if (!form.name.trim() || !form.email.trim() || !form.type) {
      toast({
        variant: 'destructive',
        title: 'Missing information',
        description: 'Please fill in your name, email, and registration type.',
      });
      return;
    }

    setIsSendingCode(true);
    const result = await sendRegistrationOtp(form.email.trim());
    setIsSendingCode(false);

    if (!result.success) {
      toast({
        variant: 'destructive',
        title: 'Could not send code',
        description: result.error,
      });
      return;
    }

    setOtpCode('');
    setStep('code');
  }

  async function handleVerifyAndRegister(formEvent: FormEvent) {
    formEvent.preventDefault();
    if (!selectedEvent || !form.type) return;

    setIsSubmitting(true);

    const verifyResult = await verifyRegistrationOtp(form.email.trim(), otpCode.trim());
    if (!verifyResult.success) {
      setIsSubmitting(false);
      toast({
        variant: 'destructive',
        title: 'Verification failed',
        description: verifyResult.error,
      });
      return;
    }

    const result = await handleRegistration(selectedEvent.id, {
      name: form.name.trim(),
      email: form.email.trim(),
      type: form.type,
    });
    setIsSubmitting(false);

    if (!result.success || !result.registration) {
      toast({
        variant: 'destructive',
        title: 'Registration failed',
        description: result.error ?? 'Something went wrong. Please try again.',
      });
      return;
    }

    if (result.registration.status === 'Confirmed') {
      toast({
        variant: 'success',
        title: 'Confirmed!',
        description: `You're registered for ${selectedEvent.title}.`,
      });
    } else {
      toast({
        title: 'Added to Waitlist!',
        description: `${selectedEvent.title} is full — we'll notify you if a spot opens up.`,
      });
    }

    handleDialogChange(false);
    await loadEvents();
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-b from-primary/5 to-transparent">
        <div className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">Talentbank</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Talentbank Career Fairs 2026 Roadmap
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Browse upcoming career fairs, check live capacity, and register in seconds — for candidates
            and employers alike.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {events.length} event{events.length === 1 ? '' : 's'}
          </p>
          <div className="flex items-center gap-1 rounded-md border p-1">
            <Button
              type="button"
              variant={view === 'grid' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="mr-1.5 h-4 w-4" />
              Grid
            </Button>
            <Button
              type="button"
              variant={view === 'list' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setView('list')}
            >
              <List className="mr-1.5 h-4 w-4" />
              List
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading events...
          </div>
        ) : loadError ? (
          <div className="flex flex-col items-center gap-3 py-24 text-center">
            <p className="text-sm text-destructive">{loadError}</p>
            <Button variant="outline" size="sm" onClick={loadEvents}>
              Try again
            </Button>
          </div>
        ) : view === 'grid' ? (
          <div className="space-y-10">
            {groupByMonth(events).map(([month, monthEvents]) => (
              <section key={month}>
                <h2 className="mb-4 text-lg font-semibold text-foreground">{month}</h2>
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {monthEvents.map((event) => {
                    const badge = getStatusBadge(event);
                    const isCancelled = event.status === 'Cancelled';
                    const remaining = spotsRemaining(event);
                    return (
                      <Card
                        key={event.id}
                        onClick={() => openEvent(event)}
                        className={cn(
                          'cursor-pointer transition hover:shadow-md',
                          isCancelled && 'opacity-60 grayscale hover:shadow-none',
                        )}
                      >
                        <CardHeader>
                          <div className="flex items-start justify-between gap-2">
                            <CardTitle className="text-base">{event.title}</CardTitle>
                            <Badge variant={badge.variant}>{badge.label}</Badge>
                          </div>
                          <CardDescription className="line-clamp-2">{event.description}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-1.5 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {formatDate(event.start_date)}
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {event.location}
                          </div>
                        </CardContent>
                        <CardFooter className="text-sm text-muted-foreground">
                          {isCancelled ? 'Registrations closed' : `${remaining} spot${remaining === 1 ? '' : 's'} remaining`}
                        </CardFooter>
                      </Card>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="divide-y rounded-lg border">
            {events.map((event) => {
              const badge = getStatusBadge(event);
              const isCancelled = event.status === 'Cancelled';
              const remaining = spotsRemaining(event);
              return (
                <div
                  key={event.id}
                  onClick={() => openEvent(event)}
                  className={cn(
                    'flex cursor-pointer flex-col gap-2 p-4 transition hover:bg-accent sm:flex-row sm:items-center sm:justify-between',
                    isCancelled && 'opacity-60 grayscale hover:bg-transparent',
                  )}
                >
                  <div>
                    <p className="font-medium">{event.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(event.start_date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5" />
                        {event.location}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {isCancelled ? 'Closed' : `${remaining} left`}
                    </span>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="sm:max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <DialogTitle>{selectedEvent.title}</DialogTitle>
                  <Badge variant={getStatusBadge(selectedEvent).variant}>
                    {getStatusBadge(selectedEvent).label}
                  </Badge>
                </div>
                <DialogDescription>{selectedEvent.description}</DialogDescription>
              </DialogHeader>

              <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEvent.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {formatDate(selectedEvent.start_date)} &middot;{' '}
                    {formatTimeRange(selectedEvent.start_date, selectedEvent.end_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {spotsRemaining(selectedEvent)} of {selectedEvent.capacity} spots remaining
                  </span>
                </div>
              </div>

              {selectedEvent.status === 'Cancelled' ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  This event has been cancelled. Registration is closed and all attendees have been
                  notified.
                </p>
              ) : step === 'details' ? (
                <form onSubmit={handleSendCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name">Full name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                      placeholder="jane@example.com"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="type">I am registering as</Label>
                    <Select
                      value={form.type}
                      onValueChange={(value) =>
                        setForm((current) => ({ ...current, type: value as RegistrationType }))
                      }
                    >
                      <SelectTrigger id="type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Candidate">Candidate</SelectItem>
                        <SelectItem value="Employer">Employer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full" disabled={isSendingCode}>
                    {isSendingCode && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Send verification code
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                  <div className="flex items-start gap-2 rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
                    <Mail className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      We sent a 6-digit code to <strong className="text-foreground">{form.email}</strong>.
                      Enter it below to confirm your registration.
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="otp">Verification code</Label>
                    <Input
                      id="otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value)}
                      placeholder="123456"
                      autoFocus
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting || !otpCode.trim()}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Verify & Register
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={isSubmitting}
                    onClick={() => setStep('details')}
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                </form>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
