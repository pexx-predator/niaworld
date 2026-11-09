
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Home,
  BriefcaseBusiness,
  CalendarDays,
  MessageCircle,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  Menu,
  X,
  RefreshCw,
  TrendingUp,
  Users,
  Clock3,
  CheckCircle2,
  CalendarCheck,
  CalendarClock,
  XCircle,
  Activity,
  BarChart3,
  ArrowUpRight,
  Info,
  AlertCircle,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { label: "Home", href: "/provider/dashboard", icon: Home },
  { label: "Services", href: "/provider/services", icon: BriefcaseBusiness },
  { label: "Bookings", href: "/provider/bookings", icon: CalendarDays },
  { label: "Messages", href: "/provider/messages", icon: MessageCircle },
  { label: "Wallet", href: "/provider/earnings", icon: Wallet },
  { label: "Analytics", href: "/provider/analytics", icon: ChartNoAxesCombined },
  { label: "Settings", href: "/provider/settings", icon: Settings },
];

type Booking = {
  id: string;
  customer_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  created_at: string;
};

type MonthlyStat = {
  label: string;
  total: number;
  completed: number;
};

type AnalyticsData = {
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  cancelledBookings: number;
  upcomingBookings: number;
  completedHours: number;
  uniqueCustomers: number;
  completionRate: number;
  monthlyStats: MonthlyStat[];
  recentBookings: Booking[];
};

const EMPTY_ANALYTICS: AnalyticsData = {
  totalBookings: 0,
  completedBookings: 0,
  pendingBookings: 0,
  confirmedBookings: 0,
  cancelledBookings: 0,
  upcomingBookings: 0,
  completedHours: 0,
  uniqueCustomers: 0,
  completionRate: 0,
  monthlyStats: [],
  recentBookings: [],
};

function isCompleted(status: string) {
  return status.toLowerCase() === "completed";
}

function isPending(status: string) {
  return status.toLowerCase() === "pending";
}

function isConfirmed(status: string) {
  return ["confirmed", "accepted", "approved"].includes(status.toLowerCase());
}

function isCancelled(status: string) {
  return ["cancelled", "canceled", "rejected"].includes(status.toLowerCase());
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours === 0) return `${remainingMinutes} min`;
  if (remainingMinutes === 0) return `${hours} hr`;

  return `${hours} hr ${remainingMinutes} min`;
}

function getMonthlyStats(bookings: Booking[]): MonthlyStat[] {
  const now = new Date();

  const months = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);

    return {
      year: date.getFullYear(),
      month: date.getMonth(),
      label: date.toLocaleDateString("en", { month: "short" }),
      total: 0,
      completed: 0,
    };
  });

  bookings.forEach((booking) => {
    const date = new Date(booking.scheduled_at);

    const month = months.find(
      (item) =>
        item.year === date.getFullYear() && item.month === date.getMonth()
    );

    if (month) {
      month.total += 1;

      if (isCompleted(booking.status)) {
        month.completed += 1;
      }
    }
  });

  return months.map(({ label, total, completed }) => ({
    label,
    total,
    completed,
  }));
}

