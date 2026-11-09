
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Home,
  BriefcaseBusiness,
  CalendarDays,
  MessageCircle,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  Search,
  Plus,
  Star,
  Users,
  Inbox,
  ArrowLeft,
  Send,
  MoreHorizontal,
  LockKeyhole,
  ChevronRight,
  X,
  Check,
  CheckCheck,
} from "lucide-react";

type Profile = {
  user_id: string;
  username: string;
  display_name: string;
  bio?: string;
  country?: string;
  languages?: string[];
  interests?: string[];
  avatar_url?: string | null;
  languages_to_learn?: string[] | null;
  cultures_to_explore?: string[] | null;
  connection_goals?: string[] | null;
};

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at?: string | null;
};

type Connection = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: string;
};

type FilterType = "inbox" | "unread" | "contacts" | "favourites";

type Conversation = {
  person: Profile;
  messages: Message[];
  lastMessage: Message;
  unreadCount: number;
};

const PROVIDER_NAV = [
  { label: "Home", href: "/provider/dashboard", icon: Home },
  { label: "Services", href: "/provider/services", icon: BriefcaseBusiness },
  { label: "Bookings", href: "/provider/bookings", icon: CalendarDays },
  { label: "Messages", href: "/provider/messages", icon: MessageCircle },
  { label: "Wallet", href: "/provider/earnings", icon: Wallet },
  { label: "Analytics", href: "/provider/analytics", icon: ChartNoAxesCombined },
  { label: "Settings", href: "/provider/settings", icon: Settings },
];

const FILTERS: {
  id: FilterType;
  label: string;
  icon: typeof Inbox;
}[] = [
  { id: "inbox", label: "Inbox", icon: Inbox },
  { id: "unread", label: "Unread", icon: MessageCircle },
  { id: "contacts", label: "Contacts", icon: Users },
  { id: "favourites", label: "Favourites", icon: Star },
];

const PROFILE_COLUMNS =
  "user_id, username, display_name, avatar_url, bio, country, languages, interests, languages_to_learn, cultures_to_explore, connection_goals";

function displayName(profile?: Profile | null) {
  return profile?.display_name || profile?.username || "NiaWorld member";
}

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");
}

