
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Listing = {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  category: string;
  languages: string[];
  price: number;
  duration_minutes: number;
  cover_image_url: string | null;
};

type Provider = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  country: string | null;
  avatar_url: string | null;
  bio: string | null;
};

export default function ServiceDetailsClient({
  serviceId,
}: {
  serviceId: string;
}) {
  const [listing, setListing] = useState<Listing | null>(null);
  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const supabase = createClient();

    async function loadService() {
      const { data, error: listingError } = await supabase
        .from("provider_listings")
        .select(
          "id, provider_id, title, description, category, languages, price, duration_minutes, cover_image_url"
        )
        .eq("id", serviceId)
        .eq("status", "published")
        .maybeSingle();

      if (!active) return;

      if (listingError || !data) {
        setError("This service is unavailable or could not be loaded.");
        setLoading(false);
        return;
      }

      const { data: providerData, error: providerError } = await supabase
        .from("profiles")
        .select("user_id, display_name, username, country, avatar_url, bio")
        .eq("user_id", data.provider_id)
        .maybeSingle();

      if (!active) return;

      if (providerError) {
        setError("Provider information could not be loaded.");
        setLoading(false);
        return;
      }

      setListing(data as Listing);
      setProvider(providerData as Provider | null);
      setLoading(false);
    }

    loadService();

    return () => {
      active = false;
    };
  }, [serviceId]);

  if (loading) {
    return (
      <main className="min-h-screen p-8 text-white">
        Loading service...
      </main>
    );
  }

  if (error || !listing) {
    return (
      <main className="min-h-screen p-8 text-white">
        <h1 className="text-2xl font-bold">Service unavailable</h1>
        <p className="mt-3 text-white/70">{error}</p>
        <Link href="/services" className="mt-5 inline-block text-green-300">
          Back to services
        </Link>
      </main>
    );
  }

  const providerName =
    provider?.display_name || provider?.username || "NiaWorld provider";

  return (
    <main className="min-h-screen px-4 py-10 text-white sm:px-6">
      <div className="mx-auto max-w-5xl">
        <Link href="/services" className="mb-6 inline-block text-green-300">
          ← Back to services
        </Link>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/50 backdrop-blur-md">
          {listing.cover_image_url && (
            <img
              src={listing.cover_image_url}
              alt={listing.title}
              className="h-64 w-full object-cover sm:h-96"
            />
          )}

          <div className="grid gap-8 p-6 md:grid-cols-[1fr_300px]">
            <section>
              <span className="rounded-full bg-green-500/15 px-3 py-1 text-sm text-green-300">
                {listing.category}
              </span>

              <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
                {listing.title}
              </h1>

              <p className="mt-5 whitespace-pre-line leading-8 text-white/75">
                {listing.description}
              </p>

              <h2 className="mt-8 font-semibold">Languages</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {listing.languages?.map((language) => (
                  <span
                    key={language}
                    className="rounded-full border border-white/15 px-3 py-2 text-sm"
                  >
                    {language}
                  </span>
                ))}
              </div>

              <div className="mt-8 border-t border-white/10 pt-6">
                <h2 className="font-semibold">About the provider</h2>

                {provider ? (
                  <Link
                    href={`/providers/${provider.user_id}`}
                    className="group mt-4 flex items-center gap-4 rounded-xl transition hover:bg-white/5"
                  >
                    {provider.avatar_url ? (
                      <img
                        src={provider.avatar_url}
                        alt={providerName}
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-700 text-xl">
                        {providerName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    <div>
                      <p className="font-semibold transition group-hover:text-green-300">
                        {providerName}
                      </p>
                      <p className="text-sm text-white/60">
                        {provider.country || ""}
                      </p>
                      <span className="mt-1 inline-block text-xs text-green-300">
                        View provider profile →
                      </span>
                    </div>
                  </Link>
                ) : (
                  <p className="mt-4 text-sm text-white/60">
                    Provider information is unavailable.
                  </p>
                )}

                {provider?.bio && (
                  <p className="mt-4 leading-7 text-white/70">
                    {provider.bio}
                  </p>
                )}
              </div>
            </section>

            <aside className="h-fit rounded-2xl border border-white/10 bg-white/5 p-6">
              <p className="text-sm text-white/60">Session price</p>
              <p className="mt-1 text-3xl font-bold text-green-300">
                ${Number(listing.price).toFixed(2)}
              </p>

              <div className="mt-5 space-y-3 border-t border-white/10 pt-5 text-sm">
                <div className="flex justify-between">
                  <span className="text-white/60">Duration</span>
                  <span>{listing.duration_minutes} minutes</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-white/60">Format</span>
                  <span>Text conversation</span>
                </div>
              </div>

              <Link
                href={`/services/${listing.id}/book`}
                className="mt-7 flex justify-center rounded-xl bg-green-600 px-5 py-3 font-semibold hover:bg-green-500"
              >
                Request a session
              </Link>

              <p className="mt-3 text-center text-xs text-white/50">
                This sends a booking request. Payment is handled separately.
              </p>
            </aside>
          </div>
        </div>
      </div>
    </main>
  );
}
