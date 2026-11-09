
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

type CheckoutResponse = {
  success?: boolean;
  approvalUrl?: string;
  returnUrl?: string;
  orderId?: string;
  alreadyApproved?: boolean;
  resumed?: boolean;
  error?: string;
};

type Props = {
  initialPlanSlug: string;
  cancelled: boolean;
};

function formatPrice(plan: MembershipPlan) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: plan.currency,
    maximumFractionDigits: 2,
  }).format(plan.price);
}

export default function MembershipCheckoutClient({
  initialPlanSlug,
  cancelled,
}: Props) {
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [selectedSlug, setSelectedSlug] = useState(initialPlanSlug);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
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
          const availablePlans = (data ?? []) as MembershipPlan[];

          setPlans(availablePlans);

          if (
            !availablePlans.some(
              (plan) => plan.slug === initialPlanSlug,
            )
          ) {
            setSelectedSlug("");
          }
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
  }, [initialPlanSlug]);

  const selectedPlan = plans.find(
    (plan) => plan.slug === selectedSlug,
  );

  async function handleCheckout() {
    if (!selectedPlan || checkoutLoading) {
      return;
    }

    setError("");
    setCheckoutLoading(true);

    try {
      const response = await fetch(
        "/api/paypal/memberships/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            planSlug: selectedPlan.slug,
          }),
        },
      );

      const result =
        (await response.json()) as CheckoutResponse;

      if (response.status === 401) {
        window.location.assign(
          `/auth?next=${encodeURIComponent(
            `/membership?plan=${selectedPlan.slug}`,
          )}`,
        );
        return;
      }

      if (!response.ok || !result.success) {
        throw new Error(
          result.error ||
            "Unable to start membership checkout.",
        );
      }

      // PayPal order is already approved.
      // Continue through the existing server-side capture flow.
      if (result.alreadyApproved && result.returnUrl) {
        const returnUrl = new URL(
          result.returnUrl,
          window.location.origin,
        );

        if (
          returnUrl.origin !== window.location.origin ||
          returnUrl.pathname !== "/membership/return"
        ) {
          throw new Error(
            "The payment provider returned an invalid return link.",
          );
        }

        window.location.assign(returnUrl.toString());
        return;
      }

      if (!result.approvalUrl) {
        throw new Error(
          "PayPal did not return an approval link.",
        );
      }

      const approvalUrl = new URL(result.approvalUrl);

      const isPayPal =
        approvalUrl.protocol === "https:" &&
        (approvalUrl.hostname === "paypal.com" ||
          approvalUrl.hostname.endsWith(".paypal.com"));

      if (!isPayPal) {
        throw new Error(
          "The payment provider returned an invalid link.",
        );
      }

      window.location.assign(approvalUrl.toString());
    } catch (err) {
      console.error("Membership checkout failed:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start checkout. Please try again.",
      );

      setCheckoutLoading(false);
    }
  }

  return (
    <main className="membership-page">
      <div className="membership-container">
        <Link href="/" className="back-link">
          ← Back to NiaWorld
        </Link>

        <header className="page-heading">
          <span className="eyebrow">
            NIAWORLD MEMBERSHIP
          </span>

          <h1>Choose your membership</h1>

          <p>
            Select a plan and continue securely to PayPal
            to complete your membership purchase.
          </p>
        </header>

        {cancelled && (
          <div className="notice">
            Checkout was cancelled. You can select a plan
            whenever you&apos;re ready.
          </div>
        )}

        {error && (
          <div className="error-message" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <p className="status-message">
            Loading available plans...
          </p>
        ) : error && plans.length === 0 ? (
          <p className="status-message">
            We couldn&apos;t load the membership plans.
            Please refresh and try again.
          </p>
        ) : plans.length === 0 ? (
          <p className="status-message">
            No membership plans are currently available.
          </p>
        ) : (
          <>
            <div className="plans-grid">
              {plans.map((plan) => {
                const selected = selectedSlug === plan.slug;

                return (
                  <button
                    type="button"
                    key={plan.id}
                    className={`plan-card ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() => {
                      setSelectedSlug(plan.slug);
                      setError("");
                    }}
                    aria-pressed={selected}
                  >
                    <span className="plan-period">
                      {plan.billing_interval}
                    </span>

                    <h2>{plan.name}</h2>

                    <div className="plan-price">
                      {formatPrice(plan)}
                    </div>

                    <p className="plan-interval">
                      per{" "}
                      {plan.billing_interval.replace("ly", "")}
                    </p>

                    <p className="plan-minutes">
                      {plan.included_minutes.toLocaleString()}{" "}
                      minutes included
                    </p>

                    {plan.description && (
                      <p className="plan-description">
                        {plan.description}
                      </p>
                    )}

                    <span className="selection-indicator">
                      {selected
                        ? "✓ Selected"
                        : "Select plan"}
                    </span>
                  </button>
                );
              })}
            </div>

            <section className="checkout-panel">
              <div>
                <span className="checkout-label">
                  YOUR SELECTION
                </span>

                {selectedPlan ? (
                  <>
                    <h2>{selectedPlan.name}</h2>

                    <p>
                      {formatPrice(selectedPlan)} ·{" "}
                      {selectedPlan.billing_interval}
                    </p>
                  </>
                ) : (
                  <p>
                    Select a membership plan to continue.
                  </p>
                )}
              </div>

              <button
                type="button"
                className="checkout-button"
                disabled={!selectedPlan || checkoutLoading}
                onClick={handleCheckout}
              >
                {checkoutLoading
                  ? "Connecting to PayPal..."
                  : "Continue to PayPal →"}
              </button>
            </section>

            <section className="paypal-guidance">
              <h3>Before you continue to PayPal</h3>

              <p>
                Sign in to the PayPal account you intend to
                use for this purchase.
              </p>

              <p>
                Want to use a different account? Sign out
                of PayPal first, then continue and sign in
                with the other account.
              </p>
            </section>
          </>
        )}

        <p className="security-note">
          Your payment is processed securely by PayPal.
          NiaWorld activates membership only after the
          payment is verified.
        </p>
      </div>

      <style jsx>{`
        .membership-page {
          min-height: 100vh;
          padding: 48px 22px 70px;
          background-image:
            linear-gradient(
              145deg,
              rgba(241, 245, 233, 0.88),
              rgba(248, 248, 240, 0.88),
              rgba(237, 243, 231, 0.88)
            ),
            url("/images/cultural-background.jpg");
          background-position: center;
          background-size: cover;
          background-attachment: fixed;
          color: #263c2a;
        }

        .membership-container {
          width: 100%;
          max-width: 1080px;
          margin: 0 auto;
        }

        .back-link {
          color: #39713e;
          font-size: 0.9rem;
          font-weight: 700;
          text-decoration: none;
        }

        .page-heading {
          max-width: 700px;
          margin: 55px auto 42px;
          text-align: center;
        }

        .eyebrow {
          color: #477a43;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.15em;
        }

        .page-heading h1 {
          margin: 15px 0;
          font-size: clamp(2rem, 5vw, 3.4rem);
          font-weight: 850;
          letter-spacing: -0.045em;
          line-height: 1.12;
        }

        .page-heading p {
          color: #657064;
          font-size: 1rem;
          line-height: 1.8;
        }

        .plans-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 20px;
        }

        .plan-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          align-items: flex-start;
          padding: 28px;
          border: 2px solid rgba(49, 76, 48, 0.12);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.9);
          color: inherit;
          text-align: left;
          cursor: pointer;
          transition:
            border-color 180ms ease,
            transform 180ms ease;
        }

        .plan-card:hover {
          transform: translateY(-3px);
          border-color: #7ba779;
        }

        .plan-card.selected {
          border-color: #39713e;
          box-shadow: 0 10px 30px rgba(49, 76, 48, 0.1);
        }

        .plan-period {
          padding: 7px 12px;
          border-radius: 999px;
          background: #e9f1df;
          color: #356d3c;
          font-size: 0.7rem;
          font-weight: 800;
          text-transform: uppercase;
        }

        .plan-card h2 {
          margin: 20px 0 12px;
          font-size: 1.3rem;
          font-weight: 800;
        }

        .plan-price {
          color: #234d2b;
          font-size: 2.25rem;
          font-weight: 850;
          letter-spacing: -0.05em;
        }

        .plan-interval {
          margin: 0;
          color: #758071;
          font-size: 0.85rem;
        }

        .plan-minutes {
          margin: 18px 0 8px;
          color: #39713e;
          font-weight: 800;
        }

        .plan-description {
          margin: 5px 0 20px;
          color: #657064;
          font-size: 0.88rem;
          line-height: 1.7;
        }

        .selection-indicator {
          margin-top: auto;
          padding-top: 18px;
          color: #356d3c;
          font-size: 0.88rem;
          font-weight: 800;
        }

        .checkout-panel {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 25px;
          margin-top: 30px;
          padding: 26px;
          border: 1px solid rgba(49, 76, 48, 0.12);
          border-radius: 20px;
          background: rgba(255, 255, 255, 0.85);
        }

        .checkout-label {
          color: #477a43;
          font-size: 0.7rem;
          font-weight: 800;
          letter-spacing: 0.12em;
        }

        .checkout-panel h2 {
          margin: 8px 0;
          font-size: 1.25rem;
        }

        .checkout-panel p {
          margin: 0;
          color: #657064;
        }

        .checkout-button {
          min-height: 50px;
          padding: 0 24px;
          border: 0;
          border-radius: 999px;
          background: #356d3c;
          color: white;
          font-size: 0.9rem;
          font-weight: 800;
          cursor: pointer;
        }

        .checkout-button:hover:not(:disabled) {
          background: #234d2b;
        }

        .checkout-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .paypal-guidance {
          margin-top: 20px;
          padding: 20px 24px;
          border: 1px solid rgba(49, 76, 48, 0.12);
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.82);
        }

        .paypal-guidance h3 {
          margin: 0 0 10px;
          color: #356d3c;
          font-size: 0.95rem;
          font-weight: 800;
        }

        .paypal-guidance p {
          margin: 7px 0;
          color: #657064;
          font-size: 0.88rem;
          line-height: 1.7;
        }

        .notice,
        .error-message {
          margin: 0 auto 22px;
          padding: 14px 18px;
          border-radius: 12px;
          text-align: center;
        }

        .notice {
          background: #e9f1df;
          color: #356d3c;
        }

        .error-message {
          background: #fbe9e7;
          color: #a33a32;
        }

        .status-message {
          padding: 35px 15px;
          color: #657064;
          text-align: center;
        }

        .security-note {
          margin: 28px auto 0;
          color: #758071;
          font-size: 0.8rem;
          line-height: 1.7;
          text-align: center;
        }

        @media (max-width: 800px) {
          .plans-grid {
            grid-template-columns: 1fr;
            max-width: 540px;
            margin: 0 auto;
          }
        }

        @media (max-width: 560px) {
          .membership-page {
            padding: 30px 16px 50px;
            background-attachment: scroll;
          }

          .page-heading {
            margin-top: 40px;
          }

          .checkout-panel {
            align-items: stretch;
            flex-direction: column;
          }

          .checkout-button {
            width: 100%;
          }
        }
      `}</style>
    </main>
  );
}
