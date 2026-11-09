
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Provider = {
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

type Service = {
  id: string;
  title: string;
  category: string;
  description: string | null;
  languages: string[] | null;
  duration_minutes: number;
  price: number;
  cover_image_url: string | null;
};

export default function ProviderProfilePage() {
  const { id } = useParams<{ id: string }>();
  const supabase = useMemo(() => createClient(), []);

  const [provider, setProvider] = useState<Provider | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError("");

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select(
          "user_id, username, display_name, bio, country, avatar_url, languages, interests, cultures_to_explore, connection_goals"
        )
        .eq("user_id", id)
        .maybeSingle();

      if (!active) return;

      if (profileError || !profile) {
        console.error(profileError);
        setError("This provider profile could not be found.");
        setLoading(false);
        return;
      }

      const { data: listings, error: listingsError } = await supabase
        .from("provider_listings")
        .select(
          "id, title, category, description, languages, duration_minutes, price, cover_image_url"
        )
        .eq("provider_id", id)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (!active) return;

      if (listingsError) {
        console.error(listingsError);
        setError("We couldn't load this provider's services.");
        setLoading(false);
        return;
      }

      setProvider(profile as Provider);
      setServices((listings ?? []) as Service[]);
      setLoading(false);
    }

    if (id) void loadProfile();

    return () => {
      active = false;
    };
  }, [id, supabase]);

  return (
    <main className="relative min-h-screen bg-[#FAF7F0] text-[#244638]">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/cultural-background.jpg')" }}
      />
      <div className="fixed inset-0 bg-[#FAF7F0]/30" />

      <div className="relative z-10">
        <header className="sticky top-0 border-b border-[#E7E0D3] bg-[#FFFDF8]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
            <Link href="/" className="text-2xl font-bold">
              NiaWorld<span className="text-[#C76D4D]">.</span>
            </Link>
            <Link
              href="/discover"
              className="rounded-full border border-[#D9DFD4] px-5 py-2.5 text-sm font-semibold hover:bg-[#F0F2E9]"
            >
              Back to Discover
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8">
          {loading ? (
            <div className="rounded-3xl bg-[#FFFDF8]/95 p-16 text-center">
              <p className="text-[#68766A]">Loading provider profile...</p>
            </div>
          ) : error || !provider ? (
            <div className="rounded-3xl bg-[#FFFDF8]/95 p-12 text-center">
              <h1 className="text-2xl font-bold">Profile unavailable</h1>
              <p className="mt-3 text-sm text-[#68766A]">
                {error || "This profile is unavailable."}
              </p>
              <Link
                href="/services"
                className="mt-6 inline-block rounded-full bg-[#244638] px-6 py-3 text-sm font-semibold text-white"
              >
                Explore services
              </Link>
            </div>
          ) : (
            <>
              <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-[#FFFDF8]/95 shadow-sm">
                <div className="h-36 bg-gradient-to-r from-[#244638] via-[#66816A] to-[#B76648]" />

                <div className="px-6 pb-8 sm:px-10">
                  <div className="-mt-14 flex flex-col gap-5 sm:flex-row sm:items-end">
                    <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-[#FFFDF8] bg-[#EEF1E8] text-4xl font-bold text-[#66816A]">
                      {provider.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={provider.avatar_url}
                          alt="Provider profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        (provider.display_name || provider.username || "N")
                          .charAt(0)
                          .toUpperCase()
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pb-2">
                      <h1 className="break-words text-3xl font-bold sm:text-4xl">
                        {provider.display_name || "NiaWorld Provider"}
                      </h1>
                      <p className="mt-1 text-sm text-[#7B867B]">
                        @{provider.username || "provider"}
                      </p>
                      {provider.country && (
                        <p className="mt-2 text-sm font-semibold text-[#B76648]">
                          {provider.country}
                        </p>
                      )}
                    </div>

                    <div className="rounded-2xl bg-[#EEF1E8] px-5 py-3 text-center">
                      <p className="text-2xl font-bold">{services.length}</p>
                      <p className="text-xs text-[#68766A]">
                        Published services
                      </p>
                    </div>
                  </div>

                  <div className="mt-8">
                    <h2 className="text-xs font-bold uppercase tracking-widest text-[#B76648]">
                      About
                    </h2>
                    <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#586B5C]">
                      {provider.bio || "Part of the NiaWorld community."}
                    </p>
                  </div>

                  {provider.languages?.length ? (
                    <div className="mt-7">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#7B867B]">
                        Languages spoken
                      </h2>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {provider.languages.map((language) => (
                          <span
                            key={language}
                            className="rounded-full bg-[#EEF1E8] px-4 py-2 text-sm"
                          >
                            {language}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {provider.interests?.length ? (
                    <div className="mt-7">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#7B867B]">
                        Cultural interests
                      </h2>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {provider.interests.map((interest) => (
                          <span
                            key={interest}
                            className="rounded-full border border-[#E7E0D3] bg-white px-4 py-2 text-sm"
                          >
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {provider.cultures_to_explore?.length ? (
                    <div className="mt-7">
                      <h2 className="text-xs font-bold uppercase tracking-wider text-[#7B867B]">
                        Cultures to explore
                      </h2>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {provider.cultures_to_explore.map((culture) => (
                          <span
                            key={culture}
                            className="rounded-full bg-[#F7EEE8] px-4 py-2 text-sm text-[#9F573D]"
                          >
                            {culture}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </section>

              <section className="pt-12">
                <p className="text-xs font-bold uppercase tracking-widest text-[#B76648]">
                  Connect through experience
                </p>
                <h2 className="mt-3 text-3xl font-bold">
                  Services by {provider.display_name || "this provider"}
                </h2>
                <p className="mt-2 text-sm text-[#586B5C]">
                  Explore available experiences and request a session.
                </p>

                {services.length === 0 ? (
                  <div className="mt-7 rounded-3xl border border-[#E7E0D3] bg-[#FFFDF8]/95 p-10 text-center">
                    <h3 className="text-lg font-bold">
                      No services available yet
                    </h3>
                    <p className="mt-2 text-sm text-[#68766A]">
                      This provider has not published any services yet.
                    </p>
                  </div>
                ) : (
                  <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {services.map((service) => (
                      <article
                        key={service.id}
                        className="flex flex-col overflow-hidden rounded-3xl border border-[#E7E0D3] bg-[#FFFDF8]/95 shadow-sm"
                      >
                        {service.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={service.cover_image_url}
                            alt=""
                            className="h-44 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-40 items-center justify-center bg-[#EEF1E8] text-5xl">
                            🌍
                          </div>
                        )}

                        <div className="flex flex-1 flex-col p-6">
                          <p className="text-xs font-bold uppercase tracking-wider text-[#B76648]">
                            {service.category}
                          </p>
                          <h3 className="mt-2 text-xl font-bold">
                            {service.title}
                          </h3>
                          <p className="mt-3 text-sm leading-6 text-[#586B5C]">
                            {service.description || "A cultural experience with this provider."}
                          </p>

                          {service.languages?.length ? (
                            <p className="mt-3 text-xs text-[#68766A]">
                              {service.languages.join(" · ")}
                            </p>
                          ) : null}

                          <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#EAE5DA] pt-5">
                            <div>
                              <p className="text-xl font-bold">
                                ${Number(service.price).toFixed(2)}
                              </p>
                              <p className="text-xs text-[#7B867B]">
                                {service.duration_minutes} minutes
                              </p>
                            </div>
                            <Link
                              href={`/services/${service.id}`}
                              className="rounded-full bg-[#244638] px-5 py-3 text-sm font-semibold text-white hover:bg-[#315B48]"
                            >
                              View service
                            </Link>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}

          <footer className="py-12 text-center text-sm text-[#526457]">
            <p className="font-semibold">
              Real People. Real Cultures. Real Connections.
            </p>
            <p className="mt-2">NiaWorld brings cultures closer through people.</p>
          </footer>
        </div>
      </div>
    </main>
  );
}
