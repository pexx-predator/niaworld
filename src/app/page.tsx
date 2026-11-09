"use client";

import { useEffect, useRef, useState } from "react";
import KenyanCulture from "@/components/kenyanCulture";
import MembershipPlans from "@/components/MembershipPlans";
import { createClient } from "@/lib/supabase/client";

type Bubble = {
  id: number;
  x: number;
  y: number;
  size: number;
};

type HomeVideo = {
  id: string;
  title: string;
  caption: string | null;
  category: string;
  storage_path: string;
  created_at: string;
  videoUrl: string;
};

function NiaWorldMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 48 48" width="100%" height="100%" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="17.5" stroke="currentColor" strokeWidth="1.4" opacity="0.65" />
        <path d="M15 31V17L23 31V17" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M25 18L29.5 31L34 20L38.5 31L42 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 18C13 8.5 27 4.5 38 11.5" stroke="#E8B84A" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="38" cy="11.5" r="2.3" fill="#E8B84A" />
      </svg>
    </span>
  );
}

const sidebarItems = [
  { icon: "◎", title: "Explore the World", detail: "Countries and cultures", href: "/journey/explore" },
  { icon: "▶", title: "NiaWorld Videos", detail: "Watch stories from the community", href: "/videos" },
  { icon: "✳", title: "Food & Traditions", detail: "Flavours and customs", href: "/explore/food-flavours" },
  { icon: "⌖", title: "Places & Travel", detail: "Local knowledge and places", href: "/explore/places-travel" },
  { icon: "文", title: "Languages & Learning", detail: "Practise with real speakers", href: "/explore/languages" },
  { icon: "♧", title: "Meet the Community", detail: "People and conversations", href: "/auth" },
  { icon: "◇", title: "Events & Festivals", detail: "Celebrations around the world", href: "/explore/culture-heritage" },
];

const galleryItems = [
  {
    title: "Flavours of the world",
    category: "FOOD & CUISINE",
    description: "Discover the dishes, ingredients, and recipes that bring people together.",
    image: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85",
    className: "mosaic-food",
    href: "/explore/food-flavours",
  },
  {
    title: "Places worth discovering",
    category: "TRAVEL & PLACES",
    description: "Explore remarkable destinations through the people who know them best.",
    image: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1000&q=85",
    className: "mosaic-travel",
    href: "/explore/places-travel",
  },
  {
    title: "Traditions that connect us",
    category: "CULTURE & HERITAGE",
    description: "Discover celebrations, customs, and traditions passed between generations.",
    image: "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1000&q=85",
    className: "mosaic-culture",
    href: "/explore/culture-heritage",
  },
  {
    title: "Art, colour & creativity",
    category: "ART & CREATIVITY",
    description: "Explore the creative expressions that make every community distinctive.",
    image: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1000&q=85",
    className: "mosaic-art",
    href: "/explore/music-art",
  },
  {
    title: "The people behind the stories",
    category: "PEOPLE & STORIES",
    description: "Every person has a perspective worth hearing and a story worth sharing.",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85",
    className: "mosaic-people",
    href: "/auth",
  },
];

const experiencePillars = [
  {
    number: "01",
    icon: "✳",
    title: "Cultural discovery",
    subtitle: "Experience life beyond your borders.",
    description: "Explore traditions, food, celebrations, family customs, and the everyday details that make each culture unique.",
    image: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1000&q=85",
    href: "/explore/culture-heritage",
    linkText: "Explore cultures",
  },
  {
    number: "02",
    icon: "文",
    title: "Language practice",
    subtitle: "Learn through real conversations.",
    description: "Discover new expressions, practise speaking, and learn how people naturally communicate in their own languages.",
    image: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1000&q=85",
    href: "/explore/languages",
    linkText: "Explore languages",
  },
  {
    number: "03",
    icon: "⌖",
    title: "Travel & local knowledge",
    subtitle: "See places through local eyes.",
    description: "Discover destinations, local perspectives, neighbourhood stories, and the experiences that make a place memorable.",
    image: "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=1000&q=85",
    href: "/explore/places-travel",
    linkText: "Explore local life",
  },
  {
    number: "04",
    icon: "♡",
    title: "Human connection",
    subtitle: "Make room for meaningful conversations.",
    description: "Meet people with different backgrounds, exchange perspectives, share stories, and discover common ground.",
    image: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1000&q=85",
    href: "/auth",
    linkText: "Meet the community",
  },
];

