
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
  }>;
};

type Payment = {
  gross_amount: number;
  platform_fee: number;
  provider_amount: number;
  currency: string;
  status: string;
  created_at: string;
};

type MembershipPayment = {
  amount: number;
  currency: string;
  status: string;
  paid_at: string | null;
  created_at: string;
};

type Payout = {
  amount: number;
  currency: string;
  status: string;
  created_at: string;
};

type StatusRow = {
  status: string;
};

type MoneyTotal = {
  currency: string;
  amount: number;
};

const PAGE_SIZE = 1000;

function getDateRange(
  range: string | undefined,
  from: string | undefined,
  to: string | undefined
) {
  const now = new Date();

  if (range === "custom" && from && to) {
    const start = new Date(`${from}T00:00:00.000Z`);
    const end = new Date(`${to}T23:59:59.999Z`);

    if (
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      start <= end
    ) {
      return {
        range: "custom",
        from: start.toISOString(),
        to: end.toISOString(),
        fromInput: from,
        toInput: to,
        label: `${from} to ${to}`,
      };
    }
  }

  const today = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  let start: Date | null = null;
  let label = "All time";
  let selectedRange = "all";

  switch (range) {
    case "today":
      start = today;
      label = "Today";
      selectedRange = "today";
      break;

    case "7":
      start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 6);
      label = "Last 7 days";
      selectedRange = "7";
      break;

    case "30":
      start = new Date(today);
      start.setUTCDate(start.getUTCDate() - 29);
      label = "Last 30 days";
      selectedRange = "30";
      break;
  }

  return {
    range: selectedRange,
    from: start?.toISOString() ?? null,
    to: null,
    fromInput: "",
    toInput: "",
    label,
  };
}

function isSuccessful(status: string) {
  return ["paid", "successful", "completed", "succeeded"].includes(
    status.toLowerCase()
  );
}

function isPending(status: string) {
  return ["pending", "processing", "queued", "initiated"].includes(
    status.toLowerCase()
  );
}

function isFailed(status: string) {
  return ["failed", "rejected", "declined"].includes(
    status.toLowerCase()
  );
}

function isCancelled(status: string) {
  return ["cancelled", "canceled"].includes(status.toLowerCase());
}

function sumByCurrency(
  rows: { amount: number; currency: string }[]
): MoneyTotal[] {
  const totals = new Map<string, number>();

  for (const row of rows) {
    const currency = row.currency || "UNKNOWN";
    totals.set(
      currency,
      (totals.get(currency) ?? 0) + Number(row.amount || 0)
    );
  }

  return Array.from(totals.entries())
    .map(([currency, amount]) => ({ currency, amount }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toLocaleString()}`;
  }
}

function formatTotals(totals: MoneyTotal[]) {
  if (totals.length === 0) return "—";

  return totals
    .map((item) => formatMoney(item.amount, item.currency))
    .join(" · ");
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function MetricCard({
  label,
  value,
  description,
}: {
  label: string;
  value: string | number;
  description?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
      <p className="text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-2 break-words text-2xl font-bold text-gray-900">
        {typeof value === "number" ? formatNumber(value) : value}
      </p>
      {description && (
        <p className="mt-2 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

function StatusBreakdown({
  title,
  rows,
}: {
  title: string;
  rows: StatusRow[];
}) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    const status = row.status || "unknown";
    counts.set(status, (counts.get(status) ?? 0) + 1);
  }

  const entries = Array.from(counts.entries()).sort(
    (a, b) => b[1] - a[1]
  );

  return (
    <section className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
      <h3 className="font-bold text-gray-900">{title}</h3>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          No records in this period.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {entries.map(([status, count]) => (
            <div
              key={status}
              className="flex items-center justify-between gap-4"
            >
              <span className="text-sm capitalize text-gray-600">
                {status.replaceAll("_", " ")}
              </span>
              <span className="font-semibold text-gray-900">
                {formatNumber(count)}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function ReportSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function DateFilters({
  range,
  from,
  to,
}: {
  range: string;
  from: string;
  to: string;
}) {
  const options = [
    { value: "all", label: "All time" },
    { value: "today", label: "Today" },
    { value: "7", label: "Last 7 days" },
    { value: "30", label: "Last 30 days" },
  ];

  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Link
            key={option.value}
            href={`/admin/reports?range=${option.value}`}
            className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
              range === option.value
                ? "border-green-700 bg-green-700 text-white"
                : "border-gray-200 bg-white text-gray-700 hover:border-green-500"
            }`}
          >
            {option.label}
          </Link>
        ))}
      </div>

      <form
        action="/admin/reports"
        method="get"
        className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <input type="hidden" name="range" value="custom" />

        <label className="flex-1 text-sm font-medium text-gray-700">
          From
          <input
            type="date"
            name="from"
            defaultValue={from}
            required
            className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900"
          />
        </label>

        <label className="flex-1 text-sm font-medium text-gray-700">
          To
          <input
            type="date"
            name="to"
            defaultValue={to}
            required
            className="mt-1 block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-gray-900"
          />
        </label>

        <button
          type="submit"
          className="rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-700"
        >
          Apply dates
        </button>
      </form>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-8 text-center shadow-sm">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-green-700" />
      <p className="mt-3 text-sm text-gray-600">
        Preparing platform reports...
      </p>
    </div>
  );
}

