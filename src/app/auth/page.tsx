
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<AuthMode>("login");
  const [providerMode, setProviderMode] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const isSignup = mode === "signup";

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setProviderMode(params.get("mode") === "provider");
  }, []);

  function clearMessages() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  function switchMode(nextMode: AuthMode) {
    if (nextMode === mode || loading) return;

    clearMessages();
    setRecoveryMode(false);
    setMode(nextMode);
  }

  function startPasswordRecovery() {
    if (loading) return;

    clearMessages();
    setRecoveryMode(true);
  }

  function returnToLogin() {
    if (loading) return;

    clearMessages();
    setRecoveryMode(false);
    setMode("login");
  }

  async function redirectAfterAuthentication() {
    const supabase = createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setErrorMessage(
        "We could not verify your account. Please sign in again."
      );
      return;
    }

    const { data: adminRecord, error: adminError } = await supabase
      .from("admin_users")
      .select("user_id, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (adminError) {
      console.error("Admin verification failed:", adminError);
      setErrorMessage(
        "Your account is signed in, but we could not verify your access. Please try again."
      );
      return;
    }

    if (adminRecord) {
      router.replace("/admin");
      router.refresh();
      return;
    }

    if (providerMode) {
      const { data: application, error: applicationError } =
        await supabase
          .from("provider_applications")
          .select("id, status")
          .eq("user_id", user.id)
          .maybeSingle();

      if (applicationError) {
        console.error(
          "Provider application verification failed:",
          applicationError
        );

        setErrorMessage(
          "You are signed in, but we could not check your provider application. Please try again."
        );
        return;
      }

      if (!application) {
        router.replace("/provider/application");
      } else {
        router.replace("/provider/dashboard");
      }

      router.refresh();
      return;
    }

    router.replace("/dashboard");
    router.refresh();
  }

  async function handlePasswordRecovery(
    supabase: ReturnType<typeof createClient>
  ) {
    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }
    );

    if (error) {
      console.error("Password recovery request failed:", error);
      setErrorMessage(
        "We could not process your request right now. Please wait a moment and try again."
      );
      return;
    }

    setSuccessMessage(
      "If an account exists with that email address, you will receive a password-reset link. Please check your inbox."
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    clearMessages();
    setLoading(true);

    try {
      const supabase = createClient();

      if (recoveryMode) {
        await handlePasswordRecovery(supabase);
        return;
      }

      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          setErrorMessage(error.message);
          return;
        }

        if (data.session) {
          await redirectAfterAuthentication();
          return;
        }

        setSuccessMessage(
          "Your account has been created. Check your email for a confirmation link before signing in."
        );

        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        await redirectAfterAuthentication();
        return;
      }

      setErrorMessage("Sign-in was unsuccessful. Please try again.");
    } catch (error) {
      console.error("Authentication error:", error);

      setErrorMessage(
        "Something went wrong. Please check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="background-overlay" />

      <header className="site-header">
        <Link href="/" className="brand" aria-label="NiaWorld home">
          <span className="brand-symbol" aria-hidden="true">
            <svg viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="2" />
              <ellipse cx="24" cy="24" rx="8" ry="18" stroke="currentColor" strokeWidth="1.6" />
              <path d="M7 18H41M6 24H42M7 30H41" stroke="currentColor" strokeWidth="1.6" />
              <circle cx="35" cy="12" r="4" fill="#B76648" />
            </svg>
          </span>
          <span>NiaWorld</span>
        </Link>

        <Link href="/" className="back-link">
          <span aria-hidden="true">←</span> Back to home
        </Link>
      </header>

      <section className="auth-layout">
        <div className="intro">
          <span className="eyebrow">
            <span className="eyebrow-dot" />
            A world of cultures, one community
          </span>

          <h1>
            The world is closer
            <br />
            <span>than you think.</span>
          </h1>

          <p className="intro-description">
            Meet people beyond borders, discover traditions, share your
            experiences, and build meaningful connections across cultures.
          </p>

          <div className="intro-footer">
            <div className="globe-icon" aria-hidden="true">
              <svg viewBox="0 0 32 32" fill="none">
                <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" />
                <ellipse cx="16" cy="16" rx="5" ry="12" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 16H28M7 9H25M7 23H25" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </div>

            <p>
              Real People. Real Cultures.
              <br />
              <strong>Real Connections.</strong>
            </p>
          </div>
        </div>

        <div className="auth-column">
          <div className="card-heading">
            <span className="card-kicker">
              {recoveryMode
                ? "ACCOUNT RECOVERY"
                : isSignup
                  ? "YOUR JOURNEY STARTS HERE"
                  : providerMode
                    ? "PROVIDER ACCESS"
                    : "WELCOME BACK"}
            </span>
            <p>
              {recoveryMode
                ? "We'll help you get back into your account."
                : isSignup
                  ? "A new perspective is one connection away."
                  : providerMode
                    ? "Sign in to access your provider account."
                    : "Your next cultural connection awaits."}
            </p>
          </div>

          {recoveryMode ? (
            <section className="card-face recovery-card">
              <div className="form-heading">
                <span className="form-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none">
                    <rect
                      x="3"
                      y="5"
                      width="18"
                      height="14"
                      rx="2"
                      stroke="currentColor"
                      strokeWidth="1.7"
                    />
                    <path
                      d="M4 7L12 13L20 7"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </span>
                <h2>Forgot your password?</h2>
                <p>
                  Enter the email address associated with your NiaWorld
                  account. If an account exists, we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="auth-form">
                <label htmlFor="recovery-email">Email address</label>
                <input
                  id="recovery-email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />

                {errorMessage && (
                  <p className="form-message error" role="alert">
                    {errorMessage}
                  </p>
                )}

                {successMessage && (
                  <p className="form-message success" role="status">
                    {successMessage}
                  </p>
                )}

                <button
                  type="submit"
                  className="submit-button"
                  disabled={loading}
                >
                  {loading ? "Sending request..." : "Send reset link"}
                  {!loading && <span aria-hidden="true">→</span>}
                </button>
              </form>

              <p className="switch-copy recovery-back">
                Remember your password?{" "}
                <button
                  type="button"
                  className="text-switch"
                  onClick={returnToLogin}
                >
                  Back to sign in
                </button>
              </p>
            </section>
          ) : (
            <div
              className={`flip-scene ${isSignup ? "is-flipped" : ""}`}
              aria-label="Account access"
            >
              <div className="flip-card">
                <section
                  className="card-face card-front"
                  aria-hidden={isSignup}
                  inert={isSignup}
                >
                  <div className="form-heading">
                    <span className="form-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <path
                          d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.7" />
                      </svg>
                    </span>
                    <h2>{providerMode ? "Provider sign in" : "Welcome back"}</h2>
                    <p>
                      {providerMode
                        ? "Sign in with your NiaWorld account."
                        : "Sign in to continue your journey."}
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="auth-form">
                    <label htmlFor="login-email">Email address</label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />

                    <div className="password-label-row">
                      <label htmlFor="login-password">Password</label>
                      <button
                        type="button"
                        className="text-switch forgot-link"
                        onClick={startPasswordRecovery}
                      >
                        Forgot password?
                      </button>
                    </div>

                    <input
                      id="login-password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      required
                    />

                    {errorMessage && (
                      <p className="form-message error" role="alert">
                        {errorMessage}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="submit-button"
                      disabled={loading}
                    >
                      {loading ? "Signing in..." : "Sign in"}
                      {!loading && <span aria-hidden="true">→</span>}
                    </button>
                  </form>

                  <div className="form-divider">
                    <span />
                    <span>YOUR WORLD AWAITS</span>
                    <span />
                  </div>

                  <p className="switch-copy">
                    New to NiaWorld?{" "}
                    <button
                      type="button"
                      className="text-switch"
                      onClick={() => switchMode("signup")}
                    >
                      Create an account
                    </button>
                  </p>

                  {providerMode && (
                    <p className="mode-switch-copy">
                      Not a provider?{" "}
                      <Link href="/auth" className="text-switch">
                        Customer login
                      </Link>
                    </p>
                  )}
                </section>

                <section
                  className="card-face card-back"
                  aria-hidden={!isSignup}
                  inert={!isSignup}
                >
                  <div className="form-heading">
                    <span className="form-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none">
                        <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="1.7" />
                        <path
                          d="M2.5 21V19C2.5 16.8 4.3 15 6.5 15H11.5C13.7 15 15.5 16.8 15.5 19V21M19 8V14M16 11H22"
                          stroke="currentColor"
                          strokeWidth="1.7"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <h2>Join NiaWorld</h2>
                    <p>Start discovering the world through people.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="auth-form">
                    <label htmlFor="signup-name">Full name</label>
                    <input
                      id="signup-name"
                      type="text"
                      autoComplete="name"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                      minLength={2}
                      required
                    />

                    <label htmlFor="signup-email">Email address</label>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      required
                    />

                    <label htmlFor="signup-password">Create a password</label>
                    <input
                      id="signup-password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      minLength={8}
                      required
                    />

                    {errorMessage && (
                      <p className="form-message error" role="alert">
                        {errorMessage}
                      </p>
                    )}

                    {successMessage && (
                      <p className="form-message success" role="status">
                        {successMessage}
                      </p>
                    )}

                    <button
                      type="submit"
                      className="submit-button"
                      disabled={loading}
                    >
                      {loading ? "Creating account..." : "Create account"}
                      {!loading && <span aria-hidden="true">→</span>}
                    </button>
                  </form>

                  <div className="form-divider">
                    <span />
                    <span>YOUR WORLD AWAITS</span>
                    <span />
                  </div>

                  <p className="switch-copy">
                    Already a member?{" "}
                    <button
                      type="button"
                      className="text-switch"
                      onClick={() => switchMode("login")}
                    >
                      Sign in
                    </button>
                  </p>
                </section>
              </div>
            </div>
          )}

          <p className="privacy-note">
            <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
              <rect x="4" y="8" width="12" height="9" rx="2" stroke="currentColor" strokeWidth="1.4" />
              <path d="M7 8V5.5a3 3 0 0 1 6 0V8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
            Your personal information stays protected.
          </p>
        </div>
      </section>

      <footer className="page-footer">
        <span>© 2026 NiaWorld</span>
        <span>Connecting cultures, one person at a time.</span>
      </footer>

      <style jsx>{`
        :global(*) { box-sizing: border-box; }
        :global(html) { min-height: 100%; background: #f8f5ed; }
        :global(body) { margin: 0; min-height: 100%; }
        :global(button), :global(input) { font: inherit; }

        .auth-page {
          --green: #315b43;
          --green-dark: #244532;
          --terracotta: #b76648;
          --ink: #24382b;
          --muted: #6d776d;
          position: relative;
          isolation: isolate;
          display: flex;
          flex-direction: column;
          min-height: 100vh;
          overflow: hidden;
          padding: 22px clamp(20px, 5vw, 76px) 18px;
          color: var(--ink);
          background-color: #e9e8d9;
          background-image:
            linear-gradient(115deg, rgba(25, 48, 32, 0.48), rgba(38, 55, 38, 0.18) 48%, rgba(28, 44, 30, 0.42)),
            url("/images/cultural-background.jpg");
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
        }

        .background-overlay {
          position: absolute;
          z-index: -1;
          inset: 0;
          background:
            radial-gradient(circle at 18% 30%, rgba(245, 231, 198, 0.12), transparent 38%),
            linear-gradient(180deg, rgba(24, 44, 29, 0.14), rgba(24, 44, 29, 0.24));
          pointer-events: none;
        }

        .site-header, .page-footer {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }

        .site-header { width: 100%; max-width: 1440px; margin: 0 auto; }

        .brand {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          color: #fffdf5;
          text-decoration: none;
          font-size: 1.3rem;
          font-weight: 750;
          letter-spacing: -0.045em;
          text-shadow: 0 2px 15px rgba(0, 0, 0, 0.16);
        }

        .brand-symbol { display: inline-flex; width: 36px; height: 36px; color: #fffdf5; }
        .brand-symbol svg, .globe-icon svg, .form-icon svg { width: 100%; height: 100%; }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #fffdf5;
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 550;
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.22);
          transition: opacity 180ms ease;
        }

        .back-link:hover { opacity: 0.76; }

        .auth-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(370px, 490px);
          align-items: center;
          gap: clamp(36px, 7vw, 112px);
          width: 100%;
          max-width: 1280px;
          margin: auto;
          padding: 40px 0;
        }

        .intro { max-width: 590px; padding: 18px 0; color: #fffdf5; text-shadow: 0 2px 24px rgba(0, 0, 0, 0.15); }

        .eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 25px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .eyebrow-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #e7b58d;
          box-shadow: 0 0 0 5px rgba(231, 181, 141, 0.16);
        }

        .intro h1 { margin: 0; font-size: clamp(2.8rem, 5.5vw, 5.3rem); font-weight: 720; letter-spacing: -0.075em; line-height: 1.02; }
        .intro h1 span { color: #f0c4a3; }

        .intro-description {
          max-width: 470px;
          margin: 25px 0 0;
          color: rgba(255, 253, 245, 0.91);
          font-size: clamp(1rem, 1.4vw, 1.13rem);
          line-height: 1.8;
        }

        .intro-footer { display: flex; align-items: center; gap: 13px; margin-top: 35px; }

        .globe-icon {
          display: grid;
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          place-items: center;
          padding: 8px;
          border: 1px solid rgba(255, 253, 245, 0.55);
          border-radius: 50%;
          color: #fffdf5;
          background: rgba(255, 253, 245, 0.11);
          backdrop-filter: blur(8px);
        }

        .intro-footer p { margin: 0; color: rgba(255, 253, 245, 0.91); font-size: 0.88rem; line-height: 1.55; }
        .intro-footer strong { color: #fffdf5; font-weight: 750; }
        .auth-column { width: 100%; min-width: 0; }

        .card-heading { margin: 0 0 16px; color: #fffdf5; text-align: center; text-shadow: 0 1px 12px rgba(0, 0, 0, 0.22); }
        .card-kicker { font-size: 0.7rem; font-weight: 800; letter-spacing: 0.17em; }
        .card-heading p { margin: 7px 0 0; color: rgba(255, 253, 245, 0.91); font-size: 0.92rem; }

        .flip-scene { position: relative; width: 100%; perspective: 1600px; -webkit-perspective: 1600px; }

        .flip-card {
          position: relative;
          width: 100%;
          min-height: 680px;
          transform: rotateY(0deg);
          transform-style: preserve-3d;
          -webkit-transform-style: preserve-3d;
          transition: transform 850ms cubic-bezier(0.2, 0.72, 0.22, 1);
          will-change: transform;
        }

        .flip-scene.is-flipped .flip-card { transform: rotateY(180deg); }

        .card-face {
          position: absolute;
          inset: 0;
          width: 100%;
          min-height: 680px;
          padding: clamp(24px, 3vw, 38px);
          overflow: visible;
          border: 1px solid rgba(255, 255, 255, 0.68);
          border-radius: 28px;
          background: rgba(250, 248, 240, 0.94);
          box-shadow: 0 24px 75px rgba(17, 35, 22, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.85);
          -webkit-backface-visibility: hidden;
          backface-visibility: hidden;
          backdrop-filter: blur(22px);
          -webkit-backdrop-filter: blur(22px);
        }

        .card-front { z-index: 2; transform: rotateY(0deg); }
        .card-back { transform: rotateY(180deg); }

        .recovery-card {
          position: relative;
          inset: auto;
          min-height: 0;
          padding: clamp(28px, 4vw, 42px);
        }

        .recovery-back { margin-top: 25px; }

        .password-label-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 8px;
        }

        .password-label-row label { margin: 0; }

        .forgot-link {
          flex: 0 0 auto;
          font-size: 0.78rem;
        }

        .form-heading { margin-bottom: 27px; text-align: center; }

        .form-icon {
          display: grid;
          width: 48px;
          height: 48px;
          margin: 0 auto 15px;
          padding: 11px;
          place-items: center;
          border: 1px solid rgba(49, 91, 67, 0.14);
          border-radius: 16px;
          color: var(--green);
          background: rgba(49, 91, 67, 0.08);
        }

        .form-heading h2 { margin: 0; color: var(--green-dark); font-size: 1.75rem; font-weight: 760; letter-spacing: -0.055em; }
        .form-heading p { margin: 8px 0 0; color: var(--muted); font-size: 0.9rem; line-height: 1.5; }

        .auth-form { display: flex; flex-direction: column; align-items: stretch; }
        .auth-form label { margin: 0 0 8px; color: #37473a; font-size: 0.82rem; font-weight: 700; }

        .auth-form input {
          display: block;
          width: 100%;
          min-width: 0;
          height: 48px;
          margin: 0 0 19px;
          padding: 0 14px;
          border: 1px solid #dedfd3;
          border-radius: 12px;
          outline: none;
          color: #263b2c;
          background: rgba(255, 255, 252, 0.92);
          font-size: 0.91rem;
          transition: border-color 180ms ease, box-shadow 180ms ease, background 180ms ease;
        }

        .auth-form input::placeholder { color: #9a9f95; }
        .auth-form input:focus { border-color: var(--green); background: #fffefa; box-shadow: 0 0 0 3px rgba(49, 91, 67, 0.11); }

        .submit-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          width: 100%;
          min-height: 52px;
          margin: 2px 0 0;
          padding: 14px 18px;
          border: 0;
          border-radius: 12px;
          color: #fffdf5;
          background: var(--green);
          box-shadow: 0 8px 20px rgba(49, 91, 67, 0.18);
          cursor: pointer;
          font-size: 0.94rem;
          font-weight: 750;
          visibility: visible;
          opacity: 1;
          transition: background 180ms ease, transform 180ms ease, box-shadow 180ms ease;
        }

        .submit-button:hover:not(:disabled) { transform: translateY(-1px); background: var(--green-dark); box-shadow: 0 11px 24px rgba(49, 91, 67, 0.23); }
        .submit-button:active:not(:disabled) { transform: translateY(0); }
        .submit-button:disabled { cursor: wait; opacity: 0.72; }
        .submit-button span { font-size: 1.15rem; }

        .form-message { margin: -3px 0 14px; padding: 10px 12px; border-radius: 9px; font-size: 0.8rem; line-height: 1.5; overflow-wrap: anywhere; }
        .form-message.error { color: #8c342b; background: #f9e7e1; border: 1px solid #efd0c7; }
        .form-message.success { color: #28583b; background: #e6f2e6; border: 1px solid #cde3ce; }

        .form-divider {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 25px 0 20px;
          color: #8a9185;
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.12em;
          white-space: nowrap;
        }

        .form-divider span:first-child, .form-divider span:last-child { height: 1px; flex: 1; background: #e0e1d6; }

        .switch-copy, .mode-switch-copy { margin: 0; color: #6d776d; text-align: center; font-size: 0.85rem; line-height: 1.6; }
        .mode-switch-copy { margin-top: 12px; font-size: 0.8rem; }

        .text-switch {
          display: inline;
          padding: 0;
          border: 0;
          color: var(--terracotta);
          background: transparent;
          cursor: pointer;
          font-weight: 800;
          text-decoration: none;
        }

        .text-switch:hover { color: #94472f; text-decoration: underline; text-underline-offset: 3px; }

        .privacy-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin: 17px 0 0;
          color: #fffdf5;
          font-size: 0.76rem;
          text-align: center;
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.25);
        }

        .privacy-note svg { width: 17px; height: 17px; flex: 0 0 17px; }

        .page-footer {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          width: 100%;
          max-width: 1440px;
          margin: 0 auto;
          padding-top: 8px;
          color: rgba(255, 253, 245, 0.88);
          font-size: 0.72rem;
          text-shadow: 0 1px 10px rgba(0, 0, 0, 0.2);
        }

        @media (max-width: 1000px) {
          .auth-page { padding-right: 28px; padding-left: 28px; }
          .auth-layout { grid-template-columns: minmax(0, 0.9fr) minmax(340px, 430px); gap: 30px; }
          .intro h1 { font-size: clamp(2.6rem, 5.2vw, 4rem); }
          .intro-description { font-size: 0.98rem; }
          .card-face { padding: 27px; }
        }

        @media (max-width: 700px) {
          .auth-page { min-height: 100vh; padding: 18px 18px 14px; background-position: center; }
          .site-header { gap: 12px; }
          .brand { gap: 8px; font-size: 1.12rem; }
          .brand-symbol { width: 31px; height: 31px; }
          .back-link { font-size: 0.8rem; }
          .auth-layout { grid-template-columns: minmax(0, 1fr); gap: 24px; max-width: 480px; padding: 38px 0 28px; }
          .intro { max-width: 100%; padding: 0; text-align: center; }
          .eyebrow { margin-bottom: 17px; font-size: 0.64rem; letter-spacing: 0.1em; }
          .intro h1 { font-size: clamp(2.5rem, 9vw, 3.65rem); }
          .intro-description { max-width: 430px; margin: 15px auto 0; font-size: 0.91rem; line-height: 1.65; }
          .intro-footer { justify-content: center; margin-top: 19px; }
          .globe-icon { width: 38px; height: 38px; flex-basis: 38px; }
          .intro-footer p { font-size: 0.79rem; text-align: left; }
          .card-heading { margin-bottom: 14px; }
          .card-heading p { font-size: 0.84rem; }
          .flip-card { min-height: 680px; }
          .card-face { min-height: 680px; padding: 25px 22px; border-radius: 23px; }
          .recovery-card { min-height: 0; padding: 25px 22px; }
          .form-heading { margin-bottom: 23px; }
          .form-heading h2 { font-size: 1.6rem; }
          .form-heading p { font-size: 0.84rem; }
          .form-icon { width: 43px; height: 43px; margin-bottom: 12px; }
          .auth-form input { height: 47px; margin-bottom: 17px; }
          .form-divider { margin-top: 22px; margin-bottom: 17px; }
          .privacy-note { margin-top: 14px; font-size: 0.72rem; }
          .page-footer { gap: 10px; font-size: 0.65rem; }
        }

        @media (max-width: 380px) {
          .auth-page { padding-right: 12px; padding-left: 12px; }
          .brand { font-size: 1rem; }
          .back-link { font-size: 0.74rem; }
          .card-face { padding: 23px 17px; }
          .recovery-card { padding: 23px 17px; }
          .page-footer { font-size: 0.59rem; }
        }

        @media (prefers-reduced-motion: reduce) {
          .flip-card, .submit-button, .back-link, .auth-form input {
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </main>
  );
}
