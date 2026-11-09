
"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  MessageCircle,
  LayoutDashboard,
  BriefcaseBusiness,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  ChevronRight,
  Search,
  SlidersHorizontal,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Hourglass,
  Users,
  ArrowUpRight,
  LockKeyhole,
  Inbox,
  Menu,
  X,
  LoaderCircle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rejected";

type ProviderActionStatus = "confirmed" | "rejected" | "completed";

type BookingRecord = {
  id: string;
  customer_id: string;
  provider_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: BookingStatus;
  notes: string | null;
  created_at: string;
  listing_title_snapshot: string | null;
  price_amount: number | null;
  currency: string | null;
};

type CustomerProfile = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  country: string | null;
};

type Booking = {
  id: string;
  customerName: string;
  initials: string;
  service: string;
  scheduledAt: string;
  duration: number;
  status: BookingStatus;
  amount: number | null;
  currency: string;
  customerId: string;
  country: string | null;
};

const navigation = [
  { label: "Home", href: "/provider/dashboard", icon: LayoutDashboard },
  { label: "Services", href: "/provider/services", icon: BriefcaseBusiness },
  { label: "Bookings", href: "/provider/bookings", icon: CalendarDays },
  { label: "Messages", href: "/provider/messages", icon: MessageCircle },
  { label: "Wallet", href: "/provider/earnings", icon: Wallet },
  { label: "Analytics", href: "/provider/analytics", icon: ChartNoAxesCombined },
  { label: "Settings", href: "/provider/settings", icon: Settings },
];

const filters = [
  "All bookings",
  "Requests",
  "Upcoming",
  "Completed",
  "Cancelled",
  "Rejected",
] as const;

type BookingFilter = (typeof filters)[number];

const filterToStatus: Record<BookingFilter, BookingStatus | null> = {
  "All bookings": null,
  Requests: "pending",
  Upcoming: "confirmed",
  Completed: "completed",
  Cancelled: "cancelled",
  Rejected: "rejected",
};

const statusConfig: Record<
  BookingStatus,
  { label: string; className: string }
> = {
  pending: {
    label: "Awaiting response",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  },
  confirmed: {
    label: "Confirmed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  completed: {
    label: "Completed",
    className: "bg-sky-50 text-sky-700 border-sky-200",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-stone-100 text-stone-600 border-stone-200",
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-50 text-rose-700 border-rose-200",
  },
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "C";
}

