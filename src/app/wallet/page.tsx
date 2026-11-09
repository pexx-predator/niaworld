
"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Wallet = {
  id: string;
  currency: string;
  created_at: string;
};

type WalletTransaction = {
  id: string;
  type: string;
  direction: "credit" | "debit";
  amount: number | string;
  currency: string;
  status: "pending" | "posted" | "failed" | "reversed";
  description: string | null;
  reference: string | null;
  created_at: string;
  posted_at: string | null;
};

type BalanceRow = {
  currency: string;
  balance: number | string;
};

const navigation = [
  { label: "Home", href: "/dashboard", symbol: "⌂" },
  { label: "Discover", href: "/discover", symbol: "✧" },
  { label: "Videos", href: "/videos", symbol: "▶" },
  { label: "Conversations", href: "/conversations", symbol: "▤" },
  { label: "Wallet", href: "/wallet", symbol: "$" },
  { label: "Bookings", href: "/bookings", symbol: "▣" },
  { label: "Messages", href: "/messages", symbol: "✉" },
  { label: "Profile", href: "/profile", symbol: "○" },
];

const formatUSD = (amount: number | string) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(amount));

const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

const transactionLabel = (type: string) =>
  type.replaceAll("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [signedIn, setSignedIn] = useState(false);

  const loadWallet = useCallback(async (isRefresh = false) => {
    const supabase = createClient();

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;

      if (!user) {
        setSignedIn(false);
        setWallet(null);
        setTransactions([]);
        setBalance(null);
        return;
      }

      setSignedIn(true);

      const { data: walletData, error: walletError } = await supabase
        .from("wallet_accounts")
        .select("id, currency, created_at")
        .eq("user_id", user.id)
        .maybeSingle();

      if (walletError) throw walletError;

      if (!walletData) {
        setWallet(null);
        setTransactions([]);
        setBalance(null);
        return;
      }

      setWallet(walletData as Wallet);

      const [balanceResult, transactionsResult] = await Promise.all([
        supabase.rpc("get_my_wallet_balance"),
        supabase
          .from("wallet_transactions")
          .select(
            "id, type, direction, amount, currency, status, description, reference, created_at, posted_at"
          )
          .eq("wallet_id", walletData.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (balanceResult.error) throw balanceResult.error;
      if (transactionsResult.error) throw transactionsResult.error;

      const rawBalance = balanceResult.data;
      const balanceRows: BalanceRow[] = Array.isArray(rawBalance)
        ? (rawBalance as BalanceRow[])
        : rawBalance && typeof rawBalance === "object"
          ? [rawBalance as BalanceRow]
          : [];

      const balanceRow = balanceRows.find(
        (row) => row.currency === "USD"
      );

      if (!balanceRow || !Number.isFinite(Number(balanceRow.balance))) {
        throw new Error("Your USD balance is not available.");
      }

      setBalance(Number(balanceRow.balance));
      setTransactions(
        (transactionsResult.data ?? []) as WalletTransaction[]
      );
    } catch (err) {
      console.error("Wallet loading error:", err);
      setError("We couldn't load your wallet. Please try again.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();

    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void loadWallet(), 0);
    });

    return () => subscription.unsubscribe();
  }, [loadWallet]);

  const statusClasses = (status: WalletTransaction["status"]) => {
    switch (status) {
      case "posted":
        return "bg-emerald-100 text-emerald-800";
      case "pending":
        return "bg-amber-100 text-amber-800";
      case "failed":
        return "bg-red-100 text-red-800";
      case "reversed":
        return "bg-slate-200 text-slate-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const activeHref = "/wallet";

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-[#f8f5ed] text-[#26382d]">
      <div
        aria-hidden="true"
        className="fixed inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/cultural-background.jpg')",
        }}
      />

      <div
        aria-hidden="true"
        className="fixed inset-0 bg-[#f8f5ed]/10"
      />

      <div className="relative z-10 min-h-screen">
        {/* Desktop navigation */}
        <header className="hidden border-b border-[#e5dfd1]/80 bg-[#fffdf7]/95 lg:block">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-6 py-5 xl:px-8">
            <Link
              href="/"
              className="shrink-0 text-2xl font-bold tracking-tight text-[#254c38]"
            >
              NiaWorld<span className="text-[#c56b4a]">.</span>
            </Link>

            <nav
              aria-label="Main navigation"
              className="flex min-w-0 flex-nowrap items-center justify-end gap-1"
            >
              {navigation.map((item) => {
                const active = item.href === activeHref;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={`whitespace-nowrap rounded-full px-3 py-2.5 text-sm font-medium transition ${
                      active
                        ? "bg-[#254c38] text-white"
                        : "text-[#405548] hover:bg-[#e9eee5]"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* Mobile header */}
        <header className="border-b border-[#e5dfd1]/80 bg-[#fffdf7]/95 px-4 py-4 lg:hidden">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-[#254c38]"
            >
              NiaWorld<span className="text-[#c56b4a]">.</span>
            </Link>

            <span className="rounded-full bg-[#e9eee5] px-3 py-1.5 text-xs font-semibold text-[#254c38]">
              USD Wallet
            </span>
          </div>
        </header>

        <div className="mx-auto max-w-7xl px-4 pb-32 pt-6 sm:px-6 sm:pt-10 lg:px-8 lg:pb-12">
          {/* Page heading */}
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="mb-2 text-sm font-semibold uppercase tracking-[0.2em] text-[#a35c40]">
                Your finances
              </p>

              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                My wallet
              </h1>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-[#536357] sm:text-base">
                Manage your NiaWorld wallet, review your available USD
                balance, and follow your deposits, service payments, and
                other wallet transactions in one place.
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadWallet(true)}
              disabled={loading || refreshing}
              className="min-h-11 self-start rounded-xl border border-[#d8dfd2] bg-white/95 px-4 py-2.5 text-sm font-semibold text-[#254c38] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
            >
              {refreshing ? "Refreshing..." : "↻ Refresh wallet"}
            </button>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-6 rounded-2xl border border-red-200 bg-red-50/95 p-4 text-sm text-red-800"
            >
              <p>{error}</p>

              <button
                type="button"
                onClick={() => void loadWallet(true)}
                className="mt-2 font-semibold underline underline-offset-4"
              >
                Try again
              </button>
            </div>
          )}

          {/* Balance and actions */}
          <section className="grid gap-6 lg:grid-cols-[1.35fr_0.85fr]">
            <div className="overflow-hidden rounded-3xl border border-white/80 bg-[#254c38]/95 p-6 text-white shadow-xl sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white/75">
                    Available USD balance
                  </p>

                  <div className="mt-3 break-words text-4xl font-bold tracking-tight sm:text-5xl">
                    {loading
                      ? "Loading..."
                      : !signedIn || !wallet || balance === null
                        ? "—"
                        : formatUSD(balance)}
                  </div>

                  <p className="mt-3 max-w-lg text-sm leading-6 text-white/75">
                    Your available balance is calculated from posted wallet
                    ledger transactions. Pending, failed, and reversed
                    transactions are not treated as completed payments.
                  </p>
                </div>

                <div
                  aria-hidden="true"
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-2xl font-bold"
                >
                  $
                </div>
              </div>

              <div className="mt-8 grid gap-4 border-t border-white/20 pt-5 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-white/70">Wallet status</p>
                  <p className="mt-1 font-semibold">
                    {loading
                      ? "Checking wallet..."
                      : !signedIn
                        ? "Sign in required"
                        : !wallet
                          ? "Wallet not set up yet"
                          : "Connected to your account"}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-white/70">Wallet currency</p>
                  <p className="mt-1 font-semibold">USD ($)</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-[#e5dfd1]/90 bg-[#fffdf7]/95 p-6 shadow-lg sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#a35c40]">
                Wallet actions
              </p>

              <h2 className="mt-2 text-xl font-bold">
                Add money to your wallet
              </h2>

              <p className="mt-3 text-sm leading-6 text-[#657267]">
                Add funds to your NiaWorld USD wallet through PayPal
                Sandbox. Your payment is verified by the server before
                the wallet balance is updated.
              </p>

              <div className="mt-6">
                <Link
                  href="/wallet/deposit"
                  className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#254c38] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3d2d] focus:outline-none focus:ring-2 focus:ring-[#254c38] focus:ring-offset-2"
                >
                  + Add money
                </Link>
              </div>

              <p className="mt-4 rounded-xl bg-[#f4eee2] p-3 text-xs leading-5 text-[#695a48]">
                PayPal Sandbox is for testing. No real payment is
                processed while the application is configured for
                Sandbox.
              </p>
            </div>
          </section>

          {/* Wallet overview */}
          <section
            aria-label="Wallet overview"
            className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          >
            <div className="rounded-2xl border border-[#e5dfd1]/90 bg-[#fffdf7]/95 p-5">
              <p className="text-sm text-[#657267]">Currency</p>
              <p className="mt-2 text-xl font-bold">USD ($)</p>
              <p className="mt-1 text-xs leading-5 text-[#758075]">
                All wallet ledger amounts are recorded in US dollars.
              </p>
            </div>

            <div className="rounded-2xl border border-[#e5dfd1]/90 bg-[#fffdf7]/95 p-5">
              <p className="text-sm text-[#657267]">Wallet account</p>

              <p className="mt-2 text-xl font-bold">
                {loading
                  ? "Checking..."
                  : wallet
                    ? "Connected"
                    : signedIn
                      ? "Not created"
                      : "Sign in required"}
              </p>

              <p className="mt-1 text-xs leading-5 text-[#758075]">
                {wallet
                  ? `Created ${new Date(wallet.created_at).toLocaleDateString()}`
                  : "Your account status is shown here."}
              </p>
            </div>

            <div className="rounded-2xl border border-[#e5dfd1]/90 bg-[#fffdf7]/95 p-5">
              <p className="text-sm text-[#657267]">Payment integration</p>
              <p className="mt-2 text-xl font-bold">PayPal Sandbox</p>
              <p className="mt-1 text-xs leading-5 text-[#758075]">
                Customer deposits are available for Sandbox testing.
              </p>
            </div>

            <div className="rounded-2xl border border-[#e5dfd1]/90 bg-[#fffdf7]/95 p-5">
              <p className="text-sm text-[#657267]">Transaction history</p>
              <p className="mt-2 text-xl font-bold">
                {loading ? "Loading..." : transactions.length}
              </p>
              <p className="mt-1 text-xs leading-5 text-[#758075]">
                Most recent ledger entries loaded for this wallet.
              </p>
            </div>
          </section>

          {/* Deposit information */}
          <section className="mt-8">
            <article className="rounded-3xl border border-[#e5dfd1]/90 bg-[#fffdf7]/95 p-6 shadow-sm sm:p-7">
              <div className="flex items-start gap-4">
                <div
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#e3ebdf] text-xl font-bold text-[#254c38]"
                >
                  +
                </div>

                <div>
                  <h2 className="text-lg font-bold">
                    How wallet deposits work
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#657267]">
                    Select Add money to enter the amount you want to
                    deposit. You will be redirected to PayPal Sandbox
                    to approve the payment. NiaWorld's server verifies
                    the payment result before recording a successful
                    deposit in your wallet ledger.
                  </p>
                </div>
              </div>

              <ul className="mt-5 space-y-3 text-sm leading-6 text-[#536357]">
                <li className="flex gap-3">
                  <span className="font-bold text-[#254c38]">1.</span>
                  Choose your deposit amount.
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#254c38]">2.</span>
                  Approve the payment through PayPal Sandbox.
                </li>
                <li className="flex gap-3">
                  <span className="font-bold text-[#254c38]">3.</span>
                  NiaWorld verifies the payment and records the deposit
                  before updating your USD balance.
                </li>
              </ul>

              <p className="mt-5 rounded-xl bg-[#f4eee2] p-3 text-xs leading-5 text-[#695a48]">
                A payment screenshot or browser message alone is not
                treated as proof that a deposit succeeded.
              </p>
            </article>
          </section>

          {/* Recent transactions */}
          <section className="mt-8 overflow-hidden rounded-3xl border border-[#e5dfd1]/90 bg-[#fffdf7]/95 shadow-lg">
            <div className="flex flex-col gap-2 border-b border-[#eae5d9] px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7">
              <div>
                <h2 className="text-xl font-bold">Recent transactions</h2>
                <p className="mt-1 text-sm leading-6 text-[#657267]">
                  Review your deposits, service payments, refunds, and
                  other recorded wallet activity.
                </p>
              </div>

              <span className="text-xs font-medium text-[#657267]">
                Latest 20 entries
              </span>
            </div>

            {!signedIn && !loading ? (
              <div className="px-5 py-12 text-center sm:px-8">
                <h3 className="text-lg font-bold">
                  Sign in to view your wallet
                </h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#657267]">
                  Your wallet balance and transaction history are private
                  to your account. Sign in to access your financial
                  information.
                </p>

                <Link
                  href="/auth"
                  className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#254c38] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1d3d2d]"
                >
                  Sign in
                </Link>
              </div>
            ) : loading ? (
              <div className="px-5 py-12 text-center text-sm text-[#657267]">
                Loading your transactions...
              </div>
            ) : !wallet ? (
              <div className="px-5 py-12 text-center sm:px-8">
                <h3 className="text-lg font-bold">
                  Your wallet is not set up yet
                </h3>

                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#657267]">
                  You are signed in, but no wallet account was found.
                  Your wallet must be provisioned before deposits can
                  be credited.
                </p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="px-5 py-12 text-center sm:px-8">
                <h3 className="text-lg font-bold">No transactions yet</h3>

                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#657267]">
                  Once verified wallet activity has been recorded, your
                  transactions will appear here with their amounts and
                  statuses.
                </p>
              </div>
            ) : (
              <>
                {/* Mobile transaction list */}
                <div className="divide-y divide-[#eee8dc] sm:hidden">
                  {transactions.map((transaction) => (
                    <article key={transaction.id} className="px-5 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-semibold">
                            {transaction.description ||
                              transactionLabel(transaction.type)}
                          </p>

                          <p className="mt-1 text-xs text-[#758075]">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>

                        <p
                          className={`shrink-0 text-sm font-bold ${
                            transaction.direction === "credit"
                              ? "text-emerald-700"
                              : "text-[#35483a]"
                          }`}
                        >
                          {transaction.direction === "credit" ? "+" : "−"}
                          {formatUSD(transaction.amount)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-xs text-[#657267]">
                          {transactionLabel(transaction.type)}
                        </span>

                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(transaction.status)}`}
                        >
                          {transaction.status}
                        </span>
                      </div>

                      {transaction.reference && (
                        <p className="mt-2 break-all text-xs text-[#758075]">
                          Ref: {transaction.reference}
                        </p>
                      )}
                    </article>
                  ))}
                </div>

                {/* Desktop transaction table */}
                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-[#f8f6ef] text-xs uppercase tracking-wide text-[#657267]">
                      <tr>
                        <th className="px-6 py-4 font-semibold">
                          Transaction
                        </th>
                        <th className="px-6 py-4 font-semibold">Date</th>
                        <th className="px-6 py-4 font-semibold">Status</th>
                        <th className="px-6 py-4 text-right font-semibold">
                          Amount (USD)
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-[#eee8dc]">
                      {transactions.map((transaction) => (
                        <tr
                          key={transaction.id}
                          className="transition hover:bg-white/60"
                        >
                          <td className="px-6 py-4">
                            <p className="font-semibold">
                              {transaction.description ||
                                transactionLabel(transaction.type)}
                            </p>

                            <p className="mt-1 break-all text-xs text-[#758075]">
                              {transaction.reference
                                ? `Ref: ${transaction.reference}`
                                : transactionLabel(transaction.type)}
                            </p>
                          </td>

                          <td className="whitespace-nowrap px-6 py-4 text-[#657267]">
                            {formatDate(transaction.created_at)}
                          </td>

                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses(transaction.status)}`}
                            >
                              {transaction.status}
                            </span>
                          </td>

                          <td
                            className={`whitespace-nowrap px-6 py-4 text-right font-bold ${
                              transaction.direction === "credit"
                                ? "text-emerald-700"
                                : "text-[#35483a]"
                            }`}
                          >
                            {transaction.direction === "credit" ? "+" : "−"}
                            {formatUSD(transaction.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          {/* Wallet security */}
          <section className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-2xl border border-[#e5dfd1]/90 bg-[#fffdf7]/95 p-5">
              <span aria-hidden="true" className="text-xl">
                ⌑
              </span>

              <h3 className="mt-3 font-bold">Private account</h3>

              <p className="mt-2 text-sm leading-6 text-[#657267]">
                Wallet records should only be accessible to the
                authenticated account owner through database access rules.
                Never share wallet details or account credentials with
                another person.
              </p>
            </article>

            <article className="rounded-2xl border border-[#e5dfd1]/90 bg-[#fffdf7]/95 p-5">
              <span aria-hidden="true" className="text-xl">
                ▤
              </span>

              <h3 className="mt-3 font-bold">Auditable ledger</h3>

              <p className="mt-2 text-sm leading-6 text-[#657267]">
                Wallet activity is recorded as transactions so deposits,
                service payments, fees, refunds, and other changes can be
                traced. The displayed balance comes from the wallet
                balance function.
              </p>
            </article>

            <article className="rounded-2xl border border-[#e5dfd1]/90 bg-[#fffdf7]/95 p-5">
              <span aria-hidden="true" className="text-xl">
                ✓
              </span>

              <h3 className="mt-3 font-bold">Verified payments</h3>

              <p className="mt-2 text-sm leading-6 text-[#657267]">
                Payment notifications must be verified on the server.
                Transaction references and idempotency controls help
                prevent duplicate credits and make payment results
                auditable.
              </p>
            </article>
          </section>

          <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-5 text-[#657267]">
            NiaWorld customer wallet deposits are currently in PayPal
            Sandbox testing. Real payments must not be accepted until
            the live payment provider and applicable payment rules have
            been configured and tested.
          </p>
        </div>

        {/* Mobile bottom navigation: exactly six aligned items */}
        <nav
          aria-label="Mobile navigation"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-[#ded8ca] bg-[#fffdf7]/98 shadow-[0_-5px_25px_rgba(40,55,40,0.08)] lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          <div className="mx-auto grid max-w-xl grid-cols-7 px-1 pb-1 pt-2">
            {navigation.map((item) => {
              const active = item.href === activeHref;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  aria-label={item.label}
                  className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-2 text-[10px] font-medium transition ${
                    active
                      ? "text-[#254c38]"
                      : "text-[#758075] hover:text-[#254c38]"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`flex h-7 w-9 items-center justify-center rounded-xl text-lg ${
                      active ? "bg-[#e3ebdf]" : ""
                    }`}
                  >
                    {item.symbol}
                  </span>

                  <span className="max-w-full truncate">
                    {item.label === "Conversations"
                      ? "Chats"
                      : item.label}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </main>
  );
}
