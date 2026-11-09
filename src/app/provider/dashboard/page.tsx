
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Home,
  BriefcaseBusiness,
  CalendarDays,
  MessageCircle,
  Wallet,
  ChartNoAxesCombined,
  Settings,
  ArrowUpRight,
  ArrowRight,
  Globe2,
  LockKeyhole,
  Sparkles,
  RefreshCw,
  Video,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type ApplicationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "changes_requested";

interface ProviderApplication {
  status: ApplicationStatus;
  review_notes: string | null;
}

const navigation = [
  { label: "Home", icon: Home, href: "/provider/dashboard" },
  { label: "Services", icon: BriefcaseBusiness, href: "/provider/services" },
  { label: "Bookings", icon: CalendarDays, href: "/provider/bookings" },
  { label: "Messages", icon: MessageCircle, href: "/provider/messages" },
  { label: "Wallet", icon: Wallet, href: "/provider/earnings" },
  { label: "Analytics", icon: ChartNoAxesCombined, href: "/provider/analytics" },
  { label: "Videos", icon: Video, href: "/videos" },
  { label: "Settings", icon: Settings, href: "/provider/settings" },
];

const upcomingSteps = [
  {
    number: "01",
    title: "Complete your provider profile",
    description:
      "Introduce yourself, your culture, your languages and your interests.",
    href: "/provider/profile",
  },
  {
    number: "02",
    title: "Set up your services",
    description:
      "Choose the cultural experiences you would like to offer.",
    href: "/provider/services",
  },
  {
    number: "03",
    title: "Submit your application",
    description:
      "Send your details for the NiaWorld team to review.",
    href: "/provider/application",
  },
];

const statusDetails: Record<
  ApplicationStatus,
  { label: string; message: string; className: string }
> = {
  pending: {
    label: "Application pending",
    message:
      "Your application has been received and is waiting for review.",
    className: "status-pending",
  },
  under_review: {
    label: "Under review",
    message:
      "The NiaWorld team is currently reviewing your application.",
    className: "status-review",
  },
  approved: {
    label: "Application approved",
    message:
      "Your provider application has been approved. You can continue setting up your services.",
    className: "status-approved",
  },
  rejected: {
    label: "Application rejected",
    message:
      "Your application was not approved. Review the feedback below.",
    className: "status-rejected",
  },
  changes_requested: {
    label: "Changes requested",
    message:
      "The NiaWorld team needs some updates before your application can be approved.",
    className: "status-changes",
  },
};

