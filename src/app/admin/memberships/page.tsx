
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type Membership = {
  id: string;
  user_id: string;
  plan_id: string;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  next_billing_at: string | null;
  auto_renew: boolean;
  cancelled_at: string | null;
  created_at: string;
};

type MembershipPlan = {
  id: string;
  name: string;
  slug: string;
  price: number | string;
  currency: string;
  billing_interval: string;
  included_minutes: number;
};

type MembershipPayment = {
  id: string;
  membership_id: string;
  amount: number | string;
  currency: string;
  status: string;
  payment_provider: string;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
};

type Profile = {
  user_id: string;
  display_name: string | null;
  username: string | null;
};

type PageProps = {
  searchParams: Promise<{
    page?: string;
    status?: string;
    q?: string;
  }>;
};

const PAGE_SIZE = 20;

function formatMoney(value: number | string, currency: string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return `${currency} —`;

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function formatDate(value: string | null) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function memberName(profile?: Profile) {
  return profile?.display_name || profile?.username || "Unknown member";
}

function statusStyle(status: string) {
  switch (status.toLowerCase()) {
    case "active":
    case "successful":
      return "bg-green-100 text-green-800";
    case "pending":
      return "bg-amber-100 text-amber-800";
    case "past_due":
    case "failed":
      return "bg-red-100 text-red-800";
    case "expired":
    case "cancelled":
    case "refunded":
      return "bg-gray-100 text-gray-700";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyle(
        status
      )}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function Loading() {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/85 p-8 text-center shadow-sm">
      <p className="text-sm text-gray-600">Loading memberships...</p>
    </div>
  );
}

async function MembershipsContent({ searchParams }: PageProps) {
  await connection();

  const params = await searchParams;
  const requestedPage = Number(params.page || "1");
  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const selectedStatus = (params.status || "").trim();
  const search = (params.q || "").trim().slice(0, 80);

  const supabase = await createClient();

  let countQuery = supabase
    .from("user_memberships")
    .select("id", { count: "exact", head: true });

  if (selectedStatus) {
    countQuery = countQuery.eq("status", selectedStatus);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    return (
      <ErrorPanel
        title="Could not load membership count"
        message={countError.message}
      />
    );
  }

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let membershipsQuery = supabase
    .from("user_memberships")
    .select(
      "id, user_id, plan_id, status, starts_at, ends_at, next_billing_at, auto_renew, cancelled_at, created_at"
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (selectedStatus) {
    membershipsQuery = membershipsQuery.eq("status", selectedStatus);
  }

  const { data: membershipData, error: membershipError } =
    await membershipsQuery;

  if (membershipError) {
    return (
      <ErrorPanel
        title="Could not load memberships"
        message={membershipError.message}
      />
    );
  }

  let memberships = (membershipData || []) as Membership[];

  const userIds = Array.from(
    new Set(memberships.map((membership) => membership.user_id))
  );

  const planIds = Array.from(
    new Set(memberships.map((membership) => membership.plan_id))
  );

  let profiles: Profile[] = [];
  let plans: MembershipPlan[] = [];

  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .in("user_id", userIds);

    if (!error) profiles = (data || []) as Profile[];
  }

  if (planIds.length > 0) {
    const { data, error } = await supabase
      .from("membership_plans")
      .select(
        "id, name, slug, price, currency, billing_interval, included_minutes"
      )
      .in("id", planIds);

    if (!error) plans = (data || []) as MembershipPlan[];
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  const planMap = new Map(plans.map((plan) => [plan.id, plan]));

  // Search is applied to the fetched page without exposing unrelated
  // profile or payment information.
  if (search) {
    const normalizedSearch = search.toLowerCase();

    memberships = memberships.filter((membership) => {
      const profile = profileMap.get(membership.user_id);
      const plan = planMap.get(membership.plan_id);

      return (
        memberName(profile).toLowerCase().includes(normalizedSearch) ||
        (profile?.username || "").toLowerCase().includes(normalizedSearch) ||
        (plan?.name || "").toLowerCase().includes(normalizedSearch)
      );
    });
  }

  const membershipIds = memberships.map((membership) => membership.id);

  let payments: MembershipPayment[] = [];

  if (membershipIds.length > 0) {
    const { data, error } = await supabase
      .from("membership_payments")
      .select(
        "id, membership_id, amount, currency, status, payment_provider, payment_reference, paid_at, created_at"
      )
      .in("membership_id", membershipIds)
      .order("created_at", { ascending: false });

    if (!error) payments = (data || []) as MembershipPayment[];
  }

  const latestPaymentMap = new Map<string, MembershipPayment>();

  for (const payment of payments) {
    if (!latestPaymentMap.has(payment.membership_id)) {
      latestPaymentMap.set(payment.membership_id, payment);
    }
  }

  const paymentTotals = payments.reduce(
    (totals, payment) => {
      if (payment.status === "successful") {
        const key = payment.currency.toUpperCase();
        totals[key] = (totals[key] || 0) + Number(payment.amount);
      }
      return totals;
    },
    {} as Record<string, number>
  );

  const activeCount = memberships.filter(
    (membership) => membership.status === "active"
  ).length;

  const pendingCount = memberships.filter(
    (membership) => membership.status === "pending"
  ).length;

  const statusOptions = [
    "pending",
    "active",
    "expired",
    "cancelled",
    "past_due",
  ];

  function pageUrl(page: number) {
    const query = new URLSearchParams();

    query.set("page", String(page));

    if (selectedStatus) query.set("status", selectedStatus);
    if (search) query.set("q", search);

    return `/admin/memberships?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-green-800">
          Platform management
        </p>
        <h1 className="mt-1 text-2xl font-bold text-gray-900">
          Memberships
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage visibility of customer subscriptions, membership plans and
          payment history.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          label="Membership records"
          value={totalCount.toLocaleString()}
          description="Matching current filter"
        />
        <SummaryCard
          label="Active on this page"
          value={activeCount.toLocaleString()}
          description="Current page only"
        />
        <SummaryCard
          label="Pending on this page"
          value={pendingCount.toLocaleString()}
          description="Current page only"
        />
        <SummaryCard
          label="Successful payments"
          value={payments.filter((payment) => payment.status === "successful").length.toLocaleString()}
          description="Current page memberships"
        />
      </div>

      {Object.keys(paymentTotals).length > 0 && (
        <section className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900">
            Successful payment totals
          </h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {Object.entries(paymentTotals).map(([currency, amount]) => (
              <div
                key={currency}
                className="rounded-xl border border-gray-200 px-4 py-3"
              >
                <p className="text-xs text-gray-500">{currency}</p>
                <p className="mt-1 font-semibold text-gray-900">
                  {formatMoney(amount, currency)}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-gray-500">
            Totals cover payments associated with the memberships on this
            page, not all platform revenue.
          </p>
        </section>
      )}

      <section className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">
              Customer memberships
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Subscription records and their latest payment details.
            </p>
          </div>

          <form
            action="/admin/memberships"
            method="get"
            className="flex flex-wrap items-center gap-2"
          >
            <input
              type="search"
              name="q"
              defaultValue={search}
              maxLength={80}
              placeholder="Search customer or plan"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-green-600 sm:w-52"
            />

            <select
              name="status"
              defaultValue={selectedStatus}
              aria-label="Filter memberships by status"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-600"
            >
              <option value="">All statuses</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-900"
            >
              Apply
            </button>

            {(selectedStatus || search) && (
              <Link
                href="/admin/memberships"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Clear
              </Link>
            )}
          </form>
        </div>

        <div className="mt-5 overflow-x-auto">
          {memberships.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <span className="text-xl">M</span>
              </div>

              <h3 className="mt-4 font-semibold text-gray-900">
                No memberships found
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                Customer subscriptions will appear here when membership
                records are created.
              </p>
            </div>
          ) : (
            <table className="min-w-[1200px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Plan</th>
                  <th className="px-3 py-3 font-semibold">Membership</th>
                  <th className="px-3 py-3 font-semibold">Start date</th>
                  <th className="px-3 py-3 font-semibold">Expiry</th>
                  <th className="px-3 py-3 font-semibold">Next billing</th>
                  <th className="px-3 py-3 font-semibold">Renewal</th>
                  <th className="px-3 py-3 font-semibold">Latest payment</th>
                </tr>
              </thead>

              <tbody>
                {memberships.map((membership) => {
                  const profile = profileMap.get(membership.user_id);
                  const plan = planMap.get(membership.plan_id);
                  const payment = latestPaymentMap.get(membership.id);

                  return (
                    <tr
                      key={membership.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/80"
                    >
                      <td className="px-3 py-4">
                        <p className="font-medium text-gray-900">
                          {memberName(profile)}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {profile?.username
                            ? `@${profile.username}`
                            : membership.user_id}
                        </p>
                      </td>

                      <td className="px-3 py-4">
                        {plan ? (
                          <>
                            <p className="font-medium text-gray-900">
                              {plan.name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {formatMoney(plan.price, plan.currency)} /{" "}
                              {plan.billing_interval}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {plan.included_minutes} included minutes
                            </p>
                          </>
                        ) : (
                          <span className="text-gray-500">
                            Plan unavailable
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-4">
                        <StatusBadge status={membership.status} />
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-gray-600">
                        {formatDate(membership.starts_at)}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-gray-600">
                        {formatDate(membership.ends_at)}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-gray-600">
                        {formatDate(membership.next_billing_at)}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={
                            membership.auto_renew
                              ? "text-green-700"
                              : "text-gray-500"
                          }
                        >
                          {membership.auto_renew ? "Enabled" : "Disabled"}
                        </span>
                      </td>

                      <td className="px-3 py-4">
                        {payment ? (
                          <>
                            <p className="font-medium text-gray-900">
                              {formatMoney(payment.amount, payment.currency)}
                            </p>
                            <div className="mt-1">
                              <StatusBadge status={payment.status} />
                            </div>
                            <p className="mt-1 text-xs text-gray-500">
                              {payment.payment_provider}
                            </p>
                          </>
                        ) : (
                          <span className="text-gray-500">
                            No payment record
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {totalCount > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Showing page {safePage} of {totalPages} ·{" "}
              {totalCount.toLocaleString()} matching records
            </p>

            <div className="flex items-center gap-2">
              {safePage > 1 ? (
                <Link
                  href={pageUrl(safePage - 1)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </Link>
              ) : (
                <span className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-400">
                  Previous
                </span>
              )}

              <span className="px-2 text-sm text-gray-600">
                Page {safePage} of {totalPages}
              </span>

              {safePage < totalPages ? (
                <Link
                  href={pageUrl(safePage + 1)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Next
                </Link>
              ) : (
                <span className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-400">
                  Next
                </span>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
      <p className="mt-1 text-xs text-gray-500">{description}</p>
    </div>
  );
}

function ErrorPanel({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <section className="rounded-2xl border border-red-200 bg-white/90 p-6">
      <h2 className="font-semibold text-red-800">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{message}</p>
    </section>
  );
}

export default function AdminMembershipsPage(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <MembershipsContent searchParams={props.searchParams} />
    </Suspense>
  );
}
