
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type AuditLog = {
  id: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type AdminProfile = {
  user_id: string;
  display_name: string | null;
  username: string | null;
};

type PageProps = {
  searchParams: Promise<{
    search?: string;
    action?: string;
    target?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 20;

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatLabel(value: string | null | undefined) {
  if (!value) return "Unknown";

  return value
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDetails(details: Record<string, unknown> | null) {
  if (!details || Object.keys(details).length === 0) {
    return "No additional details recorded.";
  }

  return JSON.stringify(details, null, 2);
}

function LoadingState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
      <p className="text-sm text-gray-500">Loading audit logs...</p>
    </div>
  );
}

async function AuditLogsContent({ searchParams }: PageProps) {
  await connection();

  const params = await searchParams;

  const search = (params.search || "").trim().slice(0, 100);
  const actionFilter = (params.action || "").trim().slice(0, 100);
  const targetFilter = (params.target || "").trim().slice(0, 100);

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

  // Overall audit log statistics.
  const yesterday = new Date(
    Date.now() - 24 * 60 * 60 * 1000
  ).toISOString();

  const [totalResult, recentResult, actionResult] = await Promise.all([
    supabase
      .from("admin_audit_logs")
      .select("id", { count: "exact", head: true }),

    supabase
      .from("admin_audit_logs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", yesterday),

    supabase
      .from("admin_audit_logs")
      .select("action"),
  ]);

  const statistics = {
    total: totalResult.count || 0,
    recent: recentResult.count || 0,
    actions: new Set(
      (actionResult.data || []).map((item) => item.action)
    ).size,
  };

  // Paginated audit log query.
  let query = supabase
    .from("admin_audit_logs")
    .select(
      "id, actor_id, action, target_type, target_id, details, created_at",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (actionFilter) {
    query = query.ilike("action", `%${actionFilter}%`);
  }

  if (targetFilter) {
    query = query.ilike("target_type", `%${targetFilter}%`);
  }

  if (search) {
    const safeSearch = search.replace(/[,%()"]/g, " ").trim();

    if (safeSearch) {
      query = query.or(
        `action.ilike.%${safeSearch}%,target_type.ilike.%${safeSearch}%,target_id.ilike.%${safeSearch}%,actor_id.ilike.%${safeSearch}%`
      );
    }
  }

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const {
    data,
    count,
    error,
  } = await query.range(from, to);

  const logs = (data || []) as AuditLog[];
  const totalLogs = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalLogs / PAGE_SIZE));

  // Resolve administrator names where profile access permits.
  const actorIds = Array.from(
    new Set(logs.map((log) => log.actor_id))
  );

  let profiles: AdminProfile[] = [];

  if (actorIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .in("user_id", actorIds);

    if (!profileError && profileData) {
      profiles = profileData as AdminProfile[];
    }
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  const getActorName = (actorId: string) => {
    const profile = profileMap.get(actorId);

    return (
      profile?.display_name ||
      (profile?.username ? `@${profile.username}` : null) ||
      "Administrator details unavailable"
    );
  };

  const buildUrl = (page: number) => {
    const queryParams = new URLSearchParams();

    if (search) queryParams.set("search", search);
    if (actionFilter) queryParams.set("action", actionFilter);
    if (targetFilter) queryParams.set("target", targetFilter);

    queryParams.set("page", String(page));

    return `/admin/audit-logs?${queryParams.toString()}`;
  };

  const clearUrl = "/admin/audit-logs";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-700">
            NiaWorld administration
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Audit Logs
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review administrative actions and maintain accountability across
            the platform.
          </p>
        </div>

        <Link
          href="/admin"
          className="inline-flex w-fit items-center rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to overview
        </Link>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Total recorded actions</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {statistics.total.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Actions in last 24 hours</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {statistics.recent.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">Distinct action types</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {statistics.actions.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search and filters */}
      <form
        action="/admin/audit-logs"
        method="get"
        className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm"
      >
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label
              htmlFor="audit-search"
              className="mb-1 block text-xs font-semibold text-gray-600"
            >
              Search records
            </label>
            <input
              id="audit-search"
              name="search"
              type="search"
              defaultValue={search}
              maxLength={100}
              placeholder="Action, target ID or admin ID..."
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label
              htmlFor="audit-action"
              className="mb-1 block text-xs font-semibold text-gray-600"
            >
              Action type
            </label>
            <input
              id="audit-action"
              name="action"
              defaultValue={actionFilter}
              maxLength={100}
              placeholder="e.g. content_moderated"
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label
              htmlFor="audit-target"
              className="mb-1 block text-xs font-semibold text-gray-600"
            >
              Target type
            </label>
            <input
              id="audit-target"
              name="target"
              defaultValue={targetFilter}
              maxLength={100}
              placeholder="e.g. provider_review"
              className="w-full rounded-xl border border-gray-200 px-3 py-3 text-sm outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            className="rounded-xl bg-green-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-800"
          >
            Apply filters
          </button>

          <Link
            href={clearUrl}
            className="rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Clear filters
          </Link>
        </div>
      </form>

      {/* Audit records */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            Administrative activity
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {totalLogs.toLocaleString()} matching records, newest first.
          </p>
        </div>

        {error && (
          <div className="p-6 text-sm text-red-700">
            Unable to load audit logs. Check that your account has the
            audit_logs.view permission and the audit log SELECT policy is
            active.
          </div>
        )}

        {!error && logs.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <span className="text-xl">↗</span>
            </div>
            <h3 className="font-semibold text-gray-900">
              No audit records found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Administrative activity will appear here when recorded.
            </p>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {logs.map((log) => (
            <details key={log.id} className="group p-5">
              <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-green-50 px-3 py-1 text-xs font-semibold text-green-800">
                      {formatLabel(log.action)}
                    </span>

                    <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
                      {formatLabel(log.target_type)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-semibold text-gray-800">
                    {getActorName(log.actor_id)}
                  </p>

                  <p className="mt-1 break-all text-xs text-gray-400">
                    Administrator ID: {log.actor_id}
                  </p>
                </div>

                <div className="flex shrink-0 items-center justify-between gap-4 sm:justify-end">
                  <span className="text-xs text-gray-500">
                    {formatDate(log.created_at)}
                  </span>

                  <span className="text-sm font-semibold text-green-700 group-open:rotate-180">
                    ▼
                  </span>
                </div>
              </summary>

              <div className="mt-4 space-y-4 rounded-xl bg-gray-50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Action
                  </p>
                  <p className="mt-1 break-words text-sm text-gray-800">
                    {log.action}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Target type
                  </p>
                  <p className="mt-1 text-sm text-gray-800">
                    {log.target_type || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Target ID
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-gray-700">
                    {log.target_id || "Not specified"}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Record ID
                  </p>
                  <p className="mt-1 break-all font-mono text-xs text-gray-700">
                    {log.id}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    Additional details
                  </p>
                  <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-gray-200 bg-white p-3 text-xs leading-5 text-gray-700">
                    {formatDetails(log.details)}
                  </pre>
                </div>
              </div>
            </details>
          ))}
        </div>

        {/* Pagination */}
        {totalLogs > 0 && (
          <div className="flex flex-col gap-3 border-t border-gray-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-500">
              Page {currentPage} of {totalPages}
            </p>

            <div className="flex gap-2">
              {currentPage > 1 ? (
                <Link
                  href={buildUrl(currentPage - 1)}
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
                  href={buildUrl(currentPage + 1)}
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

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-amber-900">
          Audit integrity
        </p>
        <p className="mt-1 text-sm leading-6 text-amber-800">
          Audit records are displayed as read-only information. This page
          does not provide editing or deletion controls.
        </p>
      </div>
    </div>
  );
}

export default function AdminAuditLogsPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <AuditLogsContent searchParams={props.searchParams} />
    </Suspense>
  );
}