export default function ProviderDashboardPage() {
  const [application, setApplication] =
    useState<ProviderApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadApplication() {
      try {
        const supabase = createClient();

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error("Your session could not be verified. Please sign in again.");
        }

        const { data, error } = await supabase
          .from("provider_applications")
          .select("status, review_notes")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          throw new Error("We couldn't load your application status. Please try again.");
        }

        if (active) {
          setApplication(data as ProviderApplication | null);
          setLoadError(null);
        }
      } catch (error) {
        if (active) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Something went wrong while loading your application.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadApplication();

    return () => {
      active = false;
    };
  }, []);

  const currentStatus = application
    ? statusDetails[application.status]
    : null;

  const isApproved = application?.status === "approved";
  const hasApplication = Boolean(application);

  const primaryActionHref = isApproved
    ? "/provider/services"
    : "/provider/application";

  const primaryActionLabel = isApproved
    ? "Manage your services"
    : hasApplication
      ? "View your application"
      : "Start your application";

  return (
    <main className="provider-shell">
      <div className="provider-background" aria-hidden="true" />
      <div className="provider-overlay" aria-hidden="true" />

      <aside className="provider-sidebar">
        <Link href="/provider/dashboard" className="provider-brand">
          <span className="brand-symbol">N</span>
          <span>
            <strong>NiaWorld</strong>
            <small>PROVIDER SPACE</small>
          </span>
        </Link>

        <p className="nav-caption">WORKSPACE</p>

        <nav className="desktop-navigation" aria-label="Provider navigation">
          {navigation.map((item) => {
            const Icon = item.icon;

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`navigation-link ${
                  item.label === "Home" ? "navigation-active" : ""
                }`}
                aria-current={item.label === "Home" ? "page" : undefined}
              >
                <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
                <span>{item.label}</span>
                {item.label === "Home" && <span className="active-dot" />}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-note">
          <Sparkles size={21} className="note-icon" />
          <strong>Your culture matters.</strong>
          <p>Share your world. Help someone discover something new.</p>
        </div>
      </aside>

      <section className="provider-content">
        <header className="provider-header">
          <div className="mobile-brand">
            <span className="brand-symbol">N</span>
            <strong>NiaWorld</strong>
          </div>

          <div className="header-spacer" />
          <span className="workspace-label">PROVIDER WORKSPACE</span>

          <Link
            href="/provider/settings"
            className="header-avatar"
            aria-label="Provider settings"
          >
            P
          </Link>
        </header>

        <div className="dashboard-main">
          <div className="welcome-row">
            <div>
              <p className="eyebrow">YOUR PROVIDER JOURNEY</p>
              <h1>Welcome to your space.</h1>
              <p className="welcome-description">
                Your journey to sharing your culture with the world starts here.
              </p>
            </div>

            <div
              className={`status-pill ${
                currentStatus?.className ?? "status-not-submitted"
              }`}
              aria-live="polite"
            >
              <span className="status-dot" />
              {loading
                ? "Checking application..."
                : loadError
                  ? "Status unavailable"
                  : currentStatus?.label ?? "Application not submitted"}
            </div>
          </div>

          {loadError && (
            <div className="application-feedback error-feedback" role="alert">
              <p>{loadError}</p>
              <button
                type="button"
                className="retry-button"
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={14} /> Reload dashboard
              </button>
            </div>
          )}

          {application?.review_notes && (
            <section className="application-feedback review-feedback">
              <p className="feedback-heading">Application review feedback</p>
              <p>{application.review_notes}</p>
            </section>
          )}

          <section className="intro-card">
            <div className="intro-copy">
              <span className="intro-kicker">YOUR WORLD. YOUR STORY.</span>
              <h2>
                {isApproved
                  ? "Your journey to sharing your culture starts now."
                  : "Make your culture someone’s next discovery."}
              </h2>
              <p>
                NiaWorld brings people together through real experiences,
                cultural knowledge, languages and everyday life. Prepare
                your provider profile to begin your application.
              </p>

              <Link href={primaryActionHref} className="primary-button">
                {loading ? "Checking your application" : primaryActionLabel}
                <ArrowRight size={16} />
              </Link>
            </div>

            <div className="intro-art" aria-hidden="true">
              <span className="art-orbit orbit-one" />
              <span className="art-orbit orbit-two" />
              <Globe2 className="art-globe" strokeWidth={1.2} />
              <Sparkles className="art-star star-one" />
              <Sparkles className="art-star star-two" />
              <span className="art-caption">
                Different roots.
                <br />
                One world.
              </span>
            </div>
          </section>

          <section className="progress-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">YOUR NEXT STEPS</p>
                <h2>Build your provider profile</h2>
              </div>
              <span className="progress-count">
                {loading
                  ? "Checking progress..."
                  : hasApplication
                    ? "Application submitted"
                    : "Application not started"}
              </span>
            </div>

            <div
              className="progress-track"
              role="progressbar"
              aria-label="Application submission progress"
              aria-valuenow={hasApplication ? 1 : 0}
              aria-valuemin={0}
              aria-valuemax={1}
            >
              <span
                style={{
                  width: loading ? "0%" : hasApplication ? "100%" : "0%",
                }}
              />
            </div>

            <div className="steps-grid">
              {upcomingSteps.map((step) => (
                <article className="step-card" key={step.number}>
                  <div className="step-topline">
                    <span className="step-number">{step.number}</span>
                    <ArrowUpRight
                      size={19}
                      className="step-arrow"
                      aria-hidden="true"
                    />
                  </div>

                  <h3>{step.title}</h3>
                  <p>{step.description}</p>

                  <Link href={step.href} className="text-link">
                    Continue <ArrowRight size={14} />
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section className="locked-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">AVAILABLE AFTER APPROVAL</p>
                <h2>Your provider tools</h2>
              </div>
              <span className="lock-label">
                <LockKeyhole size={13} /> Approval required
              </span>
            </div>

            <div className="tools-grid">
              <article className="tool-card">
                <span className="tool-icon">
                  <CalendarDays size={19} />
                </span>
                <div className="tool-copy">
                  <h3>Bookings</h3>
                  <p>Manage upcoming cultural experiences.</p>
                </div>
                <span className="tool-lock">Locked</span>
              </article>

              <article className="tool-card">
                <span className="tool-icon">
                  <Wallet size={19} />
                </span>
                <div className="tool-copy">
                  <h3>Earnings &amp; payouts</h3>
                  <p>Review earnings and payout activity.</p>
                </div>
                <span className="tool-lock">Locked</span>
              </article>

              <article className="tool-card">
                <span className="tool-icon">
                  <ChartNoAxesCombined size={19} />
                </span>
                <div className="tool-copy">
                  <h3>Analytics</h3>
                  <p>Understand your sessions and audience.</p>
                </div>
                <span className="tool-lock">Locked</span>
              </article>
            </div>
          </section>

          <footer className="provider-footer">
            <span>Real People. Real Cultures. Real Connections.</span>
            <span>NiaWorld Provider Space</span>
          </footer>
        </div>
      </section>

      <nav className="mobile-navigation" aria-label="Provider navigation">
        {navigation.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`mobile-navigation-link ${
                item.label === "Home" ? "mobile-navigation-active" : ""
              }`}
              aria-current={item.label === "Home" ? "page" : undefined}
              aria-label={item.label}
              title={item.label}
            >
              <Icon size={19} strokeWidth={1.9} aria-hidden="true" />
              <span className="mobile-navigation-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <style jsx>{`
        .provider-shell {
          min-height: 100vh;
          color: #23372a;
          position: relative;
          isolation: isolate;
          font-family: Arial, Helvetica, sans-serif;
          --green: #28613c;
          --green-dark: #1f4d1a;
          --green-light: #e8f3df;
          --text-muted: #647367;
          --panel: rgba(250, 252, 247, 0.94);
          --border: rgba(44, 76, 49, 0.14);
          --focus-color: #174ea6;
          --focus-ring: 0 0 0 3px #fff, 0 0 0 6px #174ea6;
        }

        .provider-shell :global(a:focus-visible) {
          position: relative;
          z-index: 2;
          outline: 3px solid var(--focus-color);
          outline-offset: 3px;
          box-shadow: var(--focus-ring);
        }

        .provider-shell :global(a:focus:not(:focus-visible)) {
          outline: none;
          box-shadow: none;
        }

        .provider-background,
        .provider-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .provider-background {
          z-index: -2;
          background-image: url("/images/cultural-background.jpg");
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
        }

        .provider-overlay {
          z-index: -1;
          background: rgba(245, 249, 240, 0.52);
        }

        .provider-sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          width: 238px;
          padding: 27px 17px 20px;
          display: flex;
          flex-direction: column;
          background: rgba(248, 251, 245, 0.95);
          border-right: 1px solid var(--border);
          z-index: 5;
        }

        .provider-brand,
        .mobile-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          text-decoration: none;
          color: #234b30;
        }

        .brand-symbol {
          display: grid;
          place-items: center;
          flex: 0 0 auto;
          width: 39px;
          height: 39px;
          border-radius: 13px;
          color: white;
          background: linear-gradient(145deg, #7ed321, #28613c);
          font-size: 22px;
          font-weight: 800;
        }

        .provider-brand strong {
          display: block;
          font-size: 18px;
          letter-spacing: -0.5px;
        }

        .provider-brand small {
          display: block;
          margin-top: 4px;
          color: #7a887b;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.6px;
        }

        .nav-caption {
          margin: 43px 11px 12px;
          color: #89958a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.6px;
        }

        .desktop-navigation {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .navigation-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 46px;
          padding: 0 12px;
          border-radius: 12px;
          color: #526557;
          font-size: 13px;
          font-weight: 600;
          text-decoration: none;
          transition: background 160ms ease, color 160ms ease;
        }

        .navigation-link:hover {
          color: var(--green-dark);
          background: #edf4e8;
        }

        .navigation-active {
          color: #245d34;
          background: #e4f0dc;
        }

        .active-dot {
          width: 6px;
          height: 6px;
          margin-left: auto;
          border-radius: 50%;
          background: #4c9a2a;
        }

        .sidebar-note {
          margin-top: auto;
          padding: 17px 15px;
          border: 1px solid rgba(76, 154, 42, 0.17);
          border-radius: 15px;
          background: rgba(232, 243, 223, 0.83);
        }

        .note-icon {
          color: #4c9a2a;
        }

        .sidebar-note strong {
          display: block;
          margin-top: 10px;
          font-size: 12px;
        }

        .sidebar-note p {
          margin: 7px 0 0;
          color: #637365;
          font-size: 11px;
          line-height: 1.6;
        }

        .provider-content {
          min-width: 0;
          margin-left: 238px;
        }

        .provider-header {
          min-height: 75px;
          padding: 0 38px;
          display: flex;
          align-items: center;
          gap: 15px;
          background: rgba(250, 252, 247, 0.7);
          border-bottom: 1px solid rgba(44, 76, 49, 0.1);
        }

        .mobile-brand {
          display: none;
        }

        .header-spacer {
          flex: 1;
        }

        .workspace-label {
          color: #7a887b;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        .header-avatar {
          display: grid;
          place-items: center;
          width: 37px;
          height: 37px;
          border: 1px solid rgba(76, 154, 42, 0.25);
          border-radius: 50%;
          background: #e8f3df;
          color: #28613c;
          font-size: 14px;
          font-weight: 800;
          text-decoration: none;
        }

        .dashboard-main {
          width: min(1180px, 100%);
          margin: 0 auto;
          padding: 34px 38px 22px;
        }

        .welcome-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #57804d;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.6px;
        }

        h1,
        h2,
        h3,
        p {
          overflow-wrap: anywhere;
        }

        h1 {
          margin: 0;
          color: #203d29;
          font-size: clamp(27px, 3vw, 39px);
          font-weight: 750;
          letter-spacing: -1.5px;
          line-height: 1.15;
        }

        .welcome-description {
          margin: 11px 0 0;
          color: #536858;
          font-size: 13px;
          line-height: 1.7;
        }

        .status-pill {
          display: inline-flex;
          align-items: center;
          flex: 0 0 auto;
          gap: 8px;
          padding: 10px 13px;
          border: 1px solid rgba(183, 128, 35, 0.2);
          border-radius: 999px;
          background: rgba(255, 248, 225, 0.94);
          color: #8a6321;
          font-size: 11px;
          font-weight: 700;
        }

        .status-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #d5a139;
        }

        .status-approved {
          border-color: rgba(45, 130, 65, 0.2);
          background: rgba(232, 247, 230, 0.96);
          color: #28613c;
        }

        .status-approved .status-dot {
          background: #4c9a2a;
        }

        .status-pending,
        .status-review {
          border-color: rgba(183, 128, 35, 0.2);
          background: rgba(255, 248, 225, 0.94);
          color: #8a6321;
        }

        .status-review .status-dot {
          background: #d5a139;
        }

        .status-rejected {
          border-color: rgba(180, 70, 55, 0.2);
          background: rgba(255, 238, 234, 0.96);
          color: #a33d30;
        }

        .status-rejected .status-dot {
          background: #c65343;
        }

        .status-changes {
          border-color: rgba(183, 128, 35, 0.25);
          background: rgba(255, 246, 221, 0.96);
          color: #8a6321;
        }

        .status-not-submitted {
          border-color: rgba(183, 128, 35, 0.2);
          background: rgba(255, 248, 225, 0.94);
          color: #8a6321;
        }

        .application-feedback {
          margin: 0 0 20px;
          padding: 15px 17px;
          border-radius: 13px;
          font-size: 12px;
          line-height: 1.7;
        }

        .application-feedback p {
          margin: 0;
        }

        .review-feedback {
          border: 1px solid rgba(183, 128, 35, 0.22);
          background: rgba(255, 249, 231, 0.96);
          color: #74551f;
        }

        .feedback-heading {
          margin-bottom: 5px !important;
          font-weight: 800;
        }

        .error-feedback {
          border: 1px solid rgba(180, 70, 55, 0.2);
          background: rgba(255, 239, 235, 0.96);
          color: #923d32;
        }

        .retry-button {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          margin-top: 10px;
          padding: 7px 10px;
          border: 1px solid rgba(180, 70, 55, 0.25);
          border-radius: 8px;
          background: white;
          color: #923d32;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .intro-card {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
          min-height: 255px;
          padding: 30px 34px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.8);
          border-radius: 23px;
          background: linear-gradient(
            110deg,
            rgba(246, 251, 239, 0.97),
            rgba(230, 242, 217, 0.91)
          );
          box-shadow: 0 12px 35px rgba(38, 70, 39, 0.07);
        }

        .intro-copy {
          position: relative;
          z-index: 1;
          max-width: 610px;
        }

        .intro-kicker {
          color: #57804d;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .intro-copy h2 {
          max-width: 540px;
          margin: 13px 0 10px;
          color: #244b30;
          font-size: clamp(23px, 2.5vw, 33px);
          line-height: 1.2;
          letter-spacing: -1px;
        }

        .intro-copy p {
          max-width: 550px;
          margin: 0;
          color: #526958;
          font-size: 12px;
          line-height: 1.8;
        }

        .primary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 13px;
          margin-top: 20px;
          padding: 12px 17px;
          border: 0;
          border-radius: 10px;
          background: #28613c;
          color: white;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          box-shadow: 0 5px 13px rgba(31, 77, 26, 0.13);
          transition: transform 160ms ease, background 160ms ease;
        }

        .primary-button:hover {
          background: #1f4d1a;
          transform: translateY(-1px);
        }

        .intro-art {
          position: relative;
          flex: 0 0 190px;
          width: 190px;
          height: 190px;
          display: grid;
          place-items: center;
          color: #4c9a2a;
        }

        .art-orbit {
          position: absolute;
          width: 155px;
          height: 155px;
          border: 1px solid rgba(76, 154, 42, 0.24);
          border-radius: 50%;
        }

        .orbit-two {
          width: 115px;
          height: 175px;
          transform: rotate(48deg);
        }

        .art-globe {
          width: 93px;
          height: 93px;
          padding: 10px;
          border: 1px solid rgba(76, 154, 42, 0.35);
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.62);
          color: #4c9a2a;
        }

        .art-star {
          position: absolute;
          color: #d2a03a;
          width: 22px;
          height: 22px;
        }

        .star-one {
          top: 22px;
          right: 24px;
        }

        .star-two {
          bottom: 34px;
          left: 13px;
          width: 27px;
          height: 27px;
        }

        .art-caption {
          position: absolute;
          right: -1px;
          bottom: 2px;
          color: #526958;
          font-size: 10px;
          font-weight: 700;
          line-height: 1.5;
          text-align: right;
        }

        .progress-section,
        .locked-section {
          margin-top: 32px;
        }

        .section-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          margin-bottom: 15px;
        }

        .section-heading .eyebrow {
          margin-bottom: 7px;
        }

        .section-heading h2 {
          margin: 0;
          color: #294632;
          font-size: 20px;
          letter-spacing: -0.5px;
        }

        .progress-count,
        .lock-label {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          color: #657669;
          font-size: 11px;
          font-weight: 700;
        }

        .progress-track {
          height: 5px;
          margin-bottom: 15px;
          overflow: hidden;
          border-radius: 999px;
          background: rgba(79, 110, 75, 0.15);
        }

        .progress-track span {
          display: block;
          height: 100%;
          border-radius: inherit;
          background: #4c9a2a;
          transition: width 200ms ease;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }

        .step-card {
          min-width: 0;
          min-height: 202px;
          padding: 19px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          border: 1px solid rgba(255, 255, 255, 0.82);
          border-radius: 16px;
          background: var(--panel);
          box-shadow: 0 7px 20px rgba(38, 70, 39, 0.04);
        }

        .step-topline {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .step-number {
          display: grid;
          place-items: center;
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: #e8f3df;
          color: #386b36;
          font-size: 11px;
          font-weight: 800;
        }

        .step-arrow {
          color: #829083;
        }

        .step-card h3 {
          margin: 17px 0 7px;
          color: #2a4531;
          font-size: 13px;
          line-height: 1.5;
        }

        .step-card p {
          margin: 0 0 17px;
          color: #68796b;
          font-size: 11px;
          line-height: 1.7;
        }

        .text-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-top: auto;
          color: #34723b;
          font-size: 11px;
          font-weight: 800;
          text-decoration: none;
        }

        .text-link:hover {
          text-decoration: underline;
        }

        .tools-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 13px;
        }

        .tool-card {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          min-width: 0;
          padding: 16px 14px;
          border: 1px solid rgba(44, 76, 49, 0.12);
          border-radius: 15px;
          background: rgba(248, 250, 245, 0.79);
        }

        .tool-icon {
          display: grid;
          place-items: center;
          flex: 0 0 34px;
          height: 34px;
          border-radius: 10px;
          background: #e8eee4;
          color: #6e806e;
        }

        .tool-copy {
          min-width: 0;
        }

        .tool-card h3 {
          margin: 2px 0 5px;
          color: #516354;
          font-size: 12px;
        }

        .tool-card p {
          margin: 0;
          color: #788578;
          font-size: 10px;
          line-height: 1.6;
        }

        .tool-lock {
          margin-left: auto;
          color: #8a8f83;
          font-size: 9px;
          white-space: nowrap;
        }

        .provider-footer {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding: 25px 0 8px;
          color: #6b7a6c;
          font-size: 10px;
        }

        .mobile-navigation {
          display: none;
        }

        @media (max-width: 1100px) {
          .provider-sidebar {
            width: 205px;
          }

          .provider-content {
            margin-left: 205px;
          }

          .dashboard-main {
            padding-right: 24px;
            padding-left: 24px;
          }

          .provider-header {
            padding-right: 24px;
            padding-left: 24px;
          }

          .intro-art {
            flex-basis: 145px;
            transform: scale(0.86);
          }

          .steps-grid,
          .tools-grid {
            gap: 10px;
          }

          .step-card {
            padding: 15px;
          }
        }

        @media (max-width: 760px) {
          .provider-sidebar {
            display: none;
          }

          .provider-content {
            margin-left: 0;
          }

          .provider-header {
            min-height: 61px;
            padding: 0 15px;
          }

          .mobile-brand {
            display: flex;
            gap: 8px;
            font-size: 16px;
          }

          .mobile-brand .brand-symbol {
            width: 31px;
            height: 31px;
            border-radius: 10px;
            font-size: 18px;
          }

          .workspace-label {
            display: none;
          }

          .dashboard-main {
            padding: 23px 14px 100px;
          }

          .welcome-row {
            align-items: flex-start;
            flex-direction: column;
            gap: 13px;
            margin-bottom: 19px;
          }

          h1 {
            font-size: 29px;
          }

          .welcome-description {
            max-width: 430px;
          }

          .status-pill {
            padding: 8px 11px;
            font-size: 10px;
          }

          .intro-card {
            min-height: auto;
            padding: 21px 17px;
            border-radius: 17px;
          }

          .intro-copy {
            max-width: 100%;
          }

          .intro-copy h2 {
            font-size: 24px;
          }

          .intro-art {
            display: none;
          }

          .progress-section,
          .locked-section {
            margin-top: 26px;
          }

          .section-heading h2 {
            font-size: 17px;
          }

          .progress-count,
          .lock-label {
            font-size: 10px;
            text-align: right;
          }

          .steps-grid,
          .tools-grid {
            grid-template-columns: 1fr;
          }

          .step-card {
            min-height: auto;
            padding: 16px;
          }

          .step-card h3 {
            margin-top: 12px;
          }

          .step-card p {
            margin-bottom: 14px;
          }

          .tool-card {
            padding: 13px;
          }

          .provider-footer {
            flex-direction: column;
            padding-bottom: 8px;
            line-height: 1.5;
          }

          .mobile-navigation {
            position: fixed;
            z-index: 10;
            inset: auto 0 0;
            display: grid;
            grid-template-columns: repeat(8, minmax(0, 1fr));
            align-items: stretch;
            width: 100%;
            box-sizing: border-box;
            padding: 5px 4px calc(5px + env(safe-area-inset-bottom));
            border-top: 1px solid rgba(44, 76, 49, 0.13);
            background: rgba(250, 252, 247, 0.98);
            box-shadow: 0 -4px 16px rgba(38, 70, 39, 0.06);
          }

          .mobile-navigation-link {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            min-width: 0;
            min-height: 43px;
            padding: 4px 1px;
            border-radius: 8px;
            color: #657568;
            font-size: 9px;
            font-weight: 600;
            line-height: 1.15;
            text-decoration: none;
            white-space: nowrap;
            -webkit-tap-highlight-color: transparent;
          }

          .mobile-navigation-label {
            display: block;
            max-width: 100%;
            overflow: hidden;
            text-overflow: clip;
          }

          .mobile-navigation-active {
            color: #28613c;
            background: #e8f3df;
          }
        }

        @media (max-width: 370px) {
          .mobile-navigation {
            padding-right: 3px;
            padding-left: 3px;
          }

          .mobile-navigation-link {
            min-height: 43px;
            gap: 0;
            padding: 4px 0;
          }

          .mobile-navigation-label {
            display: none;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .navigation-link,
          .primary-button {
            transition: none;
          }

          .primary-button:hover {
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}
