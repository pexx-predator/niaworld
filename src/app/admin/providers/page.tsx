
import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type ProviderApplication = {
  id: string;
  user_id: string;
  expertise: string[];
  languages: string[];
  experience: string;
  introduction: string;
  status: string;
  submitted_at: string;
};

type MemberProfile = {
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

const statuses = [
  "all",
  "pending",
  "under_review",
  "approved",
  "rejected",
  "changes_requested",
];

function formatStatus(status: string) {
  return status
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function statusClasses(status: string) {
  switch (status) {
    case "approved":
      return "bg-green-100 text-green-800";
    case "rejected":
      return "bg-red-100 text-red-800";
    case "under_review":
      return "bg-blue-100 text-blue-800";
    case "changes_requested":
      return "bg-amber-100 text-amber-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function ProvidersLoading() {
  return (
    <div className="rounded-2xl border border-white/30 bg-white/80 p-8 text-center shadow-sm">
      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
      <p className="mt-3 text-sm text-gray-600">
        Loading provider applications...
      </p>
    </div>
  );
}

async function ProvidersContent({ searchParams }: PageProps) {
  await connection();

  const params = await searchParams;

  const selectedStatus = statuses.includes(params.status ?? "all")
    ? params.status ?? "all"
    : "all";

  const requestedPage = Number(params.page ?? "1");

  const currentPage =
    Number.isInteger(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;

  const supabase = await createClient();

  let countQuery = supabase
    .from("provider_applications")
    .select("id", { count: "exact", head: true });

  let applicationsQuery = supabase
    .from("provider_applications")
    .select(
      "id,user_id,expertise,languages,experience,introduction,status,submitted_at",
    )
    .order("submitted_at", { ascending: false });

  if (selectedStatus !== "all") {
    countQuery = countQuery.eq("status", selectedStatus);
    applicationsQuery = applicationsQuery.eq("status", selectedStatus);
  }

  const { count, error: countError } = await countQuery;

  if (countError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h2 className="font-semibold">
          Could not load provider applications
        </h2>
        <p className="mt-2 text-sm">{countError.message}</p>
      </div>
    );
  }

  const totalApplications = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalApplications / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);

  const from = (safePage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const {
    data: applicationData,
    error: applicationsError,
  } = await applicationsQuery.range(from, to);

  if (applicationsError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h2 className="font-semibold">
          Could not load provider applications
        </h2>
        <p className="mt-2 text-sm">{applicationsError.message}</p>
      </div>
    );
  }

  const applications = (
    applicationData ?? []
  ) as unknown as ProviderApplication[];

  let profiles: MemberProfile[] = [];

  if (applications.length > 0) {
    const userIds = applications.map(
      (application) => application.user_id,
    );

    const { data: profileData, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id,display_name,username,country")
      .in("user_id", userIds);

    if (profilesError) {
      return (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
          <h2 className="font-semibold">
            Could not load applicant profiles
          </h2>
          <p className="mt-2 text-sm">{profilesError.message}</p>
        </div>
      );
    }

    profiles = (profileData ?? []) as unknown as MemberProfile[];
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile]),
  );

  function pageUrl(page: number) {
    const query = new URLSearchParams();

    if (selectedStatus !== "all") {
      query.set("status", selectedStatus);
    }

    query.set("page", String(page));

    return `/admin/providers?${query.toString()}`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-800">
            Administration
          </p>

          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Provider Applications
          </h1>

          <p className="mt-1 text-sm text-gray-600">
            Review people who have applied to become NiaWorld providers.
          </p>
        </div>

        <div className="rounded-xl border border-white/50 bg-white/80 px-5 py-3 shadow-sm">
          <p className="text-xs text-gray-500">
            Applications shown
          </p>

          <p className="text-2xl font-bold text-gray-900">
            {totalApplications.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((status) => {
          const active = selectedStatus === status;

          return (
            <Link
              key={status}
              href={`/admin/providers?status=${status}&page=1`}
              className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? "bg-green-800 text-white"
                  : "border border-gray-200 bg-white/80 text-gray-700 hover:bg-green-50"
              }`}
            >
              {status === "all"
                ? "All applications"
                : formatStatus(status)}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/50 bg-white/90 shadow-sm">
        {applications.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <h2 className="text-lg font-semibold text-gray-800">
              No applications found
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              There are currently no applications in this category.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="px-5 py-4 font-semibold">
                      Applicant
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Country
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Expertise
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Languages
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Submitted
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Status
                    </th>
                    <th className="px-5 py-4 font-semibold">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {applications.map((application) => {
                    const profile = profileMap.get(
                      application.user_id,
                    );

                    const applicantName =
                      profile?.display_name ||
                      profile?.username ||
                      "Unknown member";

                    return (
                      <tr
                        key={application.id}
                        className="align-top transition hover:bg-green-50/40"
                      >
                        <td className="px-5 py-4">
                          <p className="font-semibold text-gray-900">
                            {applicantName}
                          </p>

                          {profile?.username && (
                            <p className="mt-1 text-xs text-gray-500">
                              @{profile.username}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4 text-gray-700">
                          {profile?.country || "Not provided"}
                        </td>

                        <td className="max-w-52 px-5 py-4 text-gray-700">
                          {application.expertise?.length
                            ? application.expertise.join(", ")
                            : "Not provided"}
                        </td>

                        <td className="max-w-44 px-5 py-4 text-gray-700">
                          {application.languages?.length
                            ? application.languages.join(", ")
                            : "Not provided"}
                        </td>

                        <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                          {formatDate(application.submitted_at)}
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusClasses(
                              application.status,
                            )}`}
                          >
                            {formatStatus(application.status)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <Link
                            href={`/admin/providers/${application.id}`}
                            className="inline-flex whitespace-nowrap rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-semibold text-green-800 transition hover:border-green-700 hover:bg-green-800 hover:text-white"
                          >
                            Review application →
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
                {Math.min(
                  from + applications.length,
                  totalApplications,
                )}{" "}
                of {totalApplications} applications
              </p>

              <div className="flex items-center gap-2">
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
                  href={pageUrl(
                    Math.min(totalPages, safePage + 1),
                  )}
                  aria-disabled={safePage >= totalPages}
                  className={`rounded-lg border px-3 py-2 text-sm ${
                    safePage >= totalPages
                      ? "pointer-events-none border-gray-100 text-gray-300"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Next
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminProvidersPage(props: PageProps) {
  return (
    <Suspense fallback={<ProvidersLoading />}>
      <ProvidersContent {...props} />
    </Suspense>
  );
}
