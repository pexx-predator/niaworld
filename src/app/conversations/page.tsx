
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Profile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
};

type Booking = {
  id: string;
  customer_id: string;
  provider_id: string;
  created_at?: string;
  status?: string;
};

type Conversation = {
  userId: string;
  profile: Profile | null;
  lastMessage: Message | null;
  unreadCount: number;
  bookingCount: number;
};

const navigation = [
  { label: "Home", href: "/dashboard", icon: "⌂" },
  { label: "Discover", href: "/discover", icon: "◎" },
  { label: "Videos", href: "/videos", icon: "▶" },
  { label: "Conversations", href: "/conversations", icon: "☷" },
  { label: "Bookings", href: "/bookings", icon: "▣" },
  { label: "Wallet", href: "/wallet", icon: "◇" },
  { label: "Messages", href: "/messages", icon: "✉" },
  { label: "Profile", href: "/profile", icon: "◉" },
];

export default function ConversationsPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadConversations = useCallback(async () => {
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push("/auth");
      return;
    }

    setUserId(user.id);

    const { data: messageData, error: messageError } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, content, created_at, read_at")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (messageError) {
      setError(
        "Could not load conversations. Check the messages table and its permissions."
      );
      setLoading(false);
      return;
    }

    const { data: bookingData, error: bookingError } = await supabase
      .from("bookings")
      .select("id, customer_id, provider_id, created_at, status")
      .or(`customer_id.eq.${user.id},provider_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (bookingError) {
      setError(
        "Could not load booking-related conversations. Check the bookings table permissions."
      );
      setLoading(false);
      return;
    }

    const messages = (messageData ?? []) as Message[];
    const bookings = (bookingData ?? []) as Booking[];

    const conversationMap = new Map<
      string,
      {
        lastMessage: Message | null;
        unreadCount: number;
        bookingCount: number;
      }
    >();

    for (const message of messages) {
      const otherUserId =
        message.sender_id === user.id
          ? message.recipient_id
          : message.sender_id;

      if (!otherUserId || otherUserId === user.id) continue;

      const existing = conversationMap.get(otherUserId) ?? {
        lastMessage: null,
        unreadCount: 0,
        bookingCount: 0,
      };

      if (!existing.lastMessage) {
        existing.lastMessage = message;
      }

      if (message.recipient_id === user.id && !message.read_at) {
        existing.unreadCount += 1;
      }

      conversationMap.set(otherUserId, existing);
    }

    for (const booking of bookings) {
      const otherUserId =
        booking.customer_id === user.id
          ? booking.provider_id
          : booking.customer_id;

      if (!otherUserId || otherUserId === user.id) continue;

      const existing = conversationMap.get(otherUserId) ?? {
        lastMessage: null,
        unreadCount: 0,
        bookingCount: 0,
      };

      existing.bookingCount += 1;
      conversationMap.set(otherUserId, existing);
    }

    const participantIds = Array.from(conversationMap.keys());

    if (participantIds.length === 0) {
      setConversations([]);
      setLoading(false);
      return;
    }

    const { data: profileData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .in("id", participantIds);

    if (profilesError) {
      setError("Could not load member profiles. Please try again.");
      setLoading(false);
      return;
    }

    const profileMap = new Map<string, Profile>(
      ((profileData ?? []) as Profile[]).map((profile) => [
        profile.id,
        profile,
      ])
    );

    const result: Conversation[] = participantIds.map((participantId) => {
      const conversation = conversationMap.get(participantId)!;

      return {
        userId: participantId,
        profile: profileMap.get(participantId) ?? null,
        lastMessage: conversation.lastMessage,
        unreadCount: conversation.unreadCount,
        bookingCount: conversation.bookingCount,
      };
    });

    result.sort((a, b) => {
      const dateA = a.lastMessage
        ? new Date(a.lastMessage.created_at).getTime()
        : 0;
      const dateB = b.lastMessage
        ? new Date(b.lastMessage.created_at).getTime()
        : 0;

      return dateB - dateA;
    });

    setConversations(result);
    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    void loadConversations();
  }, [loadConversations]);

  const filteredConversations = conversations.filter((conversation) => {
    const name =
      conversation.profile?.full_name ??
      conversation.profile?.username ??
      "";

    return name.toLowerCase().includes(search.toLowerCase().trim());
  });

  function getDisplayName(profile: Profile | null) {
    return profile?.full_name || profile?.username || "NiaWorld member";
  }

  function formatDate(dateString: string) {
    const date = new Date(dateString);
    const now = new Date();

    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    }

    return date.toLocaleDateString([], {
      month: "short",
      day: "numeric",
    });
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#f8f5ed] pb-24 text-[#253d32] md:pb-8">
      {/* Clearly visible cultural background */}
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/cultural-background.jpg')",
        }}
      />

      {/* Very light overlay: no blur */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 bg-[#f8f5ed]/10"
      />

      {/* Desktop navigation */}
      <header className="relative z-10 hidden border-b border-white/40 bg-[#f8f5ed]/65 shadow-sm md:block">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-8 py-4">
          <Link
            href="/dashboard"
            className="text-2xl font-bold tracking-tight text-[#244c3b]"
          >
            NiaWorld<span className="text-[#bf704e]">.</span>
          </Link>

          <nav className="flex items-center gap-1">
            {navigation.map((item) => {
              const active = item.href === "/conversations";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    active
                      ? "bg-[#244c3b] text-white"
                      : "text-[#53675a] hover:bg-white/80 hover:text-[#244c3b]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-4 py-6 sm:px-6 md:py-10">
        <div className="mb-7 rounded-3xl border border-white/40 bg-[#fffdf7]/45 p-5 sm:p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a65f43]">
            Stay connected
          </p>

          <h1 className="mt-2 text-3xl font-bold tracking-tight text-[#244c3b] sm:text-4xl">
            Conversations
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-[#354f40] sm:text-base">
            Continue conversations, exchange cultural stories, and build
            meaningful connections with people around the world.
          </p>
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/60 bg-[#fffdf7]/65 shadow-xl shadow-[#344b37]/10">
          <div className="border-b border-[#e6e4d9]/80 p-4 sm:p-5">
            <label htmlFor="conversation-search" className="sr-only">
              Search conversations
            </label>

            <div className="flex items-center gap-3 rounded-2xl border border-[#dce2d8] bg-white/90 px-4">
              <span aria-hidden="true" className="text-lg text-[#718075]">
                ⌕
              </span>

              <input
                id="conversation-search"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search people..."
                className="min-h-12 w-full bg-transparent text-sm outline-none placeholder:text-[#8b978d]"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center text-sm text-[#64756a]">
              Loading your conversations…
            </div>
          ) : error ? (
            <div className="px-6 py-12 text-center">
              <p role="alert" className="text-sm leading-6 text-[#a04432]">
                {error}
              </p>

              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  void loadConversations();
                }}
                className="mt-5 rounded-full bg-[#244c3b] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#193a2c]"
              >
                Try again
              </button>
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-6 py-16 text-center sm:py-20">
              <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-[#e8eee3] text-3xl">
                🌍
              </div>

              <h2 className="text-xl font-semibold text-[#244c3b]">
                {search
                  ? "No matching conversations"
                  : "Your story starts here"}
              </h2>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#52665a]">
                {search
                  ? "Try searching with another name."
                  : "Discover people from different cultures and start a conversation to see it here."}
              </p>

              {!search && (
                <Link
                  href="/discover"
                  className="mt-6 inline-flex items-center justify-center rounded-full bg-[#244c3b] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#193a2c]"
                >
                  Discover people
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#e9e7dd]/80">
              {filteredConversations.map((conversation) => {
                const name = getDisplayName(conversation.profile);
                const lastMessage = conversation.lastMessage;

                return (
                  <Link
                    key={conversation.userId}
                    href={`/conversations/${conversation.userId}`}
                    className="group flex items-center gap-3 px-4 py-4 transition hover:bg-white/55 sm:gap-4 sm:px-5"
                  >
                    <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#244c3b] text-lg font-semibold text-[#fff8e9] sm:h-14 sm:w-14">
                      {conversation.profile?.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={conversation.profile.avatar_url}
                          alt={name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}

                      {conversation.unreadCount > 0 && (
                        <span className="absolute right-0 top-0 h-3 w-3 rounded-full border-2 border-white bg-[#bf704e]" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <h2 className="truncate font-semibold text-[#244c3b]">
                          {name}
                        </h2>

                        {lastMessage && (
                          <time
                            dateTime={lastMessage.created_at}
                            className="shrink-0 pt-0.5 text-[11px] text-[#53675a] sm:text-xs"
                          >
                            {formatDate(lastMessage.created_at)}
                          </time>
                        )}
                      </div>

                      <p className="mt-1 truncate text-sm text-[#52665a]">
                        {lastMessage
                          ? `${lastMessage.sender_id === userId ? "You: " : ""}${lastMessage.content}`
                          : "Start a conversation"}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {conversation.profile?.username && (
                          <span className="text-xs text-[#64756a]">
                            @{conversation.profile.username}
                          </span>
                        )}

                        {conversation.bookingCount > 0 && (
                          <span className="rounded-full bg-[#f1e5d9] px-2.5 py-1 text-[10px] font-medium text-[#8c543c]">
                            {conversation.bookingCount}{" "}
                            {conversation.bookingCount === 1
                              ? "booking"
                              : "bookings"}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex shrink-0 items-center gap-2">
                      {conversation.unreadCount > 0 && (
                        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-[#bf704e] px-1.5 text-xs font-semibold text-white">
                          {conversation.unreadCount > 99
                            ? "99+"
                            : conversation.unreadCount}
                        </span>
                      )}

                      <span
                        aria-hidden="true"
                        className="text-xl text-[#9aa69b] transition group-hover:translate-x-0.5 group-hover:text-[#244c3b]"
                      >
                        ›
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Mobile bottom navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/50 bg-[#fffdf7]/90 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-8px_25px_rgba(36,76,59,0.08)] md:hidden">
        <div className="mx-auto flex max-w-lg items-center justify-around">
          {navigation.map((item) => {
            const active = item.href === "/conversations";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition ${
                  active
                    ? "text-[#244c3b]"
                    : "text-[#7c897f] hover:text-[#244c3b]"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`flex h-7 w-9 items-center justify-center rounded-full text-xl ${
                    active ? "bg-[#e4ebdf]" : ""
                  }`}
                >
                  {item.icon}
                </span>

                <span className="truncate">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </main>
  );
}