const categories = [
  { slug: "food-flavours", icon: "◉", title: "Food & Flavours", text: "Taste the world through local dishes, ingredients, and recipes." },
  { slug: "places-travel", icon: "⌖", title: "Places & Travel", text: "Explore destinations, landscapes, and local discoveries." },
  { slug: "culture-heritage", icon: "✳", title: "Culture & Heritage", text: "Discover customs, celebrations, and stories from generations past." },
  { slug: "music-art", icon: "♫", title: "Music & Art", text: "Experience the sounds, designs, and creativity of different communities." },
  { slug: "languages", icon: "文", title: "Languages", text: "Learn expressions and discover new ways to communicate." },
  { slug: "everyday-life", icon: "♧", title: "Everyday Life", text: "See how people live, work, celebrate, and connect around the world." },
];

const journeySteps = [
  {
    number: "01",
    icon: "⌕",
    title: "Explore",
    description: "Discover experiences, people, cultures, and places that match your interests.",
    href: "/journey/explore",
    linkText: "Start exploring",
  },
  {
    number: "02",
    icon: "✳",
    title: "Find your experience",
    description: "Choose what interests you, learn about different perspectives, and discover who you would like to meet.",
    href: "/journey/discover",
    linkText: "Discover experiences",
  },
  {
    number: "03",
    icon: "♡",
    title: "Connect",
    description: "Take part in personal conversations, exchange perspectives, and experience another way of life.",
    href: "/auth",
    linkText: "Find your connection",
  },
  {
    number: "04",
    icon: "↗",
    title: "Share",
    description: "Bring your own stories, language, traditions, and experiences into a world of shared discovery.",
    href: "/journey/share",
    linkText: "Share your story",
  },
];

