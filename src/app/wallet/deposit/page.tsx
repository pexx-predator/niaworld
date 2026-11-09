
"use client";

import { useState } from "react";
import Link from "next/link";

export default function PayPalDepositPage() {
  const [amount, setAmount] = useState("10.00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [pendingReview, setPendingReview] = useState(false);

  async function startDeposit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPendingReview(false);

    const value = Number(amount);

    if (
      !Number.isFinite(value) ||
      !/^\d{1,4}(\.\d{1,2})?$/.test(amount) ||
      value < 1 ||
      value > 1000
    ) {
      setError("Enter a valid amount between $1.00 and $1,000.00, using up to two decimal places.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/paypal/deposits/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: value.toFixed(2) }),
      });

      const result = await response.json();

      if (result.status === "PENDING_REVIEW") {
        setPendingReview(true);
        setError(
          result.error ||
            "Your previous PayPal payment is awaiting confirmation. Please do not submit another deposit for the same payment."
        );
        setLoading(false);
        return;
      }

      if (!response.ok || !result.approvalUrl) {
        throw new Error(result.error || "Unable to start your deposit.");
      }

      window.location.assign(result.approvalUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f8f5ed] px-4 py-12 text-[#26382d]">
      <div className="mx-auto max-w-lg">
        <Link
          href="/wallet"
          className="text-sm font-semibold text-[#254c38] transition hover:text-[#a35c40]"
        >
          ← Back to wallet
        </Link>

        <section className="mt-8 rounded-3xl border border-[#e5dfd1] bg-[#fffdf7] p-6 shadow-lg sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#a35c40]">
            Secure wallet deposit
          </p>

          <h1 className="mt-3 text-3xl font-bold">Add money</h1>

          <p className="mt-3 text-sm leading-6 text-[#657267]">
            Add funds to your NiaWorld USD wallet using PayPal.
            You will approve the payment on PayPal before returning here.
          </p>

          <form onSubmit={startDeposit} className="mt-8 space-y-5">
            <div>
              <label
                htmlFor="deposit-amount"
                className="mb-2 block text-sm font-semibold"
              >
                Deposit amount (USD)
              </label>

              <div className="flex items-center rounded-xl border border-[#d8dfd2] bg-white px-4">
                <span className="text-lg font-semibold text-[#657267]">
                  $
                </span>

                <input
                  id="deposit-amount"
                  type="number"
                  min="1"
                  max="1000"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  className="min-h-14 w-full bg-transparent px-3 text-lg font-semibold outline-none"
                  placeholder="10.00"
                  disabled={loading}
                />
              </div>

              <p className="mt-2 text-xs text-[#758075]">
                Minimum $1.00 · Maximum $1,000.00 per deposit
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className={`rounded-xl border p-4 text-sm leading-6 ${
                  pendingReview
                    ? "border-amber-200 bg-amber-50 text-amber-900"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                <p className="font-semibold">
                  {pendingReview
                    ? "Payment awaiting confirmation"
                    : "Deposit could not be started"}
                </p>
                <p className="mt-1">{error}</p>

                {pendingReview && (
                  <Link
                    href="/wallet"
                    className="mt-3 inline-flex font-semibold underline underline-offset-4"
                  >
                    Return to wallet
                  </Link>
                )}
              </div>
            )}

            {!pendingReview && (
              <button
                type="submit"
                disabled={loading}
                className="min-h-12 w-full rounded-xl bg-[#254c38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3d2d] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Connecting to PayPal..." : "Continue to PayPal"}
              </button>
            )}
          </form>

          <div className="mt-6 rounded-2xl border border-[#d8dfd2] bg-[#f2f6ef] p-4">
            <h2 className="font-bold text-[#254c38]">
              Use another PayPal account
            </h2>

            <p className="mt-2 text-sm leading-6 text-[#536357]">
              You can use a different PayPal Personal Sandbox account
              whenever you make a deposit. Sign in to the account you
              want to use when PayPal opens.
            </p>

            <p className="mt-2 text-sm leading-6 text-[#536357]">
              If PayPal automatically remembers your previous account,
              sign out of PayPal first, then sign in using your other
              Sandbox account.
            </p>

            <p className="mt-3 text-xs leading-5 text-[#758075]">
              Changing your PayPal account does not create a new
              NiaWorld wallet. Your deposits still go to your existing
              USD wallet.
            </p>
          </div>

          <div className="mt-5 rounded-xl bg-[#f4eee2] p-4 text-xs leading-5 text-[#695a48]">
            Your wallet is credited only after NiaWorld verifies a
            completed PayPal capture. Returning from PayPal alone does
            not confirm payment. A payment awaiting PayPal review must
            not be submitted again.
          </div>

          <p className="mt-5 text-center text-xs text-[#758075]">
            PayPal Sandbox testing · No real payment is processed.
          </p>
        </section>
      </div>
    </main>
  );
}
