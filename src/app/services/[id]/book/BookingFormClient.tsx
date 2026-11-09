
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Listing = {
  id: string;
  provider_id: string;
  title: string;
  price: number;
  duration_minutes: number;
  status: string;
};

type BookingFormClientProps = {
  serviceId: string;
};

function localDateString(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function BookingFormClient({
  serviceId,
}: BookingFormClientProps) {
  const router = useRouter();

  const [service, setService] = useState<Listing | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [today, setToday] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setToday(localDateString(new Date()));
  }, []);

  useEffect(() => {
    let active = true;

    async function loadService() {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();

        const { data, error: serviceError } = await supabase
          .from("provider_listings")
          .select("id, provider_id, title, price, duration_minutes, status")
          .eq("id", serviceId)
          .eq("status", "published")
          .maybeSingle();

        if (serviceError) throw serviceError;

        if (active) {
          setService(data as Listing | null);

          if (!data) {
            setError("This service is no longer available.");
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load this service.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    if (serviceId) {
      void loadService();
    } else {
      setLoading(false);
      setError("A service listing was not provided.");
    }

    return () => {
      active = false;
    };
  }, [serviceId]);

  async function submitBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!service) {
      setError("This service is unavailable.");
      return;
    }

    if (!date || !time) {
      setError("Choose a session date and time.");
      return;
    }

    const scheduledAt = new Date(`${date}T${time}:00`);

    if (
      Number.isNaN(scheduledAt.getTime()) ||
      scheduledAt.getTime() <= Date.now()
    ) {
      setError("Choose a future date and time.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        router.push(
          `/login?next=${encodeURIComponent(
            `/services/${service.id}/book`,
          )}`,
        );
        return;
      }

      if (user.id === service.provider_id) {
        setError("You cannot book your own service.");
        return;
      }

      const { data: bookingId, error: bookingError } = await supabase.rpc(
        "create_booking_request",
        {
          p_listing_id: service.id,
          p_scheduled_at: scheduledAt.toISOString(),
          p_notes: notes.trim() || null,
        },
      );

      if (bookingError) throw bookingError;

      if (!bookingId) {
        throw new Error("The booking request could not be confirmed.");
      }

      router.push(`/bookings?created=${bookingId}`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "We couldn't submit your booking. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 pb-16 pt-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-3xl">
        <Link
          href={`/services/${serviceId}`}
          className="text-sm font-medium text-lime-300 hover:text-lime-200"
        >
          ← Back to experience
        </Link>

        {loading && (
          <div className="mt-8 animate-pulse rounded-3xl border border-white/10 bg-black/30 p-8">
            <div className="h-8 w-2/3 rounded bg-white/10" />
            <div className="mt-6 h-40 rounded bg-white/10" />
          </div>
        )}

        {!loading && error && !service && (
          <div className="mt-8 rounded-2xl border border-red-300/30 bg-red-950/30 p-6">
            <h1 className="text-xl font-bold">Service unavailable</h1>
            <p className="mt-2 break-words text-sm text-white/70">
              {error}
            </p>
            <Link
              href="/services"
              className="mt-5 inline-block rounded-lg bg-lime-300 px-5 py-3 font-semibold text-black"
            >
              Browse experiences
            </Link>
          </div>
        )}

        {!loading && service && (
          <section className="mt-8 rounded-3xl border border-white/15 bg-black/40 p-6 shadow-xl backdrop-blur-sm sm:p-9">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-lime-300">
              NiaWorld booking
            </p>

            <h1 className="mt-3 text-3xl font-bold">
              Book your experience
            </h1>

            <div className="mt-7 rounded-2xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-lg font-semibold">{service.title}</h2>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-white/60">
                  {service.duration_minutes} minutes
                </span>
                <span className="text-xl font-bold text-lime-300">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(Number(service.price))}
                </span>
              </div>
            </div>

            <form onSubmit={submitBooking} className="mt-8 space-y-6">
              <div>
                <label
                  htmlFor="booking-date"
                  className="mb-2 block text-sm font-semibold"
                >
                  Session date
                </label>
                <input
                  id="booking-date"
                  type="date"
                  required
                  min={today || undefined}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-white outline-none [color-scheme:dark] focus:border-lime-300"
                />
              </div>

              <div>
                <label
                  htmlFor="booking-time"
                  className="mb-2 block text-sm font-semibold"
                >
                  Session time
                </label>
                <input
                  id="booking-time"
                  type="time"
                  required
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="min-h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-white outline-none [color-scheme:dark] focus:border-lime-300"
                />
                <p className="mt-2 text-xs text-white/50">
                  Times are currently interpreted in your device&apos;s
                  local time zone.
                </p>
              </div>

              <div>
                <label
                  htmlFor="booking-notes"
                  className="mb-2 block text-sm font-semibold"
                >
                  Message to your provider
                  <span className="ml-2 font-normal text-white/45">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="booking-notes"
                  rows={4}
                  maxLength={1000}
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="What would you like to discuss during your session?"
                  className="w-full rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-white outline-none placeholder:text-white/40 focus:border-lime-300"
                />
                <p className="mt-1 text-right text-xs text-white/40">
                  {notes.length}/1000
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-300/30 bg-red-950/30 p-4 text-sm text-red-100"
                >
                  {error}
                </div>
              )}

              <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                <p className="text-sm leading-6 text-white/65">
                  Submitting this form creates a pending booking request.
                  It does not charge you. Payment will be handled separately
                  after the booking process is established.
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-lime-300 px-6 py-4 font-bold text-black transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting
                  ? "Submitting request..."
                  : "Request this session"}
              </button>
            </form>
          </section>
        )}
      </div>
    </main>
  );
}
