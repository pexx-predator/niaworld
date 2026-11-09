
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Member = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  country: string | null;
  languages: string[] | null;
  languages_to_learn: string[] | null;
  interests: string[] | null;
  cultures_to_explore: string[] | null;
  connection_goals: string[] | null;
  avatar_url: string | null;
};

type ProviderService = {
  id: string;
  provider_id: string;
  title: string;
  description: string;
  category: string;
  languages: string[];
  price: number | string;
  duration_minutes: number;
  cover_image_url: string | null;
};

type ProviderSummary = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  country: string | null;
  avatar_url: string | null;
};

const interests = [
  "Food and cuisine",
  "Music and dance",
  "History",
  "Traditions and festivals",
  "Art and crafts",
  "Travel",
  "Fashion",
  "Languages",
  "Literature",
  "Daily life",
];

const languages = [
  "English",
  "Swahili",
  "French",
  "Spanish",
  "Arabic",
  "Mandarin Chinese",
  "Portuguese",
  "German",
  "Japanese",
  "Korean",
  "Hindi",
];

const navigationItems = [
  { label: "Home", href: "/", icon: "⌂" },
  { label: "Discover", href: "/discover", icon: "⌕" },
  { label: "Videos", href: "/videos", icon: "▶" },
  { label: "Conversations", href: "/conversations", icon: "◉" },
  { label: "Bookings", href: "/bookings", icon: "▣" },
  { label: "Wallet", href: "/wallet", icon: "▤" },
  { label: "Messages", href: "/messages", icon: "✉" },
  { label: "Profile", href: "/profile", icon: "○" },
];

const inputClass =
  "mt-2 w-full rounded-xl border border-[#D9DFD4] bg-white/95 px-4 py-3 text-sm text-[#244638] outline-none transition placeholder:text-[#8A9589] focus:border-[#66816A] focus:ring-2 focus:ring-[#66816A]/20";

const primaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full bg-[#244638] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#315B48] focus:outline-none focus:ring-2 focus:ring-[#66816A] focus:ring-offset-2";

const secondaryButtonClass =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#C9D4C6] bg-white/90 px-5 py-3 text-sm font-semibold text-[#244638] transition hover:bg-[#F0F2E9] focus:outline-none focus:ring-2 focus:ring-[#66816A] focus:ring-offset-2";

function formatPrice(value: number | string) {
  const amount = Number(value);

  if (!Number.isFinite(amount)) return "—";

  return amount.toLocaleString("en", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DiscoverPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();

  const [members, setMembers] = useState<Member[]>([]);
  const [services, setServices] = useState<ProviderService[]>([]);
  const [serviceProviders, setServiceProviders] = useState<
    Record<string, ProviderSummary>
  >({});

  const [loading, setLoading] = useState(true);
  const [servicesLoading, setServicesLoading] = useState(true);
  const [error, setError] = useState("");
  const [servicesError, setServicesError] = useState("");

  const [search, setSearch] = useState("");
  const [countryFilter, setCountryFilter] = useState("");
  const [languageFilter, setLanguageFilter] = useState("");
  const [interestFilter, setInterestFilter] = useState("");

  useEffect(() => {
    let active = true;

    async function loadDiscoverData() {
      setLoading(true);
      setServicesLoading(true);
      setError("");
      setServicesError("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        router.replace("/auth");
        return;
      }

      // Load community members.
      const { data: memberData, error: membersError } = await supabase
        .from("profiles")
        .select(
          "user_id, username, display_name, bio, country, languages, languages_to_learn, interests, cultures_to_explore, connection_goals, avatar_url"
        )
        .neq("user_id", authData.user.id)
        .order("display_name", { ascending: true });

      if (!active) return;

      if (membersError) {
        console.error("NiaWorld Discover error:", membersError);
        setError(
          "We couldn't load member profiles. Please check your Supabase profile permissions and try again."
        );
      } else {
        setMembers((memberData ?? []) as Member[]);
      }

      setLoading(false);

      // Load published provider services only.
      const { data: serviceData, error: providerServicesError } =
        await supabase
          .from("provider_listings")
          .select(
            "id,provider_id,title,description,category,languages,price,duration_minutes,cover_image_url"
          )
          .eq("status", "published")
          .order("created_at", { ascending: false });

      if (!active) return;

      if (providerServicesError) {
        console.error(
          "NiaWorld Discover services error:",
          providerServicesError
        );
        setServicesError(
          "We couldn't load available services. Please try again later."
        );
        setServicesLoading(false);
        return;
      }

      const publishedServices = (serviceData ?? []) as ProviderService[];
      setServices(publishedServices);

      // Load provider profiles associated with published services.
      const providerIds = [
        ...new Set(publishedServices.map((service) => service.provider_id)),
      ];

      if (providerIds.length > 0) {
        const { data: providerData, error: providerError } = await supabase
          .from("profiles")
          .select("user_id,username,display_name,country,avatar_url")
          .in("user_id", providerIds);

        if (!active) return;

        if (providerError) {
          console.error(
            "NiaWorld service provider profiles error:",
            providerError
          );
          setServicesError(
            "Services loaded, but some provider profiles could not be displayed."
          );
        } else {
          const providerMap: Record<string, ProviderSummary> = {};

          for (const provider of (providerData ?? []) as ProviderSummary[]) {
            providerMap[provider.user_id] = provider;
          }

          setServiceProviders(providerMap);
        }
      }

      setServicesLoading(false);
    }

    void loadDiscoverData();

    return () => {
      active = false;
    };
  }, [supabase, router]);

  const countries = Array.from(
    new Set(
      members
        .map((member) => member.country?.trim())
        .filter((country): country is string => Boolean(country))
    )
  ).sort((a, b) => a.localeCompare(b));

  const filteredMembers = members.filter((member) => {
    const searchText = search.trim().toLowerCase();

    const searchableText = [
      member.display_name,
      member.username,
      member.bio,
      member.country,
      ...(member.languages ?? []),
      ...(member.languages_to_learn ?? []),
      ...(member.interests ?? []),
      ...(member.cultures_to_explore ?? []),
      ...(member.connection_goals ?? []),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesSearch =
      !searchText || searchableText.includes(searchText);

    const matchesCountry =
      !countryFilter || member.country === countryFilter;

    const matchesLanguage =
      !languageFilter ||
      (member.languages ?? []).includes(languageFilter);

    const matchesInterest =
      !interestFilter ||
      (member.interests ?? []).includes(interestFilter);

    return (
      matchesSearch &&
      matchesCountry &&
      matchesLanguage &&
      matchesInterest
    );
  });

  function clearFilters() {
    setSearch("");
    setCountryFilter("");
    setLanguageFilter("");
    setInterestFilter("");
  }

  return (
    <main className="relative min-h-screen bg-[#FAF7F0] pb-24 text-[#244638] lg:pb-0">
      {/* Cultural background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-cover bg-center"
        style={{
          backgroundImage: "url('/images/cultural-background.jpg')",
        }}
      />

      {/* Readability overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[#FAF7F0]/25"
      />

      <div className="relative z-10">
        {/* Desktop header and navigation */}
        <header className="sticky top-0 z-40 border-b border-[#E7E0D3]/80 bg-[#FFFDF8]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-8">
            <Link
              href="/"
              aria-label="NiaWorld home"
              className="shrink-0 text-2xl font-bold tracking-tight"
            >
              NiaWorld<span className="text-[#C76D4D]">.</span>
            </Link>

            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-1 xl:flex"
            >
              {navigationItems.map((item) => {
                const isActive = item.href === "/discover";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    className={`whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-semibold transition ${
                      isActive
                        ? "bg-[#244638] text-white shadow-sm"
                        : "text-[#526457] hover:bg-[#F0F2E9] hover:text-[#244638]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            {/* Compact navigation for medium-sized screens */}
            <nav
              aria-label="Main navigation"
              className="hidden items-center gap-1 md:flex xl:hidden"
            >
              {navigationItems.map((item) => {
                const isActive = item.href === "/discover";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={isActive ? "page" : undefined}
                    title={item.label}
                    className={`flex flex-col items-center justify-center rounded-xl px-2 py-2 transition ${
                      isActive
                        ? "bg-[#244638] text-white"
                        : "text-[#526457] hover:bg-[#F0F2E9]"
                    }`}
                  >
                    <span aria-hidden="true" className="text-lg leading-5">
                      {item.icon}
                    </span>
                    <span className="mt-1 whitespace-nowrap text-[10px] font-semibold">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </nav>

            <span className="text-xs font-medium text-[#68766A] md:hidden">
              Real connections
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-12">
          {/* Discover hero */}
          <section className="rounded-[2rem] border border-white/70 bg-[#FFFDF8]/85 p-6 shadow-sm backdrop-blur-sm sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#B76648] sm:text-sm">
              Explore the world through people
            </p>

            <h1 className="mt-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Every culture has a story.
              <span className="mt-2 block text-[#B76648]">
                Discover yours.
              </span>
            </h1>

            <p className="mt-5 max-w-2xl text-sm leading-7 text-[#586B5C] sm:text-base">
              Meet people from different backgrounds, discover new
              traditions, exchange languages, and find people who share
              your curiosity about the world.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#services" className={primaryButtonClass}>
                Browse Cultural Experiences
                <span aria-hidden="true">↓</span>
              </a>

              <a href="#members" className={primaryButtonClass}>
                Meet Community Members
              </a>

              <Link href="/videos" className={secondaryButtonClass}>
                <span aria-hidden="true">▶</span>
                Watch Community Videos
              </Link>

              <Link href="/profile" className={secondaryButtonClass}>
                Edit My Profile
              </Link>
            </div>

            <div className="mt-9 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-[#E7E0D3] bg-white/80 p-4">
                <p className="text-2xl font-bold text-[#244638]">
                  {loading ? "—" : members.length}
                </p>
                <p className="mt-1 text-sm text-[#68766A]">
                  Community members
                </p>
              </div>

              <div className="rounded-2xl border border-[#E7E0D3] bg-white/80 p-4">
                <p className="text-2xl font-bold text-[#244638]">
                  {servicesLoading ? "—" : services.length}
                </p>
                <p className="mt-1 text-sm text-[#68766A]">
                  Published experiences
                </p>
              </div>

              <div className="rounded-2xl border border-[#E7E0D3] bg-white/80 p-4">
                <p className="text-2xl font-bold text-[#244638]">
                  Languages
                </p>
                <p className="mt-1 text-sm text-[#68766A]">
                  Find people with shared language interests
                </p>
              </div>
            </div>
          </section>

          {/* Published provider services */}
          <section id="services" className="scroll-mt-28 pt-12 sm:pt-16">
            <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B76648]">
                  Learn directly from people
                </p>
                <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                  Discover Cultural Experiences
                </h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#586B5C]">
                  Explore cultural experiences, language sessions, local
                  knowledge and services shared by NiaWorld providers.
                </p>
              </div>

              <Link href="/services" className={primaryButtonClass}>
                Browse All Services
                <span aria-hidden="true">→</span>
              </Link>
            </div>

            {servicesError && (
              <div
                role="alert"
                className="rounded-2xl border border-red-200 bg-red-50/95 p-5 text-sm leading-6 text-red-800"
              >
                {servicesError}
              </div>
            )}

            {servicesLoading ? (
              <div className="rounded-3xl border border-[#E7E0D3] bg-[#FFFDF8]/95 p-10 text-center">
                <div
                  className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#D9DFD4] border-t-[#244638]"
                  aria-label="Loading services"
                />
                <p className="mt-4 text-sm text-[#68766A]">
                  Finding available experiences...
                </p>
              </div>
            ) : services.length === 0 ? (
              <div className="rounded-3xl border border-[#E7E0D3] bg-[#FFFDF8]/95 px-6 py-12 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF1E8] text-3xl">
                  🌍
                </div>
                <h3 className="mt-5 text-xl font-bold">
                  New experiences are coming
                </h3>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#68766A]">
                  There are no published provider services available right
                  now. Check back as our community shares more experiences.
                </p>
                <Link
                  href="/services"
                  className={`${primaryButtonClass} mt-5`}
                >
                  Browse the Services Marketplace
                </Link>
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {services.map((service) => {
                  const provider = serviceProviders[service.provider_id];
                  const providerName =
                    provider?.display_name ||
                    provider?.username ||
                    "NiaWorld provider";

                  return (
                    <article
                      key={service.id}
                      className="flex h-full flex-col overflow-hidden rounded-3xl border border-[#E7E0D3] bg-[#FFFDF8]/95 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                    >
                      <Link
                        href={`/services/${service.id}`}
                        className="block"
                        aria-label={`View details for ${service.title}`}
                      >
                        {service.cover_image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={service.cover_image_url}
                            alt={service.title}
                            loading="lazy"
                            className="h-52 w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-52 items-center justify-center bg-[#EEF1E8] text-5xl font-bold text-[#66816A]">
                            {service.title.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </Link>

                      <div className="flex flex-1 flex-col p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="rounded-full bg-[#EEF1E8] px-3 py-1.5 text-xs font-semibold text-[#244638]">
                            {service.category}
                          </span>
                          <span className="text-xs font-medium text-[#7B867B]">
                            {service.duration_minutes} minutes
                          </span>
                        </div>

                        <h3 className="mt-4 text-xl font-bold leading-snug text-[#244638]">
                          <Link
                            href={`/services/${service.id}`}
                            className="transition hover:text-[#B76648]"
                          >
                            {service.title}
                          </Link>
                        </h3>

                        <p className="mt-3 text-sm leading-6 text-[#586B5C] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
                          {service.description}
                        </p>

                        {service.languages?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {service.languages.slice(0, 3).map((language) => (
                              <span
                                key={language}
                                className="rounded-full border border-[#E7E0D3] bg-white px-3 py-1 text-xs text-[#526457]"
                              >
                                {language}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-5 border-t border-[#EAE5DA] pt-4">
                          <div className="flex items-center gap-3">
                            {provider?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={provider.avatar_url}
                                alt=""
                                loading="lazy"
                                className="h-10 w-10 rounded-full border border-[#D9DFD4] object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EEF1E8] font-bold text-[#66816A]">
                                {providerName.charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0">
                              <p className="text-xs text-[#7B867B]">
                                Provided by
                              </p>
                              <Link
                                href={`/providers/${service.provider_id}`}
                                className="block truncate text-sm font-semibold text-[#244638] hover:text-[#B76648]"
                              >
                                {providerName}
                              </Link>
                              {provider?.country && (
                                <p className="text-xs text-[#7B867B]">
                                  {provider.country}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-[#EAE5DA] pt-5">
                          <div>
                            <p className="text-xs text-[#7B867B]">
                              Service price
                            </p>
                            <p className="mt-1 text-lg font-bold text-[#244638]">
                              USD {formatPrice(service.price)}
                            </p>
                          </div>

                          <Link
                            href={`/services/${service.id}`}
                            className={primaryButtonClass}
                          >
                            View Experience Details
                            <span aria-hidden="true">→</span>
                          </Link>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Community members */}
          <section id="members" className="scroll-mt-28 pt-12 sm:pt-16">
            <div className="mb-7">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#B76648]">
                Find your connection
              </p>

              <div className="mt-3 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Meet Community Members
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#586B5C]">
                    Search by name, country, language, or cultural interest.
                  </p>
                </div>

                <p className="text-sm font-medium text-[#68766A]">
                  {loading
                    ? "Loading members..."
                    : `${filteredMembers.length} ${
                        filteredMembers.length === 1 ? "member" : "members"
                      } found`}
                </p>
              </div>
            </div>

            {/* Search and filters */}
            <div className="rounded-3xl border border-[#E7E0D3] bg-[#FFFDF8]/95 p-5 shadow-sm backdrop-blur-sm sm:p-6">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <label className="block text-sm font-semibold text-[#526457]">
                  Search members
                  <input
                    type="search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Name, culture, or keyword"
                    className={inputClass}
                  />
                </label>

                <label className="block text-sm font-semibold text-[#526457]">
                  Country
                  <select
                    value={countryFilter}
                    onChange={(event) =>
                      setCountryFilter(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">All countries</option>
                    {countries.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-[#526457]">
                  Language spoken
                  <select
                    value={languageFilter}
                    onChange={(event) =>
                      setLanguageFilter(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">All languages</option>
                    {languages.map((language) => (
                      <option key={language} value={language}>
                        {language}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="block text-sm font-semibold text-[#526457]">
                  Cultural interest
                  <select
                    value={interestFilter}
                    onChange={(event) =>
                      setInterestFilter(event.target.value)
                    }
                    className={inputClass}
                  >
                    <option value="">All interests</option>
                    {interests.map((interest) => (
                      <option key={interest} value={interest}>
                        {interest}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-[#7B867B]">
                  Refine the community list using the filters above.
                </p>
                <button
                  type="button"
                  onClick={clearFilters}
                  className={secondaryButtonClass}
                >
                  Reset Search Filters
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mt-6 rounded-2xl border border-red-200 bg-red-50/95 p-5 text-sm leading-6 text-red-800"
              >
                {error}
              </div>
            )}

            {loading ? (
              <div className="mt-8 rounded-3xl border border-[#E7E0D3] bg-[#FFFDF8]/95 p-12 text-center">
                <div
                  className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-[#D9DFD4] border-t-[#244638]"
                  aria-label="Loading"
                />
                <p className="mt-4 text-sm text-[#68766A]">
                  Finding people to connect with...
                </p>
              </div>
            ) : !error && filteredMembers.length === 0 ? (
              <div className="mt-8 rounded-3xl border border-[#E7E0D3] bg-[#FFFDF8]/95 px-6 py-12 text-center shadow-sm">
                <div
                  aria-hidden="true"
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#EEF1E8] text-3xl"
                >
                  🌍
                </div>

                <h3 className="mt-5 text-xl font-bold">
                  {members.length === 0
                    ? "Your global community is growing"
                    : "No matching members yet"}
                </h3>

                <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#68766A]">
                  {members.length === 0
                    ? "There are no other visible member profiles to show right now. As members join and complete their profiles, they can appear here."
                    : "Try another country, language, or cultural interest. You can also reset your filters to see all available members."}
                </p>

                {members.length > 0 && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className={`${primaryButtonClass} mt-5`}
                  >
                    Reset Search Filters
                  </button>
                )}

                <div className="mt-6">
                  <Link
                    href="/profile"
                    className="text-sm font-semibold text-[#B76648] underline underline-offset-4"
                  >
                    Complete or update my profile
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredMembers.map((member) => (
                  <article
                    key={member.user_id}
                    className="flex h-full flex-col rounded-3xl border border-[#E7E0D3] bg-[#FFFDF8]/95 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#D9DFD4] bg-[#EEF1E8]">
                        {member.avatar_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={member.avatar_url}
                            alt=""
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span
                            aria-hidden="true"
                            className="text-2xl font-bold text-[#66816A]"
                          >
                            {(member.display_name || member.username || "N")
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0">
                        <h3 className="break-words text-lg font-bold">
                          {member.display_name || "NiaWorld member"}
                        </h3>

                        <p className="mt-1 truncate text-sm text-[#7B867B]">
                          @{member.username || "member"}
                        </p>

                        {member.country && (
                          <p className="mt-1 text-sm font-medium text-[#B76648]">
                            {member.country}
                          </p>
                        )}
                      </div>
                    </div>

                    <p className="mt-5 min-h-20 text-sm leading-6 text-[#586B5C] [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:4] overflow-hidden">
                      {member.bio ||
                        "This member is part of the NiaWorld cultural community."}
                    </p>

                    {(member.languages ?? []).length > 0 && (
                      <div className="mt-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#7B867B]">
                          Languages spoken
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(member.languages ?? []).slice(0, 4).map((item) => (
                            <span
                              key={item}
                              className="rounded-full bg-[#EEF1E8] px-3 py-1.5 text-xs font-medium text-[#244638]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(member.interests ?? []).length > 0 && (
                      <div className="mt-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#7B867B]">
                          Cultural interests
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(member.interests ?? []).slice(0, 3).map((item) => (
                            <span
                              key={item}
                              className="rounded-full border border-[#E7E0D3] bg-white/80 px-3 py-1.5 text-xs text-[#526457]"
                            >
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {(member.connection_goals ?? []).length > 0 && (
                      <div className="mt-5">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#7B867B]">
                          Looking to
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[#526457]">
                          {(member.connection_goals ?? [])
                            .slice(0, 2)
                            .join(" · ")}
                        </p>
                      </div>
                    )}

                    <div className="mt-auto border-t border-[#EAE5DA] pt-4">
                      <p className="text-xs leading-5 text-[#7B867B]">
                        Discover shared interests and cultural experiences.
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <footer className="py-10 text-center text-sm text-[#526457]">
            <p className="font-semibold">
              Real People. Real Cultures. Real Connections.
            </p>
            <p className="mt-2">
              Discover the world through the people who make it unique.
            </p>
          </footer>
        </div>
      </div>

      {/* Fixed mobile navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E7E0D3] bg-[#FFFDF8]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(36,70,56,0.08)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-8">
          {navigationItems.map((item) => {
            const isActive = item.href === "/discover";

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
                className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2.5 transition ${
                  isActive
                    ? "font-bold text-[#B76648]"
                    : "text-[#526457] hover:text-[#244638]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 items-center justify-center text-xl leading-none ${
                    isActive ? "scale-110" : ""
                  }`}
                >
                  {item.icon}
                </span>

                <span
                  className={`w-full truncate text-center text-[9px] leading-3 sm:text-[10px] ${
                    isActive ? "font-bold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>

                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute bottom-0 h-0.5 w-7 rounded-full bg-[#B76648]"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
