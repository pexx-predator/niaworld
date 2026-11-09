
"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ProviderProfile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  country: string | null;
  avatar_url: string | null;
  languages: string[] | null;
  interests: string[] | null;
  cultures_to_explore: string[] | null;
  connection_goals: string[] | null;
};

type ProviderService = {
  id: string;
  title: string;
  category: string | null;
  description: string | null;
  languages: string[] | null;
  duration_minutes: number;
  price: number;
  cover_image_url: string | null;
};

function ProviderProfileContent() {
  const params = useParams<{ id: string }>();
  const providerId = params.id;
  const supabase = createClient();

  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProvider() {
      if (!providerId) return;

      setLoading(true);
      setError("");

      const {
        data: { user },
      } = await supabase.auth.getUser();

      setCurrentUserId(user?.id ?? null);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select(
          "user_id, username, display_name, bio, country, avatar_url, languages, interests, cultures_to_explore, connection_goals"
        )
        .eq("user_id", providerId)
        .maybeSingle();

      if (profileError || !profileData) {
        setError("This provider profile could not be found.");
        setLoading(false);
        return;
      }

      setProfile(profileData as ProviderProfile);

      const { data: serviceData, error: serviceError } = await supabase
        .from("provider_listings")
        .select(
          "id, title, category, description, languages, duration_minutes, price, cover_image_url"
        )
        .eq("provider_id", providerId)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (serviceError) {
        setError(
          "The provider profile loaded, but services could not be retrieved."
        );
      } else {
        setServices((serviceData ?? []) as ProviderService[]);
      }

      setLoading(false);
    }

    loadProvider();
  }, [providerId]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center text-white">
        Loading provider profile...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-white">
        <h1 className="text-2xl font-semibold">Provider not found</h1>
        <p className="text-white/70">{error}</p>
        <Link href="/discover" className="text-green-300 hover:underline">
          Back to Discover
        </Link>
      </main>
    );
  }

  const displayName =
    profile.display_name || profile.username || "NiaWorld Provider";

  const isOwner = currentUserId === profile.user_id;

  return (
    <main
      className="min-h-screen bg-cover bg-center bg-fixed text-white"
      style={{
        backgroundImage: "url('/images/cultural-background.jpg')",
      }}
    >
      <div className="min-h-screen bg-black/60 px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <Link
            href="/discover"
            className="mb-8 inline-block text-sm text-green-300 hover:underline"
          >
            ← Back to Discover
          </Link>

          <section className="rounded-2xl border border-white/10 bg-black/50 p-6 md:p-10">
            <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:text-left">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={displayName}
                  className="h-28 w-28 rounded-full border-2 border-white/20 object-cover"
                />
              ) : (
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-green-900 text-4xl font-bold">
                  {displayName.charAt(0).toUpperCase()}
                </div>
              )}

              <div className="flex-1">
                <h1 className="text-3xl font-bold">{displayName}</h1>

                {profile.username && (
                  <p className="mt-1 text-white/60">@{profile.username}</p>
                )}

                {profile.country && (
                  <p className="mt-2 text-sm text-green-300">
                    {profile.country}
                  </p>
                )}
              </div>

              {isOwner && (
                <Link
                  href="/provider/services"
                  className="inline-flex items-center justify-center rounded-xl bg-green-600 px-5 py-3 text-sm font-semibold text-white shadow-lg transition hover:bg-green-500"
                >
                  + Publish a Service
                </Link>
              )}
            </div>

            {profile.bio && (
              <div className="mt-8">
                <h2 className="mb-2 text-lg font-semibold">About</h2>
                <p className="whitespace-pre-line leading-7 text-white/80">
                  {profile.bio}
                </p>
              </div>
            )}

            <div className="mt-8 grid gap-6 sm:grid-cols-2">
              {profile.languages?.length ? (
                <div>
                  <h2 className="mb-3 font-semibold">Languages</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.languages.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-white/10 px-3 py-1 text-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.interests?.length ? (
                <div>
                  <h2 className="mb-3 font-semibold">Interests</h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-white/10 px-3 py-1 text-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.cultures_to_explore?.length ? (
                <div>
                  <h2 className="mb-3 font-semibold">
                    Cultures to Explore
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.cultures_to_explore.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-white/10 px-3 py-1 text-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.connection_goals?.length ? (
                <div>
                  <h2 className="mb-3 font-semibold">
                    Connection Goals
                  </h2>
                  <div className="flex flex-wrap gap-2">
                    {profile.connection_goals.map((item) => (
                      <span
                        key={item}
                        className="rounded-full bg-white/10 px-3 py-1 text-sm"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </section>

          <section className="mt-10">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h2 className="text-2xl font-bold">Published Services</h2>

              {isOwner && (
                <Link
                  href="/provider/services"
                  className="text-sm font-medium text-green-300 hover:underline"
                >
                  Manage my services →
                </Link>
              )}
            </div>

            {services.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-black/40 p-8 text-center">
                <p className="text-white/70">
                  This provider has not published any services yet.
                </p>

                {isOwner && (
                  <Link
                    href="/provider/services"
                    className="mt-5 inline-flex rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-green-500"
                  >
                    Create your first service
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-6 sm:grid-cols-2">
                {services.map((service) => (
                  <article
                    key={service.id}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-black/60"
                  >
                    {service.cover_image_url && (
                      <img
                        src={service.cover_image_url}
                        alt={service.title}
                        className="h-48 w-full object-cover"
                      />
                    )}

                    <div className="p-5">
                      {service.category && (
                        <p className="mb-2 text-sm text-green-300">
                          {service.category}
                        </p>
                      )}

                      <h3 className="text-xl font-semibold">
                        {service.title}
                      </h3>

                      {service.description && (
                        <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/70">
                          {service.description}
                        </p>
                      )}

                      {service.languages?.length ? (
                        <p className="mt-3 text-sm text-white/60">
                          Languages: {service.languages.join(", ")}
                        </p>
                      ) : null}

                      <div className="mt-5 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">
                            ${Number(service.price).toFixed(2)} USD
                          </p>
                          <p className="text-xs text-white/60">
                            {service.duration_minutes} minutes
                          </p>
                        </div>

                        <Link
                          href={`/services/${service.id}`}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-500"
                        >
                          View Service
                        </Link>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {error && (
            <p className="mt-6 text-center text-sm text-amber-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}

export default function ProviderProfilePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center text-white">
          Loading provider profile...
        </main>
      }
    >
      <ProviderProfileContent />
    </Suspense>
  );
}
