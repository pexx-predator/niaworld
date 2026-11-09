
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ReviewStatus = "pending" | "published" | "hidden";

type Review = {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  rating: number;
  review_text: string;
  status: ReviewStatus;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

type Profile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  country: string | null;
};

type PageProps = {
  searchParams: Promise<{
    status?: string;
    page?: string;
    updated?: string;
    error?: string;
  }>;
};

const PAGE_SIZE = 15;

const statuses: {
  value: "all" | ReviewStatus;
  label: string;
}[] = [
  { value: "all", label: "All reviews" },
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getDisplayName(profile?: Profile) {
  if (!profile) return "User details unavailable";

  return (
    profile.display_name ||
    (profile.username ? `@${profile.username}` : null) ||
    "Unnamed user"
  );
}

function StatusBadge({ status }: { status: ReviewStatus }) {
  const styles: Record<ReviewStatus, string> = {
    pending: "bg-amber-100 text-amber-800",
    published: "bg-green-100 text-green-800",
    hidden: "bg-gray-100 text-gray-700",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles[status]}`}
    >
      {status}
    </span>
  );
}

function ReviewLoading() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
      <p className="text-sm text-gray-500">Loading reviews...</p>
    </div>
  );
}

async function ReviewsContent({ searchParams }: PageProps) {
  await connection();

  const params = await searchParams;

  const selectedStatus = statuses.some(
    (item) => item.value === params.status
  )
    ? (params.status as "all" | ReviewStatus)
    : "all";

  const requestedPage = Number(params.page || "1");
  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Inline server action: moderation is performed by the protected RPC.
  async function moderateReview(formData: FormData) {
    "use server";

    const reviewId = String(formData.get("review_id") || "");
    const nextStatus = String(formData.get("status") || "");
    const adminNotes = String(formData.get("admin_notes") || "").trim();
    const returnStatus = String(formData.get("return_status") || "all");

    if (
      !reviewId ||
      !["pending", "published", "hidden"].includes(nextStatus)
    ) {
      redirect("/admin/reviews?error=invalid");
    }

    if (adminNotes.length > 3000) {
      redirect("/admin/reviews?error=notes");
    }

    const client = await createClient();

    const {
      data: { user: admin },
    } = await client.auth.getUser();

    if (!admin) {
      redirect("/login");
    }

    const { error } = await client.rpc("moderate_provider_review", {
      p_review_id: reviewId,
      p_status: nextStatus,
      p_admin_notes: adminNotes || null,
    });

    if (error) {
      console.error("Review moderation failed:", error.message);
      redirect(
        `/admin/reviews?status=${encodeURIComponent(returnStatus)}&error=moderation`
      );
    }

    revalidatePath("/admin/reviews");

    redirect(
      `/admin/reviews?status=${encodeURIComponent(returnStatus)}&updated=1`
    );
  }

  let reviewsQuery = supabase
    .from("provider_reviews")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (selectedStatus !== "all") {
    reviewsQuery = reviewsQuery.eq("status", selectedStatus);
  }

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const {
    data: reviewData,
    count,
    error: reviewsError,
  } = await reviewsQuery.range(from, to);

  const reviews = (reviewData || []) as Review[];
  const totalReviews = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalReviews / PAGE_SIZE));

  // Load customer and provider profiles separately.
  // The page remains usable if profile RLS prevents this lookup.
  const userIds = Array.from(
    new Set(
      reviews.flatMap((review) => [
        review.customer_id,
        review.provider_id,
      ])
    )
  );

  let profiles: Profile[] = [];

  if (userIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, country")
      .in("user_id", userIds);

    if (!profileError && profileData) {
      profiles = profileData as Profile[];
    }
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  const statusCounts: Record<"all" | ReviewStatus, number> = {
    all: 0,
    pending: 0,
    published: 0,
    hidden: 0,
  };

  // Get overall status counts independently of the selected filter.
  const { data: countData, error: countError } = await supabase
    .from("provider_reviews")
    .select("status");

  if (!countError && countData) {
    statusCounts.all = countData.length;

    for (const item of countData) {
      if (
        item.status === "pending" ||
        item.status === "published" ||
        item.status === "hidden"
      ) {
        const status: ReviewStatus = item.status;
        statusCounts[status]++;
      }
    }
  }

  const pageUrl = (page: number) =>
    `/admin/reviews?status=${selectedStatus}&page=${page}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-700">
            NiaWorld administration
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Provider Reviews
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review customer feedback and manage what appears publicly.
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex w-fit items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to overview
        </Link>
      </div>

      {params.updated === "1" && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Review moderation was saved successfully.
        </div>
      )}

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error === "invalid"
            ? "The moderation request was invalid."
            : params.error === "notes"
              ? "Admin notes cannot exceed 3,000 characters."
              : "The moderation action could not be completed. Check your permissions and try again."}
        </div>
      )}

      {reviewsError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Unable to load reviews. Check the provider_reviews table permissions
          and your admin access.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {statuses.map((item) => (
          <Link
            key={item.value}
            href={`/admin/reviews?status=${item.value}`}
            className={`rounded-2xl border bg-white p-4 shadow-sm transition hover:border-green-300 ${
              selectedStatus === item.value
                ? "border-green-600 ring-1 ring-green-600"
                : "border-gray-200"
            }`}
          >
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {statusCounts[item.value].toLocaleString()}
            </p>
          </Link>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {statuses.map((item) => (
          <Link
            key={item.value}
            href={`/admin/reviews?status=${item.value}`}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              selectedStatus === item.value
                ? "bg-green-700 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {/* Reviews */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-2 border-b border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Customer feedback</h2>
            <p className="text-sm text-gray-500">
              {totalReviews.toLocaleString()}{" "}
              {totalReviews === 1 ? "review" : "reviews"} found
            </p>
          </div>

          <span className="text-xs text-gray-400">
            Newest reviews appear first
          </span>
        </div>

        {!reviewsError && reviews.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <span className="text-xl">★</span>
            </div>
            <h3 className="font-semibold text-gray-900">
              No reviews found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Reviews will appear here when customers submit feedback for
              completed bookings.
            </p>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {reviews.map((review) => {
            const customer = profileMap.get(review.customer_id);
            const provider = profileMap.get(review.provider_id);

            return (
              <article key={review.id} className="space-y-4 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-3">
                      <div
                        className="flex items-center gap-1"
                        aria-label={`${review.rating} out of 5 stars`}
                      >
                        {Array.from({ length: 5 }, (_, index) => (
                          <span
                            key={index}
                            className={
                              index < review.rating
                                ? "text-amber-500"
                                : "text-gray-300"
                            }
                          >
                            ★
                          </span>
                        ))}
                        <span className="ml-1 text-sm font-semibold text-gray-700">
                          {review.rating}/5
                        </span>
                      </div>

                      <StatusBadge status={review.status} />
                    </div>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-800">
                      {review.review_text}
                    </p>
                  </div>

                  <span className="shrink-0 text-xs text-gray-400">
                    {formatDate(review.created_at)}
                  </span>
                </div>

                <div className="grid gap-3 rounded-xl bg-gray-50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Customer
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {getDisplayName(customer)}
                    </p>
                    {customer?.country && (
                      <p className="text-xs text-gray-500">
                        {customer.country}
                      </p>
                    )}
                    <p className="mt-1 break-all text-xs text-gray-400">
                      {review.customer_id}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Provider
                    </p>
                    <p className="mt-1 text-sm font-semibold text-gray-800">
                      {getDisplayName(provider)}
                    </p>
                    {provider?.country && (
                      <p className="text-xs text-gray-500">
                        {provider.country}
                      </p>
                    )}
                    <p className="mt-1 break-all text-xs text-gray-400">
                      {review.provider_id}
                    </p>
                  </div>

                  <div className="sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                      Booking reference
                    </p>
                    <p className="mt-1 break-all font-mono text-xs text-gray-600">
                      {review.booking_id}
                    </p>
                  </div>
                </div>

                <form action={moderateReview} className="space-y-3">
                  <input
                    type="hidden"
                    name="review_id"
                    value={review.id}
                  />
                  <input
                    type="hidden"
                    name="return_status"
                    value={selectedStatus}
                  />

                  <div>
                    <label
                      htmlFor={`notes-${review.id}`}
                      className="mb-1 block text-xs font-semibold text-gray-600"
                    >
                      Internal admin notes
                    </label>
                    <textarea
                      id={`notes-${review.id}`}
                      name="admin_notes"
                      defaultValue={review.admin_notes || ""}
                      maxLength={3000}
                      rows={2}
                      placeholder="Add an internal moderation note..."
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      name="status"
                      value="published"
                      disabled={review.status === "published"}
                      className="rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Publish
                    </button>

                    <button
                      type="submit"
                      name="status"
                      value="hidden"
                      disabled={review.status === "hidden"}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Hide review
                    </button>

                    <button
                      type="submit"
                      name="status"
                      value="pending"
                      disabled={review.status === "pending"}
                      className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Return to pending
                    </button>
                  </div>
                </form>
              </article>
            );
          })}
        </div>

        {/* Pagination */}
        {totalReviews > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex gap-2">
              {currentPage > 1 ? (
                <Link
                  href={pageUrl(currentPage - 1)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </Link>
              ) : (
                <span className="rounded-lg border border-gray-100 px-4 py-2 text-sm text-gray-300">
                  Previous
                </span>
              )}

              {currentPage < totalPages ? (
                <Link
                  href={pageUrl(currentPage + 1)}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Next
                </Link>
              ) : (
                <span className="rounded-lg border border-gray-100 px-4 py-2 text-sm text-gray-300">
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminReviewsPage(props: PageProps) {
  return (
    <Suspense fallback={<ReviewLoading />}>
      <ReviewsContent searchParams={props.searchParams} />
    </Suspense>
  );
}
