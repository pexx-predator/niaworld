
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  user_id: string;
  username: string;
  display_name: string;
  bio: string;
  country: string;
  languages: string[];
  languages_to_learn: string[];
  interests: string[];
  cultures_to_explore: string[];
  connection_goals: string[];
  avatar_url: string;
};

const emptyProfile: Profile = {
  user_id: "",
  username: "",
  display_name: "",
  bio: "",
  country: "",
  languages: [],
  languages_to_learn: [],
  interests: [],
  cultures_to_explore: [],
  connection_goals: [],
  avatar_url: "",
};

const fieldClass =
  "mt-2 w-full rounded-xl border border-[#E7E0D3] bg-white/90 px-4 py-3 text-sm text-[#244638] outline-none transition placeholder:text-[#9A9D91] focus:border-[#66816A] focus:ring-2 focus:ring-[#66816A]/20";

const options = {
  languages: [
    "English", "Swahili", "French", "Spanish", "Arabic",
    "Mandarin Chinese", "Portuguese", "German", "Japanese",
    "Korean", "Hindi", "Other",
  ],
  interests: [
    "Food and cuisine", "Music and dance", "History",
    "Traditions and festivals", "Art and crafts", "Travel",
    "Fashion", "Languages", "Literature", "Daily life",
  ],
  cultures: [
    "African cultures", "Asian cultures", "European cultures",
    "Latin American cultures", "Middle Eastern cultures",
    "Indigenous cultures", "Caribbean cultures", "Other cultures",
  ],
  goals: [
    "Make international friends", "Learn languages",
    "Discover traditions", "Share my culture",
    "Find cultural exchange partners", "Explore travel opportunities",
  ],
};

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

