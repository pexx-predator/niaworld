
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Listing = {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  category: string;
  languages: string[];
  price: number | string;
  duration_minutes: number;
  cover_image_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
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
  "draft",
  "pending",
  "published",
  "rejected",
  "suspended",
] as const;

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusClasses(status: string) {
  switch (status) {
    case "published":
      return "bg-green-100 text-green-800";
    case "rejected":
    case "suspended":
      return "bg-red-100 text-red-800";
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "draft":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatPrice(value: number | string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return amount.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function Loading() {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/80 p-8 text-center shadow-sm">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
      <p className="mt-3 text-sm text-gray-600">
        Loading provider listings...
      </p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
      <h2 className="font-semibold">Could not load listings</h2>
      <p className="mt-2 break-words text-sm">{message}</p>
    </div>
  );
}

async function ListingsContent({ searchParams }: PageProps) {
  await connection();

  const params = await searchParams;
  const requestedStatus = params.status ?? "all";

  const selectedStatus = STATUSES.includes(
    requestedStatus as (typeof STATUSES)[number]
  )
    ? requestedStatus
    : "all";

  const requestedPage = Number(params.page ?? "1");
  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const supabase = await createClient();

  let countQuery = supabase
    .from("provider_listings")
    .select("id", { count: "exact", head: true });

  let listingsQuery = supabase
    .from("provider_listings")
    .select(
      "id,provider_id,title,description,category,languages,price,duration_minutes,cover_image_url,status,created_at,updated_at"
    )
    .order("created_at", { ascending: false });

  if (selectedStatus !== "all") {
    countQuery = countQuery.eq("status", selectedStatus);
    listingsQuery = listingsQuery.eq("status", selectedStatus);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    return <ErrorState message={countError.message} />;
  }

  const totalListings = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalListings / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const { data: listingData, error: listingsError } =
    await listingsQuery.range(from, to);

  if (listingsError) {
    return <ErrorState message={listingsError.message} />;
  }

  const listings = (listingData ?? []) as unknown as Listing[];

  const providerIds = [
    ...new Set(listings.map((listing) => listing.provider_id)),
  ];

  let profiles: Profile[] = [];

  if (providerIds.length > 0) {
    const { data: profileData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id,display_name,username,country")
      .in("user_id", providerIds);

    if (profilesError) {
      return <ErrorState message={profilesError.message} />;
    }

    profiles = (profileData ?? []) as unknown as Profile[];
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

    return `/admin/listings?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-800">
            Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Provider Listings
          </h1>

          <p className="mt-1 max-w-2xl text-sm text-gray-600">
            Review provider services, monitor listing submissions and track
            publication status across NiaWorld.
          </p>
        </div>

        <div className="rounded-xl border border-white/50 bg-white/80 px-5 py-3 shadow-sm">
          <p className="text-xs text-gray-500">Matching listings</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">
            {totalListings.toLocaleString()}
          </p>
        </div>
      </section>

      <section
        aria-label="Filter provider listings by status"
        className="flex flex-wrap gap-2"
      >
        {STATUSES.map((status) => {
          const active = selectedStatus === status;

          return (
            <Link
              key={status}
              href={`/admin/listings?status=${status}&page=1`}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-green-800 text-white shadow-sm"
                  : "border border-gray-200 bg-white/80 text-gray-700 hover:bg-green-50"
              }`}
            >
              {status === "all" ? "All listings" : formatStatus(status)}
            </Link>
          );
        })}
      </section>

      <section className="overflow-hidden rounded-2xl border border-white/50 bg-white/90 shadow-sm">
        {listings.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-gray-800">
              No listings found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              There are currently no provider listings in this category.
            </p>

            {selectedStatus !== "all" && (
              <Link
                href="/admin/listings"
                className="mt-5 inline-flex rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-green-900"
              >
                View all listings
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div>
                <h2 className="font-semibold text-gray-900">
                  Listing records
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  Open each service to review its full details.
                </p>
              </div>

              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                {listings.length} records
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1150px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">Listing</th>
                    <th className="px-5 py-4 font-semibold">Provider</th>
                    <th className="px-5 py-4 font-semibold">Category</th>
                    <th className="px-5 py-4 font-semibold">Price</th>
                    <th className="px-5 py-4 font-semibold">Duration</th>
                    <th className="px-5 py-4 font-semibold">Submitted</th>
                    <th className="px-5 py-4 font-semibold">Status</th>
                    <th className="px-5 py-4 font-semibold">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {listings.map((listing) => {
                    const provider = profileMap.get(listing.provider_id);
                    const providerName =
                      provider?.display_name ||
                      provider?.username ||
                      "Unknown provider";

                    return (
                      <tr
                        key={listing.id}
                        className="align-top transition hover:bg-gray-50/80"
                      >
                        <td className="max-w-72 px-5 py-4">
                          <div className="flex items-start gap-3">
                            {listing.cover_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={listing.cover_image_url}
                                alt=""
                                className="h-12 w-12 shrink-0 rounded-lg border border-gray-100 object-cover"
                              />
                            ) : (
                              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-green-50 text-green-800">
                                <span className="text-lg font-semibold">
                                  {listing.title.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900">
                                {listing.title}
                              </p>
                              <p className="mt-1 line-clamp-2 text-xs leading-5 text-gray-500">
                                {listing.description}
                              </p>
                              <p className="mt-2 text-xs text-gray-400">
                                ID: {listing.id.slice(0, 8)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {providerName}
                          </p>
                          {provider?.username && (
                            <p className="mt-1 text-xs text-gray-500">
                              @{provider.username}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-gray-500">
                            {provider?.country || "Country not provided"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          <span>{listing.category}</span>
                          {listing.languages?.length > 0 && (
                            <p className="mt-1 max-w-40 text-xs text-gray-500">
                              {listing.languages.join(", ")}
                            </p>
                          )}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-800">
                          {formatPrice(listing.price)}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-gray-700">
                          {listing.duration_minutes} minutes
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                          {formatDate(listing.created_at)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                              listing.status
                            )}`}
                          >
                            {formatStatus(listing.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/listings/${listing.id}`}
                            className="inline-flex whitespace-nowrap rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 transition hover:border-green-800 hover:bg-green-800 hover:text-white"
                          >
                            View service →
                          </Link>
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
                {Math.min(from + listings.length, totalListings)} of{" "}
                {totalListings} listings
              </p>

              <nav
                aria-label="Listings pagination"
                className="flex items-center gap-2"
              >
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
              </nav>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function AdminListingsPage(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ListingsContent {...props} />
    </Suspense>
  );
}
