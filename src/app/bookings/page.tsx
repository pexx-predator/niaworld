
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type BookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "rejected";

type BookingRow = {
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

type ProviderProfile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  country: string | null;
  avatar_url: string | null;
};

type Booking = BookingRow & {
  provider: ProviderProfile | null;
};

type StatusFilter = "all" | BookingStatus;

const navigation = [
  { id: "home", label: "Home", icon: "⌂", route: "/dashboard" },
  { id: "discover", label: "Discover", icon: "◎", route: "/discover" },
  {
    id: "conversations",
    label: "Conversations",
    icon: "◷",
    route: "/conversations",
  },
  { id: "wallet", label: "Wallet", icon: "◇", route: "/wallet" },
  { id: "messages", label: "Messages", icon: "✉", route: "/messages" },
  { id: "profile", label: "Profile", icon: "◉", route: "/profile" },
];

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All bookings" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "rejected", label: "Rejected" },
];

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatPrice(amount: number | null, currency: string | null) {
  if (amount === null || !currency) return "Price unavailable";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function getProviderName(provider: ProviderProfile | null) {
  return (
    provider?.display_name?.trim() ||
    provider?.username?.trim() ||
    "NiaWorld provider"
  );
}

function getStatusLabel(status: BookingStatus) {
  const labels: Record<BookingStatus, string> = {
    pending: "Pending",
    confirmed: "Confirmed",
    completed: "Completed",
    cancelled: "Cancelled",
    rejected: "Rejected",
  };

  return labels[status];
}

export default function BookingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [createdBookingId, setCreatedBookingId] = useState("");
  const [activeNavigation, setActiveNavigation] = useState("bookings");

  const loadBookings = useCallback(
    async (showLoading = true) => {
      if (showLoading) setLoading(true);
      setErrorMessage("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        router.replace("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select(
          [
            "id",
            "customer_id",
            "provider_id",
            "scheduled_at",
            "duration_minutes",
            "status",
            "notes",
            "created_at",
            "listing_title_snapshot",
            "price_amount",
            "currency",
          ].join(", ")
        )
        .eq("customer_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        setErrorMessage(
          "Your bookings could not be loaded. Please try again."
        );
        setBookings([]);
        setLoading(false);
        return;
      }

      // Supabase may infer GenericStringError[] for this query.
      // Validate the result shape through this intermediate assertion.
      const rows = (data ?? []) as unknown as BookingRow[];

      const providerIds = [
        ...new Set(rows.map((booking) => booking.provider_id)),
      ];

      let providerProfiles: ProviderProfile[] = [];

      if (providerIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, country, avatar_url")
          .in("user_id", providerIds);

        if (profilesError) {
          setErrorMessage(
            "Bookings loaded, but some provider profile details are unavailable."
          );
        } else {
          providerProfiles = (profilesData ?? []) as unknown as ProviderProfile[];
        }
      }

      const profileMap = new Map(
        providerProfiles.map((profile) => [profile.user_id, profile])
      );

      const mappedBookings: Booking[] = rows.map((booking) => ({
        ...booking,
        provider: profileMap.get(booking.provider_id) ?? null,
      }));

      setBookings(mappedBookings);
      setLoading(false);
    },
    [router, supabase]
  );

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const createdId = params.get("created");

    if (createdId) {
      setCreatedBookingId(createdId);
    }

    void loadBookings();
  }, [loadBookings]);

  useEffect(() => {
    if (!createdBookingId || loading) return;

    const bookingExists = bookings.some(
      (booking) => booking.id === createdBookingId
    );

    if (bookingExists) {
      setMessage("Your booking request was submitted successfully.");
    } else if (!errorMessage) {
      setMessage(
        "Your booking request was submitted. It may take a moment to appear."
      );
    }
  }, [createdBookingId, bookings, loading, errorMessage]);

  const filteredBookings = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return bookings.filter((booking) => {
      const matchesStatus =
        statusFilter === "all" || booking.status === statusFilter;

      const providerName = getProviderName(booking.provider).toLowerCase();
      const title = (booking.listing_title_snapshot || "").toLowerCase();

      const matchesSearch =
        !search ||
        providerName.includes(search) ||
        title.includes(search) ||
        booking.id.toLowerCase().includes(search);

      return matchesStatus && matchesSearch;
    });
  }, [bookings, searchTerm, statusFilter]);

  const summary = useMemo(() => {
    return {
      total: bookings.length,
      pending: bookings.filter((item) => item.status === "pending").length,
      confirmed: bookings.filter((item) => item.status === "confirmed").length,
      completed: bookings.filter((item) => item.status === "completed").length,
    };
  }, [bookings]);

  async function handleCancelBooking(bookingId: string) {
    const booking = bookings.find((item) => item.id === bookingId);

    if (!booking || !["pending", "confirmed"].includes(booking.status)) {
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to cancel this booking?"
    );

    if (!confirmed) return;

    setCancellingId(bookingId);
    setMessage("");
    setErrorMessage("");

    const { error } = await supabase.rpc("customer_cancel_booking", {
      p_booking_id: bookingId,
    });

    if (error) {
      setErrorMessage(
        "We could not cancel this booking. Please refresh and try again."
      );
      setCancellingId(null);
      return;
    }

    setMessage("Your booking has been cancelled.");
    setCancellingId(null);

    await loadBookings(false);
  }

  function navigateTo(route: string, id: string) {
    setActiveNavigation(id);
    router.push(route);
  }

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="background-image" aria-hidden="true" />
        <div className="background-overlay" aria-hidden="true" />
        <div className="loading-content">
          <div className="loading-mark">N</div>
          <p>Loading your bookings...</p>
        </div>

        <style jsx>{`
          .loading-screen {
            position: relative;
            isolation: isolate;
            min-height: 100vh;
            display: grid;
            place-content: center;
            justify-items: center;
            color: #244c3a;
            font-family: Arial, sans-serif;
          }

          .background-image {
            position: fixed;
            inset: 0;
            z-index: -2;
            background: url("/images/cultural-background.jpg") center / cover
              no-repeat;
          }

          .background-overlay {
            position: fixed;
            inset: 0;
            z-index: -1;
            background: rgba(247, 251, 255, 0.4);
          }

          .loading-content {
            display: grid;
            justify-items: center;
            gap: 12px;
            padding: 25px;
            border-radius: 16px;
            background: rgba(247, 251, 255, 0.9);
          }

          .loading-mark {
            display: grid;
            place-items: center;
            width: 52px;
            height: 52px;
            border-radius: 16px;
            background: #244c3a;
            color: white;
            font-family: Georgia, serif;
            font-size: 27px;
            font-weight: 700;
          }

          p {
            font-size: 13px;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="bookings-page">
      <div className="background-image" aria-hidden="true" />
      <div className="background-overlay" aria-hidden="true" />

      <header className="app-header">
        <Link href="/" className="brand">
          <span className="brand-mark">N</span>
          <span className="brand-name">NiaWorld</span>
        </Link>

        <nav className="desktop-navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`nav-item ${
                activeNavigation === item.id ? "active" : ""
              }`}
              onClick={() => navigateTo(item.route, item.id)}
              aria-current={
                activeNavigation === item.id ? "page" : undefined
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="sign-out"
          onClick={async () => {
            await supabase.auth.signOut();
            router.replace("/auth");
            router.refresh();
          }}
        >
          Sign out
        </button>
      </header>

      <nav className="mobile-navigation" aria-label="Mobile navigation">
        {navigation.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`mobile-nav-item ${
              activeNavigation === item.id ? "active" : ""
            }`}
            onClick={() => navigateTo(item.route, item.id)}
            aria-label={item.label}
            aria-current={
              activeNavigation === item.id ? "page" : undefined
            }
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="page-content">
        <div className="breadcrumb">
          <Link href="/dashboard">Dashboard</Link>
          <span>/</span>
          <span>My bookings</span>
        </div>

        <section className="hero-panel">
          <div>
            <span className="eyebrow">YOUR CULTURAL JOURNEY</span>
            <h1>My bookings</h1>
            <p>
              Keep track of your cultural conversations, upcoming sessions,
              and booking history.
            </p>
          </div>

          <div className="hero-symbol" aria-hidden="true">
            ◷
          </div>
        </section>

        {message && (
          <div className="message-banner" role="status">
            <span>{message}</span>
            <button
              type="button"
              onClick={() => setMessage("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        {errorMessage && (
          <div className="error-banner" role="alert">
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <section className="summary-grid" aria-label="Booking summary">
          <article className="summary-card">
            <span className="summary-icon">▤</span>
            <p>Total bookings</p>
            <h2>{summary.total}</h2>
          </article>

          <article className="summary-card">
            <span className="summary-icon pending-icon">◷</span>
            <p>Pending requests</p>
            <h2>{summary.pending}</h2>
          </article>

          <article className="summary-card">
            <span className="summary-icon confirmed-icon">✓</span>
            <p>Confirmed sessions</p>
            <h2>{summary.confirmed}</h2>
          </article>

          <article className="summary-card">
            <span className="summary-icon completed-icon">★</span>
            <p>Completed sessions</p>
            <h2>{summary.completed}</h2>
          </article>
        </section>

        <section className="bookings-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR SESSIONS</span>
              <h2>Booking history</h2>
              <p>View your requests and manage eligible bookings.</p>
            </div>

            <Link href="/discover" className="primary-button">
              Find a provider <span>→</span>
            </Link>
          </div>

          <div className="filter-panel">
            <div className="search-box">
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                placeholder="Search provider or conversation..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                aria-label="Search bookings"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(event.target.value as StatusFilter)
              }
              aria-label="Filter bookings by status"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {filteredBookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">◷</div>

              {bookings.length === 0 ? (
                <>
                  <h3>No bookings yet</h3>
                  <p>
                    When you request a cultural conversation, your booking
                    details and status will appear here.
                  </p>
                  <Link href="/discover" className="primary-button">
                    Discover providers <span>→</span>
                  </Link>
                </>
              ) : (
                <>
                  <h3>No matching bookings</h3>
                  <p>
                    Try another search term or choose a different booking
                    status.
                  </p>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => {
                      setSearchTerm("");
                      setStatusFilter("all");
                    }}
                  >
                    Clear filters
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="booking-list">
              {filteredBookings.map((booking) => {
                const providerName = getProviderName(booking.provider);
                const canCancel = ["pending", "confirmed"].includes(
                  booking.status
                );

                return (
                  <article className="booking-card" key={booking.id}>
                    <div className="booking-main">
                      <div className="provider-avatar">
                        {booking.provider?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={booking.provider.avatar_url} alt="" />
                        ) : (
                          providerName.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="booking-details">
                        <div className="booking-title-row">
                          <div>
                            <span className="eyebrow">CULTURAL SESSION</span>
                            <h3>
                              {booking.listing_title_snapshot ||
                                "Cultural conversation"}
                            </h3>
                          </div>

                          <span
                            className={`status-badge status-${booking.status}`}
                          >
                            {getStatusLabel(booking.status)}
                          </span>
                        </div>

                        <p className="provider-name">
                          With <strong>{providerName}</strong>
                          {booking.provider?.country
                            ? ` · ${booking.provider.country}`
                            : ""}
                        </p>

                        <div className="booking-meta">
                          <span>
                            <b>◷</b> {formatDate(booking.scheduled_at)}
                          </span>
                          <span>
                            <b>◴</b> {formatTime(booking.scheduled_at)}
                          </span>
                          <span>
                            <b>◷</b> {booking.duration_minutes} minutes
                          </span>
                        </div>

                        {booking.notes && (
                          <div className="booking-notes">
                            <strong>Your note</strong>
                            <p>{booking.notes}</p>
                          </div>
                        )}

                        <div className="booking-footer">
                          <span className="booking-price">
                            {formatPrice(
                              booking.price_amount,
                              booking.currency
                            )}
                          </span>

                          <span className="booking-reference">
                            Ref: {booking.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="booking-actions">
                      {canCancel ? (
                        <button
                          type="button"
                          className="cancel-button"
                          disabled={cancellingId === booking.id}
                          onClick={() =>
                            void handleCancelBooking(booking.id)
                          }
                        >
                          {cancellingId === booking.id
                            ? "Cancelling..."
                            : "Cancel booking"}
                        </button>
                      ) : (
                        <span className="no-action">
                          {booking.status === "completed"
                            ? "Session completed"
                            : booking.status === "rejected"
                              ? "Request declined"
                              : "Booking closed"}
                        </span>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="help-panel">
          <div className="help-icon">i</div>
          <div>
            <h3>About your booking status</h3>
            <p>
              Pending requests are waiting for the provider. Confirmed
              bookings have been accepted. You can cancel pending or confirmed
              bookings from this page. Completed, rejected, and cancelled
              bookings cannot be cancelled again.
            </p>
          </div>
        </section>

        <footer className="page-footer">
          <Link href="/" className="footer-brand">
            NiaWorld
          </Link>
          <span>Real People. Real Cultures. Real Connections.</span>
        </footer>
      </div>

      <style jsx>{`
        .bookings-page {
          --forest: #244c3a;
          --forest-dark: #183b2c;
          --terracotta: #bb6c4b;
          --ink: #263c30;
          --muted: #66776b;
          min-height: 100vh;
          position: relative;
          isolation: isolate;
          color: var(--ink);
          font-family: Arial, Helvetica, sans-serif;
        }

        .background-image {
          position: fixed;
          inset: 0;
          z-index: -2;
          background-image: url("/images/cultural-background.jpg");
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
        }

        .background-overlay {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: rgba(247, 251, 255, 0.4);
          pointer-events: none;
        }

        .app-header {
          position: fixed;
          z-index: 100;
          top: 0;
          right: 0;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          min-height: 76px;
          padding: 12px 4%;
          border-bottom: 1px solid rgba(36, 76, 58, 0.13);
          background: rgba(247, 251, 255, 0.96);
          box-shadow: 0 4px 20px rgba(36, 76, 58, 0.05);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          color: var(--forest);
          text-decoration: none;
        }

        .brand-mark {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: var(--forest);
          color: white;
          font-family: Georgia, serif;
          font-size: 25px;
          font-weight: 700;
        }

        .brand-name {
          font-family: Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.6px;
        }

        .desktop-navigation {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .nav-item {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 43px;
          padding: 0 13px;
          border: 0;
          border-radius: 11px;
          background: transparent;
          color: #647469;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          white-space: nowrap;
        }

        .nav-item:hover {
          background: rgba(36, 76, 58, 0.07);
          color: var(--forest);
        }

        .nav-item.active {
          background: var(--forest);
          color: white;
        }

        .nav-icon {
          font-size: 18px;
        }

        .sign-out {
          flex-shrink: 0;
          padding: 10px 13px;
          border: 1px solid rgba(36, 76, 58, 0.2);
          border-radius: 10px;
          background: transparent;
          color: var(--forest);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
        }

        .mobile-navigation {
          display: none;
        }

        .page-content {
          width: min(1160px, 100%);
          margin: 0 auto;
          padding: 105px 30px 35px;
        }

        .breadcrumb {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 17px;
          color: #778278;
          font-size: 11px;
        }

        .breadcrumb a {
          color: var(--forest);
          text-decoration: none;
        }

        .hero-panel {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          min-height: 205px;
          padding: 35px 40px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 22px;
          background: rgba(247, 251, 255, 0.78);
          box-shadow: 0 12px 35px rgba(36, 76, 58, 0.06);
        }

        .hero-panel > div:first-child {
          position: relative;
          z-index: 1;
        }

        .eyebrow {
          color: var(--terracotta);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .hero-panel h1 {
          margin: 12px 0 9px;
          color: var(--forest);
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(35px, 5vw, 49px);
          font-weight: 500;
          letter-spacing: -1.4px;
        }

        .hero-panel p {
          max-width: 590px;
          margin: 0;
          color: #66776b;
          font-size: 13px;
          line-height: 1.8;
        }

        .hero-symbol {
          display: grid;
          place-items: center;
          width: 115px;
          height: 115px;
          flex-shrink: 0;
          margin-right: 35px;
          border: 1px solid rgba(36, 76, 58, 0.15);
          border-radius: 50%;
          background: rgba(220, 235, 221, 0.85);
          color: var(--forest);
          font-size: 55px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
          margin-top: 20px;
        }

        .summary-card {
          min-width: 0;
          padding: 19px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 16px;
          background: rgba(247, 251, 255, 0.86);
          box-shadow: 0 8px 24px rgba(36, 76, 58, 0.045);
        }

        .summary-icon {
          display: grid;
          place-items: center;
          width: 36px;
          height: 36px;
          border-radius: 12px;
          background: #dcebdd;
          color: var(--forest);
          font-size: 19px;
        }

        .pending-icon {
          background: #f6ead5;
          color: #a27435;
        }

        .confirmed-icon {
          background: #dcebdd;
          color: #2f7549;
        }

        .completed-icon {
          background: #eee5d8;
          color: #986b37;
        }

        .summary-card p {
          margin: 13px 0 5px;
          color: #718075;
          font-size: 11px;
        }

        .summary-card h2 {
          margin: 0;
          color: var(--forest);
          font-family: Georgia, serif;
          font-size: 27px;
          font-weight: 500;
        }

        .bookings-section {
          margin-top: 35px;
        }

        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 18px;
          margin-bottom: 17px;
        }

        .section-heading h2 {
          margin: 8px 0 5px;
          color: var(--forest);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 30px;
          font-weight: 500;
        }

        .section-heading p {
          margin: 0;
          color: #718075;
          font-size: 12px;
          line-height: 1.7;
        }

        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 43px;
          padding: 0 17px;
          border: 0;
          border-radius: 10px;
          background: var(--forest);
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          white-space: nowrap;
        }

        .primary-button:hover {
          background: var(--forest-dark);
        }

        .primary-button span {
          font-size: 17px;
        }

        .filter-panel {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 15px;
          padding: 13px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 14px;
          background: rgba(247, 251, 255, 0.82);
        }

        .search-box {
          display: flex;
          align-items: center;
          gap: 9px;
          min-width: 0;
          flex: 1;
          padding: 0 12px;
          border: 1px solid rgba(36, 76, 58, 0.13);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.8);
          color: #778278;
        }

        .search-box > span {
          font-size: 22px;
        }

        .search-box input {
          width: 100%;
          min-height: 40px;
          border: 0;
          outline: 0;
          background: transparent;
          color: var(--ink);
          font: inherit;
          font-size: 12px;
        }

        .filter-panel select {
          min-height: 42px;
          max-width: 180px;
          padding: 0 12px;
          border: 1px solid rgba(36, 76, 58, 0.13);
          border-radius: 9px;
          background: white;
          color: var(--forest);
          font: inherit;
          font-size: 11px;
        }

        .booking-list {
          display: grid;
          gap: 13px;
        }

        .booking-card {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 21px;
          border: 1px solid rgba(255, 255, 255, 0.85);
          border-radius: 17px;
          background: rgba(247, 251, 255, 0.88);
          box-shadow: 0 8px 24px rgba(36, 76, 58, 0.045);
        }

        .booking-main {
          display: flex;
          min-width: 0;
          flex: 1;
          gap: 15px;
        }

        .provider-avatar {
          display: grid;
          place-items: center;
          width: 51px;
          height: 51px;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 50%;
          background: #dcebdd;
          color: var(--forest);
          font-family: Georgia, serif;
          font-size: 22px;
          font-weight: 700;
        }

        .provider-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .booking-details {
          min-width: 0;
          flex: 1;
        }

        .booking-title-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .booking-title-row h3 {
          margin: 7px 0 5px;
          color: var(--forest);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 20px;
          font-weight: 500;
          overflow-wrap: anywhere;
        }

        .status-badge {
          display: inline-block;
          flex-shrink: 0;
          margin-top: 3px;
          padding: 7px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 700;
        }

        .status-pending {
          background: #f6ead5;
          color: #94672e;
        }

        .status-confirmed {
          background: #dcebdd;
          color: #2c7046;
        }

        .status-completed {
          background: #e7e9dd;
          color: #526747;
        }

        .status-cancelled {
          background: #f0e3df;
          color: #925847;
        }

        .status-rejected {
          background: #f2dfdf;
          color: #9a4f4f;
        }

        .provider-name {
          margin: 3px 0 13px;
          color: #718075;
          font-size: 11px;
        }

        .provider-name strong {
          color: var(--forest);
        }

        .booking-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 9px 17px;
          color: #66776b;
          font-size: 11px;
        }

        .booking-meta b {
          margin-right: 4px;
          color: var(--terracotta);
        }

        .booking-notes {
          margin-top: 14px;
          padding: 11px 13px;
          border-left: 3px solid rgba(187, 108, 75, 0.55);
          border-radius: 0 8px 8px 0;
          background: rgba(243, 215, 160, 0.2);
        }

        .booking-notes strong {
          color: var(--forest);
          font-size: 10px;
        }

        .booking-notes p {
          margin: 5px 0 0;
          color: #66776b;
          font-size: 11px;
          line-height: 1.7;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .booking-footer {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 8px 17px;
          margin-top: 15px;
          padding-top: 12px;
          border-top: 1px solid rgba(36, 76, 58, 0.1);
        }

        .booking-price {
          color: var(--forest);
          font-size: 13px;
          font-weight: 700;
        }

        .booking-reference {
          color: #89948b;
          font-size: 10px;
        }

        .booking-actions {
          display: flex;
          align-items: flex-start;
          flex-shrink: 0;
        }

        .cancel-button {
          min-height: 37px;
          padding: 0 12px;
          border: 1px solid rgba(174, 83, 67, 0.3);
          border-radius: 9px;
          background: rgba(255, 255, 255, 0.65);
          color: #a24e43;
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 700;
        }

        .cancel-button:hover:not(:disabled) {
          background: #fff0ed;
        }

        .cancel-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .no-action {
          padding: 9px 0;
          color: #89948b;
          font-size: 10px;
        }

        .empty-state {
          display: grid;
          justify-items: center;
          padding: 48px 25px;
          border: 1px solid rgba(255, 255, 255, 0.85);
          border-radius: 17px;
          background: rgba(247, 251, 255, 0.88);
          text-align: center;
        }

        .empty-icon {
          display: grid;
          place-items: center;
          width: 62px;
          height: 62px;
          border-radius: 50%;
          background: #dcebdd;
          color: var(--forest);
          font-size: 29px;
        }

        .empty-state h3 {
          margin: 16px 0 7px;
          color: var(--forest);
          font-family: Georgia, serif;
          font-size: 23px;
          font-weight: 500;
        }

        .empty-state p {
          max-width: 440px;
          margin: 0 0 18px;
          color: #718075;
          font-size: 12px;
          line-height: 1.8;
        }

        .text-button {
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--terracotta);
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 700;
        }

        .message-banner,
        .error-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 15px;
          padding: 12px 15px;
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.6;
        }

        .message-banner {
          border: 1px solid #c6ddc8;
          background: #eff8ef;
          color: #315f3b;
        }

        .error-banner {
          border: 1px solid #e2c7a6;
          background: #fff9ed;
          color: #76553a;
        }

        .message-banner button,
        .error-banner button {
          flex-shrink: 0;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font-size: 20px;
        }

        .help-panel {
          display: flex;
          align-items: flex-start;
          gap: 13px;
          margin-top: 23px;
          padding: 19px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 15px;
          background: rgba(247, 251, 255, 0.78);
        }

        .help-icon {
          display: grid;
          place-items: center;
          width: 29px;
          height: 29px;
          flex-shrink: 0;
          border-radius: 50%;
          background: #dcebdd;
          color: var(--forest);
          font-family: Georgia, serif;
          font-weight: 700;
        }

        .help-panel h3 {
          margin: 2px 0 6px;
          color: var(--forest);
          font-size: 12px;
        }

        .help-panel p {
          margin: 0;
          color: #718075;
          font-size: 11px;
          line-height: 1.8;
        }

        .page-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 35px;
          padding: 22px 0;
          border-top: 1px solid rgba(36, 76, 58, 0.12);
          color: #778278;
          font-size: 10px;
        }

        .footer-brand {
          color: var(--forest);
          font-family: Georgia, serif;
          font-size: 17px;
          font-weight: 700;
          text-decoration: none;
        }

        @media (max-width: 1050px) {
          .app-header {
            gap: 10px;
            padding-right: 20px;
            padding-left: 20px;
          }

          .brand-name {
            font-size: 19px;
          }

          .nav-item {
            gap: 5px;
            padding: 0 8px;
            font-size: 11px;
          }

          .sign-out {
            padding: 9px;
            font-size: 11px;
          }

          .hero-symbol {
            margin-right: 0;
          }
        }

        @media (max-width: 760px) {
          .app-header {
            min-height: 62px;
            padding: 9px 17px;
          }

          .brand-mark {
            width: 38px;
            height: 38px;
            border-radius: 12px;
          }

          .brand-name {
            font-size: 20px;
          }

          .desktop-navigation,
          .app-header .sign-out {
            display: none;
          }

          .mobile-navigation {
            position: fixed;
            z-index: 200;
            right: 0;
            bottom: 0;
            left: 0;
            display: grid;
            grid-template-columns: repeat(7, minmax(0, 1fr));
            min-height: 70px;
            padding: 7px 3px max(7px, env(safe-area-inset-bottom));
            border-top: 1px solid rgba(36, 76, 58, 0.15);
            background: rgba(247, 251, 255, 0.98);
            box-shadow: 0 -5px 20px rgba(36, 76, 58, 0.08);
          }

          .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            min-width: 0;
            padding: 3px 1px;
            border: 0;
            border-radius: 10px;
            background: transparent;
            color: #728075;
            cursor: pointer;
            font: inherit;
            -webkit-tap-highlight-color: transparent;
          }

          .mobile-nav-item.active {
            background: rgba(36, 76, 58, 0.08);
            color: var(--forest);
          }

          .mobile-nav-icon {
            font-size: 21px;
            line-height: 1;
          }

          .mobile-nav-label {
            max-width: 100%;
            overflow: hidden;
            font-size: 9px;
            font-weight: 700;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .page-content {
            padding: 80px 16px calc(95px + env(safe-area-inset-bottom));
          }

          .hero-panel {
            min-height: 175px;
            padding: 25px 21px;
            border-radius: 18px;
          }

          .hero-panel h1 {
            font-size: 37px;
          }

          .hero-panel p {
            max-width: 100%;
            font-size: 12px;
          }

          .hero-symbol {
            position: absolute;
            right: -22px;
            bottom: -25px;
            width: 105px;
            height: 105px;
            opacity: 0.15;
            font-size: 48px;
          }

          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
          }

          .summary-card {
            padding: 15px;
          }

          .summary-card h2 {
            font-size: 24px;
          }

          .section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .section-heading h2 {
            font-size: 27px;
          }

          .filter-panel {
            align-items: stretch;
            flex-direction: column;
          }

          .filter-panel select {
            width: 100%;
            max-width: none;
          }

          .booking-card {
            flex-direction: column;
            gap: 15px;
            padding: 17px;
          }

          .booking-main {
            width: 100%;
            gap: 11px;
          }

          .provider-avatar {
            width: 43px;
            height: 43px;
            font-size: 19px;
          }

          .booking-title-row {
            flex-direction: column;
            gap: 5px;
          }

          .booking-title-row h3 {
            font-size: 18px;
          }

          .status-badge {
            margin-top: 0;
          }

          .booking-actions {
            width: 100%;
          }

          .cancel-button {
            width: 100%;
          }

          .help-panel {
            padding: 15px;
          }

          .page-footer {
            align-items: flex-start;
            flex-direction: column;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
