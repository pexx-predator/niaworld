
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock3,
  FileText,
  Globe2,
  LoaderCircle,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const expertiseOptions = [
  "Cultural knowledge",
  "Language practice",
  "Food and cooking",
  "Travel and local life",
  "Arts and traditions",
  "Everyday life",
  "History and heritage",
  "Music and dance",
];

const languageOptions = [
  "English",
  "Swahili",
  "Kikuyu",
  "Luo",
  "Luhya",
  "Kalenjin",
  "Kamba",
  "Somali",
  "French",
  "Arabic",
  "Spanish",
  "Other",
];

type ApplicationStatus =
  | "pending"
  | "under_review"
  | "approved"
  | "rejected"
  | "changes_requested";

interface ExistingApplication {
  status: ApplicationStatus;
  expertise: string[];
  languages: string[];
  experience: string;
  introduction: string;
  review_notes: string | null;
  submitted_at: string;
}

const statusInformation: Record<
  ApplicationStatus,
  { title: string; description: string }
> = {
  pending: {
    title: "Application submitted",
    description:
      "Your application has been received. The NiaWorld team will review it.",
  },
  under_review: {
    title: "Your application is under review",
    description:
      "The NiaWorld team is currently reviewing your information.",
  },
  approved: {
    title: "You're approved!",
    description:
      "Your provider application has been approved. You can now continue setting up your services.",
  },
  rejected: {
    title: "Application not approved",
    description:
      "Your application received a final decision. Contact NiaWorld support if you need clarification.",
  },
  changes_requested: {
    title: "Updates requested",
    description:
      "The NiaWorld team has requested some changes. Review the feedback below.",
  },
};

