
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import PayoutMethodVerification from "./payout-method-verification";

type Payout = {
  id: string;
  provider_id: string;
  payout_method_id: string;
  amount: number | string;
  currency: string;
  status: string;
  idempotency_key: string;
  payout_reference: string | null;
  failure_reason: string | null;
  processed_at: string | null;
  created_at: string;
  updated_at: string;
};

type PayoutMethod = {
  id: string;
  provider_id: string;
  method_type: string;
  provider_name: string;
  masked_account: string;
  is_default: boolean;
  verified_at: string | null;
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
  if (!value) return "Not processed";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function memberName(profile?: Profile) {
  return (
    profile?.display_name ||
    profile?.username ||
    "Unknown provider"
  );
}

function statusStyle(status: string) {
  const normalized = status.toLowerCase();

  if (
    ["completed", "successful", "succeeded", "paid", "processed"].includes(
      normalized
    )
  ) {
    return "bg-green-100 text-green-800";
  }

  if (
    ["failed", "cancelled", "canceled", "rejected"].includes(normalized)
  ) {
    return "bg-red-100 text-red-800";
  }

  if (
    ["pending", "processing", "initiated", "queued"].includes(normalized)
  ) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-gray-100 text-gray-700";
}

function Loading() {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/85 p-8 text-center shadow-sm">
      <p className="text-sm text-gray-600">Loading payouts...</p>
    </div>
  );
}

