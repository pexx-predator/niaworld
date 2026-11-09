
"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

const CATEGORIES = [
  "Food & Cooking",
  "Culture & Traditions",
  "Music & Dance",
  "Travel & Places",
  "Languages",
  "Everyday Life",
] as const;

type Category = (typeof CATEGORIES)[number];
type VideoLoadState = "idle" | "signing" | "loading" | "ready" | "error";

type Profile = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
};

type VideoItem = {
  id: string;
  creator_id: string;
  title: string;
  caption: string;
  hashtags: string[];
  category: Category;
  storage_path: string;
  duration_seconds: number | null;
  views_count: number;
  created_at: string;
  video_url: string;
  creator: Profile | null;
  likes_count: number;
  comments_count: number;
  followers_count: number;
  liked: boolean;
  saved: boolean;
  following: boolean;
};

type CommentItem = {
  id: string;
  video_id: string;
  author_id: string;
  body: string;
  created_at: string;
  author: Profile | null;
};

type FeedTab = "for-you" | "following";

function formatCount(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }

  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return String(value);
}

function displayName(profile: Profile | null) {
  if (!profile) return "NiaWorld creator";

  return profile.display_name || profile.username || "NiaWorld creator";
}

function isAbortError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    error.name === "AbortError"
  );
}

export default function VideosPage() {
  const [supabase] = useState(() => createClient());

  const [userId, setUserId] = useState("");
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<FeedTab>("for-you");
  const [search, setSearch] = useState("");
  const [activeVideoId, setActiveVideoId] = useState("");

  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);

  const [videoUrls, setVideoUrls] = useState<Record<string, string>>({});
  const videoUrlsRef = useRef<Record<string, string>>({});
  const [videoLoadStates, setVideoLoadStates] = useState<
    Record<string, VideoLoadState>
  >({});
  const signedUrlRequests = useRef<Set<string>>(new Set());

  const feedRef = useRef<HTMLDivElement | null>(null);
  const videoElements = useRef<Map<string, HTMLVideoElement>>(new Map());
  const likeRequests = useRef<Set<string>>(new Set());

  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [commentsVideo, setCommentsVideo] = useState<VideoItem | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentSending, setCommentSending] = useState(false);

  const [notice, setNotice] = useState("");

  // Generate a signed URL only when a video is about to be watched.
  const ensureVideoUrl = useCallback(
    async (video: VideoItem, forceRefresh = false) => {
      if (!forceRefresh && videoUrlsRef.current[video.id]) {
        return;
      }

      if (signedUrlRequests.current.has(video.id)) {
        return;
      }

      signedUrlRequests.current.add(video.id);

      setVideoLoadStates((current) => ({
        ...current,
        [video.id]: "signing",
      }));

      try {
        const { data, error: signedError } = await supabase.storage
          .from("videos")
          .createSignedUrl(video.storage_path, 3600);

        if (signedError || !data?.signedUrl) {
          throw signedError ?? new Error("Could not prepare this video.");
        }

        videoUrlsRef.current[video.id] = data.signedUrl;

        setVideoUrls((current) => ({
          ...current,
          [video.id]: data.signedUrl,
        }));

        setVideoLoadStates((current) => ({
          ...current,
          [video.id]: "loading",
        }));
      } catch (err) {
        console.error("Could not prepare video URL:", err);

        setVideoLoadStates((current) => ({
          ...current,
          [video.id]: "error",
        }));
      } finally {
        signedUrlRequests.current.delete(video.id);
      }
    },
    [supabase],
  );

  const loadFeed = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        window.location.href = "/auth";
        return;
      }

      setUserId(user.id);

      const { data: videoRows, error: videoError } = await supabase
        .from("videos")
        .select(
          "id, creator_id, title, caption, hashtags, category, storage_path, duration_seconds, views_count, created_at",
        )
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(40);

      if (videoError) throw videoError;

      const rows = videoRows ?? [];

      if (rows.length === 0) {
        setVideos([]);
        setActiveVideoId("");
        setVideoUrls({});
        videoUrlsRef.current = {};
        setVideoLoadStates({});
        setLoading(false);
        return;
      }

      const videoIds = rows.map((video) => video.id);
      const creatorIds = [...new Set(rows.map((video) => video.creator_id))];

      const [
        profileResult,
        likesResult,
        commentsResult,
        followsResult,
        savesResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", creatorIds),

        supabase
          .from("video_likes")
          .select("video_id, user_id")
          .in("video_id", videoIds),

        supabase
          .from("video_comments")
          .select("video_id")
          .in("video_id", videoIds),

        supabase
          .from("video_follows")
          .select("follower_id, creator_id"),

        supabase
          .from("video_saves")
          .select("video_id, user_id")
          .eq("user_id", user.id)
          .in("video_id", videoIds),
      ]);

      if (profileResult.error) throw profileResult.error;
      if (likesResult.error) throw likesResult.error;
      if (commentsResult.error) throw commentsResult.error;
      if (followsResult.error) throw followsResult.error;
      if (savesResult.error) throw savesResult.error;

      const profileMap = new Map<string, Profile>(
        (profileResult.data ?? []).map((profile) => [
          profile.user_id,
          profile as Profile,
        ]),
      );

      const likes = likesResult.data ?? [];
      const commentRows = commentsResult.data ?? [];
      const follows = followsResult.data ?? [];
      const saves = savesResult.data ?? [];

      const loadedVideos: VideoItem[] = rows.map((video) => {
        const creatorFollows = follows.filter(
          (follow) => follow.creator_id === video.creator_id,
        );

        return {
          ...video,
          hashtags: video.hashtags ?? [],
          video_url: "",
          creator: profileMap.get(video.creator_id) ?? null,
          likes_count: likes.filter(
            (like) => like.video_id === video.id,
          ).length,
          comments_count: commentRows.filter(
            (comment) => comment.video_id === video.id,
          ).length,
          followers_count: creatorFollows.length,
          liked: likes.some(
            (like) =>
              like.video_id === video.id && like.user_id === user.id,
          ),
          saved: saves.some((save) => save.video_id === video.id),
          following: follows.some(
            (follow) =>
              follow.follower_id === user.id &&
              follow.creator_id === video.creator_id,
          ),
        } as VideoItem;
      });

      videoUrlsRef.current = {};
      signedUrlRequests.current.clear();
      setVideoUrls({});
      setVideoLoadStates(
        Object.fromEntries(
          loadedVideos.map((video) => [video.id, "idle"]),
        ) as Record<string, VideoLoadState>,
      );

      setVideos(loadedVideos);
      setActiveVideoId(loadedVideos[0]?.id ?? "");
      setAutoplayBlocked(false);
      setSoundEnabled(false);
    } catch (err) {
      console.error("NiaWorld Videos error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not load videos. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadFeed();
  }, [loadFeed]);

  const visibleVideos = useMemo(() => {
    let result = [...videos];

    if (activeTab === "following") {
      result = result.filter((video) => video.following);
    }

    const query = search.trim().toLowerCase();

    if (query) {
      result = result.filter((video) => {
        const creator = displayName(video.creator).toLowerCase();

        return (
          video.title.toLowerCase().includes(query) ||
          video.caption.toLowerCase().includes(query) ||
          creator.includes(query) ||
          video.hashtags.some((tag) => tag.toLowerCase().includes(query)) ||
          video.category.toLowerCase().includes(query)
        );
      });
    }

    return result;
  }, [videos, activeTab, search]);

  // Sign only the active video and the next video.
  useEffect(() => {
    if (!activeVideoId || visibleVideos.length === 0) return;

    const activeIndex = visibleVideos.findIndex(
      (video) => video.id === activeVideoId,
    );

    if (activeIndex < 0) return;

    const activeVideo = visibleVideos[activeIndex];
    const nextVideo = visibleVideos[activeIndex + 1];

    void ensureVideoUrl(activeVideo);

    if (nextVideo) {
      void ensureVideoUrl(nextVideo);
    }
  }, [activeVideoId, visibleVideos, ensureVideoUrl]);

  // Detect which video is most visible in the feed.
  useEffect(() => {
    const container = feedRef.current;
    if (!container || visibleVideos.length === 0) return;

    const elements = container.querySelectorAll<HTMLElement>(
      "[data-video-id]",
    );

    const observer = new IntersectionObserver(
      (entries) => {
        const mostVisible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (mostVisible) {
          const videoId = mostVisible.target.getAttribute("data-video-id");

          if (videoId) {
            setActiveVideoId(videoId);
          }
        }
      },
      {
        root: container,
        threshold: [0.35, 0.55, 0.7, 0.85],
      },
    );

    elements.forEach((element) => observer.observe(element));

    return () => observer.disconnect();
  }, [visibleVideos]);

  // Autoplay the active video using the current global sound preference.
  useEffect(() => {
    videoElements.current.forEach((element, videoId) => {
      if (videoId !== activeVideoId) {
        element.pause();
        return;
      }

      if (!activeVideoId || !videoUrls[activeVideoId]) return;

      element.muted = !soundEnabled;

      if (!element.paused) return;

      void element.play().then(
        () => {
          setAutoplayBlocked(false);
        },
        (playError: unknown) => {
          if (isAbortError(playError)) return;

          console.info("Video autoplay could not start:", playError);
          setAutoplayBlocked(true);
        },
      );
    });
  }, [activeVideoId, videoUrls, soundEnabled]);

  // One global sound button controls every video in the feed.
  async function toggleGlobalSound() {
    if (soundEnabled) {
      videoElements.current.forEach((element) => {
        element.muted = true;
      });

      setSoundEnabled(false);
      setAutoplayBlocked(false);
      return;
    }

    const activeElement = videoElements.current.get(activeVideoId);

    if (!activeElement || !videoUrls[activeVideoId]) {
      setNotice("Wait for the current video to load before enabling sound.");
      return;
    }

    activeElement.muted = false;
    activeElement.volume = 1;

    try {
      await activeElement.play();

      setSoundEnabled(true);
      setAutoplayBlocked(false);
    } catch (playError) {
      activeElement.muted = true;

      if (isAbortError(playError)) return;

      console.error("Could not enable video sound:", playError);
      setAutoplayBlocked(true);
      setNotice("Sound could not start. Tap the sound button to try again.");
    }
  }

  async function retryVideo(video: VideoItem) {
    const element = videoElements.current.get(video.id);

    if (element) {
      element.pause();
      element.removeAttribute("src");
      element.load();
    }

    delete videoUrlsRef.current[video.id];

    setVideoUrls((current) => {
      const next = { ...current };
      delete next[video.id];
      return next;
    });

    setVideoLoadStates((current) => ({
      ...current,
      [video.id]: "idle",
    }));

    await ensureVideoUrl(video, true);
  }

  useEffect(() => {
    if (!notice) return;

    const timeout = window.setTimeout(() => setNotice(""), 3500);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  function updateVideo(videoId: string, changes: Partial<VideoItem>) {
    setVideos((current) =>
      current.map((video) =>
        video.id === videoId ? { ...video, ...changes } : video,
      ),
    );
  }

  async function toggleLike(video: VideoItem) {
    if (!userId || likeRequests.current.has(video.id)) return;

    likeRequests.current.add(video.id);

    const previousLiked = video.liked;
    const previousCount = video.likes_count;
    const nextLiked = !previousLiked;

    updateVideo(video.id, {
      liked: nextLiked,
      likes_count: Math.max(
        0,
        previousCount + (nextLiked ? 1 : -1),
      ),
    });

    try {
      const result = nextLiked
        ? await supabase.from("video_likes").insert({
            video_id: video.id,
            user_id: userId,
          })
        : await supabase
            .from("video_likes")
            .delete()
            .eq("video_id", video.id)
            .eq("user_id", userId);

      if (result.error) throw result.error;
    } catch (err) {
      console.error("Could not update video like:", err);

      updateVideo(video.id, {
        liked: previousLiked,
        likes_count: previousCount,
      });

      setNotice("Could not update your like. Please try again.");
    } finally {
      likeRequests.current.delete(video.id);
    }
  }

  async function toggleSave(video: VideoItem) {
    if (!userId) return;

    const nextSaved = !video.saved;
    updateVideo(video.id, { saved: nextSaved });

    const result = nextSaved
      ? await supabase.from("video_saves").insert({
          video_id: video.id,
          user_id: userId,
        })
      : await supabase
          .from("video_saves")
          .delete()
          .eq("video_id", video.id)
          .eq("user_id", userId);

    if (result.error) {
      updateVideo(video.id, { saved: video.saved });
      setNotice("Could not update your saved videos.");
    } else {
      setNotice(nextSaved ? "Video saved." : "Video removed from saves.");
    }
  }

  async function toggleFollow(video: VideoItem) {
    if (!userId || video.creator_id === userId) return;

    const nextFollowing = !video.following;

    updateVideo(video.id, {
      following: nextFollowing,
      followers_count: Math.max(
        0,
        video.followers_count + (nextFollowing ? 1 : -1),
      ),
    });

    const result = nextFollowing
      ? await supabase.from("video_follows").insert({
          follower_id: userId,
          creator_id: video.creator_id,
        })
      : await supabase
          .from("video_follows")
          .delete()
          .eq("follower_id", userId)
          .eq("creator_id", video.creator_id);

    if (result.error) {
      updateVideo(video.id, {
        following: video.following,
        followers_count: video.followers_count,
      });

      setNotice("Could not update your follow.");
    } else {
      setVideos((current) =>
        current.map((item) =>
          item.creator_id === video.creator_id
            ? {
                ...item,
                following: nextFollowing,
                followers_count: Math.max(
                  0,
                  item.followers_count + (nextFollowing ? 1 : -1),
                ),
              }
            : item,
        ),
      );
    }
  }

  async function recordView(video: VideoItem) {
    if (!userId) return;

    const key = `niaworld-view-${video.id}`;

    if (sessionStorage.getItem(key)) return;

    sessionStorage.setItem(key, "1");

    const { error: viewError } = await supabase
      .from("video_views")
      .insert({
        video_id: video.id,
        viewer_id: userId,
      });

    if (viewError) {
      sessionStorage.removeItem(key);

      if (viewError.code !== "23505") {
        console.error("Could not record video view:", viewError);
      }

      return;
    }

    updateVideo(video.id, {
      views_count: video.views_count + 1,
    });
  }

  async function shareVideo(video: VideoItem) {
    const url = `${window.location.origin}/videos?video=${video.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: video.title,
          text: video.caption,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setNotice("Video link copied.");
      }
    } catch {
      // The user may cancel the native share dialog.
    }
  }

  async function openComments(video: VideoItem) {
    setCommentsVideo(video);
    setComments([]);
    setCommentsLoading(true);

    const { data, error: commentsError } = await supabase
      .from("video_comments")
      .select("id, video_id, author_id, body, created_at")
      .eq("video_id", video.id)
      .order("created_at", { ascending: true })
      .limit(100);

    if (commentsError) {
      setNotice("Could not load comments.");
      setCommentsLoading(false);
      return;
    }

    const commentRows = data ?? [];
    const authorIds = [
      ...new Set(commentRows.map((comment) => comment.author_id)),
    ];

    let profileMap = new Map<string, Profile>();

    if (authorIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", authorIds);

      profileMap = new Map(
        (profiles ?? []).map((profile) => [
          profile.user_id,
          profile as Profile,
        ]),
      );
    }

    setComments(
      commentRows.map((comment) => ({
        ...comment,
        author: profileMap.get(comment.author_id) ?? null,
      })) as CommentItem[],
    );

    setCommentsLoading(false);
  }

  async function submitComment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!commentsVideo || !userId || !commentText.trim()) return;

    setCommentSending(true);

    const body = commentText.trim();

    const { data, error: insertError } = await supabase
      .from("video_comments")
      .insert({
        video_id: commentsVideo.id,
        author_id: userId,
        body,
      })
      .select("id, video_id, author_id, body, created_at")
      .single();

    if (insertError) {
      setNotice("Your comment could not be posted.");
      setCommentSending(false);
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .eq("user_id", userId)
      .maybeSingle();

    setComments((current) => [
      ...current,
      {
        ...data,
        author: (profile as Profile | null) ?? null,
      },
    ]);

    setVideos((current) =>
      current.map((item) =>
        item.id === commentsVideo.id
          ? { ...item, comments_count: item.comments_count + 1 }
          : item,
      ),
    );

    setCommentText("");
    setCommentSending(false);
  }

  async function reportVideo(video: VideoItem) {
    const reason = window.prompt(
      "Choose a reason:\n" +
        "1. inappropriate_content\n" +
        "2. harassment\n" +
        "3. hate_or_discrimination\n" +
        "4. misinformation\n" +
        "5. copyright\n" +
        "6. spam\n" +
        "7. other",
    );

    if (!reason) return;

    const allowedReasons = [
      "inappropriate_content",
      "harassment",
      "hate_or_discrimination",
      "misinformation",
      "copyright",
      "spam",
      "other",
    ];

    const selectedReason = reason.trim();

    if (!allowedReasons.includes(selectedReason)) {
      setNotice("That report reason is not valid.");
      return;
    }

    const details = window.prompt("Additional details (optional):") ?? "";

    const { error: reportError } = await supabase
      .from("video_reports")
      .insert({
        video_id: video.id,
        reporter_id: userId,
        reason: selectedReason,
        details: details.slice(0, 1000),
      });

    if (reportError?.code === "23505") {
      setNotice("You have already reported this video.");
    } else if (reportError) {
      setNotice("Your report could not be submitted.");
    } else {
      setNotice("Thank you. Your report has been submitted.");
    }
  }

  async function uploadVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setUploadError("");

    const form = event.currentTarget;
    const formData = new FormData(form);

    const file = formData.get("video") as File | null;
    const title = String(formData.get("title") ?? "").trim();
    const caption = String(formData.get("caption") ?? "").trim();
    const category = String(formData.get("category") ?? "Everyday Life");

    if (!file || file.size === 0) {
      setUploadError("Choose a video to upload.");
      return;
    }

    if (file.size > 250 * 1024 * 1024) {
      setUploadError("Your video must be 250 MiB or smaller.");
      return;
    }

    if (
      !["video/mp4", "video/webm", "video/quicktime"].includes(file.type)
    ) {
      setUploadError("Use an MP4, WebM or MOV video.");
      return;
    }

    if (!title || title.length > 100) {
      setUploadError("Enter a title of up to 100 characters.");
      return;
    }

    if (caption.length > 2200) {
      setUploadError("Your caption is too long.");
      return;
    }

    if (!CATEGORIES.includes(category as Category)) {
      setUploadError("Choose a valid category.");
      return;
    }

    if (!userId) {
      setUploadError("Your session has expired. Please sign in again.");
      return;
    }

    const extension =
      file.type === "video/webm"
        ? "webm"
        : file.type === "video/quicktime"
          ? "mov"
          : "mp4";

    const videoId = crypto.randomUUID();
    const storagePath = `${userId}/${videoId}.${extension}`;

    const hashtags = [
      ...new Set(caption.match(/#[\p{L}\p{N}_]+/gu) ?? []),
    ].slice(0, 20);

    setUploading(true);

    try {
      const temporaryUrl = URL.createObjectURL(file);

      const duration = await new Promise<number | null>((resolve) => {
        const element = document.createElement("video");

        element.preload = "metadata";

        element.onloadedmetadata = () => {
          const seconds = Number.isFinite(element.duration)
            ? Math.round(element.duration)
            : null;

          URL.revokeObjectURL(temporaryUrl);
          resolve(seconds);
        };

        element.onerror = () => {
          URL.revokeObjectURL(temporaryUrl);
          resolve(null);
        };

        element.src = temporaryUrl;
      });

      const { error: storageError } = await supabase.storage
        .from("videos")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (storageError) throw storageError;

      const { error: insertError } = await supabase.from("videos").insert({
        id: videoId,
        creator_id: userId,
        title,
        caption,
        hashtags,
        category,
        storage_path: storagePath,
        duration_seconds: duration,
      });

      if (insertError) {
        await supabase.storage.from("videos").remove([storagePath]);
        throw insertError;
      }

      form.reset();
      setUploadOpen(false);
      setNotice("Your video has been published.");
      await loadFeed();
    } catch (err) {
      console.error("Video upload error:", err);

      setUploadError(
        err instanceof Error
          ? err.message
          : "Your video could not be uploaded.",
      );
    } finally {
      setUploading(false);
    }
  }

  function scrollToFirstVideo() {
    feedRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main
      className="h-[100dvh] overflow-hidden bg-[#F2F5F0] text-[#1F3529]"
      style={{
        backgroundImage: "url('/images/cultural-background.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex h-full min-h-0 flex-col bg-[#F2F5F0]/85">
        <header className="relative z-30 shrink-0 border-b border-[#DCE5DC] bg-[#F8FAF6]/95 backdrop-blur-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-3 sm:px-5">
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/discover"
                className="rounded-full border border-[#D5DED4] px-3 py-2 text-sm font-medium transition hover:bg-white"
              >
                ← <span className="hidden sm:inline">Discover</span>
              </Link>

              <Link
                href="/"
                className="text-lg font-extrabold tracking-tight text-[#244638]"
              >
                NiaWorld
              </Link>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setUploadOpen(true)}
                className="rounded-full bg-[#244638] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#315B47] sm:px-5"
              >
                + <span className="hidden sm:inline">Create video</span>
                <span className="sm:hidden">Create</span>
              </button>

              <Link
                href="/profile"
                className="hidden rounded-full border border-[#D5DED4] px-4 py-2.5 text-sm font-medium transition hover:bg-white sm:inline-flex"
              >
                My profile
              </Link>
            </div>
          </div>
        </header>

        <section className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col px-2 pt-2 sm:px-5 sm:pt-3">
          <div className="z-20 shrink-0 border-b border-[#DCE5DC]/80 bg-[#F2F5F0]/90 pb-2 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <p className="hidden text-[10px] font-bold uppercase tracking-[0.2em] text-[#65816B] sm:block">
                  NiaWorld community
                </p>
                <h1 className="text-xl font-black tracking-tight text-[#244638] sm:mt-0.5 sm:text-2xl">
                  Videos
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("for-you");
                    scrollToFirstVideo();
                  }}
                  className={`rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                    activeTab === "for-you"
                      ? "bg-[#244638] text-white"
                      : "border border-[#D5DED4] bg-white/80 text-[#42604B]"
                  }`}
                >
                  For You
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("following");
                    scrollToFirstVideo();
                  }}
                  className={`rounded-full px-3 py-2 text-xs font-bold transition sm:px-4 sm:text-sm ${
                    activeTab === "following"
                      ? "bg-[#244638] text-white"
                      : "border border-[#D5DED4] bg-white/80 text-[#42604B]"
                  }`}
                >
                  Following
                </button>
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  scrollToFirstVideo();
                }}
                placeholder="Search videos, creators, cultures..."
                aria-label="Search videos"
                className="min-w-0 flex-1 rounded-full border border-[#D5DED4] bg-white/90 px-4 py-2 text-xs outline-none transition focus:border-[#54815D] sm:text-sm"
              />

              <span className="shrink-0 text-[10px] font-medium text-[#607266] sm:text-xs">
                {visibleVideos.length} videos
              </span>

              <button
                type="button"
                onClick={() => void toggleGlobalSound()}
                disabled={
                  !activeVideoId ||
                  !videoUrls[activeVideoId] ||
                  videoLoadStates[activeVideoId] === "error"
                }
                aria-label={soundEnabled ? "Mute all videos" : "Unmute all videos"}
                aria-pressed={soundEnabled}
                title={soundEnabled ? "Mute videos" : "Turn video sound on"}
                className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-50 sm:px-4 sm:text-sm ${
                  soundEnabled
                    ? "border-[#244638] bg-[#244638] text-white"
                    : "border-[#D5DED4] bg-white text-[#315B47] hover:bg-[#E8F0E5]"
                }`}
              >
                <span aria-hidden="true">{soundEnabled ? "🔊" : "🔇"}</span>
                <span>{soundEnabled ? "Sound on" : "Sound off"}</span>
              </button>
            </div>
          </div>

          {notice && (
            <div
              role="status"
              className="absolute left-1/2 top-20 z-40 flex w-[calc(100%-2rem)] max-w-md -translate-x-1/2 items-center justify-between gap-3 rounded-xl border border-[#D5E5D5] bg-white px-4 py-3 text-sm text-[#315B47] shadow-lg"
            >
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                aria-label="Dismiss message"
              >
                ✕
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex min-h-0 flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-3 h-9 w-9 animate-spin rounded-full border-4 border-[#D8E4D7] border-t-[#315B47]" />
                <p className="text-sm text-[#607266]">
                  Loading NiaWorld videos...
                </p>
              </div>
            </div>
          ) : error ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
              <div className="w-full max-w-lg rounded-2xl border border-red-200 bg-white p-6 text-center">
                <p className="font-semibold text-red-700">
                  We couldn't load the videos.
                </p>
                <p className="mt-2 break-words text-sm text-[#607266]">
                  {error}
                </p>
                <button
                  type="button"
                  onClick={() => void loadFeed()}
                  className="mt-4 rounded-full bg-[#244638] px-5 py-2.5 text-sm font-semibold text-white"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : visibleVideos.length === 0 ? (
            <div className="flex min-h-0 flex-1 items-center justify-center p-4">
              <div className="flex w-full max-w-lg flex-col items-center justify-center rounded-3xl border border-[#DCE5DC] bg-white/90 p-8 text-center">
                <div className="text-5xl">🎬</div>
                <h2 className="mt-4 text-xl font-bold text-[#244638]">
                  {activeTab === "following"
                    ? "Your Following feed is empty"
                    : "No videos yet"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#607266]">
                  {activeTab === "following"
                    ? "Follow creators to see their latest videos here."
                    : "Be among the first to share a story with the NiaWorld community."}
                </p>
                <button
                  type="button"
                  onClick={() => setUploadOpen(true)}
                  className="mt-5 rounded-full bg-[#244638] px-6 py-3 text-sm font-bold text-white"
                >
                  + Upload a video
                </button>
              </div>
            </div>
          ) : (
            <div
              ref={feedRef}
              className="min-h-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth"
              style={{
                scrollbarWidth: "none",
                WebkitOverflowScrolling: "touch",
              }}
            >
              {visibleVideos.map((video, index) => {
                const isActive = activeVideoId === video.id;
                const loadState = videoLoadStates[video.id] ?? "idle";
                const isNext = visibleVideos[index - 1]?.id === activeVideoId;

                return (
                  <article
                    key={video.id}
                    data-video-id={video.id}
                    className="relative mx-auto h-full min-h-full w-full snap-start snap-always overflow-hidden bg-[#101713] sm:max-w-[900px] sm:rounded-2xl"
                  >
                    <video
                      ref={(element) => {
                        if (element) {
                          videoElements.current.set(video.id, element);
                        } else {
                          videoElements.current.delete(video.id);
                        }
                      }}
                      src={videoUrls[video.id] || undefined}
                      className="absolute inset-0 h-full w-full bg-[#101713] object-contain"
                      controls
                      playsInline
                      muted={!soundEnabled}
                      preload={isActive ? "auto" : isNext ? "metadata" : "none"}
                      onLoadStart={() => {
                        setVideoLoadStates((current) => ({
                          ...current,
                          [video.id]: "loading",
                        }));
                      }}
                      onWaiting={() => {
                        setVideoLoadStates((current) => ({
                          ...current,
                          [video.id]: "loading",
                        }));
                      }}
                      onStalled={() => {
                        setVideoLoadStates((current) => ({
                          ...current,
                          [video.id]: "loading",
                        }));
                      }}
                      onCanPlay={() => {
                        setVideoLoadStates((current) => ({
                          ...current,
                          [video.id]: "ready",
                        }));
                      }}
                      onPlaying={() => {
                        setVideoLoadStates((current) => ({
                          ...current,
                          [video.id]: "ready",
                        }));

                        if (isActive) {
                          setAutoplayBlocked(false);
                        }
                      }}
                      onError={() => {
                        setVideoLoadStates((current) => ({
                          ...current,
                          [video.id]: "error",
                        }));
                      }}
                      onPlay={() => {
                        if (activeVideoId === video.id) {
                          void recordView(video);
                        }
                      }}
                      onVolumeChange={(event) => {
                        const element = event.currentTarget;

                        if (activeVideoId === video.id) {
                          setSoundEnabled(!element.muted);
                        }
                      }}
                    />

                    {isActive && loadState !== "ready" && (
                      <div className="absolute inset-0 z-10 flex items-center justify-center bg-gradient-to-br from-[#14251B] via-[#203B2B] to-[#101713]">
                        {loadState === "error" ? (
                          <div className="max-w-xs px-5 text-center text-white">
                            <div className="text-3xl">⚠</div>
                            <p className="mt-3 text-sm font-semibold">
                              This video couldn't be loaded.
                            </p>
                            <p className="mt-1 text-xs text-white/70">
                              Check your connection and try again.
                            </p>
                            <button
                              type="button"
                              onClick={() => void retryVideo(video)}
                              className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-[#244638]"
                            >
                              Retry video
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center px-5 text-center text-white">
                            <div className="mb-4 h-10 w-10 animate-spin rounded-full border-4 border-white/25 border-t-white" />
                            <p className="text-sm font-semibold">
                              {loadState === "signing"
                                ? "Preparing video..."
                                : "Loading video..."}
                            </p>
                            <p className="mt-1 text-xs text-white/65">
                              This may take a moment on a slow connection.
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {autoplayBlocked && isActive && loadState === "ready" && (
                      <div className="absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-center px-4">
                        <button
                          type="button"
                          onClick={() => void toggleGlobalSound()}
                          className="flex items-center gap-3 rounded-full border border-white/30 bg-black/75 px-6 py-4 text-sm font-bold text-white shadow-2xl backdrop-blur-md transition hover:scale-105 hover:bg-black/90"
                        >
                          <span className="text-xl">▶</span>
                          <span>Tap to play with sound</span>
                          <span className="text-lg">🔊</span>
                        </button>
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/95 via-black/55 to-transparent px-4 pb-5 pt-32 sm:px-7 sm:pb-7">
                      <div className="pointer-events-auto max-w-[calc(100%-58px)] text-white">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-white/75 sm:text-xs">
                          {video.category}
                        </p>

                        <h2 className="mt-1 text-base font-extrabold sm:text-xl">
                          {video.title}
                        </h2>

                        <p className="mt-1 whitespace-pre-wrap break-words text-xs leading-5 text-white/90 sm:mt-2 sm:text-sm sm:leading-6">
                          {video.caption}
                        </p>

                        {video.hashtags.length > 0 && (
                          <p className="mt-2 flex flex-wrap gap-x-2 gap-y-1 text-xs font-semibold text-white sm:text-sm">
                            {video.hashtags.map((tag) => (
                              <span key={tag}>{tag}</span>
                            ))}
                          </p>
                        )}

                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#DCE9D8] text-sm font-bold text-[#244638] sm:h-9 sm:w-9">
                            {video.creator?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={video.creator.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              displayName(video.creator)
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-xs font-bold text-white sm:text-sm">
                              {displayName(video.creator)}
                            </p>
                            <p className="text-[10px] text-white/70 sm:text-xs">
                              @{video.creator?.username || "creator"}
                            </p>
                          </div>

                          {video.creator_id !== userId && (
                            <button
                              type="button"
                              onClick={() => void toggleFollow(video)}
                              className={`ml-1 rounded-full border px-3 py-1.5 text-[10px] font-bold transition sm:text-xs ${
                                video.following
                                  ? "border-white/60 bg-white/15 text-white"
                                  : "border-white bg-white text-[#244638]"
                              }`}
                            >
                              {video.following ? "Following" : "Follow"}
                            </button>
                          )}
                        </div>

                        <p className="mt-2 text-[10px] text-white/70 sm:text-xs">
                          {formatCount(video.views_count)} views
                        </p>
                      </div>
                    </div>

                    <div className="absolute bottom-24 right-2 z-20 flex flex-col items-center gap-4 text-white sm:bottom-28 sm:right-5 sm:gap-5">
                      <button
                        type="button"
                        onClick={() => void toggleLike(video)}
                        className="flex min-w-10 flex-col items-center gap-1 drop-shadow-md"
                        aria-label={video.liked ? "Unlike video" : "Like video"}
                      >
                        <span
                          className={`text-3xl transition sm:text-4xl ${
                            video.liked ? "scale-110 text-red-400" : "text-white"
                          }`}
                        >
                          {video.liked ? "♥" : "♡"}
                        </span>
                        <span className="text-[10px] font-bold sm:text-xs">
                          {formatCount(video.likes_count)}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void openComments(video)}
                        className="flex min-w-10 flex-col items-center gap-1 drop-shadow-md"
                        aria-label="Open comments"
                      >
                        <span className="text-2xl sm:text-3xl">◯</span>
                        <span className="text-[10px] font-bold sm:text-xs">
                          {formatCount(video.comments_count)}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void shareVideo(video)}
                        className="flex min-w-10 flex-col items-center gap-1 drop-shadow-md"
                        aria-label="Share video"
                      >
                        <span className="text-2xl sm:text-3xl">↗</span>
                        <span className="text-[10px] font-bold sm:text-xs">
                          Share
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void toggleSave(video)}
                        className="flex min-w-10 flex-col items-center gap-1 drop-shadow-md"
                        aria-label={video.saved ? "Unsave video" : "Save video"}
                      >
                        <span
                          className={`text-2xl sm:text-3xl ${
                            video.saved ? "text-[#B8E58B]" : "text-white"
                          }`}
                        >
                          {video.saved ? "▣" : "▢"}
                        </span>
                        <span className="text-[10px] font-bold sm:text-xs">
                          {video.saved ? "Saved" : "Save"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => void reportVideo(video)}
                        className="flex min-w-10 flex-col items-center gap-1 drop-shadow-md"
                        aria-label="Report video"
                      >
                        <span className="text-xl sm:text-2xl">⚑</span>
                        <span className="text-[10px] font-bold sm:text-xs">
                          Report
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#DCE5DC] bg-[#F8FAF6]/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-md sm:hidden">
          <div className="mx-auto grid max-w-lg grid-cols-5 items-center text-center">
            <Link href="/" className="py-1 text-xs font-semibold text-[#526457]">
              Home
            </Link>
            <Link
              href="/discover"
              className="py-1 text-xs font-semibold text-[#526457]"
            >
              Discover
            </Link>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="mx-auto flex h-10 w-12 items-center justify-center rounded-xl bg-[#244638] text-2xl font-bold text-white"
              aria-label="Create video"
            >
              +
            </button>
            <Link
              href="/messages"
              className="py-1 text-xs font-semibold text-[#526457]"
            >
              Messages
            </Link>
            <Link
              href="/profile"
              className="py-1 text-xs font-semibold text-[#526457]"
            >
              Profile
            </Link>
          </div>
        </nav>
      </div>

      {uploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-3 sm:p-6">
          <div className="my-auto w-full max-w-xl rounded-3xl bg-[#FAFCF8] p-5 shadow-2xl sm:p-7">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-[#65816B]">
                  Share your story
                </p>
                <h2 className="mt-1 text-2xl font-black text-[#244638]">
                  Create a video
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setUploadOpen(false)}
                className="rounded-full border border-[#D5DED4] px-3 py-2 text-lg"
                aria-label="Close upload"
              >
                ✕
              </button>
            </div>

            <form onSubmit={uploadVideo} className="mt-6 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#385343]">
                  Choose video
                </span>
                <input
                  name="video"
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  required
                  className="block w-full rounded-xl border border-dashed border-[#9DB49D] bg-white p-4 text-sm"
                />
                <span className="mt-1 block text-xs text-[#718074]">
                  MP4, WebM or MOV. Maximum size: 250 MiB.
                </span>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#385343]">
                  Video title
                </span>
                <input
                  name="title"
                  required
                  maxLength={100}
                  placeholder="Give your video a title"
                  className="w-full rounded-xl border border-[#D5DED4] bg-white px-4 py-3 text-sm outline-none focus:border-[#54815D]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#385343]">
                  Caption and hashtags
                </span>
                <textarea
                  name="caption"
                  rows={4}
                  maxLength={2200}
                  placeholder="Tell the community about your video. Add hashtags such as #Kenya or #Culture."
                  className="w-full resize-y rounded-xl border border-[#D5DED4] bg-white px-4 py-3 text-sm outline-none focus:border-[#54815D]"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#385343]">
                  Category
                </span>
                <select
                  name="category"
                  defaultValue="Everyday Life"
                  className="w-full rounded-xl border border-[#D5DED4] bg-white px-4 py-3 text-sm outline-none focus:border-[#54815D]"
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              {uploadError && (
                <p className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {uploadError}
                </p>
              )}

              <button
                type="submit"
                disabled={uploading}
                className="w-full rounded-full bg-[#244638] px-5 py-3.5 text-sm font-bold text-white transition hover:bg-[#315B47] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? "Uploading video..." : "Publish video"}
              </button>
            </form>
          </div>
        </div>
      )}

      {commentsVideo && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-5">
          <section className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-t-3xl bg-[#FAFCF8] shadow-2xl sm:rounded-3xl">
            <div className="flex items-center justify-between border-b border-[#DCE5DC] p-4">
              <div>
                <h2 className="font-bold text-[#244638]">Comments</h2>
                <p className="text-xs text-[#718074]">
                  {commentsVideo.title}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setCommentsVideo(null)}
                className="rounded-full border border-[#D5DED4] px-3 py-2"
                aria-label="Close comments"
              >
                ✕
              </button>
            </div>

            <div className="min-h-40 flex-1 space-y-4 overflow-y-auto p-4">
              {commentsLoading ? (
                <p className="py-8 text-center text-sm text-[#718074]">
                  Loading comments...
                </p>
              ) : comments.length === 0 ? (
                <p className="py-8 text-center text-sm text-[#718074]">
                  No comments yet. Start the conversation.
                </p>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#DCE9D8] text-sm font-bold text-[#244638]">
                      {displayName(comment.author).charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1 rounded-2xl bg-white p-3">
                      <p className="text-xs font-bold text-[#315B47]">
                        {displayName(comment.author)}
                      </p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm text-[#34483D]">
                        {comment.body}
                      </p>
                      <p className="mt-2 text-[11px] text-[#8A998C]">
                        {new Date(comment.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <form
              onSubmit={submitComment}
              className="flex gap-2 border-t border-[#DCE5DC] p-3"
            >
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                maxLength={1000}
                placeholder="Write a comment..."
                className="min-w-0 flex-1 rounded-full border border-[#D5DED4] bg-white px-4 py-3 text-sm outline-none focus:border-[#54815D]"
              />

              <button
                type="submit"
                disabled={commentSending || !commentText.trim()}
                className="rounded-full bg-[#244638] px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {commentSending ? "..." : "Post"}
              </button>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