function formatMoney(amount: number | null, currency: string) {
  if (amount === null || !Number.isFinite(amount)) return "—";

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency || "USD"} ${amount.toFixed(2)}`;
  }
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export default function ProviderBookingsPage() {
  const [supabase] = useState(() => createClient());

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [activeFilter, setActiveFilter] =
    useState<BookingFilter>("All bookings");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setBookings([]);
        setErrorMessage("Please sign in to view your bookings.");
        return;
      }

      const { data: bookingData, error: bookingError } = await supabase
        .from("bookings")
        .select(
          "id, customer_id, provider_id, scheduled_at, duration_minutes, status, notes, created_at, listing_title_snapshot, price_amount, currency"
        )
        .eq("provider_id", user.id)
        .order("scheduled_at", { ascending: false });

      if (bookingError) throw bookingError;

      const records = (bookingData ?? []) as unknown as BookingRecord[];
      const customerIds = [
        ...new Set(records.map((booking) => booking.customer_id)),
      ];

      let profileMap = new Map<string, CustomerProfile>();

      if (customerIds.length > 0) {
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("user_id, display_name, username, avatar_url, country")
          .in("user_id", customerIds);

        if (profileError) throw profileError;

        const profiles = (profileData ?? []) as CustomerProfile[];
        profileMap = new Map(
          profiles.map((profile) => [profile.user_id, profile])
        );
      }

      const mappedBookings: Booking[] = records.map((record) => {
        const profile = profileMap.get(record.customer_id);
        const customerName =
          profile?.display_name?.trim() ||
          profile?.username?.trim() ||
          `Customer ${record.customer_id.slice(0, 8)}`;

        return {
          id: record.id,
          customerName,
          initials: getInitials(customerName),
          service: record.listing_title_snapshot || "NiaWorld session",
          scheduledAt: record.scheduled_at,
          duration: record.duration_minutes,
          status: record.status,
          amount:
            record.price_amount === null
              ? null
              : Number(record.price_amount),
          currency: record.currency || "USD",
          customerId: record.customer_id,
          country: profile?.country ?? null,
        };
      });

      setBookings(mappedBookings);
    } catch (error) {
      console.error("Provider bookings error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to load bookings. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadBookings();
  }, [loadBookings]);

  const handleBookingAction = async (
    bookingId: string,
    newStatus: ProviderActionStatus
  ) => {
    setProcessingId(bookingId);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { error } = await supabase.rpc(
        "provider_update_booking_status",
        {
          p_booking_id: bookingId,
          p_new_status: newStatus,
        }
      );

      if (error) throw error;

      const messages: Record<ProviderActionStatus, string> = {
        confirmed: "Booking confirmed successfully.",
        rejected: "Booking request rejected.",
        completed: "Session marked as completed.",
      };

      setSuccessMessage(messages[newStatus]);
      await loadBookings();
    } catch (error) {
      console.error("Booking action error:", error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "The booking action could not be completed."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const expectedStatus = filterToStatus[activeFilter];

      const matchesStatus =
        expectedStatus === null || booking.status === expectedStatus;

      const query = searchQuery.trim().toLowerCase();

      const matchesSearch =
        !query ||
        booking.customerName.toLowerCase().includes(query) ||
        booking.service.toLowerCase().includes(query) ||
        booking.id.toLowerCase().includes(query);

      const bookingDate = new Date(booking.scheduledAt);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const matchesDate =
        dateFilter === "all" ||
        (dateFilter === "upcoming" && bookingDate >= today) ||
        (dateFilter === "past" && bookingDate < today);

      return matchesStatus && matchesSearch && matchesDate;
    });
  }, [bookings, activeFilter, searchQuery, dateFilter]);

  const counts = {
    all: bookings.length,
    requested: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
  };

  const hasFilters =
    searchQuery.trim() !== "" ||
    dateFilter !== "all" ||
    activeFilter !== "All bookings";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#F4F7F1] text-[#263526]">
      <div
        className="pointer-events-none fixed inset-0 bg-cover bg-center opacity-[0.12]"
        style={{
          backgroundImage: "url('/images/cultural-background.jpg')",
        }}
        aria-hidden="true"
      />

      <div className="relative flex min-h-screen">
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-[#DCE5D7] bg-[#F8FAF5]/95 px-5 py-6 backdrop-blur-sm lg:flex">
          <Link
            href="/provider/dashboard"
            className="mb-9 flex items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4C9A2A]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#4C9A2A] text-xl font-bold text-white">
              N
            </div>
            <div>
              <p className="text-lg font-bold tracking-tight text-[#24451F]">
                NiaWorld
              </p>
              <p className="text-xs text-[#71806C]">Provider space</p>
            </div>
          </Link>

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#8A9683]">
            Workspace
          </p>

          <nav className="flex flex-col gap-1.5" aria-label="Provider navigation">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.label === "Bookings";

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition ${
                    active
                      ? "bg-[#E5F1DE] text-[#326E27]"
                      : "text-[#667461] hover:bg-white hover:text-[#326E27]"
                  }`}
                >
                  <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                  <span>{item.label}</span>
                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-[#4C9A2A]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto rounded-2xl border border-[#DCE8D4] bg-white/80 p-4">
            <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-[#EDF5E8] text-[#4C9A2A]">
              <Users size={18} />
            </div>
            <p className="text-sm font-semibold text-[#31452C]">
              Share your culture
            </p>
            <p className="mt-1 text-xs leading-5 text-[#788571]">
              Keep your profile and services ready for your customers.
            </p>
            <Link
              href="/provider/services"
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#39792D] hover:underline"
            >
              Manage services <ArrowUpRight size={13} />
            </Link>
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:ml-[248px]">
          <header className="sticky top-0 z-30 border-b border-[#DCE5D7] bg-[#F8FAF5]/90 backdrop-blur-md">
            <div className="mx-auto flex h-[72px] max-w-[1500px] items-center justify-between gap-4 px-4 sm:px-7 xl:px-10">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileMenuOpen((open) => !open)}
                  aria-label={
                    mobileMenuOpen ? "Close navigation" : "Open navigation"
                  }
                  aria-expanded={mobileMenuOpen}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE5D7] bg-white text-[#40563B] lg:hidden"
                >
                  {mobileMenuOpen ? <X size={19} /> : <Menu size={19} />}
                </button>

                <div>
                  <p className="text-xs font-medium text-[#7D8977]">
                    Provider workspace
                  </p>
                  <h1 className="text-lg font-bold tracking-tight text-[#263D23] sm:text-xl">
                    Bookings
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link
                  href="/provider/messages"
                  aria-label="Open messages"
                  className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[#DCE5D7] bg-white text-[#5D7055] transition hover:bg-[#EDF5E8]"
                >
                  <MessageCircle size={18} />
                </Link>

                <Link
                  href="/provider/settings"
                  aria-label="Provider settings"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#D7E5D0] bg-[#E5F1DE] text-sm font-bold text-[#3F772F]"
                >
                  P
                </Link>
              </div>
            </div>
          </header>

          {mobileMenuOpen && (
            <div className="fixed inset-0 z-50 bg-[#1E2A1C]/25 lg:hidden">
              <div className="h-full w-[285px] max-w-[85vw] bg-[#F8FAF5] p-5 shadow-xl">
                <div className="mb-7 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4C9A2A] font-bold text-white">
                      N
                    </div>
                    <div>
                      <p className="font-bold text-[#24451F]">NiaWorld</p>
                      <p className="text-xs text-[#71806C]">Provider space</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    aria-label="Close navigation"
                    className="rounded-lg p-2 text-[#667461] hover:bg-white"
                  >
                    <X size={19} />
                  </button>
                </div>

                <nav
                  className="flex flex-col gap-1.5"
                  aria-label="Mobile provider navigation"
                >
                  {navigation.map((item) => {
                    const Icon = item.icon;
                    const active = item.label === "Bookings";

                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium ${
                          active
                            ? "bg-[#E5F1DE] text-[#326E27]"
                            : "text-[#667461] hover:bg-white"
                        }`}
                      >
                        <Icon size={19} />
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}

          <div className="mx-auto max-w-[1500px] px-4 pb-28 pt-6 sm:px-7 sm:pt-8 lg:pb-10 xl:px-10">
            <section className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#D7E5D0] bg-white/80 px-3 py-1.5 text-xs font-semibold text-[#527249]">
                  <CalendarCheck size={14} />
                  Booking management
                </div>

                <h2 className="text-2xl font-bold tracking-tight text-[#263D23] sm:text-3xl">
                  Your sessions, all in one place
                </h2>

                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#74816E] sm:text-base">
                  Review customer requests, prepare for upcoming cultural
                  conversations, and keep track of completed sessions.
                </p>
              </div>

              <Link
                href="/provider/services"
                className="inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-[#4C9A2A] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#3E8123] sm:self-auto"
              >
                Manage services <ChevronRight size={17} />
              </Link>
            </section>

            {errorMessage && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
              >
                <XCircle size={18} className="mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
              >
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <section
              className="mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4"
              aria-label="Booking summary"
            >
              <SummaryCard
                icon={Inbox}
                label="Total bookings"
                value={counts.all}
                detail="All time"
                iconClass="bg-[#E8F1E2] text-[#4C8B36]"
              />
              <SummaryCard
                icon={Hourglass}
                label="New requests"
                value={counts.requested}
                detail="Awaiting response"
                iconClass="bg-[#FFF1D7] text-[#A57923]"
              />
              <SummaryCard
                icon={CalendarCheck}
                label="Upcoming sessions"
                value={counts.confirmed}
                detail="Confirmed"
                iconClass="bg-[#E3F3E9] text-[#2C8452]"
              />
              <SummaryCard
                icon={CheckCircle2}
                label="Completed"
                value={counts.completed}
                detail="Finished sessions"
                iconClass="bg-[#E6EFF9] text-[#497BB1]"
              />
            </section>

            <section className="overflow-hidden rounded-2xl border border-[#DDE6D8] bg-white/95 shadow-[0_8px_28px_rgba(42,66,34,0.035)]">
              <div className="border-b border-[#E8EDE4] p-4 sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-[#2E4229]">
                      Booking activity
                    </h3>
                    <p className="mt-1 text-sm text-[#82907B]">
                      View and organize your customer sessions.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label className="relative block sm:min-w-[240px]">
                      <Search
                        size={17}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A18E]"
                      />
                      <span className="sr-only">Search bookings</span>
                      <input
                        type="search"
                        value={searchQuery}
                        onChange={(event) =>
                          setSearchQuery(event.target.value)
                        }
                        placeholder="Search bookings..."
                        className="h-11 w-full rounded-xl border border-[#DFE7DA] bg-[#FBFCF9] pl-10 pr-3 text-sm text-[#34452F] outline-none placeholder:text-[#A0AA9A] focus:border-[#78AD65] focus:ring-2 focus:ring-[#E4F1DE]"
                      />
                    </label>

                    <label className="flex h-11 items-center gap-2 rounded-xl border border-[#DFE7DA] bg-[#FBFCF9] px-3 text-sm text-[#65765E]">
                      <SlidersHorizontal size={16} />
                      <span className="sr-only">Filter by date</span>
                      <select
                        value={dateFilter}
                        onChange={(event) => setDateFilter(event.target.value)}
                        className="max-w-[160px] bg-transparent outline-none"
                      >
                        <option value="all">Any date</option>
                        <option value="upcoming">Today onwards</option>
                        <option value="past">Past sessions</option>
                      </select>
                    </label>
                  </div>
                </div>

                <div className="mt-5 flex gap-2 overflow-x-auto pb-1">
                  {filters.map((filter) => {
                    const active = activeFilter === filter;

                    return (
                      <button
                        key={filter}
                        type="button"
                        onClick={() => setActiveFilter(filter)}
                        aria-pressed={active}
                        className={`shrink-0 rounded-xl px-4 py-2.5 text-xs font-semibold transition sm:text-sm ${
                          active
                            ? "bg-[#E6F1E0] text-[#39752D]"
                            : "border border-[#E5EBE1] bg-white text-[#7A8874] hover:bg-[#F7FAF4]"
                        }`}
                      >
                        {filter}
                      </button>
                    );
                  })}
                </div>
              </div>

              {loading ? (
                <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
                  <LoaderCircle
                    size={30}
                    className="animate-spin text-[#4C9A2A]"
                  />
                  <p className="mt-4 text-sm text-[#82907B]">
                    Loading your bookings...
                  </p>
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="px-5 py-14 text-center sm:px-8 sm:py-20">
                  <div className="mx-auto flex h-[72px] w-[72px] items-center justify-center rounded-3xl bg-[#EDF5E8] text-[#5B9846]">
                    <CalendarDays size={31} strokeWidth={1.7} />
                  </div>

                  <h4 className="mt-5 text-lg font-bold text-[#30452B]">
                    {hasFilters
                      ? "No matching bookings"
                      : "Your bookings will appear here"}
                  </h4>

                  <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#82907B]">
                    {hasFilters
                      ? "Try changing your search or filters to see other bookings."
                      : "When customers book your published services, their requests and session details will appear here."}
                  </p>

                  {hasFilters ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery("");
                        setDateFilter("all");
                        setActiveFilter("All bookings");
                      }}
                      className="mt-5 rounded-xl border border-[#DCE7D5] bg-white px-4 py-2.5 text-sm font-semibold text-[#4A7B3C] transition hover:bg-[#F4F8F0]"
                    >
                      Clear filters
                    </button>
                  ) : (
                    <Link
                      href="/provider/services"
                      className="mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#4C9A2A] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#3E8123]"
                    >
                      Review your services <ChevronRight size={16} />
                    </Link>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-[#E9EEE5]">
                  {filteredBookings.map((booking) => (
                    <BookingRow
                      key={booking.id}
                      booking={booking}
                      processing={processingId === booking.id}
                      onAction={handleBookingAction}
                    />
                  ))}
                </div>
              )}

              <div className="flex flex-col gap-2 border-t border-[#E8EDE4] bg-[#FBFCF9] px-4 py-4 text-xs text-[#899585] sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <span>
                  Showing {filteredBookings.length} of {bookings.length} bookings
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <LockKeyhole size={13} />
                  Customer booking information is private
                </span>
              </div>
            </section>

            <section className="mt-8">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-[#2E4229]">
                  How booking management works
                </h3>
                <p className="mt-1 text-sm text-[#82907B]">
                  The workflow for NiaWorld cultural sessions.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <WorkflowCard
                  number="01"
                  icon={Inbox}
                  title="Receive a request"
                  description="Review the customer's selected service, preferred time, and session details."
                />
                <WorkflowCard
                  number="02"
                  icon={CalendarCheck}
                  title="Confirm the session"
                  description="Accept an available time or decline a request you cannot accommodate."
                />
                <WorkflowCard
                  number="03"
                  icon={CheckCircle2}
                  title="Complete the session"
                  description="Mark a confirmed session completed after the scheduled session has taken place."
                />
              </div>
            </section>

            <section className="mt-6 flex items-start gap-3 rounded-2xl border border-[#DCE7D5] bg-white/80 p-4 sm:p-5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#EAF3E5] text-[#4C8B36]">
                <Wallet size={18} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-[#344A2D]">
                  Session earnings and payouts
                </h4>
                <p className="mt-1 text-sm leading-6 text-[#7C8976]">
                  Booking status changes do not automatically credit earnings.
                  Payment records and session checks will be connected separately.
                </p>
                <Link
                  href="/provider/earnings"
                  className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#477C38] hover:underline"
                >
                  View wallet <ChevronRight size={15} />
                </Link>
              </div>
            </section>

            <footer className="mt-8 pb-2 text-center text-xs text-[#95A08F]">
              NiaWorld · Real People. Real Cultures. Real Connections.
            </footer>
          </div>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-[#DCE5D7] bg-[#F8FAF5]/95 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Mobile provider navigation"
      >
        <div className="mx-auto grid max-w-xl grid-cols-7">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.label === "Bookings";

            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-w-0 flex-col items-center justify-center gap-1 py-2.5 text-[9px] font-medium transition sm:text-[10px] ${
                  active
                    ? "text-[#39772D]"
                    : "text-[#879381] hover:text-[#39772D]"
                }`}
              >
                <Icon size={19} strokeWidth={active ? 2.4 : 1.8} />
                <span className="max-w-full truncate">{item.label}</span>
                {active && (
                  <span className="absolute bottom-0 h-0.5 w-8 rounded-full bg-[#4C9A2A]" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  iconClass,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: number;
  detail: string;
  iconClass: string;
}) {
  return (
    <article className="rounded-2xl border border-[#DDE6D8] bg-white/95 p-4 shadow-[0_5px_18px_rgba(42,66,34,0.025)] sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconClass}`}
        >
          <Icon size={19} />
        </div>
        <span className="hidden text-[10px] font-medium text-[#A0AA9A] sm:block">
          {detail}
        </span>
      </div>

      <p className="mt-4 text-2xl font-bold tracking-tight text-[#2D4228] sm:text-3xl">
        {value}
      </p>
      <p className="mt-1 text-xs font-medium text-[#788672] sm:text-sm">
        {label}
      </p>
      <p className="mt-1 text-[10px] text-[#A0AA9A] sm:hidden">{detail}</p>
    </article>
  );
}

function BookingRow({
  booking,
  processing,
  onAction,
}: {
  booking: Booking;
  processing: boolean;
  onAction: (id: string, status: ProviderActionStatus) => Promise<void>;
}) {
  const status = statusConfig[booking.status];
  const isPending = booking.status === "pending";
  const isConfirmed = booking.status === "confirmed";
  const canComplete =
    isConfirmed && new Date(booking.scheduledAt).getTime() <= Date.now();

  return (
    <article className="flex flex-col gap-4 px-4 py-5 transition hover:bg-[#FBFCF9] sm:px-6 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F1E2] text-sm font-bold text-[#477B37]">
          {booking.initials}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-[#30432B]">
              {booking.customerName}
            </h4>
            <span
              className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${status.className}`}
            >
              {status.label}
            </span>
          </div>

          <p className="mt-1 text-sm text-[#697964]">{booking.service}</p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#8A9685]">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={14} />
              {formatDate(booking.scheduledAt)}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock3 size={14} />
              {formatTime(booking.scheduledAt)} · {booking.duration} min
            </span>
            {booking.country && <span>{booking.country}</span>}
            <span>Text chat</span>
          </div>

          <p className="mt-2 text-[10px] text-[#A0AA9A]">
            Booking reference: {booking.id}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-[#EDF0E9] pt-3 lg:min-w-[210px] lg:items-end lg:border-0 lg:pt-0">
        <div className="flex items-center justify-between gap-4 lg:block lg:text-right">
          <div>
            <p className="text-lg font-bold text-[#30452B]">
              {formatMoney(booking.amount, booking.currency)}
            </p>
            <p className="text-[10px] text-[#8A9685]">
              Session amount · before fees
            </p>
          </div>

          <Link
            href="/provider/messages"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#DDE7D7] bg-white px-3 py-2 text-xs font-semibold text-[#4D743F] transition hover:bg-[#F0F6EC]"
          >
            <MessageCircle size={14} />
            Messages
          </Link>
        </div>

        {(isPending || isConfirmed) && (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {isPending && (
              <>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => void onAction(booking.id, "confirmed")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#4C9A2A] px-3 py-2 text-xs font-semibold text-white transition hover:bg-[#3E8123] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {processing ? (
                    <LoaderCircle size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  Confirm
                </button>

                <button
                  type="button"
                  disabled={processing}
                  onClick={() => void onAction(booking.id, "rejected")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <XCircle size={14} />
                  Reject
                </button>
              </>
            )}

            {canComplete && (
              <button
                type="button"
                disabled={processing}
                onClick={() => void onAction(booking.id, "completed")}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#E6EFF9] px-3 py-2 text-xs font-semibold text-[#497BB1] transition hover:bg-[#D8E7F7] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {processing ? (
                  <LoaderCircle size={14} className="animate-spin" />
                ) : (
                  <CheckCircle2 size={14} />
                )}
                Complete
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function WorkflowCard({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: string;
  icon: typeof CalendarDays;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-2xl border border-[#DDE6D8] bg-white/90 p-5">
      <div className="flex items-center justify-between">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#E8F1E2] text-[#4C8B36]">
          <Icon size={19} />
        </div>
        <span className="text-xs font-bold tracking-widest text-[#A0B098]">
          {number}
        </span>
      </div>

      <h4 className="mt-4 text-sm font-bold text-[#34482E]">{title}</h4>
      <p className="mt-2 text-sm leading-6 text-[#7D8977]">{description}</p>
    </article>
  );
}
