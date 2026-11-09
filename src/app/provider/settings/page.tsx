
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  BriefcaseBusiness,
  CalendarDays,
  MessageCircle,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  Menu,
  X,
  RefreshCw,
  UserRound,
  Bell,
  ShieldCheck,
  LockKeyhole,
  Globe,
  Languages,
  CreditCard,
  Smartphone,
  Building2,
  Save,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  Eye,
  EyeOff,
  Info,
  Mail,
  User,
  SlidersHorizontal,
} from "lucide-react";

const navigation = [
  { label: "Home", href: "/provider/dashboard", icon: Home },
  { label: "Services", href: "/provider/services", icon: BriefcaseBusiness },
  { label: "Bookings", href: "/provider/bookings", icon: CalendarDays },
  { label: "Messages", href: "/provider/messages", icon: MessageCircle },
  { label: "Wallet", href: "/provider/earnings", icon: Wallet },
  { label: "Analytics", href: "/provider/analytics", icon: ChartNoAxesCombined },
  { label: "Settings", href: "/provider/settings", icon: Settings },
];

type Profile = {
  username: string | null;
  display_name: string | null;
  bio: string | null;
  country: string | null;
  languages: string[] | null;
  avatar_url: string | null;
};

type Notice = {
  type: "success" | "error" | "info";
  message: string;
};

type Section =
  | "profile"
  | "account"
  | "notifications"
  | "privacy"
  | "payouts";

const sections: {
  id: Section;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    id: "profile",
    label: "Profile information",
    description: "Manage your public provider details",
    icon: UserRound,
  },
  {
    id: "account",
    label: "Account preferences",
    description: "Manage language and regional preferences",
    icon: SlidersHorizontal,
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Choose what updates you receive",
    icon: Bell,
  },
  {
    id: "privacy",
    label: "Privacy and security",
    description: "Protect your account and personal information",
    icon: ShieldCheck,
  },
  {
    id: "payouts",
    label: "Payout settings",
    description: "Manage your future payout preferences",
    icon: CreditCard,
  },
];

const inputClass =
  "w-full rounded-xl border border-[#dce6d8] bg-white px-4 py-3 text-sm text-[#344735] outline-none transition placeholder:text-[#a5afa2] focus:border-[#70a95c] focus:ring-2 focus:ring-[#70a95c]/15";

function SettingCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-[#dce6d8] bg-white/95 p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-bold text-[#243326]">{title}</h2>
        {description && (
          <p className="mt-1 text-sm leading-relaxed text-[#849184]">
            {description}
          </p>
        )}
      </div>
      {children}
    </section>
  );
}

function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#344735]">{label}</p>
        <p className="mt-1 text-xs leading-relaxed text-[#849184]">
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${
          checked ? "bg-[#4c9a2a]" : "bg-[#cbd5c5]"
        } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${
            checked ? "left-[22px]" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}

