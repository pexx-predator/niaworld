
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  Users,
  UserRound,
  Globe,
  CalendarDays,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

type UsersPageProps = {
  searchParams: Promise<{
    q?: string;
    page?: string;
  }>;
};

function UsersLoading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-56 animate-pulse rounded bg-white/20" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 animate-pulse rounded-2xl bg-white/20" />
        <div className="h-28 animate-pulse rounded-2xl bg-white/20" />
      </div>
      <div className="h-96 animate-pulse rounded-2xl bg-white/20" />
    </div>
  );
}

async function UsersContent({ searchParams }: UsersPageProps) {
  await connection();

  const params = await searchParams;

  const searchTerm = (params.q ?? "")
    .replace(/[^\p{L}\p{N}\s@._-]/gu, "")
    .trim()
    .slice(0, 80);

  const requestedPage = Math.max(
    1,
    Number.parseInt(params.page ?? "1", 10) || 1
  );

  const pageSize = 20;

  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select(
      "user_id, username, display_name, country, created_at",
      { count: "exact" }
    );

  if (searchTerm) {
    const term = `%${searchTerm}%`;

    query = query.or(
      `display_name.ilike.${term},username.ilike.${term},country.ilike.${term}`
    );
  }

  const totalCountResult = await query;

  if (totalCountResult.error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h1 className="font-bold text-red-800">
          Unable to load members
        </h1>
        <p className="mt-2 text-sm text-red-700">
          {totalCountResult.error.message}
        </p>
      </div>
    );
  }

  const totalMembers = totalCountResult.count ?? 0;
  const totalPages = Math.max(
    1,
    Math.ceil(totalMembers / pageSize)
  );

  const currentPage = Math.min(requestedPage, totalPages);
  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  let membersQuery = supabase
    .from("profiles")
    .select(
      "user_id, username, display_name, country, created_at"
    )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (searchTerm) {
    const term = `%${searchTerm}%`;

    membersQuery = membersQuery.or(
      `display_name.ilike.${term},username.ilike.${term},country.ilike.${term}`
    );
  }

  const { data: profiles, error } = await membersQuery;

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5">
        <h1 className="font-bold text-red-800">
          Unable to load members
        </h1>
        <p className="mt-2 text-sm text-red-700">
          {error.message}
        </p>
      </div>
    );
  }

  const countries = new Set(
    (profiles ?? [])
      .map((profile) => profile.country)
      .filter((country) => country?.trim())
  ).size;

  const pageUrl = (page: number) => {
    const url = new URLSearchParams();

    if (searchTerm) {
      url.set("q", searchTerm);
    }

    url.set("page", String(page));

    return `/admin/users?${url.toString()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">
          User Management
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Search, browse, and review registered NiaWorld members.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-white/15 bg-white/90 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">
              Matching Members
            </p>
            <Users className="text-green-700" size={22} />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {totalMembers.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-white/15 bg-white/90 p-5">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-600">
              Countries on This Page
            </p>
            <Globe className="text-green-700" size={22} />
          </div>
          <p className="mt-3 text-3xl font-bold text-gray-900">
            {countries.toLocaleString()}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-white/15 bg-white/95">
        <div className="space-y-4 border-b border-gray-200 p-5">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Registered Members
            </h2>
            <p className="text-sm text-gray-500">
              Search by member name, username, or country.
            </p>
          </div>

          <form
            action="/admin/users"
            method="GET"
            className="flex flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              />
              <input
                type="search"
                name="q"
                defaultValue={searchTerm}
                placeholder="Search members..."
                maxLength={80}
                className="w-full rounded-xl border border-gray-300 bg-white py-3 pl-10 pr-4 text-sm text-gray-900 outline-none transition focus:border-green-600 focus:ring-2 focus:ring-green-100"
              />
            </div>

            <button
              type="submit"
              className="rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-green-800"
            >
              Search
            </button>

            {searchTerm && (
              <Link
                href="/admin/users"
                className="rounded-xl border border-gray-300 px-5 py-3 text-center text-sm font-semibold text-gray-700 transition hover:bg-gray-100"
              >
                Clear
              </Link>
            )}
          </form>

          <p className="text-xs text-gray-500">
            {searchTerm
              ? `Results for "${searchTerm}"`
              : "Showing all registered members"}
          </p>
        </div>

        {!profiles?.length ? (
          <div className="p-10 text-center">
            <UserRound
              className="mx-auto text-gray-400"
              size={36}
            />
            <p className="mt-3 font-medium text-gray-700">
              No members found
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Try another search term.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-left text-sm">
                <thead className="bg-gray-100 text-gray-600">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Member
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Username
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Country
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Joined
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      User ID
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {profiles.map((profile) => (
                    <tr
                      key={profile.user_id}
                      className="transition hover:bg-gray-50"
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">
                        {profile.display_name || "Unnamed member"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {profile.username
                          ? `@${profile.username}`
                          : "Not set"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        {profile.country || "Not provided"}
                      </td>

                      <td className="px-5 py-4 text-gray-600">
                        <span className="inline-flex items-center gap-2">
                          <CalendarDays size={15} />
                          {profile.created_at
                            ? new Date(
                                profile.created_at
                              ).toLocaleDateString()
                            : "Unknown"}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-mono text-xs text-gray-500">
                        {profile.user_id.slice(0, 8)}...
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-gray-500">
                Showing {from + 1}–{Math.min(from + pageSize, totalMembers)} of{" "}
                {totalMembers.toLocaleString()} members
              </p>

              <div className="flex items-center gap-2">
                <Link
                  href={pageUrl(Math.max(1, currentPage - 1))}
                  aria-disabled={currentPage === 1}
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                    currentPage === 1
                      ? "pointer-events-none border-gray-200 text-gray-300"
                      : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  <ChevronLeft size={16} />
                  Previous
                </Link>

                <span className="px-2 text-sm text-gray-600">
                  Page {currentPage} of {totalPages}
                </span>

                <Link
                  href={pageUrl(Math.min(totalPages, currentPage + 1))}
                  aria-disabled={currentPage === totalPages}
                  className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                    currentPage === totalPages
                      ? "pointer-events-none border-gray-200 text-gray-300"
                      : "border-gray-300 text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  Next
                  <ChevronRight size={16} />
                </Link>
              </div>
            </div>
          </>
        )}

        <div className="border-t border-gray-200 px-5 py-4 text-xs text-gray-500">
          Member records are currently read-only. Account actions will
          require secure server-side authorization and audit logging.
        </div>
      </section>
    </div>
  );
}

export default function AdminUsersPage(props: UsersPageProps) {
  return (
    <Suspense fallback={<UsersLoading />}>
      <UsersContent searchParams={props.searchParams} />
    </Suspense>
  );
}