export default function ProviderApplicationPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [existingApplication, setExistingApplication] =
    useState<ExistingApplication | null>(null);

  const [expertise, setExpertise] = useState<string[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [otherLanguage, setOtherLanguage] = useState("");
  const [experience, setExperience] = useState("");
  const [introduction, setIntroduction] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

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
          throw new Error("Your session has expired. Please sign in again.");
        }

        const { data, error: applicationError } = await supabase
          .from("provider_applications")
          .select(
            "status, expertise, languages, experience, introduction, review_notes, submitted_at",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (applicationError) {
          throw new Error("We couldn't retrieve your application.");
        }

        if (active) {
          setUserId(user.id);
          setExistingApplication(data as ExistingApplication | null);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong. Please try again.",
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

  function toggleSelection(
    value: string,
    selected: string[],
    update: (values: string[]) => void,
  ) {
    update(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value],
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess(false);

    if (!userId) {
      setError("Your session could not be verified. Please sign in again.");
      return;
    }

    if (expertise.length === 0) {
      setError("Select at least one area of expertise.");
      return;
    }

    const finalLanguages = [
      ...languages.filter((language) => language !== "Other"),
    ];

    if (languages.includes("Other") && otherLanguage.trim()) {
      finalLanguages.push(otherLanguage.trim());
    }

    if (finalLanguages.length === 0) {
      setError("Select or enter at least one language.");
      return;
    }

    if (languages.includes("Other") && !otherLanguage.trim()) {
      setError("Please enter the other language you speak.");
      return;
    }

    if (experience.trim().length < 10) {
      setError("Please provide at least 10 characters about your experience.");
      return;
    }

    if (introduction.trim().length < 30) {
      setError("Your introduction must contain at least 30 characters.");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createClient();

      const { data, error: insertError } = await supabase
        .from("provider_applications")
        .insert({
          user_id: userId,
          expertise,
          languages: finalLanguages,
          experience: experience.trim(),
          introduction: introduction.trim(),
          status: "pending",
        })
        .select(
          "status, expertise, languages, experience, introduction, review_notes, submitted_at",
        )
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          throw new Error(
            "An application already exists for your account. Refresh the page to view its status.",
          );
        }

        throw new Error(
          insertError.message ||
            "Your application could not be submitted. Please try again.",
        );
      }

      setExistingApplication(data as ExistingApplication);
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while submitting your application.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const currentStatus = existingApplication
    ? statusInformation[existingApplication.status]
    : null;

  return (
    <main className="application-shell">
      <div className="application-background" aria-hidden="true" />
      <div className="application-overlay" aria-hidden="true" />

      <header className="application-header">
        <Link href="/provider/dashboard" className="brand">
          <span className="brand-symbol">N</span>
          <span>
            <strong>NiaWorld</strong>
            <small>PROVIDER SPACE</small>
          </span>
        </Link>

        <Link href="/provider/dashboard" className="back-link">
          <ArrowLeft size={16} />
          Back to dashboard
        </Link>
      </header>

      <div className="application-container">
        <div className="page-intro">
          <span className="page-icon">
            <FileText size={23} />
          </span>
          <p className="eyebrow">BECOME A NIAWORLD PROVIDER</p>
          <h1>Tell us your story.</h1>
          <p className="intro-description">
            Every person has something valuable to share. Tell us about your
            culture, knowledge, languages and the experiences you can offer.
          </p>
        </div>

        {loading ? (
          <section className="state-card" aria-live="polite">
            <LoaderCircle className="loading-icon" size={27} />
            <h2>Checking your application</h2>
            <p>Please wait while we retrieve your application information.</p>
          </section>
        ) : existingApplication ? (
          <section className="state-card application-state">
            <span className="state-icon">
              {existingApplication.status === "approved" ? (
                <CheckCircle2 size={28} />
              ) : (
                <Clock3 size={28} />
              )}
            </span>

            <p className="eyebrow">APPLICATION STATUS</p>
            <h2>{currentStatus?.title}</h2>
            <p className="state-description">
              {currentStatus?.description}
            </p>

            <div className="application-status-line">
              <span>Status</span>
              <strong>
                {existingApplication.status.replaceAll("_", " ")}
              </strong>
            </div>

            <div className="application-status-line">
              <span>Submitted</span>
              <strong>
                {new Date(
                  existingApplication.submitted_at,
                ).toLocaleDateString()}
              </strong>
            </div>

            {existingApplication.review_notes && (
              <div className="review-notes">
                <strong>Review feedback</strong>
                <p>{existingApplication.review_notes}</p>
              </div>
            )}

            {existingApplication.status === "approved" && (
              <Link href="/provider/services" className="submit-button">
                Continue to services <ArrowRight size={17} />
              </Link>
            )}

            {existingApplication.status === "changes_requested" && (
              <p className="state-footnote">
                Your application is protected while we prepare the secure
                update process. You cannot submit another application.
              </p>
            )}

            {existingApplication.status === "rejected" && (
              <p className="state-footnote">
                If you believe this decision needs clarification, contact
                the NiaWorld support team.
              </p>
            )}

            <Link href="/provider/dashboard" className="secondary-link">
              Return to provider dashboard
            </Link>
          </section>
        ) : error ? (
          <section className="state-card">
            <p className="error-message" role="alert">{error}</p>
            <button
              type="button"
              className="secondary-button"
              onClick={() => window.location.reload()}
            >
              Try again
            </button>
          </section>
        ) : (
          <form className="application-form" onSubmit={handleSubmit}>
            <div className="form-heading">
              <div>
                <p className="eyebrow">YOUR APPLICATION</p>
                <h2>Provider information</h2>
              </div>
              <span className="required-note">* Required fields</span>
            </div>

            <section className="form-section">
              <div className="field-heading">
                <span className="field-icon">
                  <Sparkles size={18} />
                </span>
                <div>
                  <h3>What can you share?</h3>
                  <p>
                    Choose the areas where you have knowledge or experience.
                    Select all that apply.
                  </p>
                </div>
              </div>

              <div className="option-grid">
                {expertiseOptions.map((option) => (
                  <label className="choice-option" key={option}>
                    <input
                      type="checkbox"
                      checked={expertise.includes(option)}
                      onChange={() =>
                        toggleSelection(option, expertise, setExpertise)
                      }
                    />
                    <span className="custom-checkbox">
                      <CheckCircle2 size={15} />
                    </span>
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            </section>

            <section className="form-section">
              <div className="field-heading">
                <span className="field-icon">
                  <Globe2 size={18} />
                </span>
                <div>
                  <h3>Which languages do you speak?</h3>
                  <p>
                    Select the languages you can comfortably use when
                    communicating with customers.
                  </p>
                </div>
              </div>

              <div className="option-grid">
                {languageOptions.map((option) => (
                  <label className="choice-option" key={option}>
                    <input
                      type="checkbox"
                      checked={languages.includes(option)}
                      onChange={() =>
                        toggleSelection(option, languages, setLanguages)
                      }
                    />
                    <span className="custom-checkbox">
                      <CheckCircle2 size={15} />
                    </span>
                    <span>{option}</span>
                  </label>
                ))}
              </div>

              {languages.includes("Other") && (
                <div className="field-group other-language">
                  <label htmlFor="other-language">
                    Specify another language *
                  </label>
                  <input
                    id="other-language"
                    type="text"
                    value={otherLanguage}
                    onChange={(event) =>
                      setOtherLanguage(event.target.value)
                    }
                    placeholder="Enter language"
                    maxLength={60}
                  />
                </div>
              )}
            </section>

            <section className="form-section">
              <div className="field-heading">
                <span className="field-icon">
                  <Clock3 size={18} />
                </span>
                <div>
                  <h3>Tell us about your experience</h3>
                  <p>
                    Describe your background, knowledge, skills or experience
                    related to the areas you selected.
                  </p>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="experience">Your experience *</label>
                <textarea
                  id="experience"
                  value={experience}
                  onChange={(event) => setExperience(event.target.value)}
                  placeholder="For example: I have experience teaching Swahili, sharing local traditions and introducing visitors to everyday life in my community..."
                  rows={5}
                  maxLength={1500}
                  required
                />
                <span className="character-count">
                  {experience.length}/1500
                </span>
              </div>
            </section>

            <section className="form-section">
              <div className="field-heading">
                <span className="field-icon">
                  <FileText size={18} />
                </span>
                <div>
                  <h3>Introduce yourself</h3>
                  <p>
                    Help us understand who you are and why you want to become
                    part of the NiaWorld community.
                  </p>
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="introduction">Your introduction *</label>
                <textarea
                  id="introduction"
                  value={introduction}
                  onChange={(event) => setIntroduction(event.target.value)}
                  placeholder="Tell us about yourself, your background, your interests and what makes the experiences you share meaningful..."
                  rows={6}
                  maxLength={3000}
                  required
                />
                <span className="character-count">
                  {introduction.length}/3000
                </span>
              </div>
            </section>

            {error && (
              <div className="error-message" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message" role="status">
                Your application has been submitted successfully.
              </div>
            )}

            <div className="privacy-note">
              <ShieldCheck size={19} />
              <p>
                Your application information is submitted securely and can
                only be reviewed by authorized NiaWorld administrators.
              </p>
            </div>

            <div className="form-actions">
              <Link href="/provider/dashboard" className="cancel-button">
                Save for later
              </Link>

              <button
                type="submit"
                className="submit-button"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <LoaderCircle size={17} className="button-spinner" />
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit application <Send size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        <footer className="application-footer">
          <span>Real People. Real Cultures. Real Connections.</span>
          <span>NiaWorld Provider Space</span>
        </footer>
      </div>

      <style jsx>{`
        .application-shell {
          min-height: 100vh;
          position: relative;
          isolation: isolate;
          color: #23372a;
          font-family: Arial, Helvetica, sans-serif;
          --green: #28613c;
          --green-dark: #1f4d1a;
          --muted: #657568;
          --border: rgba(44, 76, 49, 0.14);
        }

        .application-background,
        .application-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
        }

        .application-background {
          z-index: -2;
          background-image: url("/images/cultural-background.jpg");
          background-position: center;
          background-size: cover;
          background-repeat: no-repeat;
        }

        .application-overlay {
          z-index: -1;
          background: rgba(245, 249, 240, 0.62);
        }

        .application-shell :global(a:focus-visible),
        .application-shell button:focus-visible,
        .application-shell input:focus-visible,
        .application-shell textarea:focus-visible {
          outline: 3px solid #174ea6;
          outline-offset: 3px;
        }

        .application-header {
          min-height: 76px;
          padding: 0 6%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          background: rgba(250, 252, 247, 0.91);
          border-bottom: 1px solid var(--border);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          color: #234b30;
          text-decoration: none;
        }

        .brand-symbol {
          display: grid;
          place-items: center;
          width: 39px;
          height: 39px;
          border-radius: 13px;
          background: linear-gradient(145deg, #7ed321, #28613c);
          color: white;
          font-size: 22px;
          font-weight: 800;
        }

        .brand strong {
          display: block;
          font-size: 18px;
        }

        .brand small {
          display: block;
          margin-top: 4px;
          color: #7a887b;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          color: #49624d;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }

        .back-link:hover,
        .secondary-link:hover {
          color: var(--green-dark);
          text-decoration: underline;
        }

        .application-container {
          width: min(850px, calc(100% - 36px));
          margin: 0 auto;
          padding: 44px 0 30px;
        }

        .page-intro {
          max-width: 660px;
          margin: 0 auto 30px;
          text-align: center;
        }

        .page-icon {
          display: grid;
          place-items: center;
          width: 51px;
          height: 51px;
          margin: 0 auto 16px;
          border-radius: 16px;
          background: #e5f1dc;
          color: #34723b;
        }

        .eyebrow {
          margin: 0 0 10px;
          color: #57804d;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.6px;
        }

        .page-intro h1 {
          margin: 0;
          color: #203d29;
          font-size: clamp(30px, 5vw, 43px);
          letter-spacing: -1.6px;
        }

        .intro-description {
          max-width: 590px;
          margin: 13px auto 0;
          color: #5c6f60;
          font-size: 13px;
          line-height: 1.8;
        }

        .application-form,
        .state-card {
          padding: 30px;
          border: 1px solid rgba(255, 255, 255, 0.85);
          border-radius: 21px;
          background: rgba(250, 252, 247, 0.96);
          box-shadow: 0 12px 40px rgba(38, 70, 39, 0.08);
        }

        .form-heading {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 15px;
          padding-bottom: 22px;
          border-bottom: 1px solid var(--border);
        }

        .form-heading .eyebrow {
          margin-bottom: 6px;
        }

        .form-heading h2 {
          margin: 0;
          color: #294632;
          font-size: 22px;
          letter-spacing: -0.5px;
        }

        .required-note {
          color: #849084;
          font-size: 10px;
        }

        .form-section {
          padding: 25px 0;
          border-bottom: 1px solid var(--border);
        }

        .field-heading {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 19px;
        }

        .field-icon {
          display: grid;
          place-items: center;
          flex: 0 0 37px;
          height: 37px;
          border-radius: 11px;
          background: #e8f3df;
          color: #34723b;
        }

        .field-heading h3 {
          margin: 1px 0 5px;
          color: #2a4531;
          font-size: 14px;
        }

        .field-heading p {
          max-width: 590px;
          margin: 0;
          color: #738174;
          font-size: 11px;
          line-height: 1.7;
        }

        .option-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .choice-option {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 44px;
          padding: 9px 12px;
          border: 1px solid rgba(44, 76, 49, 0.13);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.75);
          color: #526557;
          font-size: 12px;
          cursor: pointer;
          transition: border-color 150ms ease, background 150ms ease;
        }

        .choice-option:hover {
          border-color: rgba(76, 154, 42, 0.5);
          background: #f5faef;
        }

        .choice-option input {
          position: absolute;
          width: 1px;
          height: 1px;
          opacity: 0;
        }

        .custom-checkbox {
          display: grid;
          place-items: center;
          flex: 0 0 19px;
          width: 19px;
          height: 19px;
          border: 1px solid #bac8b8;
          border-radius: 5px;
          color: transparent;
          background: white;
        }

        .choice-option input:checked + .custom-checkbox {
          border-color: #4c9a2a;
          background: #4c9a2a;
          color: white;
        }

        .choice-option input:focus-visible + .custom-checkbox {
          outline: 3px solid #174ea6;
          outline-offset: 3px;
        }

        .field-group {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .field-group label {
          color: #3c5542;
          font-size: 12px;
          font-weight: 700;
        }

        .field-group textarea,
        .field-group input {
          width: 100%;
          box-sizing: border-box;
          padding: 13px 14px;
          border: 1px solid rgba(44, 76, 49, 0.18);
          border-radius: 10px;
          background: rgba(255, 255, 255, 0.88);
          color: #294632;
          font-family: inherit;
          font-size: 12px;
          line-height: 1.7;
          resize: vertical;
        }

        .field-group textarea::placeholder,
        .field-group input::placeholder {
          color: #9aa69a;
        }

        .field-group textarea:focus,
        .field-group input:focus {
          border-color: #4c9a2a;
          outline: 2px solid rgba(76, 154, 42, 0.13);
        }

        .character-count {
          align-self: flex-end;
          color: #89958a;
          font-size: 10px;
        }

        .other-language {
          margin-top: 15px;
        }

        .privacy-note {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          margin-top: 22px;
          padding: 14px;
          border: 1px solid rgba(76, 154, 42, 0.15);
          border-radius: 11px;
          background: #f0f6eb;
          color: #4c6c4c;
        }

        .privacy-note svg {
          flex: 0 0 auto;
          margin-top: 1px;
        }

        .privacy-note p {
          margin: 0;
          font-size: 11px;
          line-height: 1.7;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 15px;
          margin-top: 24px;
        }

        .cancel-button,
        .secondary-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 43px;
          padding: 0 16px;
          border: 1px solid var(--border);
          border-radius: 10px;
          background: white;
          color: #536858;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
        }

        .submit-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 44px;
          padding: 0 19px;
          border: none;
          border-radius: 10px;
          background: #28613c;
          color: white;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
          cursor: pointer;
          transition: background 150ms ease;
        }

        .submit-button:hover:not(:disabled) {
          background: #1f4d1a;
        }

        .submit-button:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        .button-spinner,
        .loading-icon {
          animation: spin 1s linear infinite;
        }

        .state-card {
          max-width: 650px;
          margin: 0 auto;
          text-align: center;
        }

        .state-icon {
          display: grid;
          place-items: center;
          width: 58px;
          height: 58px;
          margin: 0 auto 17px;
          border-radius: 18px;
          background: #e8f3df;
          color: #34723b;
        }

        .state-card h2 {
          margin: 0;
          color: #294632;
          font-size: 23px;
        }

        .state-description,
        .state-card > p:not(.eyebrow) {
          color: #6b7b6c;
          font-size: 12px;
          line-height: 1.8;
        }

        .application-status-line {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          padding: 13px 0;
          border-bottom: 1px solid var(--border);
          color: #708071;
          font-size: 12px;
          text-align: left;
        }

        .application-status-line strong {
          color: #34563b;
          text-transform: capitalize;
        }

        .review-notes {
          margin-top: 18px;
          padding: 15px;
          border: 1px solid rgba(183, 128, 35, 0.2);
          border-radius: 11px;
          background: #fff8e8;
          color: #755922;
          text-align: left;
        }

        .review-notes strong {
          font-size: 12px;
        }

        .review-notes p {
          margin: 7px 0 0;
          font-size: 12px;
          line-height: 1.7;
          overflow-wrap: anywhere;
        }

        .state-card .submit-button {
          margin-top: 22px;
        }

        .secondary-link {
          display: block;
          width: fit-content;
          margin: 22px auto 0;
          color: #34723b;
          font-size: 12px;
          font-weight: 700;
          text-decoration: none;
        }

        .state-footnote {
          margin-top: 18px;
          color: #7a6b4e !important;
          font-size: 11px !important;
        }

        .error-message,
        .success-message {
          margin-top: 18px;
          padding: 12px 14px;
          border-radius: 10px;
          font-size: 12px;
          line-height: 1.6;
        }

        .error-message {
          border: 1px solid rgba(180, 70, 55, 0.2);
          background: #fff0ed;
          color: #923d32;
        }

        .success-message {
          border: 1px solid rgba(45, 130, 65, 0.2);
          background: #edf8e9;
          color: #28613c;
        }

        .application-footer {
          display: flex;
          justify-content: space-between;
          gap: 15px;
          margin-top: 25px;
          color: #6b7a6c;
          font-size: 10px;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 600px) {
          .application-header {
            min-height: 65px;
            padding: 0 15px;
          }

          .brand-symbol {
            width: 34px;
            height: 34px;
          }

          .brand strong {
            font-size: 16px;
          }

          .back-link {
            font-size: 0;
          }

          .back-link svg {
            width: 20px;
            height: 20px;
          }

          .application-container {
            width: calc(100% - 24px);
            padding-top: 29px;
          }

          .page-intro {
            margin-bottom: 23px;
          }

          .page-intro h1 {
            font-size: 32px;
          }

          .application-form,
          .state-card {
            padding: 20px 16px;
            border-radius: 16px;
          }

          .form-heading {
            align-items: flex-start;
            flex-direction: column;
            gap: 8px;
          }

          .option-grid {
            grid-template-columns: 1fr;
          }

          .form-section {
            padding: 21px 0;
          }

          .form-actions {
            align-items: stretch;
            flex-direction: column-reverse;
          }

          .cancel-button,
          .form-actions .submit-button {
            width: 100%;
            box-sizing: border-box;
          }

          .application-footer {
            flex-direction: column;
            line-height: 1.5;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .button-spinner,
          .loading-icon {
            animation: none;
          }

          .choice-option,
          .submit-button {
            transition: none;
          }
        }
      `}</style>
    </main>
  );
}
