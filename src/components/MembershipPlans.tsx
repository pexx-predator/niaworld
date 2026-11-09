
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type MembershipPlan = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  billing_interval: "weekly" | "monthly" | "yearly";
  included_minutes: number;
};

export default function MembershipPlans() {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadPlans() {
      try {
        const supabase = createClient();

        const { data, error: queryError } = await supabase
          .from("membership_plans")
          .select(
            "id, slug, name, description, price, currency, billing_interval, included_minutes",
          )
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (queryError) {
          throw queryError;
        }

        if (active) {
          setPlans((data ?? []) as MembershipPlan[]);
        }
      } catch (err) {
        console.error("Unable to load membership plans:", err);

        if (active) {
          setError("Membership plans are temporarily unavailable.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadPlans();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="membership-section section-pad" id="membership">
      <div className="membership-heading">
        <span className="membership-kicker">YOUR NIAWORLD MEMBERSHIP</span>

        <h2>
          More time for <span>real connection.</span>
        </h2>

        <p>
          Choose a membership that gives you more time to discover cultures,
          learn from people, and enjoy meaningful conversations.
        </p>
      </div>

      {loading ? (
        <p className="membership-message" aria-live="polite">
          Loading membership plans...
        </p>
      ) : error ? (
        <p className="membership-message membership-error">{error}</p>
      ) : plans.length === 0 ? (
        <p className="membership-message">
          Membership plans will be available soon.
        </p>
      ) : (
        <div className="membership-grid">
          {plans.map((plan) => (
            <article className="membership-card" key={plan.id}>
              <div>
                <span className="membership-period">
                  {plan.billing_interval}
                </span>

                <h3>{plan.name}</h3>

                <div className="membership-price">
                  <strong>
                    {new Intl.NumberFormat("en-US", {
                      style: "currency",
                      currency: plan.currency,
                      maximumFractionDigits: 2,
                    }).format(plan.price)}
                  </strong>

                  <span>
                    /{" "}
                    {plan.billing_interval === "weekly"
                      ? "week"
                      : plan.billing_interval === "monthly"
                        ? "month"
                        : "year"}
                  </span>
                </div>

                <p className="membership-minutes">
                  {plan.included_minutes.toLocaleString()} minutes included
                </p>

                {plan.description && (
                  <p className="membership-description">
                    {plan.description}
                  </p>
                )}
              </div>

              <a
                className="membership-button"
                href={`/membership?plan=${encodeURIComponent(plan.slug)}`}
              >
                Choose this plan <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      )}

      <p className="membership-footnote">
        Membership minutes are for eligible NiaWorld experiences and
        conversations, subject to the membership terms.
      </p>

      <style jsx>{`
        .membership-section {
          background: linear-gradient(
            145deg,
            #f1f5e9,
            #f8f8f0 55%,
            #edf3e7
          );
        }

        .membership-heading {
          max-width: 720px;
          margin: 0 auto 42px;
          text-align: center;
        }

        .membership-kicker {
          color: #477a43;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.15em;
        }

        .membership-heading h2 {
          margin: 16px 0;
          color: #263c2a;
          font-size: clamp(2rem, 4vw, 3.3rem);
          font-weight: 800;
          line-height: 1.12;
          letter-spacing: -0.045em;
        }

        .membership-heading h2 span {
          color: #39713e;
        }

        .membership-heading > p {
          margin: 0;
          color: #657064;
          font-size: 1rem;
          line-height: 1.8;
        }

        .membership-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 22px;
          max-width: 1120px;
          margin: 0 auto;
        }

        .membership-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          justify-content: space-between;
          gap: 28px;
          padding: 30px;
          border: 1px solid rgba(49, 76, 48, 0.15);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 0 12px 35px rgba(30, 55, 30, 0.06);
        }

        .membership-period {
          display: inline-block;
          padding: 7px 12px;
          border-radius: 999px;
          color: #356d3c;
          background: #e9f1df;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .membership-card h3 {
          margin: 20px 0 12px;
          color: #263c2a;
          font-size: 1.35rem;
          font-weight: 800;
        }

        .membership-price {
          display: flex;
          align-items: baseline;
          gap: 7px;
          flex-wrap: wrap;
        }

        .membership-price strong {
          color: #234d2b;
          font-size: 2.3rem;
          font-weight: 850;
          letter-spacing: -0.05em;
        }

        .membership-price span {
          color: #758071;
          font-size: 0.9rem;
        }

        .membership-minutes {
          margin: 16px 0 10px;
          color: #39713e;
          font-size: 0.95rem;
          font-weight: 800;
        }

        .membership-description {
          margin: 0;
          color: #657064;
          font-size: 0.88rem;
          line-height: 1.7;
        }

        .membership-button {
          display: flex;
          min-height: 48px;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 0 18px;
          border-radius: 999px;
          color: #fff;
          background: #356d3c;
          font-size: 0.88rem;
          font-weight: 800;
          text-decoration: none;
          transition: background 180ms ease, transform 180ms ease;
        }

        .membership-button:hover {
          transform: translateY(-2px);
          background: #234d2b;
        }

        .membership-message {
          padding: 30px;
          color: #657064;
          text-align: center;
        }

        .membership-error {
          color: #a33a32;
        }

        .membership-footnote {
          max-width: 760px;
          margin: 28px auto 0;
          color: #758071;
          font-size: 0.78rem;
          line-height: 1.7;
          text-align: center;
        }

        @media (max-width: 850px) {
          .membership-grid {
            grid-template-columns: 1fr;
            max-width: 520px;
          }
        }

        @media (max-width: 480px) {
          .membership-card {
            padding: 24px;
          }

          .membership-price strong {
            font-size: 2rem;
          }
        }
      `}</style>
    </section>
  );
}