export default function ProviderSettingsPage() {
  const supabase = useMemo(() => createClient(), []);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<Section>("profile");

  const [profile, setProfile] = useState<Profile>({
    username: "",
    display_name: "",
    bio: "",
    country: "",
    languages: [],
    avatar_url: null,
  });

  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice | null>(null);

  const [notifications, setNotifications] = useState({
    bookingUpdates: true,
    messages: true,
    bookingReminders: true,
    productUpdates: false,
    securityAlerts: true,
  });

  const [preferences, setPreferences] = useState({
    language: "English",
    timezone: "Africa/Nairobi",
    profileVisibility: "public",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [signingOut, setSigningOut] = useState(false);

  const showNotice = useCallback(
    (message: string, type: Notice["type"] = "success") => {
      setNotice({ message, type });
    },
    []
  );

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setNotice(null);

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select(
          "username, display_name, bio, country, languages, avatar_url"
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (data) {
        setProfile({
          username: data.username ?? "",
          display_name: data.display_name ?? "",
          bio: data.bio ?? "",
          country: data.country ?? "",
          languages: data.languages ?? [],
          avatar_url: data.avatar_url ?? null,
        });
      }
    } catch (error) {
      console.error("Settings loading error:", error);

      showNotice(
        error instanceof Error
          ? error.message
          : "Unable to load your settings.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [supabase, showNotice]);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!userId) {
      showNotice("Your account could not be verified.", "error");
      return;
    }

    if (!profile.display_name?.trim()) {
      showNotice("Please enter your display name.", "error");
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: profile.display_name.trim(),
          username: profile.username?.trim() || null,
          bio: profile.bio?.trim() || null,
          country: profile.country?.trim() || null,
          languages: profile.languages ?? [],
        })
        .eq("user_id", userId);

      if (error) throw error;

      showNotice("Your profile information has been updated.");
    } catch (error) {
      console.error("Profile update error:", error);

      showNotice(
        error instanceof Error
          ? error.message
          : "Unable to save your profile.",
        "error"
      );
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (password.length < 8) {
      showNotice("Your new password must contain at least 8 characters.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showNotice("The passwords do not match.", "error");
      return;
    }

    setChangingPassword(true);
    setNotice(null);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setPassword("");
      setConfirmPassword("");
      showNotice("Your password has been updated.");
    } catch (error) {
      console.error("Password update error:", error);

      showNotice(
        error instanceof Error
          ? error.message
          : "Unable to update your password.",
        "error"
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSignOut = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to sign out of NiaWorld?"
    );

    if (!confirmed) return;

    setSigningOut(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) throw error;

      window.location.assign("/login");
    } catch (error) {
      console.error("Sign out error:", error);

      showNotice(
        error instanceof Error ? error.message : "Unable to sign out.",
        "error"
      );

      setSigningOut(false);
    }
  };

  const updateProfileField = (field: keyof Profile, value: string) => {
    setProfile((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateNotification = (
    key: keyof typeof notifications,
    value: boolean
  ) => {
    setNotifications((current) => ({
      ...current,
      [key]: value,
    }));

    showNotice(
      "This preference is currently stored only in this page. Notification preferences will be saved in Version 2.",
      "info"
    );
  };

  const updatePreference = (
    key: keyof typeof preferences,
    value: string
  ) => {
    setPreferences((current) => ({
      ...current,
      [key]: value,
    }));

    showNotice(
      "This preference is currently a preview. Persistent preference storage will be connected in Version 2.",
      "info"
    );
  };

  const activeSectionDetails = sections.find(
    (section) => section.id === activeSection
  );

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-transparent text-[#243326]">
      {/* Cultural background */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/cultural-background.jpg')",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-[#eaf0e7]/60"
      />

      <div className="relative z-10 min-h-screen">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-[245px] flex-col border-r border-[#dce6d8] bg-[#f8fbf6]/95 px-5 py-6 backdrop-blur-sm lg:flex">
          <Link
            href="/provider/dashboard"
            className="mb-10 flex items-center gap-2"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4c9a2a] text-white">
              <span className="text-lg font-bold">N</span>
            </div>

            <div>
              <p className="text-xl font-extrabold tracking-tight text-[#244522]">
                NiaWorld
              </p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#849184]">
                Provider space
              </p>
            </div>
          </Link>

          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa697]">
            Workspace
          </p>

          <nav className="flex-1 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.label === "Settings";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                    active
                      ? "bg-[#e4f1df] text-[#397c27]"
                      : "text-[#647263] hover:bg-[#edf4e9] hover:text-[#397c27]"
                  }`}
                >
                  <Icon size={19} />
                  {item.label}

                  {active && (
                    <span className="ml-auto h-2 w-2 rounded-full bg-[#4c9a2a]" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="rounded-2xl border border-[#dce8d7] bg-[#edf5e9] p-4">
            <div className="mb-2 flex items-center gap-2 text-[#397c27]">
              <ShieldCheck size={18} />
              <span className="text-xs font-bold">Account protection</span>
            </div>

            <p className="text-xs leading-relaxed text-[#718071]">
              Keep your profile and account information up to date.
            </p>
          </div>
        </aside>

        {/* Mobile header */}
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#dce6d8] bg-[#f8fbf6]/95 px-4 py-3 backdrop-blur-sm lg:hidden">
          <Link href="/provider/dashboard" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4c9a2a] font-bold text-white">
              N
            </div>

            <span className="text-lg font-extrabold text-[#244522]">
              NiaWorld
            </span>
          </Link>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((open) => !open)}
            className="rounded-xl p-2 text-[#45613f] hover:bg-[#eaf2e5]"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </header>

        {/* Mobile dropdown navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-x-0 top-[61px] z-40 border-b border-[#dce6d8] bg-[#f8fbf6] p-4 shadow-lg lg:hidden">
            <nav className="grid grid-cols-2 gap-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                const active = item.label === "Settings";

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold ${
                      active
                        ? "bg-[#e4f1df] text-[#397c27]"
                        : "text-[#647263] hover:bg-[#edf4e9]"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        )}

        {/* Main content */}
        <main className="mx-auto min-h-screen max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:ml-[245px] lg:px-9 lg:pb-10 lg:pt-9">
          {/* Page heading */}
          <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#718071]">
                <Link
                  href="/provider/dashboard"
                  className="hover:text-[#397c27]"
                >
                  Dashboard
                </Link>
                <ChevronRight size={13} />
                <span className="text-[#397c27]">Settings</span>
              </div>

              <h1 className="text-3xl font-extrabold tracking-tight text-[#243326] sm:text-4xl">
                Settings
              </h1>

              <p className="mt-2 text-sm text-[#718071]">
                Manage your provider profile, preferences and account security.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadSettings()}
              disabled={loading}
              className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-[#cbdac5] bg-white px-4 py-2.5 text-sm font-semibold text-[#45613f] shadow-sm transition hover:bg-[#f4f8f1] disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh profile
            </button>
          </div>

          {/* Notice */}
          {notice && (
            <div
              className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${
                notice.type === "error"
                  ? "border-red-200 bg-red-50 text-red-800"
                  : notice.type === "info"
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "border-green-200 bg-green-50 text-green-800"
              }`}
              role="status"
            >
              {notice.type === "error" ? (
                <AlertCircle size={19} className="mt-0.5 shrink-0" />
              ) : notice.type === "info" ? (
                <Info size={19} className="mt-0.5 shrink-0" />
              ) : (
                <CheckCircle2 size={19} className="mt-0.5 shrink-0" />
              )}

              <p className="text-sm">{notice.message}</p>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-[350px] flex-col items-center justify-center rounded-2xl border border-[#dce6d8] bg-white/90">
              <Loader2 size={34} className="animate-spin text-[#4c9a2a]" />
              <p className="mt-4 text-sm font-semibold text-[#647263]">
                Loading your settings...
              </p>
            </div>
          ) : (
            <div className="grid items-start gap-6 lg:grid-cols-[270px_minmax(0,1fr)]">
              {/* Settings navigation */}
              <aside className="rounded-2xl border border-[#dce6d8] bg-white/95 p-3 shadow-sm">
                <p className="px-3 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[#9aa697]">
                  Settings menu
                </p>

                <nav className="space-y-1">
                  {sections.map((section) => {
                    const Icon = section.icon;
                    const active = activeSection === section.id;

                    return (
                      <button
                        type="button"
                        key={section.id}
                        onClick={() => {
                          setActiveSection(section.id);
                          setNotice(null);
                        }}
                        className={`flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition ${
                          active
                            ? "bg-[#e4f1df] text-[#397c27]"
                            : "text-[#647263] hover:bg-[#f1f6ee]"
                        }`}
                      >
                        <Icon size={19} className="mt-0.5 shrink-0" />

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">
                            {section.label}
                          </span>
                          <span className="mt-1 block text-xs leading-relaxed opacity-75">
                            {section.description}
                          </span>
                        </span>

                        {active && (
                          <ChevronRight
                            size={16}
                            className="mt-1 shrink-0"
                          />
                        )}
                      </button>
                    );
                  })}
                </nav>

                <div className="mt-4 border-t border-[#e7ede3] pt-4">
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    disabled={signingOut}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    {signingOut ? (
                      <Loader2 size={19} className="animate-spin" />
                    ) : (
                      <LogOut size={19} />
                    )}
                    Sign out
                  </button>
                </div>
              </aside>

              {/* Settings content */}
              <div className="min-w-0 space-y-6">
                <div className="mb-2">
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#8a9b83]">
                    {activeSectionDetails?.label}
                  </p>
                  <p className="mt-1 text-sm text-[#718071]">
                    {activeSectionDetails?.description}
                  </p>
                </div>

                {/* PROFILE */}
                {activeSection === "profile" && (
                  <>
                    <SettingCard
                      title="Profile information"
                      description="These details help customers understand who you are and what you offer."
                    >
                      <form onSubmit={saveProfile} className="space-y-5">
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-[#e5f1df] bg-[#e8f3e3] text-[#43832d]">
                            {profile.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={profile.avatar_url}
                                alt="Profile"
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <UserRound size={35} />
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-bold text-[#344735]">
                              Profile photo
                            </p>
                            <p className="mt-1 text-xs text-[#849184]">
                              Your current profile image.
                            </p>
                            <p className="mt-2 text-xs text-[#849184]">
                              Photo uploads will be connected to Supabase Storage
                              in a later update.
                            </p>
                          </div>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-[#405340]">
                              Display name
                            </label>
                            <input
                              type="text"
                              value={profile.display_name ?? ""}
                              onChange={(event) =>
                                updateProfileField(
                                  "display_name",
                                  event.target.value
                                )
                              }
                              placeholder="Your display name"
                              className={inputClass}
                              maxLength={80}
                              required
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-[#405340]">
                              Username
                            </label>
                            <input
                              type="text"
                              value={profile.username ?? ""}
                              onChange={(event) =>
                                updateProfileField(
                                  "username",
                                  event.target.value
                                )
                              }
                              placeholder="Your username"
                              className={inputClass}
                              maxLength={40}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#405340]">
                            About me
                          </label>
                          <textarea
                            value={profile.bio ?? ""}
                            onChange={(event) =>
                              updateProfileField("bio", event.target.value)
                            }
                            placeholder="Tell customers about yourself, your culture and the experiences you share..."
                            rows={5}
                            maxLength={1000}
                            className={inputClass}
                          />
                          <p className="mt-1 text-right text-xs text-[#9aa697]">
                            {(profile.bio ?? "").length}/1000
                          </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-[#405340]">
                              Country
                            </label>
                            <input
                              type="text"
                              value={profile.country ?? ""}
                              onChange={(event) =>
                                updateProfileField(
                                  "country",
                                  event.target.value
                                )
                              }
                              placeholder="Your country"
                              className={inputClass}
                            />
                          </div>

                          <div>
                            <label className="mb-2 block text-sm font-semibold text-[#405340]">
                              Languages
                            </label>
                            <input
                              type="text"
                              value={(profile.languages ?? []).join(", ")}
                              onChange={(event) =>
                                setProfile((current) => ({
                                  ...current,
                                  languages: event.target.value
                                    .split(",")
                                    .map((language) => language.trim())
                                    .filter(Boolean),
                                }))
                              }
                              placeholder="English, Kiswahili"
                              className={inputClass}
                            />
                            <p className="mt-1 text-xs text-[#9aa697]">
                              Separate languages with commas.
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end border-t border-[#e7ede3] pt-5">
                          <button
                            type="submit"
                            disabled={saving}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#4c9a2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3e8422] disabled:opacity-60"
                          >
                            {saving ? (
                              <Loader2 size={17} className="animate-spin" />
                            ) : (
                              <Save size={17} />
                            )}
                            {saving ? "Saving..." : "Save profile"}
                          </button>
                        </div>
                      </form>
                    </SettingCard>

                    <SettingCard
                      title="Account information"
                      description="Your account identity and sign-in email."
                    >
                      <div className="space-y-4">
                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-[#f0f5ed] p-3 text-[#43832d]">
                            <Mail size={19} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-[#849184]">
                              Account email
                            </p>
                            <p className="break-all text-sm font-semibold text-[#344735]">
                              {email || "Not available"}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="rounded-xl bg-[#f0f5ed] p-3 text-[#43832d]">
                            <User size={19} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-[#849184]">Account ID</p>
                            <p className="break-all text-xs font-medium text-[#344735]">
                              {userId || "Not available"}
                            </p>
                          </div>
                        </div>
                      </div>
                    </SettingCard>
                  </>
                )}

                {/* ACCOUNT PREFERENCES */}
                {activeSection === "account" && (
                  <>
                    <SettingCard
                      title="Regional preferences"
                      description="Choose how information is displayed in your account."
                    >
                      <div className="space-y-5">
                        <div>
                          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#405340]">
                            <Languages size={17} />
                            Language
                          </label>
                          <select
                            value={preferences.language}
                            onChange={(event) =>
                              updatePreference("language", event.target.value)
                            }
                            className={inputClass}
                          >
                            <option>English</option>
                            <option>Kiswahili</option>
                          </select>
                        </div>

                        <div>
                          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-[#405340]">
                            <Globe size={17} />
                            Time zone
                          </label>
                          <select
                            value={preferences.timezone}
                            onChange={(event) =>
                              updatePreference("timezone", event.target.value)
                            }
                            className={inputClass}
                          >
                            <option value="Africa/Nairobi">
                              East Africa Time — Nairobi
                            </option>
                            <option value="UTC">Coordinated Universal Time</option>
                            <option value="Europe/London">
                              United Kingdom — London
                            </option>
                            <option value="America/New_York">
                              Eastern Time — New York
                            </option>
                          </select>
                        </div>
                      </div>
                    </SettingCard>

                    <SettingCard
                      title="Profile visibility"
                      description="Choose whether customers can discover your provider profile."
                    >
                      <div className="space-y-3">
                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e4ebe0] p-4">
                          <input
                            type="radio"
                            name="visibility"
                            value="public"
                            checked={preferences.profileVisibility === "public"}
                            onChange={() =>
                              updatePreference("profileVisibility", "public")
                            }
                            className="mt-1 accent-[#4c9a2a]"
                          />
                          <span>
                            <span className="block text-sm font-bold text-[#344735]">
                              Public profile
                            </span>
                            <span className="mt-1 block text-xs text-[#849184]">
                              Allow customers to discover your provider profile.
                            </span>
                          </span>
                        </label>

                        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-[#e4ebe0] p-4">
                          <input
                            type="radio"
                            name="visibility"
                            value="private"
                            checked={preferences.profileVisibility === "private"}
                            onChange={() =>
                              updatePreference("profileVisibility", "private")
                            }
                            className="mt-1 accent-[#4c9a2a]"
                          />
                          <span>
                            <span className="block text-sm font-bold text-[#344735]">
                              Private profile
                            </span>
                            <span className="mt-1 block text-xs text-[#849184]">
                              Hide your profile from public discovery.
                            </span>
                          </span>
                        </label>
                      </div>
                    </SettingCard>
                  </>
                )}

                {/* NOTIFICATIONS */}
                {activeSection === "notifications" && (
                  <SettingCard
                    title="Notification preferences"
                    description="Choose which notifications you would like to receive."
                  >
                    <div className="divide-y divide-[#edf1ea]">
                      <Toggle
                        label="Booking updates"
                        description="Receive updates when customers create or change bookings."
                        checked={notifications.bookingUpdates}
                        onChange={(value) =>
                          updateNotification("bookingUpdates", value)
                        }
                      />

                      <Toggle
                        label="New messages"
                        description="Get notified when customers send you messages."
                        checked={notifications.messages}
                        onChange={(value) =>
                          updateNotification("messages", value)
                        }
                      />

                      <Toggle
                        label="Booking reminders"
                        description="Receive reminders about upcoming sessions."
                        checked={notifications.bookingReminders}
                        onChange={(value) =>
                          updateNotification("bookingReminders", value)
                        }
                      />

                      <Toggle
                        label="Product updates"
                        description="Receive news about NiaWorld features and improvements."
                        checked={notifications.productUpdates}
                        onChange={(value) =>
                          updateNotification("productUpdates", value)
                        }
                      />

                      <Toggle
                        label="Security alerts"
                        description="Receive important account security notifications."
                        checked={notifications.securityAlerts}
                        onChange={(value) =>
                          updateNotification("securityAlerts", value)
                        }
                      />
                    </div>

                    <div className="mt-5 flex items-start gap-2 rounded-xl bg-blue-50 p-3 text-blue-800">
                      <Info size={17} className="mt-0.5 shrink-0" />
                      <p className="text-xs leading-relaxed">
                        These controls currently preview your preferences.
                        Persistent notification settings and delivery channels
                        will be connected in Version 2.
                      </p>
                    </div>
                  </SettingCard>
                )}

                {/* PRIVACY AND SECURITY */}
                {activeSection === "privacy" && (
                  <>
                    <SettingCard
                      title="Change password"
                      description="Use a strong, unique password to protect your account."
                    >
                      <form onSubmit={updatePassword} className="space-y-4">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#405340]">
                            New password
                          </label>

                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(event) =>
                                setPassword(event.target.value)
                              }
                              placeholder="Enter your new password"
                              className={`${inputClass} pr-12`}
                              minLength={8}
                              autoComplete="new-password"
                              required
                            />

                            <button
                              type="button"
                              onClick={() =>
                                setShowPassword((visible) => !visible)
                              }
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#849184]"
                              aria-label={
                                showPassword ? "Hide password" : "Show password"
                              }
                            >
                              {showPassword ? (
                                <EyeOff size={18} />
                              ) : (
                                <Eye size={18} />
                              )}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="mb-2 block text-sm font-semibold text-[#405340]">
                            Confirm new password
                          </label>

                          <input
                            type={showPassword ? "text" : "password"}
                            value={confirmPassword}
                            onChange={(event) =>
                              setConfirmPassword(event.target.value)
                            }
                            placeholder="Confirm your new password"
                            className={inputClass}
                            minLength={8}
                            autoComplete="new-password"
                            required
                          />
                        </div>

                        <p className="text-xs text-[#849184]">
                          Use at least 8 characters. A longer unique password
                          provides better protection.
                        </p>

                        <div className="flex justify-end border-t border-[#e7ede3] pt-5">
                          <button
                            type="submit"
                            disabled={changingPassword}
                            className="inline-flex items-center gap-2 rounded-xl bg-[#4c9a2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3e8422] disabled:opacity-60"
                          >
                            {changingPassword ? (
                              <Loader2 size={17} className="animate-spin" />
                            ) : (
                              <LockKeyhole size={17} />
                            )}
                            Update password
                          </button>
                        </div>
                      </form>
                    </SettingCard>

                    <SettingCard
                      title="Account protection"
                      description="Important information about your account security."
                    >
                      <div className="space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-[#e8f3e3] p-3 text-[#43832d]">
                            <ShieldCheck size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#344735]">
                              Supabase authentication
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[#849184]">
                              Your account authentication is managed through
                              Supabase Auth.
                            </p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3">
                          <div className="rounded-xl bg-[#e8f3e3] p-3 text-[#43832d]">
                            <LockKeyhole size={20} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-[#344735]">
                              Password protection
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[#849184]">
                              Password changes are submitted through Supabase
                              authentication rather than stored in your profile.
                            </p>
                          </div>
                        </div>
                      </div>
                    </SettingCard>

                    <SettingCard
                      title="Sign out"
                      description="End your current NiaWorld session on this device."
                    >
                      <button
                        type="button"
                        onClick={() => void handleSignOut()}
                        disabled={signingOut}
                        className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                      >
                        {signingOut ? (
                          <Loader2 size={17} className="animate-spin" />
                        ) : (
                          <LogOut size={17} />
                        )}
                        Sign out of NiaWorld
                      </button>
                    </SettingCard>
                  </>
                )}

                {/* PAYOUT SETTINGS */}
                {activeSection === "payouts" && (
                  <SettingCard
                    title="Payout preferences"
                    description="Payout account management will be connected to the wallet system."
                  >
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 rounded-xl border border-[#e4ebe0] p-4">
                        <div className="rounded-xl bg-[#e8f3e3] p-3 text-[#43832d]">
                          <Smartphone size={21} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#344735]">
                            M-Pesa
                          </p>
                          <p className="mt-1 text-xs text-[#849184]">
                            Mobile money payout destination
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          Supported method
                        </span>
                      </div>

                      <div className="flex items-center gap-3 rounded-xl border border-[#e4ebe0] p-4">
                        <div className="rounded-xl bg-[#e8f3e3] p-3 text-[#43832d]">
                          <Building2 size={21} />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold text-[#344735]">
                            Bank transfer
                          </p>
                          <p className="mt-1 text-xs text-[#849184]">
                            Bank account payout destination
                          </p>
                        </div>
                        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          Supported method
                        </span>
                      </div>

                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-2 text-amber-800">
                          <Info size={18} className="mt-0.5 shrink-0" />
                          <div>
                            <p className="text-sm font-bold">
                              Payout configuration pending
                            </p>
                            <p className="mt-1 text-xs leading-relaxed">
                              No payout account is being added or changed from
                              this page yet. Version 2 will connect verified
                              payout methods, ownership checks and secure
                              withdrawal processing.
                            </p>
                          </div>
                        </div>
                      </div>

                      <Link
                        href="/provider/earnings"
                        className="inline-flex items-center gap-2 rounded-xl bg-[#4c9a2a] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#3e8422]"
                      >
                        Open wallet
                        <ChevronRight size={17} />
                      </Link>
                    </div>
                  </SettingCard>
                )}
              </div>
            </div>
          )}

          <p className="mt-8 text-center text-xs text-[#899688]">
            NiaWorld Provider Settings
          </p>
        </main>

        {/* Mobile bottom navigation */}
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dce6d8] bg-[#f8fbf6]/95 px-1 py-2 backdrop-blur-sm lg:hidden">
          <div className="mx-auto flex max-w-xl items-center justify-around">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.label === "Settings";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-1.5 ${
                    active ? "text-[#397c27]" : "text-[#849184]"
                  }`}
                >
                  <Icon size={19} />
                  <span className="text-[10px] font-semibold">
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