async function fetchAll<T>(
  buildQuery: (from: number, to: number) => PromiseLike<{
    data: T[] | null;
    error: { message: string } | null;
  }>
): Promise<T[]> {
  const allRows: T[] = [];

  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await buildQuery(
      offset,
      offset + PAGE_SIZE - 1
    );

    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];
    allRows.push(...rows);

    if (rows.length < PAGE_SIZE) break;
  }

  return allRows;
}

async function ReportsContent({
  searchParams,
}: {
  searchParams: PageProps["searchParams"];
}) {
  await connection();

  const params = await searchParams;
  const dateRange = getDateRange(params.range, params.from, params.to);

  const supabase = await createClient();

  const applyDate = <T extends {
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
  }>(
    query: T,
    column = "created_at"
  ) => {
    let result = query;

    if (dateRange.from) {
      result = result.gte(column, dateRange.from);
    }

    if (dateRange.to) {
      result = result.lte(column, dateRange.to);
    }

    return result;
  };

  try {
    const [
      profiles,
      applications,
      listings,
      bookings,
      financialPayments,
      memberships,
      membershipPayments,
      payouts,
    ] = await Promise.all([
      fetchAll<{ user_id: string }>((from, to) =>
        applyDate(
          supabase
            .from("profiles")
            .select("user_id")
            .order("created_at")
            .range(from, to)
        )
      ),

      fetchAll<StatusRow>((from, to) =>
        applyDate(
          supabase
            .from("provider_applications")
            .select("status")
            .order("created_at")
            .range(from, to)
        )
      ),

      fetchAll<StatusRow>((from, to) =>
        applyDate(
          supabase
            .from("provider_listings")
            .select("status")
            .order("created_at")
            .range(from, to)
        )
      ),

      fetchAll<StatusRow>((from, to) =>
        applyDate(
          supabase
            .from("bookings")
            .select("status")
            .order("created_at")
            .range(from, to)
        )
      ),

      fetchAll<Payment>((from, to) =>
        applyDate(
          supabase
            .from("financial_payments")
            .select(
              "gross_amount, platform_fee, provider_amount, currency, status, created_at"
            )
            .order("created_at")
            .range(from, to)
        )
      ),

      fetchAll<StatusRow>((from, to) =>
        applyDate(
          supabase
            .from("user_memberships")
            .select("status")
            .order("created_at")
            .range(from, to)
        )
      ),

      fetchAll<MembershipPayment>((from, to) =>
        applyDate(
          supabase
            .from("membership_payments")
            .select(
              "amount, currency, status, paid_at, created_at"
            )
            .order("created_at")
            .range(from, to)
        )
      ),

      fetchAll<Payout>((from, to) =>
        applyDate(
          supabase
            .from("provider_payouts")
            .select("amount, currency, status, created_at")
            .order("created_at")
            .range(from, to)
        )
      ),
    ]);

    const successfulFinancialPayments = financialPayments.filter(
      (payment) => isSuccessful(payment.status)
    );

    const successfulMembershipPayments = membershipPayments.filter(
      (payment) => isSuccessful(payment.status)
    );

    const successfulPayouts = payouts.filter((payout) =>
      isSuccessful(payout.status)
    );

    const totalGross = sumByCurrency(
      successfulFinancialPayments.map((payment) => ({
        amount: Number(payment.gross_amount),
        currency: payment.currency,
      }))
    );

    const totalFees = sumByCurrency(
      successfulFinancialPayments.map((payment) => ({
        amount: Number(payment.platform_fee),
        currency: payment.currency,
      }))
    );

    const totalProviderEarnings = sumByCurrency(
      successfulFinancialPayments.map((payment) => ({
        amount: Number(payment.provider_amount),
        currency: payment.currency,
      }))
    );

    const membershipRevenue = sumByCurrency(
      successfulMembershipPayments.map((payment) => ({
        amount: Number(payment.amount),
        currency: payment.currency,
      }))
    );

    const payoutTotals = sumByCurrency(
      successfulPayouts.map((payout) => ({
        amount: Number(payout.amount),
        currency: payout.currency,
      }))
    );

    const activeMemberships = memberships.filter(
      (item) => item.status.toLowerCase() === "active"
    ).length;

    const pendingPayouts = payouts.filter((item) =>
      isPending(item.status)
    ).length;

    const failedPayouts = payouts.filter((item) =>
      isFailed(item.status)
    ).length;

    const cancelledMemberships = memberships.filter((item) =>
      isCancelled(item.status)
    ).length;

    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Platform reports
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              An overview of NiaWorld activity and financial performance.
            </p>
          </div>

          <span className="w-fit rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-800">
            {dateRange.label}
          </span>
        </div>

        <DateFilters
          range={dateRange.range}
          from={dateRange.fromInput}
          to={dateRange.toInput}
        />

        <ReportSection
          title="Platform activity"
          description="Records created during the selected period."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Customer profiles"
              value={profiles.length}
            />
            <MetricCard
              label="Provider applications"
              value={applications.length}
            />
            <MetricCard
              label="Provider listings"
              value={listings.length}
            />
            <MetricCard
              label="Bookings"
              value={bookings.length}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <StatusBreakdown
              title="Provider applications"
              rows={applications}
            />
            <StatusBreakdown
              title="Listing statuses"
              rows={listings}
            />
            <StatusBreakdown
              title="Booking statuses"
              rows={bookings}
            />
          </div>
        </ReportSection>

        <ReportSection
          title="Financial performance"
          description="Only successful booking payments are included in revenue totals."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Gross booking payments"
              value={formatTotals(totalGross)}
              description={`${successfulFinancialPayments.length} successful payments`}
            />
            <MetricCard
              label="Platform fees"
              value={formatTotals(totalFees)}
              description="Recorded platform fee amounts"
            />
            <MetricCard
              label="Provider earnings"
              value={formatTotals(totalProviderEarnings)}
              description="Recorded provider payment allocations"
            />
          </div>
        </ReportSection>

        <ReportSection
          title="Membership performance"
          description="Membership records and successful subscription payments."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard
              label="Membership records"
              value={memberships.length}
            />
            <MetricCard
              label="Active memberships"
              value={activeMemberships}
            />
            <MetricCard
              label="Cancelled memberships"
              value={cancelledMemberships}
            />
            <MetricCard
              label="Successful subscription payments"
              value={successfulMembershipPayments.length}
            />
            <MetricCard
              label="Subscription revenue"
              value={formatTotals(membershipRevenue)}
            />
          </div>
        </ReportSection>

        <ReportSection
          title="Payout performance"
          description="Provider payout requests and completed transfers."
        >
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Payout requests"
              value={payouts.length}
            />
            <MetricCard
              label="Completed payout amount"
              value={formatTotals(payoutTotals)}
            />
            <MetricCard
              label="Pending payouts"
              value={pendingPayouts}
            />
            <MetricCard
              label="Failed payouts"
              value={failedPayouts}
            />
          </div>

          <StatusBreakdown
            title="Payout statuses"
            rows={payouts}
          />
        </ReportSection>

        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <h3 className="font-bold text-blue-900">
            Reporting notes
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-blue-800">
            <li>
              Currency totals are kept separate and are not converted.
            </li>
            <li>
              Financial and membership revenue includes successful payment
              statuses only.
            </li>
            <li>
              Activity counts use each table&apos;s creation date.
            </li>
            <li>
              These reports show recorded database values, not bank settlement
              confirmation.
            </li>
          </ul>
        </div>

        <p className="text-xs text-gray-500">
          Report period: {dateRange.label}. All figures are based on records
          currently accessible to this administrator.
        </p>
      </div>
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected reporting error occurred.";

    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <h2 className="font-bold text-red-700">
          Reports could not be generated
        </h2>
        <p className="mt-2 break-words text-sm text-gray-600">
          {message}
        </p>
        <p className="mt-3 text-sm text-gray-500">
          Check the reporting table permissions and database access policies.
        </p>
        <Link
          href="/admin"
          className="mt-4 inline-block text-sm font-semibold text-green-700 hover:underline"
        >
          Return to admin overview
        </Link>
      </div>
    );
  }
}

export default function ReportsPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <ReportsContent searchParams={searchParams} />
    </Suspense>
  );
}