function formatTime(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  if (date.toDateString() === new Date().toDateString()) {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

function Avatar({
  profile,
  size = "md",
}: {
  profile?: Profile | null;
  size?: "sm" | "md" | "lg";
}) {
  const name = displayName(profile);

  const sizeClass =
    size === "sm"
      ? "h-9 w-9 text-xs"
      : size === "lg"
        ? "h-16 w-16 text-lg"
        : "h-11 w-11 text-sm";

  return (
    <div
      title={name}
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-gradient-to-br from-emerald-800 to-amber-700 font-semibold text-white ${sizeClass}`}
    >
      {profile?.avatar_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={profile.avatar_url}
          alt={name}
          className="h-full w-full object-cover"
        />
      ) : (
        initials(name)
      )}
    </div>
  );
}

export default function ProviderMessagesPage() {
  const pathname = usePathname();
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState("");
  const [myProfile, setMyProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [contactIds, setContactIds] = useState<string[]>([]);

  const [activeUserId, setActiveUserId] = useState("");
  const [filter, setFilter] = useState<FilterType>("inbox");
  const [search, setSearch] = useState("");
  const [newPersonSearch, setNewPersonSearch] = useState("");
  const [messageText, setMessageText] = useState("");

  const [favourites, setFavourites] = useState<string[]>([]);
  const [showNewConversation, setShowNewConversation] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const activeProfile = profiles.find(
    (profile) => profile.user_id === activeUserId,
  );

  const loadMessages = useCallback(async () => {
    if (!userId) return;

    setLoadingMessages(true);

    try {
      const { data, error: queryError } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
        .order("created_at", { ascending: true })
        .limit(500);

      if (queryError) throw queryError;

      const rows = (data || []) as Message[];
      setMessages(rows);

      const participantIds = Array.from(
        new Set(
          rows
            .flatMap((message) => [
              message.sender_id,
              message.recipient_id,
            ])
            .filter((id) => id && id !== userId),
        ),
      );

      if (participantIds.length > 0) {
        const knownIds = new Set(
          profiles.map((profile) => profile.user_id),
        );

        const missingIds = participantIds.filter(
          (id) => !knownIds.has(id),
        );

        if (missingIds.length > 0) {
          const { data: people, error: peopleError } = await supabase
            .from("profiles")
            .select(PROFILE_COLUMNS)
            .in("user_id", missingIds);

          if (peopleError) throw peopleError;

          setProfiles((current) => {
            const byId = new Map(
              current.map((profile) => [profile.user_id, profile]),
            );

            for (const profile of (people || []) as Profile[]) {
              byId.set(profile.user_id, profile);
            }

            return Array.from(byId.values());
          });
        }
      }
    } catch (caught) {
      console.error("Failed to load provider messages:", caught);
      setError("Messages could not be loaded. Please try again.");
    } finally {
      setLoadingMessages(false);
    }
  }, [supabase, userId, profiles]);

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      setLoading(true);
      setError("");

      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (cancelled) return;

        if (!user) {
          setUserId("");
          setError("Sign in to access your provider messages.");
          setLoading(false);
          return;
        }

        setUserId(user.id);

        const { data: ownProfile, error: profileError } = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .eq("user_id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (cancelled) return;

        setMyProfile((ownProfile as Profile | null) || null);

        const { data: people, error: peopleError } = await supabase
          .from("profiles")
          .select(PROFILE_COLUMNS)
          .order("display_name", { ascending: true })
          .limit(500);

        if (peopleError) throw peopleError;
        if (cancelled) return;

        setProfiles((people || []) as Profile[]);

        const { data: relationships, error: relationshipError } =
          await supabase
            .from("connections")
            .select("id, requester_id, addressee_id, status")
            .or(
              `requester_id.eq.${user.id},addressee_id.eq.${user.id}`,
            )
            .eq("status", "accepted");

        if (relationshipError) throw relationshipError;
        if (cancelled) return;

        const ids = new Set<string>();

        for (const relationship of (relationships || []) as Connection[]) {
          const otherId =
            relationship.requester_id === user.id
              ? relationship.addressee_id
              : relationship.requester_id;

          if (otherId && otherId !== user.id) {
            ids.add(otherId);
          }
        }

        setContactIds(Array.from(ids));
      } catch (caught) {
        console.error("Provider messages initialization failed:", caught);

        if (!cancelled) {
          setError("We could not load your account. Please refresh.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;

    void loadMessages();

    const channel = supabase
      .channel(`provider-messages-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
        },
        () => {
          void loadMessages();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [supabase, userId, loadMessages]);

  useEffect(() => {
    if (!userId || !activeUserId) return;

    const unreadIds = messages
      .filter(
        (message) =>
          message.sender_id === activeUserId &&
          message.recipient_id === userId &&
          !message.read_at,
      )
      .map((message) => message.id);

    if (unreadIds.length === 0) return;

    let cancelled = false;
    const now = new Date().toISOString();

    async function markRead() {
      const { error: updateError } = await supabase
        .from("messages")
        .update({ read_at: now })
        .in("id", unreadIds);

      if (updateError) {
        console.error("Could not update read receipts:", updateError);
        return;
      }

      if (cancelled) return;

      setMessages((current) =>
        current.map((message) =>
          unreadIds.includes(message.id)
            ? { ...message, read_at: now }
            : message,
        ),
      );
    }

    void markRead();

    return () => {
      cancelled = true;
    };
  }, [activeUserId, userId, messages, supabase]);

  const conversations = useMemo(() => {
    const grouped = new Map<string, Message[]>();

    for (const message of messages) {
      const otherId =
        message.sender_id === userId
          ? message.recipient_id
          : message.sender_id;

      if (!otherId || otherId === userId) continue;

      const existing = grouped.get(otherId) || [];
      existing.push(message);
      grouped.set(otherId, existing);
    }

    const result: Conversation[] = [];

    for (const [personId, personMessages] of grouped.entries()) {
      const person = profiles.find(
        (profile) => profile.user_id === personId,
      );

      if (!person) continue;

      const ordered = [...personMessages].sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime(),
      );

      const lastMessage = ordered[ordered.length - 1];
      if (!lastMessage) continue;

      const unreadCount = ordered.filter(
        (message) =>
          message.sender_id === personId &&
          message.recipient_id === userId &&
          !message.read_at,
      ).length;

      result.push({
        person,
        messages: ordered,
        lastMessage,
        unreadCount,
      });
    }

    return result.sort(
      (a, b) =>
        new Date(b.lastMessage.created_at).getTime() -
        new Date(a.lastMessage.created_at).getTime(),
    );
  }, [messages, profiles, userId]);

  const unreadTotal = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
      ),
    [conversations],
  );

  const visibleConversations = useMemo(() => {
    const term = search.trim().toLowerCase();

    return conversations.filter((conversation) => {
      const personId = conversation.person.user_id;
      const name = displayName(conversation.person).toLowerCase();
      const username = (conversation.person.username || "").toLowerCase();

      if (term && !name.includes(term) && !username.includes(term)) {
        return false;
      }

      if (filter === "unread" && conversation.unreadCount === 0) {
        return false;
      }

      if (filter === "contacts" && !contactIds.includes(personId)) {
        return false;
      }

      if (filter === "favourites" && !favourites.includes(personId)) {
        return false;
      }

      return true;
    });
  }, [conversations, search, filter, contactIds, favourites]);

  const newConversationPeople = useMemo(() => {
    const term = newPersonSearch.trim().toLowerCase();

    return profiles
      .filter((profile) => profile.user_id !== userId)
      .filter((profile) => {
        if (!term) return true;

        return (
          displayName(profile).toLowerCase().includes(term) ||
          (profile.username || "").toLowerCase().includes(term)
        );
      })
      .slice(0, 30);
  }, [profiles, userId, newPersonSearch]);

  const activeConversation = conversations.find(
    (conversation) => conversation.person.user_id === activeUserId,
  );

  const activeMessages = activeConversation?.messages || [];
  const activeIsFavourite = favourites.includes(activeUserId);

  const currentFilterLabel =
    FILTERS.find((item) => item.id === filter)?.label || "Inbox";

  function selectFilter(nextFilter: FilterType) {
    setFilter(nextFilter);
    setSearch("");
  }

  function toggleFavourite(personId: string) {
    setFavourites((current) =>
      current.includes(personId)
        ? current.filter((id) => id !== personId)
        : [...current, personId],
    );
  }

  function startConversation(person: Profile) {
    setProfiles((current) =>
      current.some((profile) => profile.user_id === person.user_id)
        ? current
        : [...current, person],
    );

    setActiveUserId(person.user_id);
    setShowNewConversation(false);
    setNewPersonSearch("");
    setSearch("");
    setFilter("inbox");
    setError("");
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = messageText.trim();

    if (!content || !userId || !activeUserId || sending) return;

    setSending(true);
    setError("");

    try {
      const { error: insertError } = await supabase
        .from("messages")
        .insert({
          sender_id: userId,
          recipient_id: activeUserId,
          content,
        });

      if (insertError) throw insertError;

      setMessageText("");
      await loadMessages();
    } catch (caught) {
      console.error("Could not send provider message:", caught);
      setError("Your message was not sent. Please try again.");
    } finally {
      setSending(false);
    }
  }

  function handleComposerKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key === "Enter" &&
      !event.shiftKey &&
      !event.nativeEvent.isComposing
    ) {
      event.preventDefault();
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden bg-[#102d25] text-white"
      style={{
        backgroundImage:
          "linear-gradient(135deg, rgba(10,40,31,0.25), rgba(34,48,35,0.18)), url('/images/cultural-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      {/* DESKTOP PROVIDER SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[225px] flex-col border-r border-white/20 bg-[#102d25]/45 backdrop-blur-md lg:flex">
        <Link
          href="/provider/dashboard"
          className="flex h-[76px] shrink-0 items-center gap-3 border-b border-white/20 px-5"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/20 bg-white/10 text-xl font-bold text-amber-200">
            N
          </div>
          <div>
            <p className="text-lg font-bold tracking-wide text-white">
              NiaWorld
            </p>
            <p className="text-[9px] tracking-[0.16em] text-white/65">
              PROVIDER WORKSPACE
            </p>
          </div>
        </Link>

        <div className="px-4 pb-2 pt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.17em] text-white/60">
            Workspace
          </p>
        </div>

        <nav
          aria-label="Provider navigation"
          className="flex-none space-y-1 overflow-y-auto px-3"
        >
          {PROVIDER_NAV.map((item) => {
            const active =
              pathname === item.href ||
              pathname.startsWith(`${item.href}/`);

            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${
                  active
                    ? "border border-amber-200/25 bg-amber-200/15 text-amber-100"
                    : "text-white/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={1.8} />
                {item.label}

                {item.label === "Messages" && unreadTotal > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-300 px-1.5 text-[10px] font-bold text-[#173a2e]">
                    {unreadTotal > 99 ? "99+" : unreadTotal}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* MINI SIDEBAR INSIDE THE EXISTING PROVIDER SIDEBAR */}
        <div className="mx-4 my-4 border-t border-white/20 pt-4">
          <p className="mb-3 px-2 text-[10px] font-bold uppercase tracking-[0.15em] text-white/60">
            Message filters
          </p>

          <div className="space-y-1">
            {FILTERS.map((item) => {
              const Icon = item.icon;
              const selected = filter === item.id;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => selectFilter(item.id)}
                  aria-pressed={selected}
                  className={`flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                    selected
                      ? "border border-amber-200/30 bg-amber-200/15 text-amber-100"
                      : "text-white/85 hover:bg-white/10"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}

                  {item.id === "unread" && unreadTotal > 0 && (
                    <span className="ml-auto rounded-full bg-amber-300 px-2 py-0.5 text-[10px] font-bold text-[#173a2e]">
                      {unreadTotal > 99 ? "99+" : unreadTotal}
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setShowNewConversation(true)}
              className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-amber-100 transition hover:bg-amber-200/15"
            >
              <Plus size={18} />
              New conversation
            </button>
          </div>
        </div>

        <div className="mt-auto border-t border-white/20 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/[0.08] p-3">
            <Avatar profile={myProfile} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">
                {displayName(myProfile)}
              </p>
              <p className="text-[10px] text-white/65">
                Provider account
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN MESSAGES WORKSPACE */}
      <main className="relative flex min-h-0 flex-1 overflow-hidden pb-[68px] lg:ml-[225px] lg:p-4">
        <div className="mx-auto flex min-h-0 w-full max-w-[1600px] overflow-hidden border-white/20 bg-[#102d25]/20 shadow-2xl backdrop-blur-sm lg:rounded-2xl lg:border">
          {/* MOBILE MESSAGE FILTER RAIL */}
          <aside
            aria-label="Message filters"
            className={`${
              activeUserId ? "hidden md:flex" : "flex"
            } relative z-20 w-[58px] shrink-0 flex-col items-center border-r border-white/15 bg-[#102d25]/35 py-3 backdrop-blur-sm md:w-[64px] lg:hidden`}
          >
            <div className="mb-4 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/[0.08] text-amber-200">
              <MessageCircle size={20} />
            </div>

            <div className="flex w-full flex-1 flex-col items-center gap-2">
              {FILTERS.map((item) => {
                const selected = filter === item.id;
                const Icon = item.icon;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectFilter(item.id)}
                    aria-label={item.label}
                    aria-pressed={selected}
                    title={item.label}
                    className={`group/filter relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition ${
                      selected
                        ? "border-amber-200/40 bg-amber-200/20 text-amber-100"
                        : "border-transparent text-white/90 hover:border-white/15 hover:bg-white/10"
                    }`}
                  >
                    <Icon size={19} strokeWidth={1.8} />

                    {item.id === "unread" && unreadTotal > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-300 px-1 text-[9px] font-bold text-[#173a2e]">
                        {unreadTotal > 9 ? "9+" : unreadTotal}
                      </span>
                    )}

                    <span className="pointer-events-none absolute left-[50px] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/20 bg-[#102d25] px-3 py-2 text-xs font-semibold text-white shadow-xl group-hover/filter:block group-focus-visible/filter:block md:left-[58px]">
                      {item.label}
                    </span>
                  </button>
                );
              })}

              <div className="my-1 h-px w-8 shrink-0 bg-white/20" />

              <button
                type="button"
                onClick={() => setShowNewConversation(true)}
                aria-label="New conversation"
                title="New conversation"
                className="group/new relative mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-200/30 bg-amber-300/15 text-amber-100 transition hover:bg-amber-300/25"
              >
                <Plus size={21} />
                <span className="pointer-events-none absolute left-[50px] top-1/2 z-50 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-white/20 bg-[#102d25] px-3 py-2 text-xs font-semibold text-white shadow-xl group-hover/new:block group-focus-visible/new:block md:left-[58px]">
                  New conversation
                </span>
              </button>
            </div>
          </aside>

          {/* CONVERSATION LIST */}
          <aside
            className={`${
              activeUserId ? "hidden md:flex" : "flex"
            } w-[calc(100%-58px)] shrink-0 flex-col border-r border-white/15 bg-[#102d25]/25 backdrop-blur-sm sm:w-[300px] md:w-[270px] lg:w-[300px] xl:w-[340px]`}
          >
            <header className="flex h-[74px] shrink-0 items-center justify-between border-b border-white/15 px-4">
              <div className="min-w-0">
                <h1 className="truncate text-xl font-bold text-white">
                  Messages
                </h1>
                <p className="mt-0.5 text-xs text-white/80">
                  Customer conversations
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewConversation(true)}
                aria-label="New conversation"
                title="New conversation"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/40 bg-amber-300/15 text-amber-100 transition hover:bg-amber-300/25"
              >
                <Plus size={21} />
              </button>
            </header>

            <div className="shrink-0 px-3 py-3">
              <label htmlFor="provider-conversation-search" className="sr-only">
                Search conversations
              </label>

              <div className="flex h-11 items-center gap-2 rounded-xl border border-white/25 bg-black/20 px-3">
                <Search size={17} className="shrink-0 text-white/80" />
                <input
                  id="provider-conversation-search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search conversations..."
                  className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/70"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch("")}
                    aria-label="Clear search"
                    className="text-white/75 hover:text-white"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>

            <div className="flex shrink-0 items-center justify-between px-4 pb-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-white/80">
                {filter === "inbox" ? "All conversations" : currentFilterLabel}
              </p>
              <span className="text-xs text-white/75">
                {visibleConversations.length}
              </span>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {loading || loadingMessages ? (
                <p className="px-4 py-8 text-center text-sm text-white/85">
                  Loading conversations…
                </p>
              ) : visibleConversations.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-white/10 text-amber-100">
                    <MessageCircle size={22} />
                  </div>

                  <p className="text-sm font-semibold text-white">
                    {filter === "unread"
                      ? "You're all caught up"
                      : filter === "contacts"
                        ? "No contacts to show"
                        : filter === "favourites"
                          ? "No favourites yet"
                          : "No conversations yet"}
                  </p>

                  <p className="mt-2 text-xs leading-5 text-white/80">
                    {filter === "contacts"
                      ? "Your accepted connections will appear here."
                      : filter === "favourites"
                        ? "Use the star on a conversation to save it here."
                        : "Customer conversations will appear here when someone messages you."}
                  </p>

                  <button
                    type="button"
                    onClick={() => setShowNewConversation(true)}
                    className="mt-4 rounded-xl border border-amber-200/40 bg-amber-300/15 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-300/25"
                  >
                    New conversation
                  </button>
                </div>
              ) : (
                visibleConversations.map((conversation) => {
                  const person = conversation.person;
                  const personId = person.user_id;
                  const lastMessage = conversation.lastMessage;
                  const isActive = activeUserId === personId;
                  const sentByMe = lastMessage.sender_id === userId;

                  return (
                    <div
                      key={personId}
                      className={`group flex items-stretch border-b border-white/[0.12] transition ${
                        isActive ? "bg-white/15" : "hover:bg-white/[0.08]"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveUserId(personId);
                          setError("");
                        }}
                        className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
                      >
                        <Avatar profile={person} />

                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-white">
                              {displayName(person)}
                            </span>
                            <span className="shrink-0 text-[10px] text-white/75">
                              {formatTime(lastMessage.created_at)}
                            </span>
                          </span>

                          <span className="mt-1 flex items-center gap-1.5">
                            <span className="min-w-0 flex-1 truncate text-xs text-white/85">
                              {sentByMe ? "You: " : ""}
                              {lastMessage.content}
                            </span>

                            {conversation.unreadCount > 0 && (
                              <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber-300 px-1.5 text-[10px] font-bold text-[#173a2e]">
                                {conversation.unreadCount > 99
                                  ? "99+"
                                  : conversation.unreadCount}
                              </span>
                            )}
                          </span>

                          {person.country && (
                            <span className="mt-1 block truncate text-[10px] text-white/65">
                              {person.country}
                            </span>
                          )}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => toggleFavourite(personId)}
                        aria-label={
                          favourites.includes(personId)
                            ? "Remove from favourites"
                            : "Add to favourites"
                        }
                        title="Toggle favourite"
                        className="shrink-0 px-2 text-amber-200 hover:text-amber-100"
                      >
                        <Star
                          size={17}
                          fill={
                            favourites.includes(personId)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <footer className="flex h-[42px] shrink-0 items-center justify-between border-t border-white/15 px-4">
              <span className="text-xs font-medium text-white/80">
                Provider Inbox
              </span>
              <span className="text-[10px] text-white/75">
                {unreadTotal} unread
              </span>
            </footer>
          </aside>

          {/* CHAT PANEL */}
          <section
            className={`${
              activeUserId ? "flex" : "hidden md:flex"
            } min-w-0 flex-1 flex-col bg-[#102d25]/10`}
            aria-label="Customer chat"
          >
            {!activeUserId ? (
              <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl border border-white/25 bg-white/10 text-amber-100 shadow-lg backdrop-blur-sm">
                  <MessageCircle size={37} strokeWidth={1.5} />
                </div>

                <h2 className="mt-6 text-2xl font-bold text-white">
                  Your conversations start here
                </h2>

                <p className="mt-3 max-w-md text-sm leading-6 text-white/90">
                  Connect with customers, answer questions about your culture
                  and services, and build meaningful connections through NiaWorld.
                </p>

                <div className="mt-6 flex flex-wrap justify-center gap-3 text-xs text-white/85">
                  <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                    <MessageCircle size={14} />
                    Customer communication
                  </span>
                  <span className="flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-2 backdrop-blur-sm">
                    <LockKeyhole size={14} />
                    Respectful conversations
                  </span>
                </div>
              </div>
            ) : (
              <>
                <header className="z-10 flex h-[72px] shrink-0 items-center justify-between border-b border-white/20 bg-[#102d25]/45 px-3 backdrop-blur-md sm:px-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveUserId("")}
                      aria-label="Back to conversations"
                      className="flex h-10 w-9 shrink-0 items-center justify-center rounded-xl text-white hover:bg-white/10 md:hidden"
                    >
                      <ArrowLeft size={19} />
                    </button>

                    <Avatar profile={activeProfile} />

                    <div className="min-w-0">
                      <h2 className="truncate text-sm font-bold text-white sm:text-base">
                        {displayName(activeProfile)}
                      </h2>
                      <p className="mt-0.5 truncate text-xs text-white/80">
                        Customer conversation
                        {activeProfile?.country
                          ? ` · ${activeProfile.country}`
                          : ""}
                      </p>
                    </div>
                  </div>

                  <div className="ml-2 flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => toggleFavourite(activeUserId)}
                      aria-label={
                        activeIsFavourite
                          ? "Remove from favourites"
                          : "Add to favourites"
                      }
                      title="Toggle favourite"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-amber-200 hover:bg-white/10"
                    >
                      <Star
                        size={19}
                        fill={activeIsFavourite ? "currentColor" : "none"}
                      />
                    </button>

                    <button
                      type="button"
                      aria-label="Conversation options"
                      title="Conversation options"
                      className="flex h-10 w-10 items-center justify-center rounded-xl text-white/90 hover:bg-white/10"
                    >
                      <MoreHorizontal size={21} />
                    </button>
                  </div>
                </header>

                <div className="flex shrink-0 items-center gap-2 border-b border-white/15 bg-[#102d25]/35 px-4 py-2.5 text-xs text-white/90 backdrop-blur-sm">
                  <LockKeyhole size={14} className="shrink-0 text-amber-200" />
                  Keep communication respectful and never request passwords or
                  private payment details.
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-6 sm:py-6">
                  <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
                    <div className="mb-3 self-center rounded-full border border-white/20 bg-black/25 px-4 py-2 text-center text-[11px] font-medium text-white/90 backdrop-blur-sm">
                      NiaWorld · Real People. Real Cultures. Real Connections.
                    </div>

                    {activeMessages.length === 0 ? (
                      <div className="mt-8 self-center rounded-2xl border border-white/25 bg-[#102d25]/55 px-5 py-4 text-center shadow-lg backdrop-blur-md">
                        <p className="text-sm font-semibold text-white">
                          Start a conversation with{" "}
                          {displayName(activeProfile)}
                        </p>
                        <p className="mt-2 text-xs leading-5 text-white/90">
                          Welcome the customer and help them understand your
                          cultural experience or service.
                        </p>
                      </div>
                    ) : (
                      activeMessages.map((message, index) => {
                        const mine = message.sender_id === userId;
                        const previous = activeMessages[index - 1];

                        const showDate =
                          !previous ||
                          new Date(previous.created_at).toDateString() !==
                            new Date(message.created_at).toDateString();

                        return (
                          <div key={message.id} className="flex flex-col">
                            {showDate && (
                              <div className="my-3 self-center rounded-full border border-white/20 bg-black/35 px-3 py-1.5 text-[10px] font-semibold text-white/90 backdrop-blur-sm">
                                {new Date(message.created_at).toLocaleDateString(
                                  [],
                                  {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  },
                                )}
                              </div>
                            )}

                            <div
                              className={`flex ${
                                mine ? "justify-end" : "justify-start"
                              }`}
                            >
                              <div
                                className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-md sm:max-w-[75%] ${
                                  mine
                                    ? "rounded-br-md border border-emerald-100/25 bg-[#1b624b]/90 text-white"
                                    : "rounded-bl-md border border-white/25 bg-[#142c25]/85 text-white"
                                }`}
                              >
                                <p className="whitespace-pre-wrap break-words text-sm leading-6 text-white">
                                  {message.content}
                                </p>

                                <div className="mt-1 flex items-center justify-end gap-1.5">
                                  <span className="text-[10px] text-white/85">
                                    {formatTime(message.created_at)}
                                  </span>

                                  {mine && (
                                    <span
                                      title={message.read_at ? "Read" : "Sent"}
                                      aria-label={message.read_at ? "Read" : "Sent"}
                                      className={
                                        message.read_at
                                          ? "text-amber-200"
                                          : "text-white/80"
                                      }
                                    >
                                      {message.read_at ? (
                                        <CheckCheck size={13} />
                                      ) : (
                                        <Check size={13} />
                                      )}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="shrink-0 border-t border-white/20 bg-[#102d25]/55 px-3 py-3 backdrop-blur-md sm:px-5">
                  {error && (
                    <p
                      role="alert"
                      className="mx-auto mb-2 max-w-3xl text-xs font-medium text-amber-100"
                    >
                      {error}
                    </p>
                  )}

                  <form
                    onSubmit={sendMessage}
                    className="mx-auto flex max-w-3xl items-end gap-2"
                  >
                    <label htmlFor="provider-message-input" className="sr-only">
                      Write a message
                    </label>

                    <textarea
                      id="provider-message-input"
                      value={messageText}
                      onChange={(event) => setMessageText(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      placeholder="Reply to your customer..."
                      rows={1}
                      maxLength={5000}
                      className="max-h-28 min-h-[46px] min-w-0 flex-1 resize-none rounded-2xl border border-white/25 bg-black/25 px-4 py-3 text-sm leading-5 text-white outline-none placeholder:text-white/75 focus:border-amber-200/70 focus:ring-1 focus:ring-amber-200/30"
                    />

                    <button
                      type="submit"
                      disabled={!messageText.trim() || sending || !userId}
                      className="flex h-[46px] shrink-0 items-center justify-center gap-2 rounded-2xl border border-amber-200/40 bg-amber-300/20 px-4 text-sm font-bold text-amber-100 transition hover:bg-amber-300/30 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span className="hidden sm:inline">
                        {sending ? "Sending…" : "Send"}
                      </span>
                      <Send size={17} />
                    </button>
                  </form>

                  <p className="mx-auto mt-2 max-w-3xl text-[10px] text-white/75">
                    Enter to send · Shift + Enter for a new line
                  </p>
                </div>
              </>
            )}
          </section>
        </div>
      </main>

      {/* MOBILE PROVIDER NAVIGATION */}
      <nav
        aria-label="Provider mobile navigation"
        className="fixed inset-x-0 bottom-0 z-40 flex h-[68px] items-stretch justify-around border-t border-white/20 bg-[#102d25]/75 px-1 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {PROVIDER_NAV.map((item) => {
          const active =
            pathname === item.href ||
            pathname.startsWith(`${item.href}/`);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-center transition ${
                active
                  ? "text-amber-200"
                  : "text-white/85 hover:bg-white/10 hover:text-white"
              }`}
            >
              <span className="relative flex h-7 items-center justify-center">
                <Icon size={19} strokeWidth={1.8} />
                {item.label === "Messages" && unreadTotal > 0 && (
                  <span className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-amber-300" />
                )}
              </span>
              <span className="max-w-full truncate text-[9px] font-semibold leading-3 min-[380px]:text-[10px]">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* NEW CONVERSATION DIALOG */}
      {showNewConversation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-3 backdrop-blur-sm sm:p-6"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowNewConversation(false);
            }
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-conversation-title"
            className="flex max-h-[min(80dvh,650px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/20 bg-[#102d25]/95 shadow-2xl backdrop-blur-2xl"
          >
            <header className="flex shrink-0 items-center justify-between border-b border-white/15 px-4 py-4">
              <div>
                <h2
                  id="new-conversation-title"
                  className="text-lg font-bold text-white"
                >
                  New conversation
                </h2>
                <p className="mt-1 text-xs text-white/80">
                  Find a NiaWorld member
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowNewConversation(false)}
                aria-label="Close dialog"
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white/90 hover:bg-white/10"
              >
                <X size={20} />
              </button>
            </header>

            <div className="shrink-0 p-3">
              <label
                htmlFor="provider-new-person-search"
                className="sr-only"
              >
                Search members
              </label>

              <input
                id="provider-new-person-search"
                value={newPersonSearch}
                onChange={(event) => setNewPersonSearch(event.target.value)}
                placeholder="Search by name or username..."
                autoFocus
                className="h-11 w-full rounded-xl border border-white/20 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/70 focus:border-amber-200/60"
              />
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {loading ? (
                <p className="px-5 py-10 text-center text-sm text-white/85">
                  Loading members…
                </p>
              ) : newConversationPeople.length === 0 ? (
                <p className="px-5 py-10 text-center text-sm text-white/85">
                  No members found.
                </p>
              ) : (
                newConversationPeople.map((person) => (
                  <button
                    key={person.user_id}
                    type="button"
                    onClick={() => startConversation(person)}
                    className="flex w-full items-center gap-3 border-b border-white/10 px-4 py-3 text-left transition hover:bg-white/10"
                  >
                    <Avatar profile={person} />

                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-white">
                        {displayName(person)}
                      </span>
                      <span className="mt-1 block truncate text-xs text-white/75">
                        {person.country ||
                          (person.username
                            ? `@${person.username}`
                            : "NiaWorld member")}
                      </span>
                    </span>

                    <ChevronRight
                      size={18}
                      className="shrink-0 text-amber-200"
                    />
                  </button>
                ))
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
