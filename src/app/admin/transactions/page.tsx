
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type FinancialPayment = {
  id: string;
  booking_id: string | null;
  customer_id: string;
  provider_id: string;
  payment_provider: string;
  payment_reference: string;
  gross_amount: number | string;
  platform_fee: number | string;
  provider_amount: number | string;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
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

  if (!Number.isFinite(amount)) {
    return `${currency} —`;
  }

  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toFixed(2)}`;
  }
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown date";
  }

  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function displayName(profile?: Profile) {
  if (!profile) return "Unknown member";
  return profile.display_name || profile.username || "Unnamed member";
}

function statusStyle(status: string) {
  const normalized = status.toLowerCase();

  if (["completed", "successful", "succeeded", "paid"].includes(normalized)) {
    return "bg-green-100 text-green-800";
  }

  if (["failed", "cancelled", "canceled", "rejected"].includes(normalized)) {
    return "bg-red-100 text-red-800";
  }

  if (["pending", "processing", "initiated"].includes(normalized)) {
    return "bg-amber-100 text-amber-800";
  }

  return "bg-gray-100 text-gray-700";
}

function Loading() {
  return (
    <div className="rounded-2xl border border-white/50 bg-white/85 p-8 text-center shadow-sm">
      <p className="text-sm text-gray-600">Loading transactions...</p>
    </div>
  );
}

async function TransactionsContent({ searchParams }: PageProps) {
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
    .from("financial_payments")
    .select("id", { count: "exact", head: true });

  if (selectedStatus) {
    countQuery = countQuery.eq("status", selectedStatus);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-white/90 p-6">
        <h2 className="font-semibold text-red-800">
          Could not load transaction count
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

  let paymentsQuery = supabase
    .from("financial_payments")
    .select(
      [
        "id",
        "booking_id",
        "customer_id",
        "provider_id",
        "payment_provider",
        "payment_reference",
        "gross_amount",
        "platform_fee",
        "provider_amount",
        "currency",
        "status",
        "created_at",
        "updated_at",
      ].join(",")
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (selectedStatus) {
    paymentsQuery = paymentsQuery.eq("status", selectedStatus);
  }

  const { data: payments, error: paymentsError } = await paymentsQuery;

  if (paymentsError) {
    return (
      <section className="rounded-2xl border border-red-200 bg-white/90 p-6">
        <h2 className="font-semibold text-red-800">
          Could not load transactions
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {paymentsError.message}
        </p>
      </section>
    );
  }

  const records = (payments || []) as unknown as FinancialPayment[];

  const memberIds = Array.from(
    new Set(
      records.flatMap((payment) => [
        payment.customer_id,
        payment.provider_id,
      ])
    )
  );

  let profiles: Profile[] = [];

  if (memberIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .in("user_id", memberIds);

    if (!profileError) {
      profiles = (profileData || []) as Profile[];
    }
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  const statuses = Array.from(
    new Set(records.map((payment) => payment.status))
  ).sort();

  function pageUrl(page: number) {
    const query = new URLSearchParams();

    query.set("page", String(page));

    if (selectedStatus) {
      query.set("status", selectedStatus);
    }

    return `/admin/transactions?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-800">
            Finance management
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Review customer payments, platform fees, and provider earnings.
          </p>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white/90 px-4 py-3">
          <p className="text-xs text-gray-500">Total transactions</p>
          <p className="text-2xl font-bold text-gray-900">
            {totalCount.toLocaleString()}
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">
              Payment records
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              Customer payment records from the financial ledger.
            </p>
          </div>

          <form
            action="/admin/transactions"
            method="get"
            className="flex flex-wrap items-center gap-2"
          >
            <select
              name="status"
              defaultValue={selectedStatus}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-600"
              aria-label="Filter transactions by status"
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
              <Link
                href="/admin/transactions"
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                Clear
              </Link>
            )}
          </form>
        </div>

        <div className="mt-5 overflow-x-auto">
          {records.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/80 px-6 py-14 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
                <span className="text-xl">$</span>
              </div>

              <h3 className="mt-4 font-semibold text-gray-900">
                No transactions yet
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm text-gray-500">
                Customer payments will appear here when payment records are
                created. This page is currently read-only.
              </p>
            </div>
          ) : (
            <table className="min-w-[1100px] w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-3 font-semibold">Payment</th>
                  <th className="px-3 py-3 font-semibold">Customer</th>
                  <th className="px-3 py-3 font-semibold">Provider</th>
                  <th className="px-3 py-3 font-semibold">Gross amount</th>
                  <th className="px-3 py-3 font-semibold">Platform fee</th>
                  <th className="px-3 py-3 font-semibold">Provider amount</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold">Date</th>
                </tr>
              </thead>

              <tbody>
                {records.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-100 last:border-0 hover:bg-gray-50/80"
                  >
                    <td className="px-3 py-4">
                      <p className="font-medium text-gray-900">
                        {payment.payment_provider}
                      </p>
                      <p className="mt-1 max-w-[180px] truncate text-xs text-gray-500">
                        {payment.payment_reference}
                      </p>
                    </td>

                    <td className="px-3 py-4 text-gray-700">
                      {displayName(profileMap.get(payment.customer_id))}
                    </td>

                    <td className="px-3 py-4 text-gray-700">
                      {displayName(profileMap.get(payment.provider_id))}
                    </td>

                    <td className="px-3 py-4 font-medium text-gray-900">
                      {formatMoney(payment.gross_amount, payment.currency)}
                    </td>

                    <td className="px-3 py-4 text-gray-700">
                      {formatMoney(payment.platform_fee, payment.currency)}
                    </td>

                    <td className="px-3 py-4 text-gray-700">
                      {formatMoney(payment.provider_amount, payment.currency)}
                    </td>

                    <td className="px-3 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium capitalize ${statusStyle(
                          payment.status
                        )}`}
                      >
                        {payment.status.replaceAll("_", " ")}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-4 text-gray-600">
                      {formatDate(payment.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalCount > 0 && (
          <div className="mt-5 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Showing {from + 1}–{Math.min(to + 1, totalCount)} of{" "}
              {totalCount.toLocaleString()} transactions
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

export default function AdminTransactionsPage(props: PageProps) {
  return (
    <Suspense fallback={<Loading />}>
      <TransactionsContent searchParams={props.searchParams} />
    </Suspense>
  );
}
