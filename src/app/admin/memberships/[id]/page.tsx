
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

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
  updated_at: string;
};

type MembershipPlan = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  billing_interval: string;
  included_minutes: number;
  is_active: boolean;
};

type Profile = {
  user_id: string;
  username: string;
  display_name: string;
  country: string;
  bio: string;
  avatar_url: string | null;
};

type MembershipPayment = {
  id: string;
  membership_id: string;
  user_id: string;
  plan_id: string;
  amount: number;
  currency: string;
  status: string;
  payment_provider: string;
  payment_reference: string | null;
  paid_at: string | null;
  created_at: string;
};

function formatDate(value: string | null) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Invalid date";

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: currency || "USD",
  }).format(Number(amount));
}

function statusStyle(status: string) {
  const normalized = status.toLowerCase();

  if (["active", "paid", "successful", "completed"].includes(normalized)) {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (["pending", "processing"].includes(normalized)) {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }

  if (
    ["cancelled", "canceled", "expired", "failed", "rejected"].includes(
      normalized
    )
  ) {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-gray-200 bg-gray-50 text-gray-700";
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusStyle(status)}`}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}

function DetailItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-1 break-words text-sm font-semibold text-gray-900">
        {value}
      </p>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
      {children}
    </section>
  );
}

function LoadingState() {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/90 p-8 text-center shadow-sm">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-200 border-t-green-700" />
      <p className="mt-3 text-sm text-gray-600">
        Loading membership details...
      </p>
    </div>
  );
}

async function MembershipDetails({ id }: { id: string }) {
  await connection();

  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("user_memberships")
    .select(
      "id, user_id, plan_id, status, starts_at, ends_at, next_billing_at, auto_renew, cancelled_at, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (membershipError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6">
        <h2 className="font-bold text-red-700">
          Could not load membership
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          {membershipError.message}
        </p>
        <Link
          href="/admin/memberships"
          className="mt-4 inline-block text-sm font-semibold text-green-700 hover:underline"
        >
          Back to memberships
        </Link>
      </div>
    );
  }

  if (!membership) notFound();

  const currentMembership = membership as Membership;

  const [
    { data: plan, error: planError },
    { data: profile, error: profileError },
    { data: payments, error: paymentsError },
  ] = await Promise.all([
    supabase
      .from("membership_plans")
      .select(
        "id, name, slug, description, price, currency, billing_interval, included_minutes, is_active"
      )
      .eq("id", currentMembership.plan_id)
      .maybeSingle(),

    supabase
      .from("profiles")
      .select(
        "user_id, username, display_name, country, bio, avatar_url"
      )
      .eq("user_id", currentMembership.user_id)
      .maybeSingle(),

    supabase
      .from("membership_payments")
      .select(
        "id, membership_id, user_id, plan_id, amount, currency, status, payment_provider, payment_reference, paid_at, created_at"
      )
      .eq("membership_id", currentMembership.id)
      .order("created_at", { ascending: false }),
  ]);

  const currentPlan = plan as MembershipPlan | null;
  const currentProfile = profile as Profile | null;
  const paymentHistory = (payments ?? []) as MembershipPayment[];

  const successfulPayments = paymentHistory.filter((payment) =>
    ["paid", "successful", "completed"].includes(
      payment.status.toLowerCase()
    )
  );

  const totalPaid = successfulPayments.reduce(
    (total, payment) => total + Number(payment.amount || 0),
    0
  );

  const totalCurrency =
    successfulPayments[0]?.currency ||
    currentPlan?.currency ||
    "USD";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link
            href="/admin/memberships"
            className="text-sm font-semibold text-green-700 hover:underline"
          >
            ← Back to memberships
          </Link>

          <h1 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">
            Membership details
          </h1>

          <p className="mt-1 break-all text-sm text-gray-500">
            Membership ID: {currentMembership.id}
          </p>
        </div>

        <StatusBadge status={currentMembership.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total successful payments</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {successfulPayments.length}
          </p>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total amount paid</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {formatMoney(totalPaid, totalCurrency)}
          </p>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Included minutes</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {currentPlan
              ? currentPlan.included_minutes.toLocaleString()
              : "—"}
          </p>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/90 p-5 shadow-sm">
          <p className="text-sm text-gray-500">Auto renewal</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {currentMembership.auto_renew ? "Enabled" : "Disabled"}
          </p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Section
          title="Customer information"
          description="The account associated with this membership."
        >
          {profileError ? (
            <p className="text-sm text-red-600">
              Could not load customer profile: {profileError.message}
            </p>
          ) : currentProfile ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                {currentProfile.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={currentProfile.avatar_url}
                    alt=""
                    className="h-14 w-14 rounded-full border border-gray-200 object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-xl font-bold text-green-800">
                    {(currentProfile.display_name || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="break-words font-bold text-gray-900">
                    {currentProfile.display_name}
                  </p>
                  <p className="text-sm text-gray-500">
                    @{currentProfile.username}
                  </p>
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <DetailItem
                  label="Country"
                  value={currentProfile.country || "Not provided"}
                />
                <DetailItem
                  label="User ID"
                  value={currentProfile.user_id}
                />
              </div>

              {currentProfile.bio && (
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Bio
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">
                    {currentProfile.bio}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No customer profile was found for this account.
            </p>
          )}
        </Section>

        <Section
          title="Membership plan"
          description="The plan currently linked to this membership."
        >
          {planError ? (
            <p className="text-sm text-red-600">
              Could not load plan: {planError.message}
            </p>
          ) : currentPlan ? (
            <div className="space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-gray-900">
                    {currentPlan.name}
                  </h3>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      currentPlan.is_active
                        ? "bg-green-50 text-green-700"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {currentPlan.is_active ? "Available plan" : "Inactive plan"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  {currentPlan.description || "No plan description."}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <DetailItem
                  label="Price"
                  value={formatMoney(
                    currentPlan.price,
                    currentPlan.currency
                  )}
                />
                <DetailItem
                  label="Billing interval"
                  value={currentPlan.billing_interval}
                />
                <DetailItem
                  label="Included minutes"
                  value={currentPlan.included_minutes.toLocaleString()}
                />
                <DetailItem
                  label="Plan slug"
                  value={currentPlan.slug}
                />
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              The plan linked to this membership could not be found.
            </p>
          )}
        </Section>
      </div>

      <Section
        title="Membership timeline"
        description="Important dates and renewal information."
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          <DetailItem
            label="Membership started"
            value={formatDate(currentMembership.starts_at)}
          />
          <DetailItem
            label="Membership expires"
            value={formatDate(currentMembership.ends_at)}
          />
          <DetailItem
            label="Next billing date"
            value={formatDate(currentMembership.next_billing_at)}
          />
          <DetailItem
            label="Auto renewal"
            value={currentMembership.auto_renew ? "Enabled" : "Disabled"}
          />
          <DetailItem
            label="Cancelled at"
            value={formatDate(currentMembership.cancelled_at)}
          />
          <DetailItem
            label="Created at"
            value={formatDate(currentMembership.created_at)}
          />
          <DetailItem
            label="Last updated"
            value={formatDate(currentMembership.updated_at)}
          />
        </div>
      </Section>

      <Section
        title="Payment history"
        description="All payment records associated with this membership, newest first."
      >
        {paymentsError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-700">
              Could not load payment history.
            </p>
            <p className="mt-1 text-sm text-red-600">
              {paymentsError.message}
            </p>
          </div>
        ) : paymentHistory.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
            <p className="font-semibold text-gray-800">
              No payments recorded
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Payment records for this membership will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
                  <th className="px-3 py-3 font-semibold">Date</th>
                  <th className="px-3 py-3 font-semibold">Amount</th>
                  <th className="px-3 py-3 font-semibold">Provider</th>
                  <th className="px-3 py-3 font-semibold">Reference</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {paymentHistory.map((payment) => (
                  <tr
                    key={payment.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <td className="px-3 py-4 text-gray-600">
                      {formatDate(payment.paid_at || payment.created_at)}
                    </td>
                    <td className="px-3 py-4 font-semibold text-gray-900">
                      {formatMoney(payment.amount, payment.currency)}
                    </td>
                    <td className="px-3 py-4 text-gray-700">
                      {payment.payment_provider}
                    </td>
                    <td className="max-w-[220px] break-all px-3 py-4 text-gray-600">
                      {payment.payment_reference || "Not provided"}
                    </td>
                    <td className="px-3 py-4">
                      <StatusBadge status={payment.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">
          Read-only administration
        </p>
        <p className="mt-1 text-sm text-amber-800">
          This page displays membership and payment information. It does not
          change membership status, renew subscriptions, cancel memberships,
          or modify payment records.
        </p>
      </div>
    </div>
  );
}

export default async function MembershipDetailsPage({
  params,
}: PageProps) {
  const { id } = await params;

  return (
    <Suspense fallback={<LoadingState />}>
      <MembershipDetails id={id} />
    </Suspense>
  );
}