export default function Home() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const [homeVideos, setHomeVideos] = useState<HomeVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(true);

  const lastBubbleTime = useRef(0);
  const nextBubbleId = useRef(0);

  useEffect(() => {
    let active = true;

    async function loadHomeVideos() {
      const supabase = createClient();

      try {
        const { data, error } = await supabase
          .from("videos")
          .select("id, title, caption, category, storage_path, created_at")
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(3);

        if (error) throw error;

        const videosWithUrls = await Promise.all(
          (data ?? []).map(async (video) => {
            const { data: signedData, error: signedError } =
              await supabase.storage
                .from("videos")
                .createSignedUrl(video.storage_path, 3600);

            if (signedError || !signedData?.signedUrl) return null;

            return {
              ...video,
              videoUrl: signedData.signedUrl,
            } as HomeVideo;
          }),
        );

        if (active) {
          setHomeVideos(
            videosWithUrls.filter(
              (video): video is HomeVideo => video !== null,
            ),
          );
        }
      } catch (error) {
        console.error("Unable to load homepage videos:", error);
      } finally {
        if (active) setVideosLoading(false);
      }
    }

    loadHomeVideos();

    return () => {
      active = false;
    };
  }, []);

  function handlePointerMove(event: React.PointerEvent<HTMLElement>) {
    if (event.pointerType !== "mouse") return;

    const now = Date.now();
    if (now - lastBubbleTime.current < 90) return;

    lastBubbleTime.current = now;
    const id = nextBubbleId.current++;

    const bubble: Bubble = {
      id,
      x: event.clientX,
      y: event.clientY,
      size: 8 + Math.random() * 15,
    };

    setBubbles((current) => [...current.slice(-14), bubble]);

    window.setTimeout(() => {
      setBubbles((current) => current.filter((item) => item.id !== id));
    }, 850);
  }

  return (
    <main onPointerMove={handlePointerMove}>
      <div className="cursor-bubbles" aria-hidden="true">
        {bubbles.map((bubble) => (
          <span
            key={bubble.id}
            className="cursor-bubble"
            style={{
              left: bubble.x,
              top: bubble.y,
              width: bubble.size,
              height: bubble.size,
            }}
          />
        ))}
      </div>

      <div className="sidebar-edge" onMouseEnter={() => setSidebarOpen(true)} aria-hidden="true" />

      <aside
        className={`explore-sidebar ${sidebarOpen ? "sidebar-open" : ""}`}
        onMouseEnter={() => setSidebarOpen(true)}
        onMouseLeave={() => setSidebarOpen(false)}
        aria-label="Explore NiaWorld"
      >
        <div className="sidebar-brand">
          <NiaWorldMark />
          <span>NiaWorld</span>
        </div>

        <p className="sidebar-label">EXPLORE</p>

        <nav className="sidebar-links" aria-label="Explore categories">
          {sidebarItems.map((item) => (
            <a href={item.href} className="sidebar-link" key={item.title} onClick={() => setSidebarOpen(false)}>
              <span className="sidebar-icon" aria-hidden="true">{item.icon}</span>
              <span className="sidebar-link-copy">
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
            </a>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <span className="sidebar-note-icon">✦</span>
            <p>Curiosity brings us closer. Every story opens a new door.</p>
          </div>

          <a className="sidebar-join" href="/auth" onClick={() => setSidebarOpen(false)}>
            Join the community <span aria-hidden="true">↗</span>
          </a>
        </div>
      </aside>

      <button
        className="mobile-explore-button"
        type="button"
        aria-label={sidebarOpen ? "Close explore menu" : "Open explore menu"}
        aria-expanded={sidebarOpen}
        onClick={() => setSidebarOpen((open) => !open)}
      >
        {sidebarOpen ? "×" : "☰"}
        <span>{sidebarOpen ? "Close" : "Explore"}</span>
      </button>

      {sidebarOpen && (
        <button className="sidebar-dismiss" type="button" aria-label="Close explore menu" onClick={() => setSidebarOpen(false)} />
      )}

      <header className="site-header">
        <a className="brand" href="#home" aria-label="NiaWorld home">
          <NiaWorldMark />
          <span className="brand-name">Nia<span>World</span></span>
        </a>

        <nav className="main-nav" aria-label="Main navigation">
          <a className="nav-link active" href="#experiences">Experiences</a>
          <a className="nav-link" href="/videos">Videos</a>
          <a className="nav-link" href="#how-it-works">How it works</a>
          <a className="nav-link" href="/auth">Community</a>
        </nav>

        <div className="header-actions">
          <a className="login-link" href="/auth">Log in</a>
          <a className="provider-login-link" href="/auth?mode=provider">Login as Provider</a>
          <a className="button button-small" href="/auth">Join NiaWorld <span aria-hidden="true">↗</span></a>
        </div>
      </header>

      <section className="hero" id="home" aria-labelledby="hero-heading">
        <div className="hero-image" />
        <div className="hero-shade" />

        <div className="hero-content">
          <span className="eyebrow hero-eyebrow">
            <span className="eyebrow-dot" />
            REAL PEOPLE. REAL CULTURES. REAL CONNECTIONS.
          </span>

          <h1 id="hero-heading">
            Don't just explore the world.
            <span> Experience it through its people.</span>
          </h1>

          <p className="hero-description">
            Discover cultures, practise languages, explore local life, and share meaningful conversations with people whose stories bring the world closer.
          </p>

          <div className="hero-actions">
            <a className="button button-light" href="/journey/explore">Explore experiences <span aria-hidden="true">↗</span></a>
            <a className="hero-text-link" href="/videos">Watch NiaWorld Videos <span aria-hidden="true">▶</span></a>
            <a className="hero-text-link" href="#experiences">Find what inspires you <span aria-hidden="true">↓</span></a>
          </div>

          <div className="hero-bottom">
            <div className="hero-caption">
              <span className="caption-line" />
              <span>A world of experiences, connected by people</span>
            </div>
            <span className="hero-index">01 — EXPERIENCE</span>
          </div>
        </div>
      </section>

      <section className="intro-section section-pad" id="discover">
        <div className="intro-kicker">
          <span className="section-number">01</span>
          <span className="section-kicker">MORE THAN INFORMATION</span>
        </div>

        <div className="intro-grid">
          <h2>
            The world feels
            <span> closer when</span>
            <span className="green-text"> we connect through people.</span>
          </h2>

          <div className="intro-copy">
            <p className="intro-lead">
              A place can tell a story. A tradition can carry generations of meaning. But the people who live those experiences bring them to life.
            </p>
            <p>
              NiaWorld brings people and cultures closer through personal experiences. Discover the food, languages, places, traditions, and everyday lives that make our world remarkable. Learn from different perspectives, meet people beyond your borders, and find experiences that stay with you long after the conversation.
            </p>
            <a className="underlined-link" href="#experiences">Discover what you can experience <span aria-hidden="true">↗</span></a>
          </div>
        </div>

        <div className="intro-stat-row">
          <div className="intro-stat">
            <span className="stat-symbol">✳</span>
            <div><strong>Experience culture</strong><span>Discover traditions and ways of life</span></div>
          </div>
          <div className="intro-stat">
            <span className="stat-symbol">文</span>
            <div><strong>Learn together</strong><span>Practise languages through conversation</span></div>
          </div>
          <div className="intro-stat">
            <span className="stat-symbol">♡</span>
            <div><strong>Meet people</strong><span>Exchange stories and perspectives</span></div>
          </div>
        </div>
      </section>

      <section className="home-video-section section-pad" id="community-videos">
        <div className="video-section-heading">
          <div>
            <div className="intro-kicker">
              <span className="section-number">02</span>
              <span className="section-kicker">SEE THE WORLD THROUGH REAL PEOPLE</span>
            </div>
            <h2>
              Don't just imagine it.
              <span className="green-text"> Watch it come to life.</span>
            </h2>
            <p>
              Get a glimpse of real cultures, local experiences, food, places,
              and everyday life through videos shared by the NiaWorld community.
            </p>
          </div>

          <a className="button button-green video-view-all" href="/videos">
            Explore all videos <span aria-hidden="true">↗</span>
          </a>
        </div>

        {videosLoading ? (
          <div className="home-video-empty" aria-live="polite">
            <span className="video-empty-icon">▶</span>
            <p>Discovering the latest community stories...</p>
          </div>
        ) : homeVideos.length > 0 ? (
          <div className="home-video-grid">
            {homeVideos.map((video) => (
              <article className="home-video-card" key={video.id}>
                <div className="home-video-player">
                  <video
                    src={video.videoUrl}
                    controls
                    playsInline
                    preload="metadata"
                    aria-label={video.title}
                  />
                  <span className="home-video-category">{video.category}</span>
                </div>

                <div className="home-video-copy">
                  <h3>{video.title}</h3>
                  {video.caption && <p>{video.caption}</p>}
                  <a href="/videos" className="home-video-link">
                    Watch more stories <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="home-video-empty">
            <span className="video-empty-icon">▶</span>
            <h3>The next story could be yours.</h3>
            <p>
              NiaWorld videos bring cultures and everyday experiences closer.
              Visit the video community and discover what people are sharing.
            </p>
            <a className="button button-green" href="/videos">
              Discover NiaWorld videos <span aria-hidden="true">↗</span>
            </a>
          </div>
        )}

        <div className="video-join-strip">
          <div>
            <span className="video-join-kicker">HAVE A STORY TO SHARE?</span>
            <h3>Your culture deserves to be experienced.</h3>
            <p>Join NiaWorld, share your perspective, and help the world discover life through your eyes.</p>
          </div>
          <a className="button button-light" href="/auth?mode=provider">
            Share your story <span aria-hidden="true">↗</span>
          </a>
        </div>
      </section>

      <section className="experience-section section-pad" id="experiences">
        <div className="section-heading">
          <div>
            <div className="intro-kicker">
              <span className="section-number">03</span>
              <span className="section-kicker">YOUR WORLD OF EXPERIENCES</span>
            </div>
            <h2>Four ways to <span className="green-text">experience the world.</span></h2>
          </div>
          <p>
            Follow your curiosity. Whether you want to discover a culture, practise a language, learn about a destination, or meet someone new, there is more than one way to connect with the world.
          </p>
        </div>

        <div className="experience-grid">
          {experiencePillars.map((experience) => (
            <a href={experience.href} className="experience-card" key={experience.number}>
              <div className="experience-image-wrap">
                <img src={experience.image} alt={experience.title} loading="lazy" />
                <span className="experience-number">{experience.number}</span>
                <span className="experience-image-arrow" aria-hidden="true">↗</span>
              </div>
              <div className="experience-card-content">
                <span className="experience-icon" aria-hidden="true">{experience.icon}</span>
                <h3>{experience.title}</h3>
                <strong>{experience.subtitle}</strong>
                <p>{experience.description}</p>
                <span className="category-link">{experience.linkText} <span aria-hidden="true">↗</span></span>
              </div>
            </a>
          ))}
        </div>

        <div className="experience-bottom">
          <p>One world. Different perspectives. Experiences made meaningful through people.</p>
          <a className="underlined-link" href="/journey/explore">Explore NiaWorld <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="gallery-section section-pad" id="gallery">
        <div className="section-heading">
          <div>
            <div className="intro-kicker">
              <span className="section-number">04</span>
              <span className="section-kicker">A WORLD TO EXPLORE</span>
            </div>
            <h2>Many cultures. <span className="green-text">Endless stories.</span></h2>
          </div>
          <p>
            From the meals we share to the places we call home, discover the details that make cultures unique and humanity universal.
          </p>
        </div>

        <div className="culture-mosaic">
          {galleryItems.map((item, index) => (
            <a className={`mosaic-card ${item.className}`} href={item.href} key={item.title} aria-label={`Explore ${item.title}`}>
              <img src={item.image} alt={item.title} loading={index === 0 ? "eager" : "lazy"} />
              <span className="mosaic-shade" />
              <span className="mosaic-content">
                <span className="mosaic-category">{item.category}</span>
                <strong>{item.title}</strong>
                <span className="mosaic-description">{item.description}</span>
                <span className="mosaic-arrow" aria-hidden="true">↗</span>
              </span>
            </a>
          ))}
        </div>

        <p className="gallery-note">
          A glimpse of the world. Discover more stories, experiences, and perspectives across NiaWorld.
        </p>
      </section>

      <KenyanCulture />

      <section className="categories-section section-pad" id="categories">
        <div className="section-heading category-heading">
          <div>
            <div className="intro-kicker">
              <span className="section-number">05</span>
              <span className="section-kicker">FOLLOW YOUR CURIOSITY</span>
            </div>
            <h2>Where will your <span className="green-text">curiosity take you?</span></h2>
          </div>
          <p>
            Follow an interest, discover something unexpected, or start with a part of the world you have always wanted to understand.
          </p>
        </div>

        <div className="category-grid">
          {categories.map((category, index) => (
            <a href={`/explore/${category.slug}`} className="category-card" key={category.slug}>
              <div className="category-top">
                <span className="category-icon" aria-hidden="true">{category.icon}</span>
                <span className="category-index">0{index + 1}</span>
              </div>
              <h3>{category.title}</h3>
              <p>{category.text}</p>
              <span className="category-link">Explore <span aria-hidden="true">↗</span></span>
            </a>
          ))}
        </div>
      </section>

      <section className="story-section section-pad" id="stories">
        <div className="story-image-wrap">
          <img
            src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85"
            alt="People spending time together and sharing an experience"
            loading="lazy"
          />
          <div className="story-image-label">
            <span className="story-label-dot" />
            Every person has a perspective
          </div>
        </div>

        <div className="story-copy">
          <div className="intro-kicker">
            <span className="section-number">06</span>
            <span className="section-kicker">THE HUMAN SIDE OF CULTURE</span>
          </div>
          <h2>Behind every tradition, <span className="green-text">there are people.</span></h2>
          <p>
            Culture is not only something we see in photographs or read about in books. It lives in the words our families use, the food prepared for special occasions, the music heard in our neighbourhoods, and the little rituals that make a place feel like home.
          </p>
          <p>
            NiaWorld celebrates the people who carry these stories. Through shared experiences and personal conversations, you can move beyond assumptions and discover the meaning behind different ways of life.
          </p>
          <a className="underlined-link" href="/auth">Meet the community <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <section className="how-section section-pad" id="how-it-works">
        <div className="how-heading">
          <div className="intro-kicker">
            <span className="section-number">07</span>
            <span className="section-kicker">YOUR JOURNEY STARTS HERE</span>
          </div>
          <h2>From curiosity to <span className="green-text">real connection.</span></h2>
          <p>
            Finding an experience should feel natural. Explore what interests you, discover people and perspectives, choose how you want to connect, and make room for a new experience.
          </p>
        </div>

        <div className="steps-grid">
          {journeySteps.map((step) => (
            <a className="step-card" href={step.href} key={step.title} aria-label={`${step.linkText}: ${step.title}`}>
              <span className="step-number">{step.number}</span>
              <span className="step-icon" aria-hidden="true">{step.icon}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <span className="category-link">{step.linkText} <span aria-hidden="true">↗</span></span>
            </a>
          ))}
        </div>
      </section>

      {/* Membership plans */}
      <MembershipPlans />

      <section className="community-section section-pad" id="community">
        <div className="community-copy">
          <div className="intro-kicker">
            <span className="section-number">08</span>
            <span className="section-kicker">A PLACE FOR EVERY STORY</span>
          </div>
          <h2>Your world is part of <span>our world.</span></h2>
          <p>
            You do not need to travel across the globe to discover something new. Sometimes, a conversation, a family recipe, a local tradition, or a different perspective can open the door to a whole new way of seeing the world.
          </p>
          <p>
            NiaWorld brings curious people together with those who have stories, knowledge, languages, and experiences to share. Wherever you come from, there is something meaningful you can discover and something valuable you can contribute.
          </p>
          <a className="button button-green" href="/auth">Become part of NiaWorld <span aria-hidden="true">↗</span></a>
        </div>

        <div className="community-art" aria-hidden="true">
          <div className="community-orbit orbit-one" />
          <div className="community-orbit orbit-two" />
          <div className="community-globe">
            <span className="globe-line globe-line-one" />
            <span className="globe-line globe-line-two" />
            <span className="globe-line globe-line-three" />
            <span className="globe-dot dot-one" />
            <span className="globe-dot dot-two" />
            <span className="globe-dot dot-three" />
            <span className="globe-dot dot-four" />
            <span className="globe-dot dot-five" />
          </div>
          <span className="orbit-caption caption-one">People</span>
          <span className="orbit-caption caption-two">Stories</span>
          <span className="orbit-caption caption-three">Cultures</span>
        </div>
      </section>

      <section className="closing-section section-pad" id="join">
        <div className="closing-inner">
          <span className="closing-star" aria-hidden="true">✳</span>
          <p className="closing-kicker">YOUR NEXT EXPERIENCE STARTS HERE</p>
          <h2>Don't just read about the world. Meet the people who bring it to life.</h2>
          <p>
            Discover a culture. Practise a language. Explore local life. Start a conversation. Find your next experience on NiaWorld.
          </p>
          <a className="button button-light closing-button" href="/journey/explore">Explore experiences <span aria-hidden="true">↗</span></a>
        </div>
      </section>

      <footer className="site-footer" id="login">
        <div className="footer-main">
          <a className="brand footer-brand" href="#home">
            <NiaWorldMark />
            <span className="brand-name">Nia<span>World</span></span>
          </a>
          <p>Real People. Real Cultures. Real Connections.</p>
          <a className="footer-back-top" href="#home">Back to top ↑</a>
        </div>
        <div className="footer-bottom">
          <span>© 2026 NiaWorld</span>
          <span>Built around curiosity, culture, and connection.</span>
        </div>
      </footer>

      <style jsx>{`
        .header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 18px;
        }

        .provider-login-link {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 42px;
          padding: 0 16px;
          border: 1px solid rgba(255, 255, 255, 0.72);
          border-radius: 999px;
          color: #fffdf5;
          background: rgba(255, 255, 255, 0.10);
          text-decoration: none;
          font-size: 0.82rem;
          font-weight: 700;
          white-space: nowrap;
          backdrop-filter: blur(8px);
          transition: background 180ms ease, border-color 180ms ease, transform 180ms ease;
        }

        .provider-login-link:hover {
          transform: translateY(-1px);
          border-color: #fffdf5;
          background: rgba(255, 255, 255, 0.22);
        }

        /* Homepage video showcase */
        .home-video-section {
          position: relative;
          overflow: hidden;
          background: linear-gradient(145deg, #f1f5e9 0%, #f8f8f0 55%, #edf3e7 100%);
        }

        .video-section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 32px;
          margin-bottom: 34px;
        }

        .video-section-heading > div {
          max-width: 720px;
        }

        .video-section-heading h2 {
          margin: 18px 0 12px;
          color: #263c2a;
          font-size: clamp(2rem, 4vw, 3.4rem);
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -0.045em;
        }

        .video-section-heading h2 span {
          display: block;
        }

        .video-section-heading > div > p {
          max-width: 620px;
          margin: 0;
          color: #657064;
          font-size: 1rem;
          line-height: 1.8;
        }

        .video-view-all {
          flex-shrink: 0;
        }

        .home-video-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
        }

        .home-video-card {
          min-width: 0;
          overflow: hidden;
          border: 1px solid rgba(49, 76, 48, 0.13);
          border-radius: 18px;
          background: #fff;
          box-shadow: 0 12px 35px rgba(30, 55, 30, 0.07);
          transition: transform 220ms ease, box-shadow 220ms ease;
        }

        .home-video-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 42px rgba(30, 55, 30, 0.13);
        }

        .home-video-player {
          position: relative;
          overflow: hidden;
          aspect-ratio: 16 / 10;
          background: #17251b;
        }

        .home-video-player video {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          background: #17251b;
        }

        .home-video-category {
          position: absolute;
          top: 12px;
          left: 12px;
          max-width: calc(100% - 24px);
          overflow: hidden;
          padding: 7px 11px;
          border: 1px solid rgba(255, 255, 255, 0.35);
          border-radius: 999px;
          color: #fff;
          background: rgba(20, 35, 23, 0.72);
          font-size: 0.65rem;
          font-weight: 800;
          letter-spacing: 0.08em;
          text-overflow: ellipsis;
          white-space: nowrap;
          backdrop-filter: blur(8px);
        }

        .home-video-copy {
          padding: 20px;
        }

        .home-video-copy h3 {
          margin: 0 0 9px;
          color: #263c2a;
          font-size: 1.1rem;
          line-height: 1.4;
        }

        .home-video-copy p {
          display: -webkit-box;
          overflow: hidden;
          margin: 0 0 17px;
          color: #687367;
          font-size: 0.86rem;
          line-height: 1.65;
          -webkit-box-orient: vertical;
          -webkit-line-clamp: 3;
        }

        .home-video-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #39713e;
          font-size: 0.82rem;
          font-weight: 750;
          text-decoration: none;
        }

        .home-video-link:hover {
          color: #1f4d1a;
        }

        .home-video-empty {
          display: flex;
          min-height: 230px;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 35px 22px;
          border: 1px dashed rgba(49, 76, 48, 0.25);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.6);
          text-align: center;
        }

        .video-empty-icon {
          display: grid;
          width: 54px;
          height: 54px;
          margin-bottom: 15px;
          place-items: center;
          border-radius: 50%;
          color: #fff;
          background: #356d3c;
          font-size: 1.2rem;
        }

        .home-video-empty h3 {
          margin: 0 0 8px;
          color: #263c2a;
          font-size: 1.25rem;
        }

        .home-video-empty p {
          max-width: 520px;
          margin: 0 0 20px;
          color: #657064;
          font-size: 0.9rem;
          line-height: 1.7;
        }

        .video-join-strip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 28px;
          margin-top: 30px;
          padding: 28px 32px;
          border-radius: 18px;
          color: #fff;
          background: #234d2b;
        }

        .video-join-strip > div {
          max-width: 650px;
        }

        .video-join-kicker {
          color: #e8b84a;
          font-size: 0.68rem;
          font-weight: 800;
          letter-spacing: 0.13em;
        }

        .video-join-strip h3 {
          margin: 8px 0;
          color: #fffdf5;
          font-size: clamp(1.25rem, 2.5vw, 1.8rem);
          line-height: 1.3;
        }

        .video-join-strip p {
          margin: 0;
          color: rgba(255, 255, 255, 0.76);
          font-size: 0.9rem;
          line-height: 1.65;
        }

        .video-join-strip .button {
          flex-shrink: 0;
          color: #234d2b;
          background: #f4f7ed;
        }

        .experience-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 20px;
          margin-top: 42px;
        }

        .experience-card {
          display: flex;
          flex-direction: column;
          min-width: 0;
          overflow: hidden;
          border: 1px solid rgba(49, 76, 48, 0.12);
          border-radius: 18px;
          background: rgba(255, 255, 255, 0.78);
          color: inherit;
          text-decoration: none;
          box-shadow: 0 12px 35px rgba(30, 55, 30, 0.055);
          transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
        }

        .experience-card:hover {
          transform: translateY(-6px);
          border-color: rgba(49, 110, 56, 0.32);
          box-shadow: 0 20px 42px rgba(30, 55, 30, 0.12);
        }

        .experience-image-wrap {
          position: relative;
          height: 205px;
          overflow: hidden;
          background: #dce6d5;
        }

        .experience-image-wrap img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform 450ms ease;
        }

        .experience-card:hover .experience-image-wrap img {
          transform: scale(1.055);
        }

        .experience-number {
          position: absolute;
          top: 14px;
          left: 14px;
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          border: 1px solid rgba(255, 255, 255, 0.65);
          border-radius: 50%;
          color: #fff;
          background: rgba(22, 49, 30, 0.62);
          font-size: 0.72rem;
          font-weight: 700;
          backdrop-filter: blur(8px);
        }

        .experience-image-arrow {
          position: absolute;
          right: 14px;
          bottom: 14px;
          display: grid;
          width: 36px;
          height: 36px;
          place-items: center;
          border-radius: 50%;
          color: #244329;
          background: #f4f7ed;
          font-size: 1rem;
          transition: color 180ms ease, background 180ms ease, transform 180ms ease;
        }

        .experience-card:hover .experience-image-arrow {
          transform: rotate(45deg);
          color: #fff;
          background: #356d3c;
        }

        .experience-card-content {
          display: flex;
          flex: 1;
          flex-direction: column;
          align-items: flex-start;
          padding: 22px;
        }

        .experience-icon {
          display: grid;
          width: 38px;
          height: 38px;
          margin-bottom: 15px;
          place-items: center;
          border-radius: 12px;
          color: #356d3c;
          background: #e9f1df;
          font-size: 1.1rem;
        }

        .experience-card-content h3 {
          margin: 0 0 8px;
          color: #263c2a;
          font-size: 1.12rem;
          font-weight: 750;
          line-height: 1.3;
        }

        .experience-card-content > strong {
          margin-bottom: 10px;
          color: #477a43;
          font-size: 0.83rem;
          line-height: 1.45;
        }

        .experience-card-content p {
          margin: 0 0 20px;
          color: #657064;
          font-size: 0.88rem;
          line-height: 1.7;
        }

        .experience-card-content .category-link {
          margin-top: auto;
        }

        .experience-bottom {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          margin-top: 28px;
          padding-top: 22px;
          border-top: 1px solid rgba(49, 76, 48, 0.14);
        }

        .experience-bottom p {
          margin: 0;
          color: #647064;
          font-size: 0.9rem;
          line-height: 1.6;
        }

        @media (max-width: 1100px) {
          .experience-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 900px) {
          .header-actions { gap: 10px; }
          .provider-login-link {
            min-height: 38px;
            padding: 0 12px;
            font-size: 0.75rem;
          }
        }

        @media (max-width: 800px) {
          .video-section-heading {
            align-items: flex-start;
            flex-direction: column;
          }

          .home-video-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 700px) {
          .header-actions { gap: 8px; }
          .provider-login-link {
            min-height: 34px;
            padding: 0 10px;
            font-size: 0.68rem;
          }

          .experience-grid { gap: 14px; }
          .experience-image-wrap { height: 175px; }
          .experience-card-content { padding: 17px; }
          .experience-card-content h3 { font-size: 1rem; }
          .experience-card-content p { font-size: 0.82rem; }

          .experience-bottom {
            align-items: flex-start;
            flex-direction: column;
            gap: 12px;
          }

          .video-join-strip {
            align-items: flex-start;
            flex-direction: column;
            padding: 24px;
          }
        }

        @media (max-width: 540px) {
          .home-video-grid {
            grid-template-columns: 1fr;
          }

          .home-video-player {
            aspect-ratio: 16 / 10;
          }
        }

        @media (max-width: 480px) {
          .header-actions { gap: 7px; }
          .provider-login-link {
            padding: 0 8px;
            font-size: 0.63rem;
          }

          .experience-grid { grid-template-columns: 1fr; }
          .experience-image-wrap { height: 215px; }
          .experience-card-content { padding: 20px; }
        }
      `}</style>
    </main>
  );
}