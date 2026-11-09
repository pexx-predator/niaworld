"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import MembershipPlans from "@/components/MembershipPlans";

type Profile = {
  username: string | null;
  display_name: string | null;
  country: string | null;
  avatar_url: string | null;
};

const navigation = [
  { id: "home", label: "Home", icon: "⌂" },
  { id: "discover", label: "Discover", icon: "◎" },
  { id: "conversations", label: "Conversations", icon: "◷" },
  { id: "bookings", label: "Bookings", icon: "▣" },
  { id: "wallet", label: "Wallet", icon: "◇" },
  { id: "messages", label: "Messages", icon: "✉" },
  { id: "profile", label: "Profile", icon: "◉" },
];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [loading, setLoading] = useState(true);
  const [memberName, setMemberName] = useState("Member");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeSection, setActiveSection] = useState("home");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMember() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        router.replace("/auth");
        return;
      }

      const user = data.user;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("username, display_name, country, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (profileError) {
        setErrorMessage(
          "Your account is signed in, but your profile details could not be loaded."
        );
      }

      if (profileData) {
        const memberProfile = profileData as Profile;
        setProfile(memberProfile);
        setMemberName(
          memberProfile.display_name?.trim() ||
            memberProfile.username?.trim() ||
            user.email?.split("@")[0] ||
            "Member"
        );
      } else {
        setMemberName(user.email?.split("@")[0] || "Member");
      }

      setLoading(false);
    }

    void loadMember();

    return () => {
      active = false;
    };
  }, [router, supabase]);

  useEffect(() => {
    if (loading) return;

    const sectionIds = navigation
      .filter(
        (item) =>
          item.id !== "discover" &&
          item.id !== "conversations" &&
          item.id !== "messages" &&
          item.id !== "profile"
      )
      .map((item) => item.id)
      .concat("account");

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visible) {
          setActiveSection(visible.target.id);
        }
      },
      {
        rootMargin: "-15% 0px -65% 0px",
        threshold: [0, 0.1, 0.3, 0.6],
      }
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [loading]);

  function navigateToSection(id: string) {
    const routes: Record<string, string> = {
      home: "/dashboard",
      discover: "/discover",
      conversations: "/conversations",
      bookings: "/bookings",
      wallet: "/wallet",
      messages: "/messages",
      profile: "/profile",
    };

    const destination = routes[id];

    if (destination) {
      router.push(destination);
    }
  }

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      setErrorMessage("Sign-out failed. Please try again.");
      return;
    }

    router.replace("/auth");
    router.refresh();
  }

  const profileCompletion = useMemo(() => {
    if (!profile) return 0;

    const fields = [
      profile.username,
      profile.display_name,
      profile.country,
    ];

    return Math.round(
      (fields.filter((field) => Boolean(field?.trim())).length /
        fields.length) *
        100
    );
  }, [profile]);

  if (loading) {
    return (
      <main className="loading-screen">
        <div className="background-image" aria-hidden="true" />
        <div className="background-overlay" aria-hidden="true" />
        <div className="loading-content">
          <div className="loading-mark">N</div>
          <p>Preparing your NiaWorld...</p>
        </div>

        <style jsx>{`
          .loading-screen {
            position: relative;
            isolation: isolate;
            min-height: 100vh;
            display: grid;
            place-content: center;
            justify-items: center;
            gap: 12px;
            color: #244c3a;
            font-family: Arial, sans-serif;
          }

          .background-image {
            position: fixed;
            inset: 0;
            z-index: -2;
            background-image: url("/images/cultural-background.jpg");
            background-position: center;
            background-size: cover;
            background-repeat: no-repeat;
          }

          .background-overlay {
            position: fixed;
            inset: 0;
            z-index: -1;
            background: rgba(247, 251, 255, 0.4);
          }

          .loading-content {
            display: grid;
            justify-items: center;
            gap: 12px;
            padding: 25px;
            border-radius: 16px;
            background: rgba(247, 251, 255, 0.86);
          }

          .loading-mark {
            display: grid;
            place-items: center;
            width: 52px;
            height: 52px;
            border-radius: 16px;
            background: #244c3a;
            color: white;
            font-family: Georgia, serif;
            font-size: 27px;
            font-weight: 700;
          }

          p {
            font-size: 13px;
          }
        `}</style>
      </main>
    );
  }

  return (
    <main className="dashboard">
      <div className="background-image" aria-hidden="true" />
      <div className="background-overlay" aria-hidden="true" />

      <header className="app-header">
        <Link href="/" className="brand">
          <span className="brand-mark">N</span>
          <span className="brand-name">NiaWorld</span>
        </Link>

        <nav className="desktop-navigation" aria-label="Main navigation">
          {navigation.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`nav-item ${
                activeSection === item.id ? "active" : ""
              }`}
              onClick={() => navigateToSection(item.id)}
              aria-current={
                activeSection === item.id ? "page" : undefined
              }
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <button
          type="button"
          className="sign-out"
          onClick={handleSignOut}
        >
          Sign out
        </button>
      </header>

      <nav className="mobile-navigation" aria-label="Mobile navigation">
        {navigation.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`mobile-nav-item ${
              activeSection === item.id ? "active" : ""
            }`}
            onClick={() => navigateToSection(item.id)}
            aria-label={item.label}
            aria-current={
              activeSection === item.id ? "page" : undefined
            }
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="page-content">
        {errorMessage && (
          <div className="error-banner" role="alert">
            {errorMessage}
            <button
              type="button"
              onClick={() => setErrorMessage("")}
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        )}

        <section id="home" className="dashboard-section home-section">
          <div className="welcome-panel">
            <span className="eyebrow">YOUR CULTURAL JOURNEY</span>

            <h1>
              Welcome back,
              <br />
              <span>{memberName}.</span>
            </h1>

            <p>
              Meet new perspectives, discover different cultures, and make
              meaningful connections with people around the world.
            </p>

            <button
              type="button"
              className="primary-button"
              onClick={() => navigateToSection("discover")}
            >
              Discover cultures <span>→</span>
            </button>

            <div className="globe-decoration" aria-hidden="true">
              <div className="globe-orbit orbit-one" />
              <div className="globe-orbit orbit-two" />
              <div className="globe-symbol">N</div>
            </div>
          </div>

          <div className="section-title">
            <span className="eyebrow">YOUR OVERVIEW</span>
            <h2>Your journey at a glance</h2>
          </div>

          <div className="overview-grid">
            <article className="overview-card">
              <span className="overview-icon">◷</span>
              <p>Conversation minutes</p>
              <h3>Not connected</h3>
              <span className="muted-note">
                Your available minutes will appear here when the subscription
                system is connected.
              </span>
            </article>

            <article className="overview-card">
              <span className="overview-icon">◎</span>
              <p>Cultural discovery</p>
              <h3>Explore something new</h3>
              <button
                type="button"
                className="text-button"
                onClick={() => navigateToSection("discover")}
              >
                Browse providers →
              </button>
            </article>

            <article className="overview-card">
              <span className="overview-icon">◉</span>
              <p>Profile completion</p>
              <h3>{profileCompletion}%</h3>
              <div
                className="progress-track"
                role="progressbar"
                aria-label="Profile completion"
                aria-valuenow={profileCompletion}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <span style={{ width: `${profileCompletion}%` }} />
              </div>
              <Link href="/profile" className="text-button">
                Update profile →
              </Link>
            </article>
          </div>

          <div className="section-title">
            <span className="eyebrow">QUICK ACCESS</span>
            <h2>Where would you like to go?</h2>
          </div>

          <div className="shortcut-grid">
            <button
              type="button"
              className="shortcut-card"
              onClick={() => navigateToSection("discover")}
            >
              <span>◎</span>
              <strong>Find a provider</strong>
              <small>Discover cultural conversations</small>
              <b>→</b>
            </button>

            <button
              type="button"
              className="shortcut-card"
              onClick={() => navigateToSection("conversations")}
            >
              <span>◷</span>
              <strong>My conversations</strong>
              <small>View your bookings and session history</small>
              <b>→</b>
            </button>

            <button
              type="button"
              className="shortcut-card"
              onClick={() => navigateToSection("wallet")}
            >
              <span>◇</span>
              <strong>Customer wallet</strong>
              <small>Manage your balance and payments</small>
              <b>→</b>
            </button>
          </div>
        </section>

        <section id="discover" className="dashboard-section content-section">
          <span className="eyebrow">MEET THE WORLD</span>
          <h2>Discover cultural conversation providers</h2>
          <p className="section-description">
            Find people who can share their culture, language, traditions, and
            everyday experiences.
          </p>

          <div className="feature-panel">
            <span className="feature-icon">◎</span>
            <h3>Your next cultural connection starts here.</h3>
            <p>
              The provider directory, search filters, availability, and
              booking options still need to be connected.
            </p>
            <span className="status-label">Provider discovery pending</span>
            <div>
              <button
                type="button"
                className="text-button"
                onClick={() => router.push("/discover")}
              >
                Open Discover →
              </button>
            </div>
          </div>
        </section>

        <section
          id="conversations"
          className="dashboard-section content-section"
        >
          <span className="eyebrow">YOUR SESSIONS</span>
          <h2>Conversations</h2>
          <p className="section-description">
            Keep track of upcoming cultural conversations and revisit your
            previous sessions.
          </p>

          <div className="two-column-grid">
            <article className="feature-panel">
              <span className="feature-icon">◷</span>
              <h3>Upcoming sessions</h3>
              <p>
                View your confirmed bookings, upcoming sessions, and pending
                requests on the Conversations page.
              </p>
              <button
                type="button"
                className="primary-button section-action"
                onClick={() => router.push("/conversations")}
              >
                View conversations <span>→</span>
              </button>
            </article>

            <article className="feature-panel">
              <span className="feature-icon">↺</span>
              <h3>Previous sessions</h3>
              <p>
                Revisit your completed sessions and check the status of your
                cultural conversation bookings.
              </p>
              <button
                type="button"
                className="text-button"
                onClick={() => router.push("/conversations")}
              >
                View session history →
              </button>
            </article>
          </div>
        </section>

        <div id="wallet" className="dashboard-section"><MembershipPlans /></div>

        <section id="messages" className="dashboard-section content-section">
          <span className="eyebrow">STAY CONNECTED</span>
          <h2>Messages</h2>
          <p className="section-description">
            Access messages related to your cultural conversations.
          </p>

          <div className="feature-panel">
            <span className="feature-icon">✉</span>
            <h3>Your conversation messages</h3>
            <p>
              The messaging system is not yet implemented. For now, use
              Conversations to review booking requests and session details.
            </p>
            <button
              type="button"
              className="primary-button section-action"
              onClick={() => router.push("/conversations")}
            >
              Open conversations <span>→</span>
            </button>
            <div>
              <span className="status-label">Messaging pending</span>
            </div>
          </div>
        </section>

        <section id="account" className="dashboard-section content-section">
          <span className="eyebrow">YOUR ACCOUNT</span>
          <h2>Account & settings</h2>
          <p className="section-description">
            Manage your member profile and access account options.
          </p>

          <div className="account-card">
            <div className="account-avatar">
              {profile?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.avatar_url} alt="" />
              ) : (
                memberName.charAt(0).toUpperCase()
              )}
            </div>

            <div className="account-details">
              <h3>{memberName}</h3>
              <p>{profile?.country || "Country not added yet"}</p>
              <span>Member profile</span>
            </div>

            <Link href="/profile" className="primary-button account-button">
              Edit profile →
            </Link>
          </div>

          <div className="settings-card">
            <div>
              <strong>Account settings</strong>
              <p>Additional settings will be added in a later step.</p>
            </div>
            <span className="status-label">Coming later</span>
          </div>

          <button
            type="button"
            className="sign-out-mobile"
            onClick={handleSignOut}
          >
            Sign out of NiaWorld
          </button>
        </section>

        <footer className="dashboard-footer">
          <Link href="/" className="footer-brand">
            NiaWorld
          </Link>
          <span>Real People. Real Cultures. Real Connections.</span>
        </footer>
      </div>

      <style jsx>{`
        .dashboard {
          --forest: #244c3a;
          --forest-dark: #183b2c;
          --terracotta: #bb6c4b;
          --cream: #f7fbff;
          --ink: #263c30;
          --muted: #66776b;
          min-height: 100vh;
          position: relative;
          isolation: isolate;
          color: var(--ink);
          font-family: Arial, Helvetica, sans-serif;
        }

        .background-image {
          position: fixed;
          inset: 0;
          z-index: -2;
          background-image: url("/images/cultural-background.jpg");
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
        }

        .background-overlay {
          position: fixed;
          inset: 0;
          z-index: -1;
          background: rgba(247, 251, 255, 0.4);
          pointer-events: none;
        }

        .app-header {
          position: fixed;
          z-index: 100;
          top: 0;
          right: 0;
          left: 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          min-height: 76px;
          padding: 12px 4%;
          border-bottom: 1px solid rgba(36, 76, 58, 0.13);
          background: rgba(247, 251, 255, 0.96);
          box-shadow: 0 4px 20px rgba(36, 76, 58, 0.05);
        }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
          color: var(--forest);
          text-decoration: none;
        }

        .brand-mark {
          display: grid;
          place-items: center;
          width: 42px;
          height: 42px;
          border-radius: 14px;
          background: var(--forest);
          color: white;
          font-family: Georgia, serif;
          font-size: 25px;
          font-weight: 700;
        }

        .brand-name {
          font-family: Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: -0.6px;
        }

        .desktop-navigation {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 5px;
        }

        .nav-item {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          min-height: 43px;
          padding: 0 13px;
          border: 0;
          border-radius: 11px;
          background: transparent;
          color: #647469;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          white-space: nowrap;
          transition: background 160ms ease, color 160ms ease;
        }

        .nav-item:hover {
          background: rgba(36, 76, 58, 0.07);
          color: var(--forest);
        }

        .nav-item.active {
          background: var(--forest);
          color: white;
        }

        .nav-icon {
          font-size: 18px;
        }

        .sign-out {
          flex-shrink: 0;
          padding: 10px 13px;
          border: 1px solid rgba(36, 76, 58, 0.2);
          border-radius: 10px;
          background: transparent;
          color: var(--forest);
          cursor: pointer;
          font: inherit;
          font-size: 12px;
        }

        .sign-out:hover {
          background: rgba(36, 76, 58, 0.07);
        }

        .mobile-navigation {
          display: none;
        }

        .page-content {
          width: min(1160px, 100%);
          margin: 0 auto;
          padding: 105px 30px 35px;
        }

        .dashboard-section {
          scroll-margin-top: 96px;
        }

        .home-section {
          padding-top: 4px;
        }

        .welcome-panel {
          position: relative;
          min-height: 305px;
          padding: 43px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.75);
          border-radius: 24px;
          background: rgba(247, 251, 255, 0.72);
          box-shadow: 0 12px 35px rgba(36, 76, 58, 0.06);
        }

        .welcome-panel > *:not(.globe-decoration) {
          position: relative;
          z-index: 2;
        }

        .eyebrow {
          color: var(--terracotta);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .welcome-panel h1 {
          margin: 17px 0 12px;
          color: var(--forest);
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(38px, 5vw, 57px);
          font-weight: 500;
          letter-spacing: -1.8px;
          line-height: 1.1;
        }

        .welcome-panel h1 span {
          color: var(--terracotta);
          overflow-wrap: anywhere;
        }

        .welcome-panel > p {
          max-width: 530px;
          margin: 0 0 22px;
          color: rgba(52, 70, 57, 0.84);
          font-size: 13px;
          line-height: 1.9;
        }

        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          min-height: 43px;
          padding: 0 17px;
          border: 0;
          border-radius: 10px;
          background: var(--forest);
          color: white;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          transition: background 160ms ease;
        }

        .primary-button:hover {
          background: var(--forest-dark);
        }

        .primary-button span {
          font-size: 17px;
        }

        .section-action {
          margin-top: 18px;
        }

        .globe-decoration {
          position: absolute;
          top: 50%;
          right: 8%;
          width: 230px;
          height: 230px;
          transform: translateY(-50%);
        }

        .globe-orbit {
          position: absolute;
          top: 50%;
          left: 50%;
          border: 1px solid rgba(36, 76, 58, 0.2);
          border-radius: 50%;
          transform: translate(-50%, -50%);
        }

        .orbit-one {
          width: 155px;
          height: 155px;
        }

        .orbit-two {
          width: 220px;
          height: 220px;
          border-color: rgba(187, 108, 75, 0.25);
        }

        .globe-symbol {
          position: absolute;
          top: 50%;
          left: 50%;
          display: grid;
          place-items: center;
          width: 105px;
          height: 105px;
          border: 1px solid rgba(36, 76, 58, 0.18);
          border-radius: 50%;
          background: rgba(220, 235, 221, 0.9);
          color: var(--forest);
          font-family: Georgia, serif;
          font-size: 51px;
          font-weight: 700;
          box-shadow: 0 10px 30px rgba(36, 76, 58, 0.1);
          transform: translate(-50%, -50%);
        }

        .section-title {
          margin: 35px 0 17px;
        }

        .section-title h2,
        .content-section > h2 {
          margin: 8px 0;
          color: var(--forest);
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(25px, 3vw, 34px);
          font-weight: 500;
          letter-spacing: -0.7px;
        }

        .overview-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .overview-card,
        .feature-panel,
        .shortcut-card,
        .account-card,
        .settings-card {
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 17px;
          background: rgba(247, 251, 255, 0.83);
          box-shadow: 0 8px 24px rgba(36, 76, 58, 0.045);
        }

        .overview-card {
          min-width: 0;
          padding: 21px;
        }

        .overview-icon,
        .feature-icon {
          display: grid;
          place-items: center;
          width: 40px;
          height: 40px;
          border-radius: 13px;
          background: #dcebdd;
          color: var(--forest);
          font-size: 21px;
        }

        .overview-card > p {
          margin: 17px 0 7px;
          color: rgba(52, 70, 57, 0.78);
          font-size: 12px;
        }

        .overview-card h3 {
          margin: 0 0 9px;
          color: var(--forest);
          font-size: 18px;
          line-height: 1.4;
          overflow-wrap: anywhere;
        }

        .muted-note {
          display: block;
          color: #778278;
          font-size: 11px;
          line-height: 1.7;
        }

        .text-button {
          display: inline-block;
          margin-top: 11px;
          padding: 0;
          border: 0;
          background: transparent;
          color: var(--terracotta);
          cursor: pointer;
          font: inherit;
          font-size: 11px;
          font-weight: 700;
          text-decoration: none;
        }

        .progress-track {
          height: 6px;
          margin-top: 12px;
          overflow: hidden;
          border-radius: 10px;
          background: rgba(36, 76, 58, 0.12);
        }

        .progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: var(--terracotta);
        }

        .shortcut-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
        }

        .shortcut-card {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          min-height: 160px;
          padding: 20px;
          color: var(--forest);
          cursor: pointer;
          text-align: left;
          transition: border-color 160ms ease, background 160ms ease;
        }

        .shortcut-card:hover {
          border-color: rgba(36, 76, 58, 0.3);
          background: rgba(247, 251, 255, 0.96);
        }

        .shortcut-card > span {
          margin-bottom: 15px;
          color: var(--terracotta);
          font-size: 23px;
        }

        .shortcut-card strong {
          font-size: 13px;
        }

        .shortcut-card small {
          margin-top: 7px;
          color: #738075;
          font-size: 11px;
          line-height: 1.6;
        }

        .shortcut-card b {
          position: absolute;
          right: 18px;
          bottom: 18px;
          font-size: 18px;
        }

        .content-section {
          padding: 37px 0 8px;
        }

        .section-description {
          max-width: 680px;
          margin: 0 0 22px;
          color: #657468;
          font-size: 13px;
          line-height: 1.9;
        }

        .feature-panel {
          padding: 25px;
        }

        .feature-panel h3 {
          margin: 17px 0 9px;
          color: var(--forest);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 22px;
          font-weight: 500;
        }

        .feature-panel p {
          max-width: 650px;
          margin: 0;
          color: rgba(52, 70, 57, 0.8);
          font-size: 12px;
          line-height: 1.9;
        }

        .status-label {
          display: inline-block;
          margin-top: 16px;
          padding: 7px 10px;
          border: 1px solid rgba(187, 108, 75, 0.18);
          border-radius: 20px;
          background: rgba(243, 215, 160, 0.25);
          color: #896346;
          font-size: 10px;
        }

        .two-column-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 16px;
        }

        .membership-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          align-items: stretch;
        }

        .membership-card {
          position: relative;
          display: flex;
          flex-direction: column;
          min-width: 0;
          padding: 25px 21px;
          border: 1px solid rgba(36, 76, 58, 0.14);
          border-radius: 18px;
          background: rgba(247, 251, 255, 0.91);
          box-shadow: 0 8px 24px rgba(36, 76, 58, 0.05);
        }

        .featured-plan {
          border: 2px solid #244c3a;
          background: rgba(247, 251, 255, 0.98);
        }

        .popular-label {
          align-self: flex-start;
          margin-bottom: 14px;
          padding: 6px 9px;
          border-radius: 20px;
          background: #244c3a;
          color: white;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .membership-card h3 {
          margin: 0 0 15px;
          color: #244c3a;
          font-family: Georgia, serif;
          font-size: 22px;
          font-weight: 500;
        }

        .membership-price {
          color: #244c3a;
          font-size: 38px;
          font-weight: 700;
          letter-spacing: -1.5px;
        }

        .membership-price > span {
          font-size: 20px;
          vertical-align: top;
        }

        .membership-price small {
          color: #748075;
          font-size: 11px;
          font-weight: 400;
          letter-spacing: 0;
        }

        .membership-minutes {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin: 19px 0;
          padding: 14px;
          border-radius: 12px;
          background: rgba(220, 235, 221, 0.65);
          color: #244c3a;
        }

        .membership-minutes strong {
          font-size: 24px;
        }

        .membership-minutes span {
          color: #66776b;
          font-size: 11px;
        }

        .membership-card > p {
          min-height: 48px;
          color: #66776b;
          font-size: 12px;
          line-height: 1.8;
        }

        .membership-card ul {
          display: grid;
          gap: 12px;
          margin: 12px 0 22px;
          padding: 0;
          color: #526457;
          font-size: 11px;
          list-style: none;
        }

        .plan-button,
        .secondary-plan-button {
          width: 100%;
          margin-top: auto;
        }

        .plan-button:disabled,
        .secondary-plan-button:disabled {
          cursor: wait;
          opacity: 0.65;
        }

        .secondary-plan-button {
          min-height: 43px;
          padding: 0 15px;
          border: 1px solid rgba(36, 76, 58, 0.3);
          border-radius: 10px;
          background: transparent;
          color: #244c3a;
          cursor: pointer;
          font: inherit;
          font-size: 12px;
          font-weight: 700;
        }

        .secondary-plan-button:hover:not(:disabled) {
          background: rgba(36, 76, 58, 0.07);
        }

        .plan-coming-soon {
          margin-top: 10px;
          color: #899187;
          font-size: 10px;
          text-align: center;
        }

        .payment-information {
          margin-top: 22px;
          padding: 23px;
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 17px;
          background: rgba(247, 251, 255, 0.83);
        }

        .payment-information h3 {
          margin: 14px 0 8px;
          color: #244c3a;
          font-family: Georgia, serif;
          font-size: 21px;
          font-weight: 500;
        }

        .payment-information p {
          max-width: 650px;
          color: #66776b;
          font-size: 12px;
          line-height: 1.8;
        }

        .account-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 23px;
        }

        .account-avatar {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          flex-shrink: 0;
          overflow: hidden;
          border-radius: 50%;
          background: #dcebdd;
          color: var(--forest);
          font-family: Georgia, serif;
          font-size: 25px;
          font-weight: 700;
        }

        .account-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .account-details {
          min-width: 0;
          flex: 1;
        }

        .account-details h3 {
          margin: 0 0 5px;
          color: var(--forest);
          font-size: 16px;
          overflow-wrap: anywhere;
        }

        .account-details p,
        .account-details > span {
          display: block;
          margin: 0 0 5px;
          color: #748075;
          font-size: 11px;
        }

        .account-button {
          flex-shrink: 0;
        }

        .settings-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-top: 14px;
          padding: 20px;
        }

        .settings-card strong {
          color: var(--forest);
          font-size: 13px;
        }

        .settings-card p {
          margin: 6px 0 0;
          color: #748075;
          font-size: 11px;
          line-height: 1.7;
        }

        .sign-out-mobile {
          display: none;
        }

        .error-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 16px;
          padding: 12px 15px;
          border: 1px solid #e2c7a6;
          border-radius: 10px;
          background: #fff9ed;
          color: #76553a;
          font-size: 12px;
          line-height: 1.6;
        }

        .error-banner button {
          flex-shrink: 0;
          border: 0;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font-size: 20px;
        }

        .dashboard-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-top: 35px;
          padding: 22px 0;
          border-top: 1px solid rgba(36, 76, 58, 0.12);
          color: #778278;
          font-size: 10px;
        }

        .footer-brand {
          color: var(--forest);
          font-family: Georgia, serif;
          font-size: 17px;
          font-weight: 700;
          text-decoration: none;
        }

        @media (max-width: 1050px) {
          .app-header {
            gap: 10px;
            padding-right: 20px;
            padding-left: 20px;
          }

          .brand-name {
            font-size: 19px;
          }

          .nav-item {
            gap: 5px;
            padding: 0 8px;
            font-size: 11px;
          }

          .sign-out {
            padding: 9px;
            font-size: 11px;
          }

          .globe-decoration {
            right: 3%;
            opacity: 0.7;
          }
        }

        @media (max-width: 900px) {
          .membership-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 760px) {
          .app-header {
            min-height: 62px;
            padding: 9px 17px;
          }

          .brand-mark {
            width: 38px;
            height: 38px;
            border-radius: 12px;
          }

          .brand-name {
            font-size: 20px;
          }

          .desktop-navigation,
          .app-header .sign-out {
            display: none;
          }

          .mobile-navigation {
            position: fixed;
            z-index: 200;
            right: 0;
            bottom: 0;
            left: 0;
            display: grid;
            grid-template-columns: repeat(7, minmax(0, 1fr));
            min-height: 70px;
            padding: 7px 3px max(7px, env(safe-area-inset-bottom));
            border-top: 1px solid rgba(36, 76, 58, 0.15);
            background: rgba(247, 251, 255, 0.98);
            box-shadow: 0 -5px 20px rgba(36, 76, 58, 0.08);
          }

          .mobile-nav-item {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
            min-width: 0;
            padding: 3px 1px;
            border: 0;
            border-radius: 10px;
            background: transparent;
            color: #728075;
            cursor: pointer;
            font: inherit;
            -webkit-tap-highlight-color: transparent;
          }

          .mobile-nav-item.active {
            background: rgba(36, 76, 58, 0.08);
            color: var(--forest);
          }

          .mobile-nav-icon {
            font-size: 21px;
            line-height: 1;
          }

          .mobile-nav-label {
            max-width: 100%;
            overflow: hidden;
            font-size: 9px;
            font-weight: 700;
            text-overflow: ellipsis;
            white-space: nowrap;
          }

          .page-content {
            padding: 80px 16px calc(95px + env(safe-area-inset-bottom));
          }

          .dashboard-section {
            scroll-margin-top: 75px;
          }

          .welcome-panel {
            min-height: 0;
            padding: 30px 22px;
            border-radius: 19px;
          }

          .welcome-panel h1 {
            font-size: clamp(35px, 9vw, 46px);
          }

          .welcome-panel > p {
            max-width: 100%;
            font-size: 12px;
          }

          .globe-decoration {
            top: 15px;
            right: -100px;
            opacity: 0.16;
            transform: scale(0.8);
          }

          .overview-grid,
          .shortcut-grid,
          .two-column-grid,
          .membership-grid {
            grid-template-columns: 1fr;
          }

          .overview-card {
            padding: 18px;
          }

          .shortcut-card {
            min-height: 140px;
          }

          .content-section {
            padding-top: 29px;
          }

          .feature-panel {
            padding: 21px;
          }

          .membership-card {
            padding: 23px 20px;
          }

          .account-card {
            flex-wrap: wrap;
            padding: 19px;
          }

          .account-button {
            width: 100%;
          }

          .settings-card {
            align-items: flex-start;
            flex-direction: column;
          }

          .sign-out-mobile {
            display: block;
            width: 100%;
            margin-top: 14px;
            padding: 13px;
            border: 1px solid rgba(36, 76, 58, 0.2);
            border-radius: 10px;
            background: rgba(247, 251, 255, 0.85);
            color: var(--forest);
            cursor: pointer;
            font: inherit;
            font-size: 12px;
          }

          .dashboard-footer {
            align-items: flex-start;
            flex-direction: column;
            padding-bottom: 10px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          *,
          *::before,
          *::after {
            scroll-behavior: auto !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
