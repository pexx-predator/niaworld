
"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Result = {
  success?: boolean;
  alreadyProcessed?: boolean;
  amount?: number | string;
  currency?: string;
  status?: string;
  reason?: string | null;
  error?: string;
  message?: string;
};

export default function PayPalReturnPage() {
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<Result | null>(null);

  const orderIdRef = useRef<string | null>(null);
  const requestInProgressRef = useRef(false);
  const initialRequestStartedRef = useRef(false);

  async function checkPaymentStatus() {
    const orderId = orderIdRef.current;

    if (!orderId || requestInProgressRef.current) return;

    requestInProgressRef.current = true;
    setLoading(true);

    try {
      const response = await fetch("/api/paypal/deposits/capture", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ orderId }),
        cache: "no-store",
      });

      const data = (await response.json()) as Result;

      if (data.success) {
        setResult(data);
      } else {
        setResult({
          ...data,
          status: data.status ?? "UNKNOWN",
        });
      }
    } catch {
      setResult({
        error:
          "Unable to contact NiaWorld. Please check your connection and try again.",
      });
    } finally {
      requestInProgressRef.current = false;
      setLoading(false);
    }
  }

  useEffect(() => {
    const orderId = new URLSearchParams(
      window.location.search,
    ).get("token");

    if (!orderId || !/^[A-Z0-9]{8,64}$/.test(orderId)) {
      setResult({
        error: "No valid PayPal order reference was received.",
      });
      setLoading(false);
      return;
    }

    orderIdRef.current = orderId;

    if (initialRequestStartedRef.current) return;

    initialRequestStartedRef.current = true;
    void checkPaymentStatus();
  }, []);

  const isPending =
    !result?.success &&
    (result?.status === "PENDING" ||
      result?.reason === "PENDING_REVIEW");

  return (
    <main
      className="relative flex min-h-screen items-center justify-center bg-cover bg-center bg-fixed px-4 py-12 text-[#26382d]"
      style={{
        backgroundImage: "url('/images/cultural-background.jpg')",
      }}
    >
      <div className="absolute inset-0 bg-black/25" />

      <section className="relative z-10 w-full max-w-lg rounded-3xl border border-white/40 bg-[#fffdf7]/95 p-7 shadow-2xl backdrop-blur-sm sm:p-9">
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a35c40]">
          NiaWorld · PayPal payment
        </p>

        <h1 className="mt-3 text-2xl font-bold">
          {loading
            ? "Checking your payment"
            : result?.success
              ? "Deposit confirmed"
              : isPending
                ? "Payment under review"
                : "Payment confirmation"}
        </h1>

        {loading ? (
          <p className="mt-4 text-sm leading-6 text-[#657267]">
            NiaWorld is checking your payment directly with PayPal.
            Please keep this page open.
          </p>
        ) : result?.success ? (
          <>
            <p className="mt-4 text-sm leading-6 text-[#657267]">
              PayPal has confirmed your payment and your USD wallet
              has been credited.
            </p>

            <p className="mt-5 rounded-xl bg-emerald-50 p-4 text-lg font-bold text-emerald-800">
              {result.currency} {Number(result.amount).toFixed(2)}
            </p>
          </>
        ) : isPending ? (
          <>
            <p className="mt-4 text-sm leading-6 text-[#657267]">
              PayPal is reviewing this payment. Your wallet has not
              been credited yet. You do not need to make another
              payment.
            </p>

            {result?.reason && (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                PayPal status: {result.reason}
              </p>
            )}
          </>
        ) : (
          <p
            role="alert"
            className="mt-4 text-sm leading-6 text-red-700"
          >
            {result?.error ||
              result?.message ||
              "Your payment has not yet been confirmed."}
          </p>
        )}

        {!loading && (
          <div className="mt-7 flex flex-col gap-3">
            {!result?.success && (
              <button
                type="button"
                onClick={() => void checkPaymentStatus()}
                className="min-h-12 rounded-xl border border-[#d8dfd2] bg-white px-5 py-3 text-sm font-semibold text-[#254c38] transition hover:bg-[#f2f5f0] disabled:opacity-60"
                disabled={loading}
              >
                Check payment status again
              </button>
            )}

            <Link
              href="/wallet"
              className="flex min-h-12 items-center justify-center rounded-xl bg-[#254c38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f402f]"
            >
              Return to wallet
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
