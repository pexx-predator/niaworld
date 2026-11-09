"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type CaptureResponse = {
  success?: boolean;
  alreadyProcessed?: boolean;
  membershipId?: string;
  membership?: unknown;
  message?: string;
  error?: string;
  status?: string;
};

type Props = {
  orderId: string;
};

export default function MembershipReturnClient({ orderId }: Props) {
  const started = useRef(false);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState(
    "Verifying your PayPal payment...",
  );

  useEffect(() => {
    if (!orderId) {
      setLoading(false);
      setMessage(
        "We couldn't find a PayPal order reference. Please check your membership before trying again.",
      );
      return;
    }

    if (started.current) {
      return;
    }

    started.current = true;
    let active = true;

    async function confirmPayment() {
      try {
        const response = await fetch(
          "/api/paypal/memberships/capture",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ orderId }),
          },
        );

        const result =
          (await response.json()) as CaptureResponse;

        if (!active) {
          return;
        }

        if (response.status === 202) {
          setSuccess(false);
          setMessage(
            result.message ||
              "PayPal has not confirmed the completed payment yet. Please check again shortly.",
          );
          return;
        }

        if (response.status === 401) {
          setMessage(
            "Please sign in with the account you used to purchase this membership, then return to check your payment.",
          );
          return;
        }

        if (!response.ok || !result.success) {
          throw new Error(
            result.error ||
              "We couldn't confirm your membership payment.",
          );
        }

        setSuccess(true);
        setMessage(
          result.alreadyProcessed
            ? "Your membership payment has already been confirmed."
            : "Your payment has been confirmed and your membership is active.",
        );
      } catch (err) {
        console.error("Membership payment confirmation failed:", err);

        if (active) {
          setSuccess(false);
          setMessage(
            err instanceof Error
              ? err.message
              : "We couldn't confirm your payment. Please try again.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    confirmPayment();

    return () => {
      active = false;
    };
  }, [orderId, attempt]);

  const canRetry =
    !loading &&
    !success &&
    Boolean(orderId);

  return (
    <main className="return-page">
      <section className="return-card">
        <span className="eyebrow">NIAWORLD MEMBERSHIP</span>

        {loading ? (
          <div className="status-icon loading-icon">...</div>
        ) : success ? (
          <div className="status-icon success-icon">✓</div>
        ) : (
          <div className="status-icon pending-icon">!</div>
        )}

        <h1>
          {loading
            ? "Confirming your payment"
            : success
              ? "Membership confirmed"
              : "Payment confirmation"}
        </h1>

        <p aria-live="polite">{message}</p>

        {!loading && !success && (
          <div className="actions">
            {canRetry && (
              <button
                type="button"
                onClick={() => {
                  started.current = false;
                  setLoading(true);
                  setMessage("Checking your payment again...");
                  setAttempt((value) => value + 1);
                }}
              >
                Try again
              </button>
            )}

            <Link href="/auth">
              Sign in
            </Link>
          </div>
        )}

        {success && (
          <Link className="primary-link" href="/dashboard">
            Go to your dashboard →
          </Link>
        )}

        {!success && !loading && (
          <Link className="secondary-link" href="/membership">
            Return to membership plans
          </Link>
        )}
      </section>

      <style jsx>{`
        .return-page {
          display: flex;
          min-height: 100vh;
          align-items: center;
          justify-content: center;
          padding: 25px;
          background: linear-gradient(
            145deg,
            #f1f5e9,
            #f8f8f0 55%,
            #edf3e7
          );
          color: #263c2a;
        }

        .return-card {
          width: 100%;
          max-width: 560px;
          padding: 45px 35px;
          border: 1px solid rgba(49, 76, 48, 0.12);
          border-radius: 24px;
          background: rgba(255, 255, 255, 0.93);
          box-shadow: 0 18px 55px rgba(30, 55, 30, 0.08);
          text-align: center;
        }

        .eyebrow {
          color: #477a43;
          font-size: 0.72rem;
          font-weight: 800;
          letter-spacing: 0.15em;
        }

        .status-icon {
          display: flex;
          width: 66px;
          height: 66px;
          align-items: center;
          justify-content: center;
          margin: 28px auto 20px;
          border-radius: 50%;
          font-size: 1.8rem;
          font-weight: 800;
        }

        .loading-icon {
          background: #e9f1df;
          color: #356d3c;
        }

        .success-icon {
          background: #e2f3df;
          color: #2e7838;
        }

        .pending-icon {
          background: #fff1d8;
          color: #94621c;
        }

        h1 {
          margin: 0 0 14px;
          font-size: clamp(1.7rem, 5vw, 2.3rem);
          font-weight: 850;
          letter-spacing: -0.04em;
        }

        p {
          margin: 0;
          color: #657064;
          font-size: 0.98rem;
          line-height: 1.8;
        }

        .actions {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 12px;
          margin-top: 28px;
        }

        button,
        .primary-link,
        .actions a {
          display: inline-flex;
          min-height: 46px;
          align-items: center;
          justify-content: center;
          padding: 0 22px;
          border: 0;
          border-radius: 999px;
          background: #356d3c;
          color: white;
          font-size: 0.88rem;
          font-weight: 800;
          text-decoration: none;
          cursor: pointer;
        }

        button:hover,
        .primary-link:hover,
        .actions a:hover {
          background: #234d2b;
        }

        .primary-link {
          margin-top: 28px;
        }

        .secondary-link {
          display: inline-block;
          margin-top: 22px;
          color: #39713e;
          font-size: 0.88rem;
          font-weight: 700;
          text-decoration: none;
        }
      `}</style>
    </main>
  );
}