
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type ContentType = "post" | "comment";
type ModerationStatus = "published" | "hidden";
type ContentTab = "posts" | "comments";

type ContentItem = {
  id: string;
  author_id: string;
  body: string;
  moderation_status: ModerationStatus;
  admin_notes: string | null;
  moderated_at: string | null;
  created_at: string;
  image_url?: string | null;
  post_id?: string;
};

type PageProps = {
  searchParams: Promise<{
    tab?: string;
    status?: string;
    search?: string;
    page?: string;
    updated?: string;
    error?: string;
  }>;
};

const PAGE_SIZE = 15;

function formatDate(value: string) {
  return new Date(value).toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function StatusBadge({ status }: { status: ModerationStatus }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        status === "published"
          ? "bg-green-100 text-green-800"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      {status === "published" ? "Published" : "Hidden"}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
      <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-green-700 border-t-transparent" />
      <p className="text-sm text-gray-500">Loading content...</p>
    </div>
  );
}

async function ContentPageContent({ searchParams }: PageProps) {
  await connection();

  const params = await searchParams;

  const tab: ContentTab =
    params.tab === "comments" ? "comments" : "posts";

  const status =
    params.status === "published" || params.status === "hidden"
      ? params.status
      : "all";

  const search = (params.search || "").trim().slice(0, 100);

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

  async function moderateContent(formData: FormData) {
    "use server";

    const contentId = String(formData.get("content_id") || "");
    const contentType = String(formData.get("content_type") || "");
    const nextStatus = String(formData.get("status") || "");
    const adminNotes = String(formData.get("admin_notes") || "").trim();

    const returnTab =
      formData.get("return_tab") === "comments" ? "comments" : "posts";

    const returnStatus = String(formData.get("return_status") || "all");
    const returnSearch = String(formData.get("return_search") || "").slice(0, 100);

    if (
      !contentId ||
      !["post", "comment"].includes(contentType) ||
      !["published", "hidden"].includes(nextStatus)
    ) {
      redirect("/admin/content?error=invalid");
    }

    if (adminNotes.length > 3000) {
      redirect("/admin/content?error=notes");
    }

    const client = await createClient();

    const {
      data: { user: admin },
    } = await client.auth.getUser();

    if (!admin) {
      redirect("/login");
    }

    const { error } = await client.rpc("moderate_content", {
      p_content_type: contentType,
      p_content_id: contentId,
      p_status: nextStatus,
      p_admin_notes: adminNotes || null,
    });

    if (error) {
      console.error("Content moderation failed:", error.message);

      redirect(
        `/admin/content?tab=${returnTab}&status=${returnStatus}&error=moderation`
      );
    }

    revalidatePath("/admin/content");

    const query = new URLSearchParams({
      tab: returnTab,
      status: returnStatus,
      updated: "1",
    });

    if (returnSearch) {
      query.set("search", returnSearch);
    }

    redirect(`/admin/content?${query.toString()}`);
  }

  const table = tab === "posts" ? "posts" : "comments";

  // Overall counts for both content types.
  const [
    postsTotalResult,
    postsPublishedResult,
    postsHiddenResult,
    commentsTotalResult,
    commentsPublishedResult,
    commentsHiddenResult,
  ] = await Promise.all([
    supabase.from("posts").select("id", { count: "exact", head: true }),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "published"),
    supabase
      .from("posts")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "hidden"),
    supabase.from("comments").select("id", { count: "exact", head: true }),
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "published"),
    supabase
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("moderation_status", "hidden"),
  ]);

  const countErrors = [
    postsTotalResult.error,
    postsPublishedResult.error,
    postsHiddenResult.error,
    commentsTotalResult.error,
    commentsPublishedResult.error,
    commentsHiddenResult.error,
  ].filter(Boolean);

  const counts = {
    posts: postsTotalResult.count || 0,
    postsPublished: postsPublishedResult.count || 0,
    postsHidden: postsHiddenResult.count || 0,
    comments: commentsTotalResult.count || 0,
    commentsPublished: commentsPublishedResult.count || 0,
    commentsHidden: commentsHiddenResult.count || 0,
  };

  let query =
    tab === "posts"
      ? supabase
          .from("posts")
          .select(
            "id, author_id, body, image_url, moderation_status, admin_notes, moderated_at, created_at",
            { count: "exact" }
          )
          .order("created_at", { ascending: false })
      : supabase
          .from("comments")
          .select(
            "id, post_id, author_id, body, moderation_status, admin_notes, moderated_at, created_at",
            { count: "exact" }
          )
          .order("created_at", { ascending: false });

  if (status !== "all") {
    query = query.eq("moderation_status", status);
  }

  if (search) {
    query = query.ilike("body", `%${search}%`);
  }

  const from = (currentPage - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const {
    data,
    count,
    error: contentError,
  } = await query.range(from, to);

  const items = (data || []) as ContentItem[];
  const totalItems = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

  // Load parent post information for the displayed comments.
  const parentPostIds =
    tab === "comments"
      ? Array.from(
          new Set(
            items
              .map((item) => item.post_id)
              .filter((id): id is string => Boolean(id))
          )
        )
      : [];

  let parentPosts: { id: string; body: string }[] = [];

  if (parentPostIds.length > 0) {
    const { data: parentData } = await supabase
      .from("posts")
      .select("id, body")
      .in("id", parentPostIds);

    parentPosts = parentData || [];
  }

  const parentPostMap = new Map(
    parentPosts.map((post) => [post.id, post.body])
  );

  // Profile names are best-effort. Content moderation remains available
  // even if the current profile RLS policies do not allow this lookup.
  const authorIds = Array.from(
    new Set(items.map((item) => item.author_id))
  );

  let profiles: {
    user_id: string;
    display_name: string | null;
    username: string | null;
  }[] = [];

  if (authorIds.length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, display_name, username")
      .in("user_id", authorIds);

    if (!profileError && profileData) {
      profiles = profileData;
    }
  }

  const profileMap = new Map(
    profiles.map((profile) => [profile.user_id, profile])
  );

  const getAuthorName = (authorId: string) => {
    const profile = profileMap.get(authorId);

    return (
      profile?.display_name ||
      (profile?.username ? `@${profile.username}` : null) ||
      "User details unavailable"
    );
  };

  const pageUrl = (page: number) => {
    const queryParams = new URLSearchParams({
      tab,
      status,
      page: String(page),
    });

    if (search) queryParams.set("search", search);

    return `/admin/content?${queryParams.toString()}`;
  };

  const baseFilterUrl = (nextStatus: string) => {
    const queryParams = new URLSearchParams({
      tab,
      status: nextStatus,
    });

    if (search) queryParams.set("search", search);

    return `/admin/content?${queryParams.toString()}`;
  };

  const activeCounts =
    tab === "posts"
      ? {
          all: counts.posts,
          published: counts.postsPublished,
          hidden: counts.postsHidden,
        }
      : {
          all: counts.comments,
          published: counts.commentsPublished,
          hidden: counts.commentsHidden,
        };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-700">
            NiaWorld administration
          </p>
          <h1 className="mt-1 text-2xl font-bold text-gray-900">
            Content Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Review community posts and comments and manage their visibility.
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
          Content moderation was saved successfully.
        </div>
      )}

      {params.error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {params.error === "invalid"
            ? "The moderation request was invalid."
            : params.error === "notes"
              ? "Admin notes cannot exceed 3,000 characters."
              : "The moderation action failed. Check your admin permissions and try again."}
        </div>
      )}

      {countErrors.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Some content totals could not be loaded. Check your Content admin
          permissions and table access.
        </div>
      )}

      {/* Overview */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Community posts</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {counts.posts.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Published posts</p>
          <p className="mt-2 text-2xl font-bold text-green-700">
            {counts.postsPublished.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Comments</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">
            {counts.comments.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500">Hidden content</p>
          <p className="mt-2 text-2xl font-bold text-gray-700">
            {(counts.postsHidden + counts.commentsHidden).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Content type tabs */}
      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/content?tab=posts"
          className={`rounded-xl px-5 py-3 text-sm font-semibold ${
            tab === "posts"
              ? "bg-green-700 text-white"
              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Community posts
        </Link>

        <Link
          href="/admin/content?tab=comments"
          className={`rounded-xl px-5 py-3 text-sm font-semibold ${
            tab === "comments"
              ? "bg-green-700 text-white"
              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
          }`}
        >
          Comments
        </Link>
      </div>

      {/* Status filters */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: "all", label: "All content" },
          { value: "published", label: "Published" },
          { value: "hidden", label: "Hidden" },
        ].map((item) => (
          <Link
            key={item.value}
            href={baseFilterUrl(item.value)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              status === item.value
                ? "bg-gray-900 text-white"
                : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            {item.label} ({activeCounts[item.value as keyof typeof activeCounts]})
          </Link>
        ))}
      </div>

      {/* Search */}
      <form
        action="/admin/content"
        method="get"
        className="flex flex-col gap-2 sm:flex-row"
      >
        <input type="hidden" name="tab" value={tab} />
        <input type="hidden" name="status" value={status} />

        <input
          type="search"
          name="search"
          defaultValue={search}
          maxLength={100}
          placeholder={`Search ${tab} by content...`}
          className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100"
        />

        <button
          type="submit"
          className="rounded-xl bg-green-700 px-6 py-3 text-sm font-semibold text-white hover:bg-green-800"
        >
          Search
        </button>

        {search && (
          <Link
            href={baseFilterUrl(status)}
            className="rounded-xl border border-gray-200 bg-white px-5 py-3 text-center text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            Clear
          </Link>
        )}
      </form>

      {/* Content list */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            {tab === "posts" ? "Community posts" : "Community comments"}
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            {totalItems.toLocaleString()} matching records
          </p>
        </div>

        {contentError && (
          <div className="p-6 text-sm text-red-700">
            Unable to load content. Check the Content admin permissions and
            database policies.
          </div>
        )}

        {!contentError && items.length === 0 && (
          <div className="px-6 py-16 text-center">
            <h3 className="font-semibold text-gray-900">
              No content found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              There are no records matching the selected filters.
            </p>
          </div>
        )}

        <div className="divide-y divide-gray-100">
          {items.map((item) => {
            const contentType: ContentType =
              tab === "posts" ? "post" : "comment";

            return (
              <article key={item.id} className="space-y-4 p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3">
                      <StatusBadge status={item.moderation_status} />
                      <span className="text-xs text-gray-400">
                        {formatDate(item.created_at)}
                      </span>
                    </div>

                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-gray-800">
                      {item.body}
                    </p>

                    {item.image_url && (
                      <div className="mt-3">
                        <a
                          href={item.image_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-medium text-green-700 underline underline-offset-2"
                        >
                          Open attached image
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-4">
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Author
                  </p>
                  <p className="mt-1 text-sm font-semibold text-gray-800">
                    {getAuthorName(item.author_id)}
                  </p>
                  <p className="mt-1 break-all text-xs text-gray-400">
                    {item.author_id}
                  </p>

                  {tab === "comments" && item.post_id && (
                    <div className="mt-4 border-t border-gray-200 pt-3">
                      <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                        Original post
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-600">
                        {parentPostMap.get(item.post_id) ||
                          "Original post is unavailable."}
                      </p>
                      <p className="mt-1 break-all text-xs text-gray-400">
                        Post ID: {item.post_id}
                      </p>
                    </div>
                  )}

                  <p className="mt-3 break-all text-xs text-gray-400">
                    Content ID: {item.id}
                  </p>
                </div>

                <form action={moderateContent} className="space-y-3">
                  <input
                    type="hidden"
                    name="content_id"
                    value={item.id}
                  />
                  <input
                    type="hidden"
                    name="content_type"
                    value={contentType}
                  />
                  <input
                    type="hidden"
                    name="return_tab"
                    value={tab}
                  />
                  <input
                    type="hidden"
                    name="return_status"
                    value={status}
                  />
                  <input
                    type="hidden"
                    name="return_search"
                    value={search}
                  />

                  <div>
                    <label
                      htmlFor={`notes-${item.id}`}
                      className="mb-1 block text-xs font-semibold text-gray-600"
                    >
                      Internal moderation notes
                    </label>
                    <textarea
                      id={`notes-${item.id}`}
                      name="admin_notes"
                      defaultValue={item.admin_notes || ""}
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
                      disabled={item.moderation_status === "published"}
                      className="rounded-lg bg-green-700 px-4 py-2 text-xs font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Publish
                    </button>

                    <button
                      type="submit"
                      name="status"
                      value="hidden"
                      disabled={item.moderation_status === "hidden"}
                      className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Hide content
                    </button>
                  </div>
                </form>
              </article>
            );
          })}
        </div>

        {totalItems > 0 && (
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

export default function AdminContentPage(props: PageProps) {
  return (
    <Suspense fallback={<LoadingState />}>
      <ContentPageContent searchParams={props.searchParams} />
    </Suspense>
  );
}
