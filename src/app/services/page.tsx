
"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
  created_at: string;
};

type ProviderProfile = {
  user_id: string;
  display_name: string | null;
  username: string | null;
  country: string | null;
  avatar_url: string | null;
};

export default function ServicesPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [providers, setProviders] = useState<Record<string, ProviderProfile>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    let active = true;

    async function loadMarketplace() {
      setLoading(true);
      setError("");

      try {
        const supabase = createClient();

        const { data, error: listingError } = await supabase
          .from("provider_listings")
          .select(
            "id, provider_id, title, description, category, languages, price, duration_minutes, cover_image_url, created_at",
          )
          .eq("status", "published")
          .order("created_at", { ascending: false });

        if (listingError) throw listingError;

        const rows = (data ?? []) as Listing[];

        if (!active) return;

        setListings(rows);

        const providerIds = [...new Set(rows.map((item) => item.provider_id))];

        if (providerIds.length > 0) {
          const { data: profileData, error: profileError } = await supabase
            .from("profiles")
            .select("user_id, display_name, username, country, avatar_url")
            .in("user_id", providerIds);

          if (!profileError && active) {
            const profileMap: Record<string, ProviderProfile> = {};

            for (const profile of (profileData ?? []) as ProviderProfile[]) {
              profileMap[profile.user_id] = profile;
            }

            setProviders(profileMap);
          }
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "We couldn't load services right now. Please try again.",
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMarketplace();

    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(
    () => [
      "All",
      ...Array.from(new Set(listings.map((item) => item.category))).sort(),
    ],
    [listings],
  );

  const filteredListings = useMemo(() => {
    const term = search.trim().toLowerCase();

    return listings.filter((listing) => {
      const matchesCategory =
        category === "All" || listing.category === category;

      const provider = providers[listing.provider_id];
      const providerName =
        provider?.display_name || provider?.username || "";

      const matchesSearch =
        !term ||
        listing.title.toLowerCase().includes(term) ||
        listing.description.toLowerCase().includes(term) ||
        listing.category.toLowerCase().includes(term) ||
        listing.languages.some((language) =>
          language.toLowerCase().includes(term),
        ) ||
        providerName.toLowerCase().includes(term) ||
        (provider?.country ?? "").toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [listings, providers, search, category]);

  function formatPrice(price: number) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(Number(price));
  }

  return (
    <main className="min-h-screen bg-transparent px-4 pb-16 pt-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <section className="mb-10 rounded-3xl border border-white/15 bg-black/35 px-6 py-10 shadow-xl backdrop-blur-sm sm:px-10 lg:py-14">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-lime-300">
            NiaWorld experiences
          </p>

          <h1 className="max-w-3xl text-3xl font-bold leading-tight sm:text-5xl">
            Discover cultures through real people.
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-7 text-white/75 sm:text-lg">
            Explore cultural conversations, practise Kiswahili, and learn
            about everyday life from people with experiences worth sharing.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search experiences, languages or places..."
              aria-label="Search services"
              className="min-h-12 w-full rounded-xl border border-white/20 bg-white/10 px-4 text-white outline-none placeholder:text-white/50 focus:border-lime-300 sm:max-w-xl"
            />

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setCategory("All");
              }}
              className="min-h-12 rounded-xl border border-white/20 px-6 font-medium text-white transition hover:bg-white/10"
            >
              Clear filters
            </button>
          </div>
        </section>

        <section>
          <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-medium text-lime-300">
                THE MARKETPLACE
              </p>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">
                Explore experiences
              </h2>
              <p className="mt-2 text-sm text-white/65">
                {loading
                  ? "Loading available experiences..."
                  : `${filteredListings.length} experience${filteredListings.length === 1 ? "" : "s"} available`}
              </p>
            </div>

            <Link
              href="/discover"
              className="text-sm font-semibold text-lime-300 transition hover:text-lime-200"
            >
              Explore the community →
            </Link>
          </div>

          <div className="mb-8 flex gap-2 overflow-x-auto pb-2">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  category === item
                    ? "border-lime-300 bg-lime-300 text-black"
                    : "border-white/20 bg-black/25 text-white/80 hover:bg-white/10"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          {loading && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-72 animate-pulse rounded-2xl border border-white/10 bg-black/25"
                />
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="rounded-2xl border border-red-300/30 bg-red-950/30 p-6">
              <h3 className="font-semibold text-white">
                Couldn't load the marketplace
              </h3>
              <p className="mt-2 break-words text-sm text-white/70">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-lg bg-lime-300 px-5 py-2 font-semibold text-black hover:bg-lime-200"
              >
                Try again
              </button>
            </div>
          )}

          {!loading && !error && filteredListings.length === 0 && (
            <div className="rounded-2xl border border-white/15 bg-black/25 px-6 py-14 text-center">
              <div className="text-4xl" aria-hidden="true">
                🌍
              </div>
              <h3 className="mt-4 text-xl font-semibold">
                No experiences found
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/65">
                {listings.length === 0
                  ? "New experiences will appear here when providers publish services approved by NiaWorld."
                  : "Try another search or choose a different category."}
              </p>
            </div>
          )}

          {!loading && !error && filteredListings.length > 0 && (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredListings.map((listing) => {
                const provider = providers[listing.provider_id];
                const providerName =
                  provider?.display_name ||
                  provider?.username ||
                  "NiaWorld provider";

                return (
                  <article
                    key={listing.id}
                    className="group overflow-hidden rounded-2xl border border-white/15 bg-black/35 shadow-lg backdrop-blur-sm transition hover:-translate-y-1 hover:border-lime-300/50"
                  >
                    <div className="relative flex h-44 items-center justify-center overflow-hidden bg-gradient-to-br from-green-950 via-emerald-900 to-lime-900">
                      {listing.cover_image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={listing.cover_image_url}
                          alt=""
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <span className="text-6xl" aria-hidden="true">
                          {listing.category.toLowerCase().includes("swahili")
                            ? "💬"
                            : "🌍"}
                        </span>
                      )}

                      <span className="absolute left-4 top-4 rounded-full border border-white/20 bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur">
                        {listing.category}
                      </span>
                    </div>

                    <div className="p-5">
                      <div className="flex items-center gap-3">
                        {provider?.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={provider.avatar_url}
                            alt=""
                            className="h-10 w-10 rounded-full border border-white/20 object-cover"
                          />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-300/15 font-bold text-lime-200">
                            {providerName.charAt(0).toUpperCase()}
                          </div>
                        )}

                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {providerName}
                          </p>
                          {provider?.country && (
                            <p className="text-xs text-white/55">
                              {provider.country}
                            </p>
                          )}
                        </div>
                      </div>

                      <h3 className="mt-5 line-clamp-2 text-xl font-bold text-white">
                        {listing.title}
                      </h3>

                      <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-white/65">
                        {listing.description}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {listing.languages.map((language) => (
                          <span
                            key={language}
                            className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/75"
                          >
                            {language}
                          </span>
                        ))}
                      </div>

                      <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                        <div>
                          <p className="text-xs text-white/50">Per session</p>
                          <p className="text-xl font-bold text-lime-300">
                            {formatPrice(listing.price)}
                          </p>
                          <p className="text-xs text-white/55">
                            {listing.duration_minutes} minutes
                          </p>
                        </div>

                        <Link
                          href={`/services/${listing.id}`}
                          className="rounded-xl bg-lime-300 px-4 py-3 text-sm font-bold text-black transition hover:bg-lime-200"
                        >
                          View experience
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
