
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  ArrowLeft,
  UserRound,
  Globe,
  Languages,
  Heart,
  CalendarDays,
  AtSign,
} from "lucide-react";

type MemberDetailsProps = {
  params: Promise<{ id: string }>;
};

function DetailsLoading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-8 w-48 rounded bg-white/20" />
      <div className="h-64 rounded-2xl bg-white/20" />
    </div>
  );
}

async function MemberDetails({ params }: MemberDetailsProps) {
  await connection();

  const { id } = await params;
  const supabase = await createClient();

  const { data: member, error } = await supabase
    .from("profiles")
    .select(
      "user_id, username, display_name, bio, country, languages, interests, avatar_url, created_at, updated_at"
    )
    .eq("user_id", id)
    .maybeSingle();

  if (error) {
    return (
      <div className="rounded-xl bg-red-50 p-5 text-red-800">
        <h1 className="font-bold">Unable to load member</h1>
        <p className="mt-2 text-sm">{error.message}</p>
      </div>
    );
  }

  if (!member) notFound();

  const languages = Array.isArray(member.languages)
    ? member.languages
    : [];

  const interests = Array.isArray(member.interests)
    ? member.interests
    : [];

  return (
    <div className="space-y-6">
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-2 text-sm font-medium text-white hover:text-green-200"
      >
        <ArrowLeft size={17} />
        Back to members
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">
          Member Profile
        </h1>
        <p className="mt-1 text-sm text-white/70">
          Review this member's registered profile information.
        </p>
      </div>

      <section className="rounded-2xl border border-white/15 bg-white/95 p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-800">
            <UserRound size={32} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {member.display_name || "Unnamed member"}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {member.username ? `@${member.username}` : "No username set"}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-white/15 bg-white/95 p-6">
        <h2 className="mb-5 text-lg font-bold text-gray-900">
          Personal Information
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Display name
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {member.display_name || "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Username
            </p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-900">
              <AtSign size={15} />
              {member.username || "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Country
            </p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-900">
              <Globe size={15} />
              {member.country || "Not provided"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Registered
            </p>
            <p className="mt-1 inline-flex items-center gap-2 text-sm text-gray-900">
              <CalendarDays size={15} />
              {member.created_at
                ? new Date(member.created_at).toLocaleString()
                : "Unknown"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              Last profile update
            </p>
            <p className="mt-1 text-sm text-gray-900">
              {member.updated_at
                ? new Date(member.updated_at).toLocaleString()
                : "Unknown"}
            </p>
          </div>

          <div>
            <p className="text-xs font-medium uppercase text-gray-500">
              User ID
            </p>
            <p className="mt-1 break-all font-mono text-xs text-gray-700">
              {member.user_id}
            </p>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-200 pt-5">
          <h3 className="font-semibold text-gray-900">Bio</h3>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-600">
            {member.bio || "This member has not added a bio."}
          </p>
        </div>
      </section>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-white/15 bg-white/95 p-6">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <Languages size={19} />
            Languages
          </h2>

          {languages.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {languages.map((language, index) => (
                <span
                  key={`${language}-${index}`}
                  className="rounded-full bg-green-50 px-3 py-2 text-sm text-green-800"
                >
                  {language}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              No languages provided.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-white/15 bg-white/95 p-6">
          <h2 className="flex items-center gap-2 font-bold text-gray-900">
            <Heart size={19} />
            Interests
          </h2>

          {interests.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {interests.map((interest, index) => (
                <span
                  key={`${interest}-${index}`}
                  className="rounded-full bg-amber-50 px-3 py-2 text-sm text-amber-800"
                >
                  {interest}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              No interests provided.
            </p>
          )}
        </section>
      </div>

      <div className="rounded-xl border border-white/15 bg-white/10 p-4 text-sm text-white/80">
        This profile is currently view-only. No member information has
        been changed.
      </div>
    </div>
  );
}

export default function AdminMemberDetailsPage(
  props: MemberDetailsProps
) {
  return (
    <Suspense fallback={<DetailsLoading />}>
      <MemberDetails params={props.params} />
    </Suspense>
  );
}
