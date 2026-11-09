
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    result?: string;
    message?: string;
  }>;
};

type ProviderApplication = {
  id: string;
  user_id: string;
  expertise: string[];
  languages: string[];
  experience: string;
  introduction: string;
  status: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_notes: string | null;
};

type MemberProfile = {
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

function formatDate(value: string | null) {
  if (!value) return "Not available";

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

async function reviewProviderApplicationAction(formData: FormData) {
  "use server";

  const applicationId = String(formData.get("application_id") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("admin_notes") ?? "").trim();

  if (!applicationId) {
    redirect("/admin/providers?result=error&message=Missing%20application%20ID");
  }

  if (
    !["approved", "rejected", "changes_requested"].includes(decision)
  ) {
    redirect(
      `/admin/providers/${encodeURIComponent(applicationId)}?result=error&message=Invalid%20decision`,
    );
  }

  if (
    ["rejected", "changes_requested"].includes(decision) &&
    !notes
  ) {
    redirect(
      `/admin/providers/${encodeURIComponent(applicationId)}?result=error&message=Review%20notes%20are%20required`,
    );
  }

  const supabase = await createClient();

  const { error } = await supabase.rpc("review_provider_application", {
    p_application_id: applicationId,
    p_status: decision,
    p_admin_notes: notes || null,
  });

  if (error) {
    redirect(
      `/admin/providers/${encodeURIComponent(applicationId)}?result=error&message=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(
    `/admin/providers/${encodeURIComponent(applicationId)}?result=success&message=${encodeURIComponent(`Application ${decision.replaceAll("_", " ")} successfully`)}`,
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

function AdminLoading() {
  return (
    <div className="mx-auto max-w-5xl rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
      <div className="h-5 w-40 animate-pulse rounded bg-gray-100" />
      <div className="mt-5 h-8 w-64 animate-pulse rounded bg-gray-100" />
      <div className="mt-8 h-40 animate-pulse rounded-xl bg-gray-100" />
    </div>
  );
}

async function ProviderApplicationContent({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const query = await searchParams;

  const supabase = await createClient();

  const {
    data: applicationData,
    error: applicationError,
  } = await supabase
    .from("provider_applications")
    .select(
      "id,user_id,expertise,languages,experience,introduction,status,submitted_at,reviewed_at,reviewed_by,review_notes",
    )
    .eq("id", id)
    .maybeSingle();

  if (applicationError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h2 className="font-semibold">
          Could not load provider application
        </h2>
        <p className="mt-2 text-sm">{applicationError.message}</p>
        <Link
          href="/admin/providers"
          className="mt-4 inline-block text-sm font-semibold underline"
        >
          Return to applications
        </Link>
      </div>
    );
  }

  if (!applicationData) {
    notFound();
  }

  const application =
    applicationData as unknown as ProviderApplication;

  const {
    data: profileData,
    error: profileError,
  } = await supabase
    .from("profiles")
    .select(
      "user_id,display_name,username,country,bio,avatar_url",
    )
    .eq("user_id", application.user_id)
    .maybeSingle();

  if (profileError) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800">
        <h2 className="font-semibold">Could not load applicant profile</h2>
        <p className="mt-2 text-sm">{profileError.message}</p>
      </div>
    );
  }

  const profile = profileData as MemberProfile | null;

  const applicantName =
    profile?.display_name ||
    profile?.username ||
    "Unknown member";

  const isFinal =
    application.status === "approved" ||
    application.status === "rejected";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <Link
          href="/admin/providers"
          className="inline-flex items-center gap-2 text-sm font-medium text-green-800 hover:text-green-950"
        >
          <span aria-hidden="true">←</span>
          Back to provider applications
        </Link>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-800">
            Administration / Providers
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Application review
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Review the applicant's information before making a decision.
          </p>
        </div>

        <span
          className={`inline-flex w-fit rounded-full px-4 py-2 text-xs font-semibold ${statusClasses(application.status)}`}
        >
          {formatStatus(application.status)}
        </span>
      </div>

      {query.result === "success" && (
        <div
          role="status"
          className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
        >
          {query.message || "Application reviewed successfully."}
        </div>
      )}

      {query.result === "error" && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {query.message || "The review could not be completed."}
        </div>
      )}

      <DetailSection title="Applicant information">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatar_url}
              alt=""
              className="h-16 w-16 rounded-full border border-gray-200 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-2xl font-bold text-green-800">
              {applicantName.charAt(0).toUpperCase()}
            </div>
          )}

          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {applicantName}
            </h2>
            {profile?.username && (
              <p className="mt-1 text-sm text-gray-500">
                @{profile.username}
              </p>
            )}
            <p className="mt-1 text-sm text-gray-600">
              {profile?.country || "Country not provided"}
            </p>
          </div>
        </div>

        {profile?.bio && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Profile biography
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-gray-700">
              {profile.bio}
            </p>
          </div>
        )}

        <div className="mt-5 grid gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2">
          <div>
            <p className="text-xs text-gray-500">User ID</p>
            <p className="mt-1 break-all font-mono text-xs text-gray-700">
              {application.user_id}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Application ID</p>
            <p className="mt-1 break-all font-mono text-xs text-gray-700">
              {application.id}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Submitted</p>
            <p className="mt-1 text-sm text-gray-800">
              {formatDate(application.submitted_at)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Last reviewed</p>
            <p className="mt-1 text-sm text-gray-800">
              {formatDate(application.reviewed_at)}
            </p>
          </div>
        </div>
      </DetailSection>

      <DetailSection title="Areas of expertise">
        {application.expertise?.length ? (
          <div className="flex flex-wrap gap-2">
            {application.expertise.map((item) => (
              <span
                key={item}
                className="rounded-full border border-green-100 bg-green-50 px-3 py-2 text-xs font-medium text-green-800"
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No expertise provided.</p>
        )}
      </DetailSection>

      <DetailSection title="Languages">
        {application.languages?.length ? (
          <div className="flex flex-wrap gap-2">
            {application.languages.map((language) => (
              <span
                key={language}
                className="rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800"
              >
                {language}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No languages provided.</p>
        )}
      </DetailSection>

      <DetailSection title="Experience">
        <p className="whitespace-pre-wrap text-sm leading-8 text-gray-700">
          {application.experience || "No experience information provided."}
        </p>
      </DetailSection>

      <DetailSection title="Personal introduction">
        <p className="whitespace-pre-wrap text-sm leading-8 text-gray-700">
          {application.introduction || "No introduction provided."}
        </p>
      </DetailSection>

      {application.review_notes && (
        <DetailSection title="Previous review feedback">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="whitespace-pre-wrap text-sm leading-7 text-amber-900">
              {application.review_notes}
            </p>
          </div>
        </DetailSection>
      )}

      <DetailSection title="Review decision">
        {isFinal ? (
          <div className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <h3 className="font-semibold text-gray-800">
              This application has received a final decision.
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Current decision: {formatStatus(application.status)}.
              Final decisions cannot be changed through this page.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-5 text-sm leading-7 text-gray-600">
              Select an appropriate decision. Rejection and change requests
              require written feedback so the applicant understands the
              outcome.
            </p>

            <div className="grid gap-4 lg:grid-cols-3">
              <form action={reviewProviderApplicationAction}>
                <input
                  type="hidden"
                  name="application_id"
                  value={application.id}
                />
                <input
                  type="hidden"
                  name="decision"
                  value="approved"
                />

                <div className="flex h-full flex-col rounded-xl border border-green-200 bg-green-50 p-4">
                  <h3 className="font-bold text-green-900">
                    Approve application
                  </h3>
                  <p className="mt-2 flex-1 text-xs leading-6 text-green-800">
                    Confirm this person as an approved NiaWorld provider.
                  </p>
                  <button
                    type="submit"
                    className="mt-4 rounded-lg bg-green-800 px-4 py-3 text-sm font-semibold text-white hover:bg-green-900"
                  >
                    Approve provider
                  </button>
                </div>
              </form>

              <form action={reviewProviderApplicationAction}>
                <input
                  type="hidden"
                  name="application_id"
                  value={application.id}
                />
                <input
                  type="hidden"
                  name="decision"
                  value="changes_requested"
                />

                <div className="flex h-full flex-col rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <h3 className="font-bold text-amber-900">
                    Request changes
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-amber-800">
                    Ask the applicant to clarify or improve their application.
                  </p>
                  <label
                    htmlFor="changes-notes"
                    className="mb-2 mt-4 text-xs font-semibold text-amber-900"
                  >
                    Explain the requested changes *
                  </label>
                  <textarea
                    id="changes-notes"
                    name="admin_notes"
                    required
                    minLength={3}
                    maxLength={2000}
                    rows={4}
                    className="w-full rounded-lg border border-amber-200 bg-white p-3 text-xs text-gray-800 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100"
                    placeholder="Explain what needs to be updated..."
                  />
                  <button
                    type="submit"
                    className="mt-4 rounded-lg bg-amber-700 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-800"
                  >
                    Request changes
                  </button>
                </div>
              </form>

              <form action={reviewProviderApplicationAction}>
                <input
                  type="hidden"
                  name="application_id"
                  value={application.id}
                />
                <input
                  type="hidden"
                  name="decision"
                  value="rejected"
                />

                <div className="flex h-full flex-col rounded-xl border border-red-200 bg-red-50 p-4">
                  <h3 className="font-bold text-red-900">
                    Reject application
                  </h3>
                  <p className="mt-2 text-xs leading-6 text-red-800">
                    Decline the application with a clear explanation.
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
                    placeholder="Explain the decision..."
                  />
                  <button
                    type="submit"
                    className="mt-4 rounded-lg bg-red-700 px-4 py-3 text-sm font-semibold text-white hover:bg-red-800"
                  >
                    Reject application
                  </button>
                </div>
              </form>
            </div>

            <p className="mt-5 text-xs leading-6 text-gray-500">
              Approval permissions are enforced by the database function.
              Only authorized active super administrators can complete these
              decisions. Other administrator roles will receive an
              authorization error.
            </p>
          </>
        )}
      </DetailSection>
    </div>
  );
}

export default function ProviderApplicationDetailPage(props: PageProps) {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ProviderApplicationContent
        params={props.params}
        searchParams={props.searchParams}
      />
    </Suspense>
  );
}