async function PayoutsContent({ searchParams }: PageProps) {
  await connection();

  const params = await searchParams;
  const requestedPage = Number(params.page || "1");
  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const selectedStatus = (params.status || "").trim();

  const supabase = await createClient();

  let countQuery = supabase
    .from("provider_payouts")
    .select("id", { count: "exact", head: true });

  if (selectedStatus) {
    countQuery = countQuery.eq("status", selectedStatus);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-white/90 p-6">
        <h2 className="font-semibold text-red-800">
          Could not load payout count
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {countError.message}
        </p>
      </section>
    );
  }

  const totalCount = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let payoutsQuery = supabase
    .from("provider_payouts")
    .select(
      [
        "id",
        "provider_id",
        "payout_method_id",
        "amount",
        "currency",
        "status",
        "idempotency_key",
        "payout_reference",
        "failure_reason",
        "processed_at",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (selectedStatus) {
    payoutsQuery = payoutsQuery.eq("status", selectedStatus);
  }

  const { data: payoutData, error: payoutError } = await payoutsQuery;

  if (payoutError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-white/90 p-6">
        <h2 className="font-semibold text-red-800">
          Could not load payouts
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {payoutError.message}
        </p>
      </section>
    );
  }

  const payouts = (payoutData || []) as unknown as Payout[];

  const providerIds = Array.from(
    new Set(payouts.map((payout) => payout.provider_id))
  );

  const methodIds = Array.from(
    new Set(payouts.map((payout) => payout.payout_method_id))
  );

  let profiles: Profile[] = [];
  let methods: PayoutMethod[] = [];

  if (providerIds.length > 0) {
    const { data, error } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .in("user_id", providerIds);

    if (!error) profiles = (data || []) as Profile[];
  }

  if (methodIds.length > 0) {
    const { data, error } = await supabase
      .from("provider_payout_methods")
      .select(
        "id, provider_id, method_type, provider_name, masked_account, is_default, verified_at"
      )
      .in("id", methodIds);

    if (!error) methods = (data || []) as PayoutMethod[];
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  const methodMap = new Map(
    methods.map((method) => [method.id, method])
  );

  const statuses = Array.from(
    new Set(payouts.map((payout) => payout.status))
  ).sort();

  function pageUrl(page: number) {
    const query = new URLSearchParams();

    query.set("page", String(page));

    if (selectedStatus) {
      query.set("status", selectedStatus);
    }

    return `/admin/payouts?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-800">
            Finance management
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Provider payouts
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Review provider withdrawal requests and payout destinations.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white/90 px-4 py-3">
          <p className="text-xs text-gray-500">Total payout requests</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalCount.toLocaleString()}
          </p>
        </div>
      </div>

      <PayoutMethodVerification />

      <section className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">
              Payout requests
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Withdrawal requests and their processing history.
            </p>
          </div>

          <form
            action="/admin/payouts"
            method="get"
            className="flex flex-wrap items-center gap-2"
          >
            <select
              name="status"
              defaultValue={selectedStatus}
              aria-label="Filter payouts by status"
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-600"
            >
              <option value="">All statuses</option>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="rounded-lg bg-green-800 px-4 py-2 text-sm font-medium text-white hover:bg-green-900"
            >
              Filter
            </button>

            {selectedStatus && (
              <a
                href="/admin/payouts"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Clear
              </a>
            )}
          </form>
        </div>

        <div className="mt-5 overflow-x-auto">
          {payouts.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <span className="text-xl">$</span>
              </div>

              <h3 className="mt-4 font-semibold text-gray-900">
                No payout requests yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                Provider withdrawal requests will appear here when they are
                submitted. No payouts can be initiated or changed from this
                page.
              </p>
            </div>
          ) : (
            <table className="min-w-[1150px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-3 font-semibold">Provider</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">Payout destination</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Payout reference</th>
                  <th className="px-3 py-3 font-semibold">Requested</th>
                  <th className="px-3 py-3 font-semibold">Processed</th>
                </tr>
              </thead>

              <tbody>
                {payouts.map((payout) => {
                  const method = methodMap.get(payout.payout_method_id);

                  return (
                    <tr
                      key={payout.id}
                      className="border-b border-gray-100 last:border-0 hover:bg-gray-50/80"
                    >
                      <td className="px-3 py-4">
                        <p className="font-medium text-gray-900">
                          {memberName(profileMap.get(payout.provider_id))}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {payout.provider_id}
                        </p>
                      </td>

                      <td className="px-3 py-4 font-semibold text-gray-900">
                        {formatMoney(payout.amount, payout.currency)}
                      </td>

                      <td className="px-3 py-4">
                        {method ? (
                          <>
                            <p className="font-medium text-gray-800">
                              {method.provider_name}
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              {method.method_type} · {method.masked_account}
                            </p>
                            {method.is_default && (
                              <span className="mt-1 inline-block text-xs text-green-700">
                                Default method
                              </span>
                            )}
                            {!method.verified_at && (
                              <span className="mt-1 block text-xs text-amber-700">
                                Not verified
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-500">
                            Payout method unavailable
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-4">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyle(
                            payout.status
                          )}`}
                        >
                          {payout.status.replaceAll("_", " ")}
                        </span>

                        {payout.failure_reason && (
                          <p className="mt-1 max-w-[180px] text-xs text-red-700">
                            {payout.failure_reason}
                          </p>
                        )}
                      </td>

                      <td className="px-3 py-4 text-gray-700">
                        {payout.payout_reference || "Not assigned"}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-gray-600">
                        {formatDate(payout.created_at)}
                      </td>

                      <td className="whitespace-nowrap px-3 py-4 text-gray-600">
                        {formatDate(payout.processed_at)}
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
              Showing {from + 1}–{Math.min(to + 1, totalCount)} of{" "}
              {totalCount.toLocaleString()} payout requests
            </p>

            <div className="flex items-center gap-2">
              {safePage > 1 ? (
                <a
                  href={pageUrl(safePage - 1)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Previous
                </a>
              ) : (
                <span className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-400">
                  Previous
                </span>
              )}

              <span className="px-2 text-sm text-gray-600">
                Page {safePage} of {totalPages}
              </span>

              {safePage < totalPages ? (
                <a
                  href={pageUrl(safePage + 1)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  Next
                </a>
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

export default function AdminPayoutsPage(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <PayoutsContent searchParams={props.searchParams} />
    </Suspense>
  );
}