function calculateAnalytics(bookings: Booking[]): AnalyticsData {
  const now = new Date();

  const completed = bookings.filter((booking) =>
    isCompleted(booking.status)
  );

  const pending = bookings.filter((booking) =>
    isPending(booking.status)
  );

  const confirmed = bookings.filter((booking) =>
    isConfirmed(booking.status)
  );

  const cancelled = bookings.filter((booking) =>
    isCancelled(booking.status)
  );

  const upcoming = bookings.filter((booking) => {
    const scheduledDate = new Date(booking.scheduled_at);

    return (
      scheduledDate >= now &&
      !isCancelled(booking.status) &&
      !isCompleted(booking.status)
    );
  });

  const uniqueCustomers = new Set(
    bookings.map((booking) => booking.customer_id).filter(Boolean)
  ).size;

  const totalMinutes = completed.reduce(
    (total, booking) => total + (booking.duration_minutes || 0),
    0
  );

  const completionRate =
    bookings.length > 0
      ? Math.round((completed.length / bookings.length) * 100)
      : 0;

  return {
    totalBookings: bookings.length,
    completedBookings: completed.length,
    pendingBookings: pending.length,
    confirmedBookings: confirmed.length,
    cancelledBookings: cancelled.length,
    upcomingBookings: upcoming.length,
    completedHours: Math.round((totalMinutes / 60) * 10) / 10,
    uniqueCustomers,
    completionRate,
    monthlyStats: getMonthlyStats(bookings),
    recentBookings: [...bookings]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 6),
  };
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dce6d8] bg-white/95 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-[#718071]">{title}</p>
          <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-[#243326]">
            {value}
          </h3>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>

      <p className="mt-4 text-xs text-[#849184]">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let styles = "bg-gray-100 text-gray-700";

  if (isCompleted(status)) {
    styles = "bg-green-100 text-green-800";
  } else if (isPending(status)) {
    styles = "bg-amber-100 text-amber-800";
  } else if (isConfirmed(status)) {
    styles = "bg-blue-100 text-blue-800";
  } else if (isCancelled(status)) {
    styles = "bg-red-100 text-red-800";
  }

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${styles}`}
    >
      {status}
    </span>
  );
}

export default function ProviderAnalyticsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [analytics, setAnalytics] =
    useState<AnalyticsData>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAnalytics = useCallback(
    async (showRefresh = false) => {
      if (showRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user) {
          setAnalytics(EMPTY_ANALYTICS);
          setError("Your session could not be verified. Please sign in again.");
          return;
        }

        const { data, error: bookingsError } = await supabase
          .from("bookings")
          .select(
            "id, customer_id, scheduled_at, duration_minutes, status, created_at"
          )
          .eq("provider_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1000);

        if (bookingsError) throw bookingsError;

        const bookings = (data ?? []) as Booking[];

        setAnalytics(calculateAnalytics(bookings));
        setLastUpdated(new Date());
      } catch (err) {
        console.error("Provider analytics error:", err);

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load your analytics. Please try again."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  const maximumMonthlyBookings = Math.max(
    1,
    ...analytics.monthlyStats.map((item) => item.total)
  );

  const bookingStatuses = [
    {
      label: "Completed",
      value: analytics.completedBookings,
      icon: CheckCircle2,
      color: "bg-green-500",
      text: "text-green-700",
    },
    {
      label: "Pending",
      value: analytics.pendingBookings,
      icon: Clock3,
      color: "bg-amber-400",
      text: "text-amber-700",
    },
    {
      label: "Confirmed",
      value: analytics.confirmedBookings,
      icon: CalendarCheck,
      color: "bg-blue-500",
      text: "text-blue-700",
    },
    {
      label: "Cancelled",
      value: analytics.cancelledBookings,
      icon: XCircle,
      color: "bg-red-400",
      text: "text-red-700",
    },
  ];

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#eaf0e7] text-[#243326]">
      {/* Cultural background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/cultural-background.jpg')",
        }}
      />
      <div className="fixed inset-0 z-0 bg-[#eaf0e7]/55" />

      <div className="relative z-10">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[245px] flex-col border-r border-[#dce6d8] bg-[#f8fbf6]/95 px-5 py-6 backdrop-blur-sm lg:flex">
          <Link
            href="/provider/dashboard"
            className="mb-10 flex items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4c9a2a] text-white">
              <span className="text-lg font-bold">N</span>
            </div>

            <div>
              <p className="text-xl font-extrabold tracking-tight text-[#244522]">
                NiaWorld
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#849184]">
                Provider space
              </p>
            </div>
          </Link>

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa697]">
            Workspace
          </p>

          <nav className="flex-1 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.label === "Analytics";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#e4f1df] text-[#397c27]"
                      : "text-[#647263] hover:bg-[#edf4e9] hover:text-[#397c27]"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}

                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-[#4c9a2a]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="rounded-2xl border border-[#dce8d7] bg-[#edf5e9] p-4">
            <div className="mb-2 flex items-center gap-2 text-[#397c27]">
              <Activity size={18} />
              <span className="text-xs font-bold">Your performance</span>
            </div>

            <p className="text-xs leading-relaxed text-[#718071]">
              Track your bookings and understand how your provider activity is
              progressing.
            </p>

            <Link
              href="/provider/bookings"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#397c27] hover:underline"
            >
              View bookings <ChevronRight size={14} />
            </Link>
          </div>
        </aside>

        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#dce6d8] bg-[#f8fbf6]/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <Link href="/provider/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4c9a2a] font-bold text-white">
              N
            </div>
            <span className="text-lg font-extrabold text-[#244522]">
              NiaWorld
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-xl p-2 text-[#45613f] hover:bg-[#eaf2e5]"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>

        {/* Mobile dropdown navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-x-0 top-[61px] z-40 border-b border-[#dce6d8] bg-[#f8fbf6] p-4 shadow-lg lg:hidden">
            <nav className="grid grid-cols-2 gap-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = item.label === "Analytics";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold ${
                      active
                        ? "bg-[#e4f1df] text-[#397c27]"
                        : "text-[#647263] hover:bg-[#edf4e9]"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main page */}
        <main className="mx-auto min-h-screen max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:ml-[245px] lg:px-9 lg:pb-10 lg:pt-9">
          {/* Heading */}
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#718071]">
                <Link
                  href="/provider/dashboard"
                  className="hover:text-[#397c27]"
                >
                  Dashboard
                </Link>
                <ChevronRight size={13} />
                <span className="text-[#397c27]">Analytics</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-[#243326] sm:text-4xl">
                Performance Analytics
              </h1>

              <p className="mt-2 text-sm text-[#718071]">
                Understand your bookings, customers and session activity.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadAnalytics(true)}
              disabled={loading || refreshing}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-[#cbdac5] bg-white px-4 py-2.5 text-sm font-semibold text-[#45613f] shadow-sm transition hover:bg-[#f4f8f1] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh analytics
            </button>
          </div>

          {/* Data source notice */}
          <div className="mb-7 flex items-start gap-3 rounded-2xl border border-[#cbdcc2] bg-[#f4f9f0]/95 p-4">
            <div className="rounded-xl bg-[#e4f1df] p-2.5 text-[#43832d]">
              <Activity size={20} />
            </div>

            <div className="flex-1">
              <p className="font-bold text-[#355d2b]">
                Connected to your booking records
              </p>
              <p className="mt-1 text-sm leading-relaxed text-[#718071]">
                Analytics are calculated from your bookings in NiaWorld. Revenue
                and payment analytics are not displayed because booking pricing
                and payment records have not yet been implemented.
              </p>

              {lastUpdated && (
                <p className="mt-2 text-xs text-[#849184]">
                  Last updated: {lastUpdated.toLocaleTimeString()}
                </p>
              )}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">
              <AlertCircle size={20} className="mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-bold">Unable to load analytics</p>
                <p className="mt-1 text-sm">{error}</p>

                <button
                  type="button"
                  onClick={() => void loadAnalytics(true)}
                  className="mt-3 text-sm font-bold underline"
                >
                  Try again
                </button>
              </div>
            </div>
          )}

          {/* Loading state */}
          {loading ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-[#dce6d8] bg-white/90">
              <Loader2 size={34} className="animate-spin text-[#4c9a2a]" />
              <p className="mt-4 text-sm font-semibold text-[#647263]">
                Loading your analytics...
              </p>
            </div>
          ) : (
            <>
              {/* Main statistics */}
              <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatCard
                  title="Total bookings"
                  value={analytics.totalBookings}
                  description="All bookings recorded for your account"
                  icon={CalendarDays}
                  color="bg-[#e6f3df] text-[#43832d]"
                />

                <StatCard
                  title="Completed sessions"
                  value={analytics.completedBookings}
                  description="Bookings marked as completed"
                  icon={CheckCircle2}
                  color="bg-green-100 text-green-700"
                />

                <StatCard
                  title="Upcoming sessions"
                  value={analytics.upcomingBookings}
                  description="Future bookings not yet completed"
                  icon={CalendarClock}
                  color="bg-blue-100 text-blue-700"
                />

                <StatCard
                  title="Unique customers"
                  value={analytics.uniqueCustomers}
                  description="Different customer accounts that booked you"
                  icon={Users}
                  color="bg-purple-100 text-purple-700"
                />
              </section>

              {/* Secondary statistics */}
              <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                <StatCard
                  title="Completed session hours"
                  value={`${analytics.completedHours} hrs`}
                  description="Calculated from completed booking durations"
                  icon={Clock3}
                  color="bg-amber-100 text-amber-700"
                />

                <StatCard
                  title="Completion rate"
                  value={`${analytics.completionRate}%`}
                  description="Completed bookings divided by all bookings"
                  icon={TrendingUp}
                  color="bg-[#e6f3df] text-[#43832d]"
                />

                <StatCard
                  title="Pending bookings"
                  value={analytics.pendingBookings}
                  description="Bookings awaiting a decision"
                  icon={CalendarClock}
                  color="bg-orange-100 text-orange-700"
                />
              </section>

              {/* Charts */}
              <section className="mb-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
                {/* Monthly booking activity */}
                <div className="rounded-2xl border border-[#dce6d8] bg-white/95 p-5 shadow-sm sm:p-6">
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold text-[#243326]">
                        Booking activity
                      </h2>
                      <p className="mt-1 text-sm text-[#849184]">
                        Bookings by scheduled month over the last six months.
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#f0f5ed] p-2.5 text-[#43832d]">
                      <BarChart3 size={20} />
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap gap-4 text-xs font-medium text-[#718071]">
                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#4c9a2a]" />
                      Completed
                    </span>

                    <span className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-sm bg-[#cbdcc2]" />
                      Other bookings
                    </span>
                  </div>

                  <div className="flex h-[220px] items-end gap-3 border-b border-[#e7ede3] pb-2 sm:gap-5">
                    {analytics.monthlyStats.map((month) => {
                      const totalHeight =
                        (month.total / maximumMonthlyBookings) * 100;

                      const completedHeight =
                        month.total > 0
                          ? (month.completed / month.total) * totalHeight
                          : 0;

                      const otherHeight = Math.max(
                        0,
                        totalHeight - completedHeight
                      );

                      return (
                        <div
                          key={month.label}
                          className="flex h-full flex-1 flex-col items-center justify-end"
                        >
                          <span className="mb-2 text-xs font-bold text-[#647263]">
                            {month.total}
                          </span>

                          <div className="flex h-[170px] w-full max-w-[48px] flex-col justify-end overflow-hidden rounded-t-lg bg-[#f2f6ef]">
                            {month.total > 0 && (
                              <>
                                <div
                                  className="w-full bg-[#cbdcc2]"
                                  style={{ height: `${otherHeight}%` }}
                                />
                                <div
                                  className="w-full bg-[#4c9a2a]"
                                  style={{ height: `${completedHeight}%` }}
                                />
                              </>
                            )}
                          </div>

                          <span className="mt-3 text-xs font-semibold text-[#849184]">
                            {month.label}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {analytics.totalBookings === 0 && (
                    <p className="mt-4 text-center text-xs text-[#849184]">
                      Your booking activity will appear here when bookings are
                      recorded.
                    </p>
                  )}
                </div>

                {/* Booking status breakdown */}
                <div className="rounded-2xl border border-[#dce6d8] bg-white/95 p-5 shadow-sm sm:p-6">
                  <h2 className="text-lg font-bold text-[#243326]">
                    Booking status
                  </h2>

                  <p className="mt-1 text-sm text-[#849184]">
                    Breakdown of your booking records.
                  </p>

                  <div className="my-7 flex justify-center">
                    <div
                      className="relative flex h-40 w-40 items-center justify-center rounded-full"
                      style={{
                        background: `conic-gradient(
                          #4c9a2a 0% ${
                            analytics.totalBookings > 0
                              ? (analytics.completedBookings /
                                  analytics.totalBookings) *
                                100
                              : 0
                          }%,
                          #e8c36b ${
                            analytics.totalBookings > 0
                              ? (analytics.completedBookings /
                                  analytics.totalBookings) *
                                100
                              : 0
                          }% ${
                            analytics.totalBookings > 0
                              ? ((analytics.completedBookings +
                                  analytics.pendingBookings) /
                                  analytics.totalBookings) *
                                100
                              : 0
                          }%,
                          #6c9ed1 0%,
                          #e6e9e3 100%
                        )`,
                      }}
                    >
                      <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full bg-white">
                        <span className="text-3xl font-extrabold text-[#243326]">
                          {analytics.totalBookings}
                        </span>
                        <span className="text-xs text-[#849184]">
                          Bookings
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {bookingStatuses.map((status) => {
                      const Icon = status.icon;
                      const percentage =
                        analytics.totalBookings > 0
                          ? (status.value / analytics.totalBookings) * 100
                          : 0;

                      return (
                        <div key={status.label}>
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Icon size={16} className={status.text} />
                              <span className="text-sm font-medium text-[#647263]">
                                {status.label}
                              </span>
                            </div>

                            <span className="text-sm font-bold text-[#344735]">
                              {status.value}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-[#edf2e9]">
                            <div
                              className={`h-full rounded-full ${status.color}`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>

              {/* Recent bookings */}
              <section className="mb-8 rounded-2xl border border-[#dce6d8] bg-white/95 p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-[#243326]">
                      Recent booking activity
                    </h2>
                    <p className="mt-1 text-sm text-[#849184]">
                      Your latest recorded bookings.
                    </p>
                  </div>

                  <Link
                    href="/provider/bookings"
                    className="inline-flex w-fit items-center gap-1 text-sm font-bold text-[#43832d] hover:underline"
                  >
                    View all bookings <ArrowUpRight size={16} />
                  </Link>
                </div>

                {analytics.recentBookings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[#cbdac5] bg-[#f8faf6] px-4 py-12 text-center">
                    <CalendarDays
                      size={32}
                      className="mx-auto text-[#9aaa94]"
                    />

                    <h3 className="mt-3 font-bold text-[#405340]">
                      No bookings yet
                    </h3>

                    <p className="mt-1 text-sm text-[#849184]">
                      Your booking activity will appear here when customers
                      start booking your services.
                    </p>

                    <Link
                      href="/provider/bookings"
                      className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-[#43832d] hover:underline"
                    >
                      Go to bookings <ChevronRight size={16} />
                    </Link>
                  </div>
                ) : (
                  <>
                    {/* Desktop table */}
                    <div className="hidden overflow-x-auto md:block">
                      <table className="w-full min-w-[650px] text-left">
                        <thead>
                          <tr className="border-b border-[#e7ede3] text-xs uppercase tracking-wider text-[#849184]">
                            <th className="px-3 py-3 font-bold">Booking</th>
                            <th className="px-3 py-3 font-bold">Scheduled</th>
                            <th className="px-3 py-3 font-bold">Duration</th>
                            <th className="px-3 py-3 font-bold">Status</th>
                          </tr>
                        </thead>

                        <tbody>
                          {analytics.recentBookings.map((booking) => (
                            <tr
                              key={booking.id}
                              className="border-b border-[#edf1ea] last:border-0"
                            >
                              <td className="px-3 py-4">
                                <p className="text-sm font-semibold text-[#344735]">
                                  Customer booking
                                </p>
                                <p className="mt-1 text-xs text-[#9aa697]">
                                  Ref: {booking.id.slice(0, 8)}
                                </p>
                              </td>

                              <td className="px-3 py-4 text-sm text-[#718071]">
                                {formatDate(booking.scheduled_at)}
                              </td>

                              <td className="px-3 py-4 text-sm text-[#718071]">
                                {formatDuration(booking.duration_minutes || 0)}
                              </td>

                              <td className="px-3 py-4">
                                <StatusBadge status={booking.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile cards */}
                    <div className="space-y-3 md:hidden">
                      {analytics.recentBookings.map((booking) => (
                        <div
                          key={booking.id}
                          className="rounded-xl border border-[#e7ede3] p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-bold text-[#344735]">
                                Customer booking
                              </p>
                              <p className="mt-1 text-xs text-[#9aa697]">
                                Ref: {booking.id.slice(0, 8)}
                              </p>
                            </div>

                            <StatusBadge status={booking.status} />
                          </div>

                          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-[#718071]">
                            <span className="flex items-center gap-1.5">
                              <CalendarDays size={14} />
                              {formatDate(booking.scheduled_at)}
                            </span>

                            <span className="flex items-center gap-1.5">
                              <Clock3 size={14} />
                              {formatDuration(booking.duration_minutes || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </section>

              {/* Revenue unavailable notice */}
              <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/95 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-amber-100 p-3 text-amber-700">
                    <Info size={22} />
                  </div>

                  <div>
                    <h2 className="font-bold text-amber-900">
                      Revenue analytics coming with payment integration
                    </h2>

                    <p className="mt-1 text-sm leading-relaxed text-amber-800">
                      Your current booking records do not contain service
                      prices or confirmed payment amounts. We will add revenue,
                      commission, earnings trends and payout analytics after
                      the pricing and payment system is implemented. No
                      revenue figures are estimated or fabricated here.
                    </p>

                    <Link
                      href="/provider/earnings"
                      className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-amber-900 hover:underline"
                    >
                      View wallet <ChevronRight size={16} />
                    </Link>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* Footer */}
          <p className="mt-7 text-center text-xs text-[#899688]">
            NiaWorld Provider Analytics
          </p>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dce6d8] bg-[#f8fbf6]/95 px-1 py-2 backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-around">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.label === "Analytics";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-1.5 ${
                    active ? "text-[#397c27]" : "text-[#849184]"
                  }`}
                >
                  <Icon size={19} />
                  <span className="text-[10px] font-semibold">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
