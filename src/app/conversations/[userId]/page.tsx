
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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

export default function ConversationPage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-[#f8f5ed] text-[#253d32]">
          <p className="text-sm">Loading conversation…</p>
        </main>
      }
    >
      <ConversationContent />
    </Suspense>
  );
}

function ConversationContent() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();
  const otherUserId = params.userId;

  const [supabase] = useState(() => createClient());
  const [currentUserId, setCurrentUserId] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);

  const loadConversation = useCallback(async () => {
    setError("");
    setLoading(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.push("/auth");
      return;
    }

    setCurrentUserId(user.id);

    if (!otherUserId || otherUserId === user.id) {
      setError("This conversation could not be opened.");
      setLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("profiles")
      .select("id, full_name, username, avatar_url")
      .eq("id", otherUserId)
      .maybeSingle();

    if (profileError) {
      setError("Could not load this person's profile.");
      setLoading(false);
      return;
    }

    setProfile(profileData as Profile | null);

    if (!profileData) {
      setMessages([]);
      setLoading(false);
      return;
    }

    const { data: messageData, error: messageError } = await supabase
      .from("messages")
      .select("id, sender_id, recipient_id, content, created_at, read_at")
      .or(
        `and(sender_id.eq.${user.id},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${user.id})`
      )
      .order("created_at", { ascending: true });

    if (messageError) {
      setError("Could not load messages. Check your messages table permissions.");
      setLoading(false);
      return;
    }

    const loadedMessages = (messageData ?? []) as Message[];
    setMessages(loadedMessages);

    const unreadIds = loadedMessages
      .filter(
        (message) =>
          message.recipient_id === user.id &&
          message.sender_id === otherUserId &&
          !message.read_at
      )
      .map((message) => message.id);

    if (unreadIds.length > 0) {
      const readAt = new Date().toISOString();

      const { error: readError } = await supabase
        .from("messages")
        .update({ read_at: readAt })
        .in("id", unreadIds);

      if (!readError) {
        setMessages((previous) =>
          previous.map((message) =>
            unreadIds.includes(message.id)
              ? { ...message, read_at: readAt }
              : message
          )
        );
      }
    }

    setLoading(false);
  }, [otherUserId, router, supabase]);

  useEffect(() => {
    void loadConversation();
  }, [loadConversation]);

  useEffect(() => {
    if (!currentUserId || !otherUserId) return;

    const channel = supabase
      .channel(`conversation-${currentUserId}-${otherUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          const incoming = payload.new as Message;

          const belongsToConversation =
            (incoming.sender_id === currentUserId &&
              incoming.recipient_id === otherUserId) ||
            (incoming.sender_id === otherUserId &&
              incoming.recipient_id === currentUserId);

          if (!belongsToConversation) return;

          setMessages((previous) => {
            if (previous.some((message) => message.id === incoming.id)) {
              return previous;
            }

            return [...previous, incoming].sort(
              (a, b) =>
                new Date(a.created_at).getTime() -
                new Date(b.created_at).getTime()
            );
          });

          if (
            incoming.sender_id === otherUserId &&
            incoming.recipient_id === currentUserId &&
            !incoming.read_at
          ) {
            const readAt = new Date().toISOString();

            void supabase
              .from("messages")
              .update({ read_at: readAt })
              .eq("id", incoming.id)
              .then(({ error: readError }) => {
                if (!readError) {
                  setMessages((previous) =>
                    previous.map((message) =>
                      message.id === incoming.id
                        ? { ...message, read_at: readAt }
                        : message
                    )
                  );
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUserId, otherUserId, supabase]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = messageText.trim();

    if (!content || !currentUserId || sending) return;

    setSending(true);
    setError("");

    const { data, error: sendError } = await supabase
      .from("messages")
      .insert({
        sender_id: currentUserId,
        recipient_id: otherUserId,
        content,
      })
      .select("id, sender_id, recipient_id, content, created_at, read_at")
      .single();

    if (sendError) {
      setError("Message could not be sent. Please try again.");
      setSending(false);
      return;
    }

    setMessages((previous) => {
      if (previous.some((message) => message.id === data.id)) {
        return previous;
      }

      return [...previous, data as Message];
    });

    setMessageText("");
    setSending(false);
  }

  const displayName =
    profile?.full_name || profile?.username || "NiaWorld member";

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-[#f8f5ed] text-[#253d32]">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/cultural-background.jpg')" }}
      />

      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[#f8f5ed]/80 backdrop-blur-[2px]"
      />

      <header className="relative z-10 border-b border-white/50 bg-[#f8f5ed]/85 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-4 sm:px-6">
          <button
            type="button"
            onClick={() => router.push("/conversations")}
            aria-label="Back to conversations"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#d9dfd4] bg-white/80 text-xl transition hover:bg-white"
          >
            ←
          </button>

          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#244c3b] text-lg font-semibold text-[#fff8e9]">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              displayName.charAt(0).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-base font-semibold sm:text-lg">
              {displayName}
            </h1>
            <p className="text-xs text-[#64756a]">
              {profile?.username
                ? `@${profile.username}`
                : "Cultural connection"}
            </p>
          </div>

          <Link
            href="/conversations"
            className="hidden rounded-full border border-[#d9dfd4] bg-white/70 px-4 py-2 text-sm font-medium transition hover:bg-white sm:inline-flex"
          >
            All conversations
          </Link>
        </div>
      </header>

      <section className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col px-3 py-4 sm:px-6 sm:py-6">
        <div className="flex min-h-[65vh] flex-1 flex-col overflow-hidden rounded-3xl border border-white/70 bg-[#fffdf7]/75 shadow-xl shadow-[#344b37]/10 backdrop-blur-md">
          <div className="border-b border-[#e6e4d9] px-5 py-4">
            <p className="text-sm font-medium">Your conversation</p>
            <p className="mt-1 text-xs leading-5 text-[#718075]">
              Share stories, traditions, languages, and everyday life with respect.
            </p>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center text-sm text-[#64756a]">
                Loading conversation…
              </div>
            ) : error && messages.length === 0 ? (
              <div className="mx-auto my-10 max-w-md rounded-2xl border border-[#ead8c9] bg-white/85 p-5 text-center">
                <p className="text-sm text-[#805b47]">{error}</p>
                <button
                  type="button"
                  onClick={() => void loadConversation()}
                  className="mt-4 rounded-full bg-[#244c3b] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#193a2c]"
                >
                  Try again
                </button>
              </div>
            ) : !profile ? (
              <div className="py-12 text-center text-sm text-[#64756a]">
                This member could not be found.
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto my-auto max-w-sm py-16 text-center">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#e8eee3] text-2xl">
                  🌍
                </div>
                <h2 className="text-lg font-semibold">
                  Start a cultural connection
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#64756a]">
                  Send the first message and begin getting to know each other.
                </p>
              </div>
            ) : (
              messages.map((message) => {
                const isMine = message.sender_id === currentUserId;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%] ${
                        isMine
                          ? "rounded-br-md bg-[#285640] text-white"
                          : "rounded-bl-md border border-[#e6e4d9] bg-white/95 text-[#253d32]"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words text-sm leading-6">
                        {message.content}
                      </p>

                      <div
                        className={`mt-2 flex items-center justify-end gap-2 text-[10px] ${
                          isMine ? "text-white/70" : "text-[#7c897f]"
                        }`}
                      >
                        <time dateTime={message.created_at}>
                          {new Date(message.created_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                        {isMine && message.read_at && <span>Read</span>}
                      </div>
                    </div>
                  </div>
                );
              })
            )}

            <div ref={bottomRef} />
          </div>

          {error && messages.length > 0 && (
            <p role="alert" className="px-5 pb-2 text-sm text-[#a04432]">
              {error}
            </p>
          )}

          <form
            onSubmit={sendMessage}
            className="border-t border-[#e6e4d9] bg-[#fffdf7]/90 p-3 sm:p-4"
          >
            <div className="flex items-end gap-2 sm:gap-3">
              <textarea
                value={messageText}
                onChange={(event) => setMessageText(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="Write a message…"
                rows={1}
                maxLength={5000}
                disabled={loading || !profile || sending}
                className="max-h-36 min-h-12 flex-1 resize-y rounded-2xl border border-[#dce2d8] bg-white/90 px-4 py-3 text-sm outline-none transition placeholder:text-[#8b978d] focus:border-[#66866e] focus:ring-2 focus:ring-[#66866e]/20 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!messageText.trim() || sending || loading || !profile}
                className="flex h-12 shrink-0 items-center justify-center rounded-2xl bg-[#244c3b] px-5 text-sm font-semibold text-white transition hover:bg-[#193a2c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {sending ? "Sending…" : "Send"}
              </button>
            </div>

            <p className="mt-2 px-1 text-[11px] text-[#7c897f]">
              Press Enter to send · Shift + Enter for a new line
            </p>
          </form>
        </div>
      </section>
    </main>
  );
}
