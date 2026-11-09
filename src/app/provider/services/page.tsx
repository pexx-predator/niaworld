
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type ListingStatus =
  | "draft"
  | "pending"
  | "published"
  | "rejected"
  | "suspended";

type Service = {
  id: string;
  provider_id: string;
  title: string;
  category: string;
  description: string;
  languages: string[];
  duration_minutes: number;
  price: number;
  status: ListingStatus;
  created_at: string;
  updated_at: string;
};

const navigation = [
  { label: "Dashboard", href: "/provider/dashboard" },
  { label: "My services", href: "/provider/services" },
  { label: "Bookings", href: "/provider/bookings" },
  { label: "Messages", href: "/provider/messages" },
  { label: "Earnings", href: "/provider/earnings" },
  { label: "Analytics", href: "/provider/analytics" },
  { label: "Settings", href: "/provider/settings" },
];

const categories = [
  "Cultural conversations",
  "Swahili practice",
];

const statusLabels: Record<ListingStatus, string> = {
  draft: "Draft",
  pending: "Pending review",
  published: "Approved",
  rejected: "Rejected",
  suspended: "Suspended",
};

export default function ProviderServicesPage() {
  const router = useRouter();
  const [supabase] = useState(() => createClient());

  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [filter, setFilter] = useState("All");

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("English");
  const [duration, setDuration] = useState("30");
  const [price, setPrice] = useState("");
  const [agreed, setAgreed] = useState(false);

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError("");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      router.replace("/login?next=/provider/services");
      return;
    }

    const { data, error: queryError } = await supabase
      .from("provider_listings")
      .select(
        "id, provider_id, title, category, description, languages, duration_minutes, price, status, created_at, updated_at",
      )
      .eq("provider_id", user.id)
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setServices([]);
    } else {
      setServices((data ?? []) as Service[]);
    }

    setLoading(false);
  }, [router, supabase]);

  useEffect(() => {
    void loadServices();
  }, [loadServices]);

  async function submitService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const cleanTitle = title.trim();
    const cleanDescription = description.trim();
    const numericPrice = Number(price);
    const numericDuration = Number(duration);

    if (cleanTitle.length < 5 || cleanTitle.length > 80) {
      setError("The service title must be between 5 and 80 characters.");
      return;
    }

    if (
      cleanDescription.length < 30 ||
      cleanDescription.length > 1200
    ) {
      setError(
        "The description must be between 30 and 1,200 characters.",
      );
      return;
    }

    if (
      !Number.isFinite(numericPrice) ||
      numericPrice <= 0 ||
      numericPrice > 10000
    ) {
      setError("Enter a valid service price in USD.");
      return;
    }

    if (![15, 30, 45, 60].includes(numericDuration)) {
      setError("Choose a valid session duration.");
      return;
    }

    if (!agreed) {
      setError("Please agree to the provider service standards.");
      return;
    }

    setSubmitting(true);

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      setSubmitting(false);
      router.replace("/login?next=/provider/services");
      return;
    }

    const languages =
      language === "English and Kiswahili"
        ? ["English", "Kiswahili"]
        : [language];

    const { error: insertError } = await supabase
      .from("provider_listings")
      .insert({
        provider_id: user.id,
        title: cleanTitle,
        category,
        description: cleanDescription,
        languages,
        duration_minutes: numericDuration,
        price: numericPrice,
        cover_image_url: null,
      });

    setSubmitting(false);

    if (insertError) {
      setError(
        insertError.message.includes("row-level security")
          ? "Your provider account may not have permission to submit services. Please contact support."
          : insertError.message,
      );
      return;
    }

    setSuccess("Your service has been submitted for review.");

    setTitle("");
    setCategory(categories[0]);
    setDescription("");
    setLanguage("English");
    setDuration("30");
    setPrice("");
    setAgreed(false);

    await loadServices();
  }

  const filteredServices =
    filter === "All"
      ? services
      : services.filter((service) => {
          if (filter === "Approved") {
            return service.status === "published";
          }

          if (filter === "Pending review") {
            return service.status === "pending";
          }

          if (filter === "Rejected") {
            return service.status === "rejected";
          }

          if (filter === "Suspended") {
            return service.status === "suspended";
          }

          return service.status === "draft";
        });

  const pendingCount = services.filter(
    (service) => service.status === "pending",
  ).length;

  const approvedCount = services.filter(
    (service) => service.status === "published",
  ).length;

  return (
    <main className="services-page">
      <aside className="sidebar">
        <Link href="/provider/dashboard" className="brand">
          <span className="brand-mark">N</span>
          <span>NiaWorld</span>
        </Link>

        <div className="sidebar-heading">PROVIDER WORKSPACE</div>

        <nav className="sidebar-nav">
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={
                item.href === "/provider/services"
                  ? "nav-link active"
                  : "nav-link"
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sidebar-footer">
          <span className="footer-dot" />
          Provider workspace
        </div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div>
            <p className="eyebrow">PROVIDER WORKSPACE</p>
            <h1>My services</h1>
          </div>

          <Link href="/provider/dashboard" className="back-link">
            Back to dashboard
          </Link>
        </header>

        <div className="content">
          <section className="intro">
            <div>
              <p className="eyebrow">YOUR OFFERINGS</p>
              <h2>Share what you can offer.</h2>
              <p>
                Create cultural experiences and language sessions
                customers can discover and book.
              </p>
            </div>

            <div className="intro-icon">✦</div>
          </section>

          <section className="stats-grid">
            <div className="stat-card">
              <span>Total services</span>
              <strong>{services.length}</strong>
            </div>

            <div className="stat-card">
              <span>Pending review</span>
              <strong>{pendingCount}</strong>
            </div>

            <div className="stat-card">
              <span>Approved services</span>
              <strong>{approvedCount}</strong>
            </div>
          </section>

          <section className="form-section">
            <div className="section-heading">
              <div>
                <p className="eyebrow">CREATE A SERVICE</p>
                <h2>Service details</h2>
                <p>
                  Complete the details below. Your service will be
                  submitted directly for review.
                </p>
              </div>
            </div>

            {error && (
              <div className="alert error-alert" role="alert">
                {error}
              </div>
            )}

            {success && (
              <div className="alert success-alert" role="status">
                {success}
              </div>
            )}

            <form onSubmit={submitService} className="service-form">
              <div className="field">
                <label htmlFor="service-title">Service title</label>
                <input
                  id="service-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="e.g. Discover everyday Kenyan culture"
                  minLength={5}
                  maxLength={80}
                  required
                />
                <small>5–80 characters</small>
              </div>

              <div className="field">
                <label htmlFor="category">Category</label>
                <select
                  id="category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  required
                >
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="language">Session language</label>
                <select
                  id="language"
                  value={language}
                  onChange={(event) => setLanguage(event.target.value)}
                  required
                >
                  <option>English</option>
                  <option>Kiswahili</option>
                  <option>English and Kiswahili</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="duration">Session duration</label>
                <select
                  id="duration"
                  value={duration}
                  onChange={(event) => setDuration(event.target.value)}
                  required
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="45">45 minutes</option>
                  <option value="60">60 minutes</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="price">Price (USD)</label>
                <div className="price-input">
                  <span>$</span>
                  <input
                    id="price"
                    type="number"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    placeholder="10.00"
                    min="0.01"
                    max="10000"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div className="field full-width">
                <label htmlFor="description">Service description</label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Describe what customers will experience, what they will learn, and what they can expect from the session."
                  minLength={30}
                  maxLength={1200}
                  rows={6}
                  required
                />
                <small>
                  {description.length}/1200 characters · Minimum 30
                </small>
              </div>

              <div className="format-note full-width">
                <div className="format-icon">💬</div>
                <div>
                  <strong>Text chat sessions</strong>
                  <p>
                    Services currently support text chat. Other session
                    formats are not available in this version.
                  </p>
                </div>
              </div>

              <label className="agreement full-width">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(event) => setAgreed(event.target.checked)}
                />
                <span>
                  I agree to NiaWorld&apos;s provider standards and
                  understand that my service must be reviewed before
                  customers can discover it.
                </span>
              </label>

              <div className="form-actions full-width">
                <button
                  type="submit"
                  className="submit-button"
                  disabled={submitting}
                >
                  {submitting
                    ? "Submitting..."
                    : "Submit service for review"}
                </button>
              </div>
            </form>
          </section>

          <section className="list-section">
            <div className="section-heading list-heading">
              <div>
                <p className="eyebrow">SERVICE MANAGEMENT</p>
                <h2>Your submitted services</h2>
                <p>
                  Track the review status of services submitted to
                  NiaWorld.
                </p>
              </div>
            </div>

            <div className="filters">
              {[
                "All",
                "Pending review",
                "Approved",
                "Rejected",
                "Suspended",
              ].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setFilter(item)}
                  className={filter === item ? "filter active" : "filter"}
                >
                  {item}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="empty-state">
                Loading your services...
              </div>
            ) : filteredServices.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">✦</div>
                <h3>No services found</h3>
                <p>
                  {filter === "All"
                    ? "Submit your first service using the form above."
                    : `You do not have any ${filter.toLowerCase()} services.`}
                </p>
              </div>
            ) : (
              <div className="service-list">
                {filteredServices.map((service) => (
                  <article key={service.id} className="service-card">
                    <div className="service-card-main">
                      <div className="service-card-top">
                        <span className="category-tag">
                          {service.category}
                        </span>
                        <span
                          className={`status status-${service.status}`}
                        >
                          {statusLabels[service.status] ??
                            service.status}
                        </span>
                      </div>

                      <h3>{service.title}</h3>
                      <p className="service-description">
                        {service.description}
                      </p>

                      <div className="service-meta">
                        <span>
                          {service.languages?.join(" / ") || "Language not set"}
                        </span>
                        <span>
                          {service.duration_minutes} minutes
                        </span>
                        <span>
                          ${Number(service.price).toFixed(2)}
                        </span>
                      </div>

                      {service.status === "rejected" && (
                        <p className="review-note">
                          This service was rejected. Contact NiaWorld
                          support for guidance before submitting another
                          version.
                        </p>
                      )}

                      {service.status === "suspended" && (
                        <p className="review-note">
                          This service is currently suspended. Contact
                          NiaWorld support for assistance.
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>

      <nav className="mobile-nav" aria-label="Provider navigation">
        {navigation.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={
              item.href === "/provider/services"
                ? "mobile-nav-link active"
                : "mobile-nav-link"
            }
          >
            {item.label === "Dashboard"
              ? "Home"
              : item.label === "My services"
                ? "Services"
                : item.label}
          </Link>
        ))}
      </nav>

      <style jsx>{`
        .services-page {
          min-height: 100vh;
          color: #263329;
          background:
            linear-gradient(
              135deg,
              rgba(244, 248, 239, 0.94),
              rgba(239, 246, 232, 0.9)
            ),
            url("/images/cultural-background.jpg") center / cover fixed;
          font-family: Arial, Helvetica, sans-serif;
        }

        .sidebar {
          position: fixed;
          inset: 0 auto 0 0;
          z-index: 20;
          display: flex;
          width: 250px;
          flex-direction: column;
          padding: 30px 20px;
          background: rgba(255, 255, 255, 0.94);
          border-right: 1px solid rgba(31, 77, 26, 0.1);
          backdrop-filter: blur(14px);
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 11px;
          color: #1f4d1a;
          font-size: 21px;
          font-weight: 800;
          text-decoration: none;
        }

        .brand-mark {
          display: grid;
          width: 38px;
          height: 38px;
          place-items: center;
          color: white;
          background: #4c9a2a;
          border-radius: 12px;
        }

        .sidebar-heading {
          margin: 48px 0 16px;
          color: #89968a;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        .sidebar-nav {
          display: grid;
          gap: 7px;
        }

        .nav-link {
          padding: 13px 14px;
          color: #637064;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: 0.2s ease;
        }

        .nav-link:hover,
        .nav-link.active {
          color: #1f4d1a;
          background: #edf6e8;
        }

        .nav-link.active {
          font-weight: 800;
        }

        .sidebar-footer {
          display: flex;
          align-items: center;
          gap: 9px;
          margin-top: auto;
          color: #788579;
          font-size: 12px;
        }

        .footer-dot {
          width: 8px;
          height: 8px;
          background: #7ed321;
          border-radius: 50%;
        }

        .main-content {
          min-height: 100vh;
          margin-left: 250px;
        }

        .topbar {
          display: flex;
          min-height: 100px;
          align-items: center;
          justify-content: space-between;
          padding: 20px 5%;
          background: rgba(255, 255, 255, 0.82);
          border-bottom: 1px solid rgba(31, 77, 26, 0.08);
        }

        .topbar h1 {
          margin: 4px 0 0;
          color: #1f4d1a;
          font-size: 25px;
        }

        .eyebrow {
          margin: 0;
          color: #71945f;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 1.5px;
        }

        .back-link {
          color: #4c7c3c;
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        .content {
          width: min(1050px, 92%);
          margin: 0 auto;
          padding: 36px 0 70px;
        }

        .intro {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          padding: 30px;
          background: rgba(255, 255, 255, 0.88);
          border: 1px solid rgba(31, 77, 26, 0.08);
          border-radius: 20px;
          box-shadow: 0 12px 35px rgba(31, 77, 26, 0.04);
        }

        .intro h2 {
          margin: 10px 0;
          color: #1f4d1a;
          font-size: clamp(24px, 3vw, 34px);
        }

        .intro p:not(.eyebrow) {
          max-width: 600px;
          margin: 0;
          color: #718071;
          font-size: 14px;
          line-height: 1.7;
        }

        .intro-icon {
          display: grid;
          width: 64px;
          height: 64px;
          flex-shrink: 0;
          place-items: center;
          color: #4c9a2a;
          background: #edf6e8;
          border-radius: 18px;
          font-size: 30px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin: 20px 0 32px;
        }

        .stat-card {
          padding: 20px 22px;
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(31, 77, 26, 0.08);
          border-radius: 15px;
        }

        .stat-card span {
          display: block;
          color: #7b897b;
          font-size: 12px;
        }

        .stat-card strong {
          display: block;
          margin-top: 9px;
          color: #1f4d1a;
          font-size: 28px;
        }

        .form-section,
        .list-section {
          margin-top: 25px;
          padding: 28px;
          background: rgba(255, 255, 255, 0.92);
          border: 1px solid rgba(31, 77, 26, 0.08);
          border-radius: 19px;
          box-shadow: 0 12px 35px rgba(31, 77, 26, 0.035);
        }

        .section-heading h2 {
          margin: 8px 0;
          color: #1f4d1a;
          font-size: 22px;
        }

        .section-heading p:not(.eyebrow) {
          margin: 0;
          color: #7a8879;
          font-size: 13px;
          line-height: 1.6;
        }

        .service-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 20px;
          margin-top: 27px;
        }

        .field {
          display: grid;
          align-content: start;
          gap: 9px;
        }

        .field label {
          color: #344a35;
          font-size: 13px;
          font-weight: 700;
        }

        .field input,
        .field select,
        .field textarea {
          width: 100%;
          min-width: 0;
          padding: 13px 14px;
          color: #2b392d;
          background: #fbfdf9;
          border: 1px solid #dce6d8;
          border-radius: 10px;
          outline: none;
          font: inherit;
          font-size: 13px;
          transition: border 0.2s ease;
        }

        .field input:focus,
        .field select:focus,
        .field textarea:focus {
          border-color: #78b65b;
          box-shadow: 0 0 0 3px rgba(126, 211, 33, 0.1);
        }

        .field textarea {
          resize: vertical;
          line-height: 1.6;
        }

        .field small {
          color: #879487;
          font-size: 11px;
        }

        .full-width {
          grid-column: 1 / -1;
        }

        .price-input {
          position: relative;
        }

        .price-input span {
          position: absolute;
          top: 50%;
          left: 14px;
          color: #6b8067;
          transform: translateY(-50%);
        }

        .price-input input {
          padding-left: 30px;
        }

        .format-note {
          display: flex;
          align-items: center;
          gap: 14px;
          padding: 17px;
          background: #f2f8ed;
          border: 1px solid #e0edd7;
          border-radius: 12px;
        }

        .format-icon {
          display: grid;
          width: 40px;
          height: 40px;
          flex-shrink: 0;
          place-items: center;
          background: white;
          border-radius: 12px;
        }

        .format-note strong {
          color: #315b2b;
          font-size: 13px;
        }

        .format-note p {
          margin: 5px 0 0;
          color: #758573;
          font-size: 12px;
          line-height: 1.5;
        }

        .agreement {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          color: #687668;
          font-size: 12px;
          line-height: 1.6;
          cursor: pointer;
        }

        .agreement input {
          width: 16px;
          height: 16px;
          flex-shrink: 0;
          margin-top: 2px;
          accent-color: #4c9a2a;
        }

        .form-actions {
          display: flex;
          justify-content: flex-end;
        }

        .submit-button {
          padding: 14px 23px;
          color: white;
          background: #4c9a2a;
          border: 0;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          transition: 0.2s ease;
        }

        .submit-button:hover:not(:disabled) {
          background: #367c20;
          transform: translateY(-1px);
        }

        .submit-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .alert {
          margin-top: 20px;
          padding: 13px 15px;
          border-radius: 10px;
          font-size: 13px;
          line-height: 1.5;
        }

        .error-alert {
          color: #963c34;
          background: #fff0ed;
          border: 1px solid #f3d0c9;
        }

        .success-alert {
          color: #2f7028;
          background: #eff9e9;
          border: 1px solid #d5ebc8;
        }

        .list-heading {
          margin-bottom: 22px;
        }

        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 20px;
        }

        .filter {
          padding: 9px 13px;
          color: #6d7b6c;
          background: #f7faf5;
          border: 1px solid #e3eadf;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 700;
          cursor: pointer;
        }

        .filter.active {
          color: white;
          background: #4c9a2a;
          border-color: #4c9a2a;
        }

        .service-list {
          display: grid;
          gap: 13px;
        }

        .service-card {
          padding: 20px;
          border: 1px solid #e5ece1;
          border-radius: 13px;
          background: #fff;
        }

        .service-card-top {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
        }

        .category-tag {
          color: #4d7c3d;
          background: #eff6e9;
          padding: 7px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
        }

        .status {
          padding: 7px 10px;
          border-radius: 20px;
          font-size: 10px;
          font-weight: 800;
        }

        .status-pending {
          color: #91691d;
          background: #fff5df;
        }

        .status-published {
          color: #34752c;
          background: #eaf7e5;
        }

        .status-rejected {
          color: #a0443b;
          background: #fff0ed;
        }

        .status-suspended {
          color: #6d5a83;
          background: #f3eef8;
        }

        .status-draft {
          color: #64716a;
          background: #eef1ee;
        }

        .service-card h3 {
          margin: 15px 0 7px;
          color: #29462a;
          font-size: 17px;
        }

        .service-description {
          margin: 0;
          color: #7b887b;
          font-size: 12px;
          line-height: 1.7;
          white-space: pre-wrap;
          overflow-wrap: anywhere;
        }

        .service-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 18px;
          margin-top: 16px;
          padding-top: 13px;
          border-top: 1px solid #edf1ea;
          color: #647664;
          font-size: 11px;
          font-weight: 700;
        }

        .review-note {
          margin: 14px 0 0;
          padding: 11px;
          color: #815d30;
          background: #fff8e9;
          border-radius: 8px;
          font-size: 11px;
          line-height: 1.6;
        }

        .empty-state {
          padding: 45px 20px;
          color: #7c897a;
          background: #fafcf8;
          border: 1px dashed #d8e5d2;
          border-radius: 13px;
          text-align: center;
          font-size: 13px;
        }

        .empty-icon {
          color: #7ab45b;
          font-size: 28px;
        }

        .empty-state h3 {
          margin: 10px 0 6px;
          color: #345c2e;
          font-size: 17px;
        }

        .empty-state p {
          margin: 0;
          line-height: 1.6;
        }

        .mobile-nav {
          display: none;
        }

        @media (max-width: 850px) {
          .sidebar {
            width: 210px;
          }

          .main-content {
            margin-left: 210px;
          }

          .content {
            width: 94%;
          }

          .form-section,
          .list-section {
            padding: 22px;
          }
        }

        @media (max-width: 650px) {
          .sidebar {
            display: none;
          }

          .main-content {
            margin-left: 0;
            padding-bottom: 75px;
          }

          .topbar {
            min-height: 80px;
            padding: 15px 5%;
          }

          .topbar h1 {
            font-size: 21px;
          }

          .back-link {
            font-size: 11px;
          }

          .content {
            width: 92%;
            padding-top: 20px;
          }

          .intro {
            padding: 22px;
          }

          .intro-icon {
            width: 48px;
            height: 48px;
            border-radius: 14px;
            font-size: 22px;
          }

          .stats-grid {
            gap: 9px;
          }

          .stat-card {
            padding: 14px 12px;
          }

          .stat-card span {
            font-size: 10px;
            line-height: 1.4;
          }

          .stat-card strong {
            font-size: 23px;
          }

          .form-section,
          .list-section {
            padding: 19px 16px;
          }

          .service-form {
            grid-template-columns: 1fr;
            gap: 17px;
          }

          .full-width {
            grid-column: auto;
          }

          .form-actions {
            grid-column: auto;
          }

          .submit-button {
            width: 100%;
          }

          .mobile-nav {
            position: fixed;
            inset: auto 0 0;
            z-index: 30;
            display: flex;
            justify-content: space-around;
            gap: 3px;
            padding: 10px 5px calc(10px + env(safe-area-inset-bottom));
            background: rgba(255, 255, 255, 0.97);
            border-top: 1px solid #e4ebe0;
            backdrop-filter: blur(12px);
          }

          .mobile-nav-link {
            max-width: 18%;
            color: #758274;
            font-size: 9px;
            font-weight: 700;
            text-align: center;
            text-decoration: none;
            overflow-wrap: anywhere;
          }

          .mobile-nav-link.active {
            color: #367c20;
          }
        }
      `}</style>
    </main>
  );
}
