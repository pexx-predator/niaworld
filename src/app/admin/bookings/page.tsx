
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Booking = {
  id: string;
  customer_id: string;
  provider_id: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  notes: string | null;
  created_at: string;
};

type Profile = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  country: string | null;
};

type PageProps = {
  searchParams: Promise<{
    status?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 20;

const STATUSES = [
  "all",
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "rejected",
];

function formatStatus(status: string) {
  return status.replaceAll("_", " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusClasses(status: string) {
  switch (status) {
    case "confirmed":
      return "bg-blue-100 text-blue-800";
    case "completed":
      return "bg-green-100 text-green-800";
    case "cancelled":
    case "rejected":
      return "bg-red-100 text-red-800";
    default:
      return "bg-amber-100 text-amber-800";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function Loading() {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/80 p-8 text-center">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
      <p className="mt-3 text-sm text-gray-600">Loading bookings...</p>
    </div>
  );
}

async function BookingsContent({ searchParams }: PageProps) {
  await connection();

  const params = await searchParams;

  const selectedStatus = STATUSES.includes(params.status ?? "all")
    ? params.status ?? "all"
    : "all";

  const requestedPage = Number(params.page ?? "1");
  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const supabase = await createClient();

  let countQuery = supabase
    .from("bookings")
    .select("id", { count: "exact", head: true });

  let bookingsQuery = supabase
    .from("bookings")
    .select(
      "id,customer_id,provider_id,scheduled_at,duration_minutes,status,notes,created_at"
    )
    .order("scheduled_at", { ascending: false });

  if (selectedStatus !== "all") {
    countQuery = countQuery.eq("status", selectedStatus);
    bookingsQuery = bookingsQuery.eq("status", selectedStatus);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h2 className="font-semibold">Unable to load bookings</h2>
        <p className="mt-2 text-sm">{countError.message}</p>
      </div>
    );
  }

  const totalBookings = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalBookings / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: bookingData, error: bookingsError } =
    await bookingsQuery.range(from, to);

  if (bookingsError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h2 className="font-semibold">Unable to load bookings</h2>
        <p className="mt-2 text-sm">{bookingsError.message}</p>
      </div>
    );
  }

  const bookings = (bookingData ?? []) as Booking[];

  const userIds = [
    ...new Set(
      bookings.flatMap((booking) => [
        booking.customer_id,
        booking.provider_id,
      ])
    ),
  ];

  let profiles: Profile[] = [];

  if (userIds.length > 0) {
    const { data: profileData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id,display_name,username,country")
      .in("user_id", userIds);

    if (profilesError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h2 className="font-semibold">Unable to load member information</h2>
          <p className="mt-2 text-sm">{profilesError.message}</p>
        </div>
      );
    }

    profiles = (profileData ?? []) as Profile[];
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  function pageUrl(page: number) {
    const query = new URLSearchParams();

    if (selectedStatus !== "all") {
      query.set("status", selectedStatus);
    }

    query.set("page", String(page));

    return `/admin/bookings?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-800">Administration</p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Bookings Management
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Monitor customer bookings and provider sessions.
          </p>
        </div>

        <div className="rounded-xl border border-white/50 bg-white/80 px-5 py-3 shadow-sm">
          <p className="text-xs text-gray-500">Matching bookings</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalBookings.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((status) => {
          const active = selectedStatus === status;

          return (
            <Link
              key={status}
              href={`/admin/bookings?status=${status}&page=1`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-green-800 text-white"
                  : "border border-gray-200 bg-white/80 text-gray-700 hover:bg-green-50"
              }`}
            >
              {status === "all" ? "All bookings" : formatStatus(status)}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/90 shadow-sm">
        {bookings.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-gray-800">
              No bookings found
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              There are currently no bookings in this category.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Booking ID</th>
                    <th className="px-5 py-4 font-semibold">Customer</th>
                    <th className="px-5 py-4 font-semibold">Provider</th>
                    <th className="px-5 py-4 font-semibold">Scheduled</th>
                    <th className="px-5 py-4 font-semibold">Duration</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {bookings.map((booking) => {
                    const customer = profileMap.get(booking.customer_id);
                    const provider = profileMap.get(booking.provider_id);

                    return (
                      <tr
                        key={booking.id}
                        className="align-top hover:bg-gray-50/80"
                      >
                        <td className="px-5 py-4">
                          <span className="font-mono text-xs text-gray-600">
                            {booking.id.slice(0, 8)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {customer?.display_name ||
                              customer?.username ||
                              "Unknown member"}
                          </p>
                          {customer?.username && (
                            <p className="mt-1 text-xs text-gray-500">
                              @{customer.username}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {provider?.display_name ||
                              provider?.username ||
                              "Unknown provider"}
                          </p>
                          {provider?.username && (
                            <p className="mt-1 text-xs text-gray-500">
                              @{provider.username}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                          {formatDate(booking.scheduled_at)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                          {booking.duration_minutes} minutes
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                              booking.status
                            )}`}
                          >
                            {formatStatus(booking.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Showing {from + 1}–
                {Math.min(from + bookings.length, totalBookings)} of{" "}
                {totalBookings} bookings
              </p>

              <div className="flex items-center gap-2">
                <Link
                  href={pageUrl(Math.max(1, safePage - 1))}
                  aria-disabled={safePage <= 1}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    safePage <= 1
                      ? "pointer-events-none border-gray-100 text-gray-300"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Previous
                </Link>

                <span className="px-2 text-sm text-gray-600">
                  Page {safePage} of {totalPages}
                </span>

                <Link
                  href={pageUrl(Math.min(totalPages, safePage + 1))}
                  aria-disabled={safePage >= totalPages}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    safePage >= totalPages
                      ? "pointer-events-none border-gray-100 text-gray-300"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminBookingsPage(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <BookingsContent {...props} />
    </Suspense>
  );
}