function MultiSelect({
  label,
  values,
  selected,
  onChange,
}: {
  label: string;
  values: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  function toggle(value: string) {
    onChange(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-[#526457]">
        {label}
      </legend>
      <div className="mt-3 flex flex-wrap gap-2">
        {values.map((value) => {
          const active = selected.includes(value);

          return (
            <button
              key={value}
              type="button"
              onClick={() => toggle(value)}
              aria-pressed={active}
              className={`rounded-full border px-3 py-2 text-sm transition ${
                active
                  ? "border-[#244638] bg-[#244638] text-white"
                  : "border-[#D9DFD4] bg-white/80 text-[#526457] hover:border-[#66816A]"
              }`}
            >
              {value}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      setLoading(true);
      setError("");

      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        setError("Please sign in to view and edit your profile.");
        setLoading(false);
        return;
      }

      const user = authData.user;

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "user_id, username, display_name, bio, country, languages, languages_to_learn, interests, cultures_to_explore, connection_goals, avatar_url",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        setError(
          "We couldn't load your profile. Please check your profiles table and column names.",
        );
        setLoading(false);
        return;
      }

      const metadataName =
        typeof user.user_metadata?.full_name === "string"
          ? user.user_metadata.full_name
          : "";

      if (data) {
        setProfile({
          user_id: user.id,
          username: data.username ?? "",
          display_name: data.display_name || metadataName,
          bio: data.bio ?? "",
          country: data.country ?? "",
          languages: Array.isArray(data.languages) ? data.languages : [],
          languages_to_learn: Array.isArray(data.languages_to_learn)
            ? data.languages_to_learn
            : [],
          interests: Array.isArray(data.interests) ? data.interests : [],
          cultures_to_explore: Array.isArray(data.cultures_to_explore)
            ? data.cultures_to_explore
            : [],
          connection_goals: Array.isArray(data.connection_goals)
            ? data.connection_goals
            : [],
          avatar_url: data.avatar_url ?? "",
        });
      } else {
        setProfile({
          ...emptyProfile,
          user_id: user.id,
          display_name: metadataName,
        });
      }

      setLoading(false);
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [supabase]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
    setMessage("");
    setError("");
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    const { data: authData, error: authError } =
      await supabase.auth.getUser();

    if (authError || !authData.user) {
      setError("Your session has expired. Please sign in again.");
      setSaving(false);
      return;
    }

    const user = authData.user;

    const payload = {
      user_id: user.id,
      username: profile.username.trim().toLowerCase(),
      display_name: profile.display_name.trim(),
      bio: profile.bio.trim(),
      country: profile.country.trim(),
      languages: profile.languages,
      languages_to_learn: profile.languages_to_learn,
      interests: profile.interests,
      cultures_to_explore: profile.cultures_to_explore,
      connection_goals: profile.connection_goals,
      avatar_url: profile.avatar_url.trim(),
      updated_at: new Date().toISOString(),
    };

    const { error: saveError } = await supabase
      .from("profiles")
      .upsert(payload, { onConflict: "user_id" });

    if (saveError) {
      console.error("NiaWorld profile save error:", saveError);

      setError(
        saveError.code === "23505"
          ? "That username is already in use. Please choose another."
          : `Profile save failed: ${saveError.message} (Code: ${saveError.code ?? "unknown"})`,
      );

      setSaving(false);
      return;
    }

    setProfile((current) => ({ ...current, user_id: user.id }));
    setMessage("Your profile has been saved.");
    setSaving(false);
  }

  const completed = [
    profile.username,
    profile.display_name,
    profile.bio,
    profile.country,
    profile.languages.length > 0,
    profile.languages_to_learn.length > 0,
    profile.interests.length > 0,
    profile.cultures_to_explore.length > 0,
    profile.connection_goals.length > 0,
  ].filter(Boolean).length;

  const progress = Math.round((completed / 9) * 100);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#FAF7F0] pb-20 text-[#244638] md:pb-0">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/images/cultural-background.jpg')" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#FAF7F0]/0"
      />

      <div className="relative z-10">
        <header className="sticky top-0 z-40 border-b border-[#E7E0D3]/80 bg-[#FFFDF8]/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6 sm:py-5">
            <Link
              href="/"
              className="shrink-0 text-2xl font-bold tracking-tight"
            >
              NiaWorld<span className="text-[#C76D4D]">.</span>
            </Link>

            <nav
              aria-label="Desktop navigation"
              className="hidden items-center gap-1 md:flex"
            >
              {navigationItems.map((item) => {
                const active = item.href === "/profile";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`whitespace-nowrap rounded-full px-2.5 py-2 text-xs font-semibold transition lg:px-3 lg:text-sm ${
                      active
                        ? "bg-[#244638] text-white"
                        : "text-[#526457] hover:bg-[#F0F2E9]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <Link
              href="/"
              className="shrink-0 rounded-full border border-[#D9DFD4] px-3 py-2 text-xs font-medium transition hover:bg-[#F0F2E9] sm:px-5 sm:text-sm md:hidden"
            >
              Back home
            </Link>
          </div>
        </header>

        <section className="mx-auto max-w-5xl px-6 py-12 sm:py-16">
          {/* Return to the dashboard */}
          <div className="mb-8">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-[#244C3A]/20 bg-[#FAF7F0]/90 px-4 py-3 text-sm font-semibold text-[#244C3A] no-underline transition-colors hover:bg-[#FAF7F0]"
            >
              <span aria-hidden="true" className="text-lg leading-none">
              </span>
              Dashboard
            </Link>
          </div>

          <div className="mb-10">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#B76648]">
              Your cultural identity
            </p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Your profile, your story.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[#68766A]">
              Introduce yourself to the world. Share your interests, celebrate
              your background, and discover the cultures that connect us.
            </p>
          </div>

          {loading ? (
            <div className="rounded-3xl border border-[#E7E0D3] bg-white/90 p-10 text-center shadow-sm">
              Loading your profile...
            </div>
          ) : error && !profile.user_id ? (
            <div className="rounded-3xl border border-[#E7E0D3] bg-white/95 p-8 shadow-sm">
              <p role="alert" className="text-sm leading-6 text-[#9B3D2B]">
                {error}
              </p>
              <a
                href="/auth"
                className="mt-5 inline-flex rounded-full bg-[#244638] px-5 py-3 text-sm font-semibold text-white hover:bg-[#315B48]"
              >
                Go to sign in
              </a>
            </div>
          ) : (
            <div className="grid gap-8 md:grid-cols-[280px_1fr]">
              <aside className="h-fit rounded-3xl border border-[#E7E0D3] bg-white/90 p-7 shadow-sm backdrop-blur-sm">
                <div className="mx-auto flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-[#C7D2C1] bg-[#EEF1E8]">
                  {profile.avatar_url ? (
                    // The URL is user-supplied; this is only a preview.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={profile.avatar_url}
                      alt="Profile preview"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      className="h-12 w-12 text-[#66816A]"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="8"
                        r="4"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M4.5 20c.8-4 3.3-6 7.5-6s6.7 2 7.5 6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  )}
                </div>

                <h2 className="mt-5 break-words text-center text-xl font-semibold">
                  {profile.display_name || "Your name here"}
                </h2>
                <p className="mt-1 text-center text-sm text-[#7B867B]">
                  @{profile.username || "yourusername"}
                </p>

                <div className="my-6 border-t border-[#EAE5DA]" />

                <p className="text-center text-sm leading-6 text-[#68766A]">
                  {profile.bio ||
                    "Your story starts here. Tell the community what makes you unique."}
                </p>

                <div className="mt-6 rounded-2xl bg-[#F4F1E8] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[#8A765D]">
                      Profile progress
                    </p>
                    <span className="text-sm font-semibold">{progress}%</span>
                  </div>
                  <div
                    className="mt-3 h-2 overflow-hidden rounded-full bg-[#E1DFD2]"
                    role="progressbar"
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Profile completion"
                  >
                    <div
                      className="h-full rounded-full bg-[#66816A] transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </aside>

              <form onSubmit={saveProfile} className="space-y-6">
                <section className="rounded-3xl border border-[#E7E0D3] bg-white/95 p-6 shadow-sm backdrop-blur-sm sm:p-8">
                  <h2 className="text-xl font-semibold">About you</h2>
                  <p className="mt-2 text-sm leading-6 text-[#68766A]">
                    Tell other members who you are and where you call home.
                  </p>

                  <div className="mt-6 grid gap-5 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-[#526457]">
                      Username
                      <input
                        required
                        minLength={3}
                        maxLength={24}
                        pattern="[A-Za-z0-9_]+"
                        title="Use 3–24 letters, numbers, or underscores."
                        autoComplete="username"
                        value={profile.username}
                        onChange={(e) => update("username", e.target.value)}
                        className={fieldClass}
                        placeholder="e.g. cultureexplorer"
                      />
                    </label>

                    <label className="block text-sm font-medium text-[#526457]">
                      Full name / display name
                      <input
                        required
                        maxLength={80}
                        autoComplete="name"
                        value={profile.display_name}
                        onChange={(e) =>
                          update("display_name", e.target.value)
                        }
                        className={fieldClass}
                        placeholder="Your name"
                      />
                    </label>

                    <label className="block text-sm font-medium text-[#526457] sm:col-span-2">
                      Country of residence
                      <input
                        maxLength={100}
                        autoComplete="country-name"
                        value={profile.country}
                        onChange={(e) => update("country", e.target.value)}
                        className={fieldClass}
                        placeholder="Which country do you live in?"
                      />
                    </label>

                    <label className="block text-sm font-medium text-[#526457] sm:col-span-2">
                      Short biography
                      <textarea
                        rows={4}
                        maxLength={500}
                        value={profile.bio}
                        onChange={(e) => update("bio", e.target.value)}
                        className={fieldClass}
                        placeholder="Tell us a little about yourself, your background, and what you enjoy."
                      />
                      <span className="mt-1 block text-right text-xs text-[#7B867B]">
                        {profile.bio.length}/500
                      </span>
                    </label>

                    <label className="block text-sm font-medium text-[#526457] sm:col-span-2">
                      Profile photo URL
                      <input
                        type="url"
                        value={profile.avatar_url}
                        onChange={(e) => update("avatar_url", e.target.value)}
                        className={fieldClass}
                        placeholder="https://..."
                      />
                      <span className="mt-1 block text-xs font-normal text-[#7B867B]">
                        Photo uploads can be added later using Supabase Storage.
                      </span>
                    </label>
                  </div>
                </section>

                <section className="rounded-3xl border border-[#E7E0D3] bg-white/95 p-6 shadow-sm backdrop-blur-sm sm:p-8">
                  <h2 className="text-xl font-semibold">
                    Languages and culture
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#68766A]">
                    Choose all the options that reflect your interests.
                  </p>

                  <div className="mt-6 space-y-7">
                    <MultiSelect
                      label="Languages spoken"
                      values={options.languages}
                      selected={profile.languages}
                      onChange={(v) => update("languages", v)}
                    />
                    <MultiSelect
                      label="Languages to learn"
                      values={options.languages}
                      selected={profile.languages_to_learn}
                      onChange={(v) => update("languages_to_learn", v)}
                    />
                    <MultiSelect
                      label="Cultural interests"
                      values={options.interests}
                      selected={profile.interests}
                      onChange={(v) => update("interests", v)}
                    />
                    <MultiSelect
                      label="Cultures to explore"
                      values={options.cultures}
                      selected={profile.cultures_to_explore}
                      onChange={(v) => update("cultures_to_explore", v)}
                    />
                    <MultiSelect
                      label="Connection goals"
                      values={options.goals}
                      selected={profile.connection_goals}
                      onChange={(v) => update("connection_goals", v)}
                    />
                  </div>
                </section>

                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800"
                  >
                    {error}
                  </p>
                )}
                {message && (
                  <p
                    role="status"
                    className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800"
                  >
                    {message}
                  </p>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-5 text-[#68766A]">
                    Your profile is saved to your signed-in account.
                  </p>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-full bg-[#244638] px-7 py-3 font-semibold text-white shadow-sm transition hover:bg-[#315B48] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving profile..." : "Save profile"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>

        <footer className="border-t border-[#E7E0D3]/80 bg-[#FFFDF8]/80 px-6 py-6 text-center text-sm text-[#7B867B] backdrop-blur-sm">
          Real People. Real Cultures. Real Connections.
        </footer>
      </div>

      {/* Fixed mobile navigation */}
      <nav
        aria-label="Mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[#E7E0D3] bg-[#FFFDF8]/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(36,70,56,0.08)] backdrop-blur-md md:hidden"
      >
        <div className="mx-auto grid max-w-xl grid-cols-8">
          {navigationItems.map((item) => {
            const active = item.href === "/profile";

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                aria-label={item.label}
                className={`relative flex min-w-0 flex-col items-center justify-center gap-1 px-0.5 py-2.5 transition ${
                  active
                    ? "font-bold text-[#B76648]"
                    : "text-[#526457] hover:text-[#244638]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-6 items-center justify-center text-xl leading-none ${
                    active ? "scale-110" : ""
                  }`}
                >
                  {item.icon}
                </span>

                <span
                  className={`w-full truncate text-center text-[9px] leading-3 sm:text-[10px] ${
                    active ? "font-bold" : "font-medium"
                  }`}
                >
                  {item.label}
                </span>

                {active && (
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
