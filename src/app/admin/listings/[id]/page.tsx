
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    result?: string;
    message?: string;
  }>;
};

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
  admin_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  created_at: string;
  updated_at: string;
};

type Profile = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  country: string | null;
  bio: string | null;
  avatar_url: string | null;
};

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
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

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

async function reviewProviderListingAction(formData: FormData) {
  "use server";

  const listingId = String(formData.get("listing_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim();

  const detailPath = `/admin/listings/${encodeURIComponent(listingId)}`;

  if (!listingId) {
    redirect("/admin/listings");
  }

  if (!["published", "rejected", "suspended"].includes(decision)) {
    redirect(
      `${detailPath}?result=error&message=${encodeURIComponent(
        "Invalid review decision."
      )}`
    );
  }

  if (["rejected", "suspended"].includes(decision) && !notes) {
    redirect(
      `${detailPath}?result=error&message=${encodeURIComponent(
        "Admin notes are required for this decision."
      )}`
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("review_provider_listing", {
    p_listing_id: listingId,
    p_status: decision,
    p_admin_notes: notes || null,
  });

  if (error) {
    redirect(
      `${detailPath}?result=error&message=${encodeURIComponent(
        error.message
      )}`
    );
  }

  revalidatePath("/admin/listings");
  revalidatePath(detailPath);
  revalidatePath("/services");

  redirect(
    `${detailPath}?result=success&message=${encodeURIComponent(
      `Service ${decision} successfully.`
    )}`
  );
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/50 bg-white/90 p-6 shadow-sm">
      <h2 className="mb-4 text-base font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function Loading() {
  return (
    <div className="mx-auto max-w-5xl rounded-2xl border border-white/50 bg-white/90 p-8 shadow-sm">
      <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
      <div className="mt-5 h-8 w-64 animate-pulse rounded bg-gray-100" />
      <div className="mt-8 h-40 rounded-xl bg-gray-100" />
    </div>
  );
}

async function ListingDetails({
  params,
  searchParams,
}: PageProps) {
  // Render this page at request time.
  await connection();

  const { id } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const { data: listingData, error: listingError } = await supabase
    .from("provider_listings")
    .select(
      "id,provider_id,title,description,category,languages,price,duration_minutes,cover_image_url,status,admin_notes,reviewed_at,reviewed_by,created_at,updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (listingError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h2 className="font-semibold">Could not load provider service</h2>
        <p className="mt-2 break-words text-sm">{listingError.message}</p>
        <Link
          href="/admin/listings"
          className="mt-4 inline-block text-sm font-semibold underline"
        >
          Return to listings
        </Link>
      </div>
    );
  }

  if (!listingData) notFound();

  const listing = listingData as unknown as Listing;

  const { data: profileData, error: profileError } = await supabase
    .from("profiles")
    .select("user_id,display_name,username,country,bio,avatar_url")
    .eq("user_id", listing.provider_id)
    .maybeSingle();

  if (profileError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h2 className="font-semibold">Could not load provider profile</h2>
        <p className="mt-2 text-sm">{profileError.message}</p>
        <Link
          href="/admin/listings"
          className="mt-4 inline-block text-sm font-semibold underline"
        >
          Return to listings
        </Link>
      </div>
    );
  }

  const provider = profileData as Profile | null;
  const providerName =
    provider?.display_name || provider?.username || "Unknown provider";

  const canApprove = listing.status === "pending";
  const canReject = listing.status === "pending";
  const canSuspend = listing.status === "published";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/admin/listings"
        className="inline-flex items-center gap-2 text-sm font-medium text-green-800 hover:text-green-950"
      >
        <span aria-hidden="true">←</span>
        Back to provider listings
      </Link>

      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-800">
            Administration / Provider Listings
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Service review
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Review the complete service submission before making a decision.
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-semibold ${statusClasses(
            listing.status
          )}`}
        >
          {formatStatus(listing.status)}
        </span>
      </section>

      {query.result === "success" && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {query.message || "Service review completed successfully."}
        </div>
      )}

      {query.result === "error" && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {query.message || "The service review could not be completed."}
        </div>
      )}

      <DetailSection title="Service information">
        {listing.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={listing.cover_image_url}
            alt={listing.title}
            className="mb-6 max-h-96 w-full rounded-xl border border-gray-100 object-cover"
          />
        ) : (
          <div className="mb-6 flex h-48 items-center justify-center rounded-xl bg-green-50 text-5xl font-bold text-green-800">
            {listing.title.charAt(0).toUpperCase()}
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-900">{listing.title}</h2>

        <p className="mt-4 whitespace-pre-wrap text-sm leading-8 text-gray-700">
          {listing.description}
        </p>

        <div className="mt-6 grid gap-5 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Category</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {listing.category}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Price</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              USD {formatPrice(listing.price)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Duration</p>
            <p className="mt-1 text-sm font-semibold text-gray-900">
              {listing.duration_minutes} minutes
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Submitted</p>
            <p className="mt-1 text-sm text-gray-800">
              {formatDate(listing.created_at)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Last updated</p>
            <p className="mt-1 text-sm text-gray-800">
              {formatDate(listing.updated_at)}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Service ID</p>
            <p className="mt-1 break-all font-mono text-xs text-gray-700">
              {listing.id}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-gray-100 pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Languages offered
          </p>

          {listing.languages?.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {listing.languages.map((language) => (
                <span
                  key={language}
                  className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800"
                >
                  {language}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              No languages specified.
            </p>
          )}
        </div>
      </DetailSection>

      <DetailSection title="Provider information">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          {provider?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={provider.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-800">
              {providerName.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {providerName}
            </h2>
            {provider?.username && (
              <p className="mt-1 text-sm text-gray-500">
                @{provider.username}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-600">
              {provider?.country || "Country not provided"}
            </p>
          </div>
        </div>

        {provider?.bio && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Provider biography
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700">
              {provider.bio}
            </p>
          </div>
        )}

        <div className="mt-5 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500">Provider user ID</p>
          <p className="mt-1 break-all font-mono text-xs text-gray-700">
            {listing.provider_id}
          </p>
        </div>

        <Link
          href={`/providers/${listing.provider_id}`}
          className="mt-4 inline-flex text-sm font-semibold text-green-800 hover:text-green-950"
        >
          View public provider profile →
        </Link>
      </DetailSection>

      {listing.admin_notes && (
        <DetailSection title="Previous review notes">
          <p className="whitespace-pre-wrap text-sm leading-7 text-gray-700">
            {listing.admin_notes}
          </p>
        </DetailSection>
      )}

      <DetailSection title="Review decision">
        {canApprove || canReject || canSuspend ? (
          <>
            <p className="mb-5 text-sm leading-7 text-gray-600">
              Choose the appropriate action for this service. Rejections and
              suspensions require an explanation.
            </p>

            <div className="grid gap-4 lg:grid-cols-3">
              {canApprove && (
                <form action={reviewProviderListingAction}>
                  <input
                    type="hidden"
                    name="listing_id"
                    value={listing.id}
                  />
                  <input
                    type="hidden"
                    name="decision"
                    value="published"
                  />

                  <div className="flex h-full flex-col rounded-xl border border-green-200 bg-green-50 p-4">
                    <h3 className="font-bold text-green-900">
                      Approve service
                    </h3>
                    <p className="mt-2 flex-1 text-xs leading-6 text-green-800">
                      Publish this service so customers can discover it.
                    </p>
                    <button
                      type="submit"
                      className="mt-4 rounded-lg bg-green-800 px-4 py-3 text-sm font-semibold text-white hover:bg-green-900"
                    >
                      Approve and publish
                    </button>
                  </div>
                </form>
              )}

              {canReject && (
                <form action={reviewProviderListingAction}>
                  <input
                    type="hidden"
                    name="listing_id"
                    value={listing.id}
                  />
                  <input
                    type="hidden"
                    name="decision"
                    value="rejected"
                  />

                  <div className="flex h-full flex-col rounded-xl border border-red-200 bg-red-50 p-4">
                    <h3 className="font-bold text-red-900">
                      Reject service
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-red-800">
                      Decline this submission with a clear explanation.
                    </p>
                    <label
                      htmlFor="rejection-notes"
                      className="mb-2 mt-4 text-xs font-semibold text-red-900"
                    >
                      Reason for rejection *
                    </label>
                    <textarea
                      id="rejection-notes"
                      name="admin_notes"
                      required
                      minLength={3}
                      maxLength={2000}
                      rows={4}
                      className="w-full rounded-lg border border-red-200 bg-white p-3 text-xs text-gray-800 outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100"
                      placeholder="Explain why this service is being rejected..."
                    />
                    <button
                      type="submit"
                      className="mt-4 rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-800"
                    >
                      Reject service
                    </button>
                  </div>
                </form>
              )}

              {canSuspend && (
                <form action={reviewProviderListingAction}>
                  <input
                    type="hidden"
                    name="listing_id"
                    value={listing.id}
                  />
                  <input
                    type="hidden"
                    name="decision"
                    value="suspended"
                  />

                  <div className="flex h-full flex-col rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <h3 className="font-bold text-amber-900">
                      Suspend service
                    </h3>
                    <p className="mt-2 text-xs leading-6 text-amber-800">
                      Remove this published service from public discovery.
                    </p>
                    <label
                      htmlFor="suspension-notes"
                      className="mb-2 mt-4 text-xs font-semibold text-amber-900"
                    >
                      Reason for suspension *
                    </label>
                    <textarea
                      id="suspension-notes"
                      name="admin_notes"
                      required
                      minLength={3}
                      maxLength={2000}
                      rows={4}
                      className="w-full rounded-lg border border-amber-200 bg-white p-3 text-xs text-gray-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                      placeholder="Explain why this service is being suspended..."
                    />
                    <button
                      type="submit"
                      className="mt-4 rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-800"
                    >
                      Suspend service
                    </button>
                  </div>
                </form>
              )}
            </div>
          </>
        ) : (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h3 className="font-semibold text-gray-800">
              No review action is available
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              This service currently has the status{" "}
              <strong>{formatStatus(listing.status)}</strong>. The available
              review actions do not support changing it from this status.
            </p>
          </div>
        )}

        <p className="mt-5 text-xs leading-6 text-gray-500">
          Review permissions are enforced by the database function. Only
          authorized active administrators with the required permission can
          complete these decisions.
        </p>
      </DetailSection>
    </div>
  );
}

export default function AdminListingDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <ListingDetails
        params={props.params}
        searchParams={props.searchParams}
      />
    </Suspense>
  );
}
