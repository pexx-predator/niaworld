"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FormEvent, ElementType } from "react";
import Link from "next/link";
import {
  Home, BriefcaseBusiness, CalendarDays, MessageCircle, Wallet,
  ChartNoAxesCombined, Settings, Menu, X, RefreshCw,
  ArrowDownToLine, ArrowUpRight, ArrowDownLeft, Clock3,
  ShieldCheck, CreditCard, Smartphone, Building2, Info,
  CheckCircle2, AlertCircle, Plus, ChevronRight,
  CalendarCheck, Receipt, Mail,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { label: "Home", href: "/provider/dashboard", icon: Home },
  { label: "Services", href: "/provider/services", icon: BriefcaseBusiness },
  { label: "Bookings", href: "/provider/bookings", icon: CalendarDays },
  { label: "Messages", href: "/provider/messages", icon: MessageCircle },
  { label: "Wallet", href: "/provider/earnings", icon: Wallet },
  { label: "Analytics", href: "/provider/analytics", icon: ChartNoAxesCombined },
  { label: "Settings", href: "/provider/settings", icon: Settings },
];

type NoticeType = "success" | "error" | "info";
type PayoutMethodType = "mpesa" | "bank" | "paypal";

type WalletLedgerEntry = {
  id: string;
  currency: string;
  bucket: "pending" | "available" | "reserved" | "earned";
  entry_type: string;
  amount: number | string;
  description: string;
  created_at: string;
};

type Payment = {
  id: string;
  payment_reference: string;
  provider_amount: number | string;
  currency: string;
  status: string;
  created_at: string;
};

type PayoutMethod = {
  id: string;
  method_type: PayoutMethodType;
  provider_name: string;
  masked_account: string;
  is_default: boolean;
  verified_at: string | null;
  created_at: string;
};

type Payout = {
  id: string;
  payout_method_id: string;
  amount: number | string;
  currency: string;
  status: string;
  payout_reference: string | null;
  failure_reason: string | null;
  created_at: string;
  processed_at: string | null;
  commission_rate: number | string;
  commission_amount: number | string;
  total_debit: number | string;
};

type CurrencyBalance = {
  currency: string;
  amount: number;
};

type Transaction = {
  id: string;
  description: string;
  reference: string;
  date: string;
  status: string;
  amount: number;
  currency: string;
  type: "earning" | "withdrawal";
};

type PendingPayoutRequest = {
  signature: string;
  key: string;
};

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

function formatCurrencyTotals(items: CurrencyBalance[]) {
  if (items.length === 0) return "—";
  return items.map((item) => formatMoney(item.amount, item.currency)).join(" · ");
}

function formatDate(date: string) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function sumByCurrency(
  records: { currency: string; amount: number | string }[],
): CurrencyBalance[] {
  const totals = new Map<string, number>();

  for (const record of records) {
    const currency = record.currency.toUpperCase();
    const amount = Number(record.amount);
    if (!Number.isFinite(amount)) continue;
    totals.set(currency, (totals.get(currency) ?? 0) + amount);
  }

  return Array.from(totals.entries())
    .map(([currency, amount]) => ({
      currency,
      amount: roundToCents(amount),
    }))
    .sort((a, b) => a.currency.localeCompare(b.currency));
}

function toCents(amount: number) {
  return Math.round((amount + Number.EPSILON) * 100);
}

function fromCents(cents: number) {
  return cents / 100;
}

function roundToCents(amount: number) {
  return fromCents(toCents(amount));
}

function calculateCommission(amount: number, rate: number) {
  return fromCents(Math.round(toCents(amount) * rate));
}

function getMaximumNetAmount(balance: number, rate: number) {
  if (
    !Number.isFinite(balance) ||
    balance <= 0 ||
    !Number.isFinite(rate) ||
    rate < 0 ||
    rate > 1
  ) {
    return 0;
  }

  const balanceCents = toCents(balance);
  let low = 0;
  let high = balanceCents;

  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const commissionCents = Math.round(middle * rate);

    if (middle + commissionCents <= balanceCents) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }

  return fromCents(low);
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const successful = ["completed", "confirmed", "paid"].includes(normalized);
  const failed = ["failed", "cancelled", "refunded"].includes(normalized);

  const styles = successful
    ? "bg-green-100 text-green-800"
    : failed
      ? "bg-red-100 text-red-800"
      : "bg-amber-100 text-amber-800";

  const dotStyles = successful
    ? "bg-green-600"
    : failed
      ? "bg-red-600"
      : "bg-amber-500";

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold capitalize ${styles}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${dotStyles}`} />
      {normalized.replaceAll("_", " ")}
    </span>
  );
}

function StatCard({
  title,
  amount,
  description,
  icon: Icon,
  iconColor,
}: {
  title: string;
  amount: string;
  description: string;
  icon: ElementType;
  iconColor: string;
}) {
  return (
    <div className="rounded-2xl border border-[#dce6d8] bg-white/95 p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[#718071]">{title}</p>
          <h3 className="mt-3 break-words text-xl font-bold tracking-tight text-[#243326] sm:text-2xl">
            {amount}
          </h3>
        </div>
        <div className={`rounded-xl p-3 ${iconColor}`}>
          <Icon size={21} />
        </div>
      </div>
      <p className="mt-4 text-xs text-[#849184]">{description}</p>
    </div>
  );
}

function getMethodIcon(type: PayoutMethodType) {
  if (type === "mpesa") return Smartphone;
  if (type === "paypal") return Mail;
  return Building2;
}

export default function ProviderEarningsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [notice, setNotice] = useState("");
  const [noticeType, setNoticeType] = useState<NoticeType>("info");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState("");

  const [ledger, setLedger] = useState<WalletLedgerEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [commissionRate, setCommissionRate] = useState<number | null>(null);

  const [showMethodForm, setShowMethodForm] = useState(false);
  const [methodType, setMethodType] = useState<PayoutMethodType>("mpesa");
  const [accountReference, setAccountReference] = useState("");
  const [bankName, setBankName] = useState("");
  const [registeringMethod, setRegisteringMethod] = useState(false);

  const pendingRequestRef = useRef<PendingPayoutRequest | null>(null);

  const availableBalances = sumByCurrency(
    ledger
      .filter((entry) => entry.bucket === "available")
      .map((entry) => ({ currency: entry.currency, amount: entry.amount })),
  );

  const pendingBalances = sumByCurrency(
    ledger
      .filter((entry) => entry.bucket === "pending")
      .map((entry) => ({ currency: entry.currency, amount: entry.amount })),
  );

  const lifetimeBalances = sumByCurrency(
    payments
      .filter((payment) => payment.status === "confirmed")
      .map((payment) => ({
        currency: payment.currency,
        amount: payment.provider_amount,
      })),
  );

  const withdrawnBalances = sumByCurrency(
    payouts
      .filter((payout) => payout.status === "paid")
      .map((payout) => ({ currency: payout.currency, amount: payout.amount })),
  );

  const selectedBalance =
    availableBalances.find((balance) => balance.currency === selectedCurrency)?.amount ?? 0;

  const verifiedMethods = methods.filter((method) => Boolean(method.verified_at));

  const selectedMethodRecord = verifiedMethods.find(
    (method) => method.id === selectedMethod,
  );

  const numericAmount = amount.trim() === "" ? 0 : Number(amount);
  const effectiveCommissionRate = commissionRate ?? 0;

  const commissionPreview =
    Number.isFinite(numericAmount) && numericAmount > 0
      ? calculateCommission(numericAmount, effectiveCommissionRate)
      : 0;

  const totalDebitPreview = roundToCents(
    Math.max(0, numericAmount) + commissionPreview,
  );

  const remainingBalance = roundToCents(selectedBalance - totalDebitPreview);

  const maximumNetAmount =
    commissionRate === null
      ? 0
      : getMaximumNetAmount(selectedBalance, commissionRate);

  function showNotice(message: string, type: NoticeType = "info") {
    setNotice(message);
    setNoticeType(type);
  }

  const loadWallet = useCallback(async () => {
    setLoading(true);
    setLoadError("");

    try {
      const supabase = createClient();

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!user) throw new Error("Your session has expired. Please sign in again.");

      const [ledgerResult, paymentResult, payoutResponse, methodResponse] =
        await Promise.all([
          supabase
            .from("provider_wallet_ledger")
            .select("id, currency, bucket, entry_type, amount, description, created_at")
            .eq("provider_id", user.id)
            .order("created_at", { ascending: false })
            .limit(200),

          supabase
            .from("financial_payments")
            .select("id, payment_reference, provider_amount, currency, status, created_at")
            .eq("provider_id", user.id)
            .order("created_at", { ascending: false })
            .limit(100),

          fetch("/api/provider/payouts", {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
          }),

          fetch("/api/provider/payout-methods", {
            method: "GET",
            cache: "no-store",
            credentials: "same-origin",
          }),
        ]);

      if (ledgerResult.error) throw ledgerResult.error;
      if (paymentResult.error) throw paymentResult.error;

      const payoutData = await payoutResponse.json().catch(() => null);
      const methodData = await methodResponse.json().catch(() => null);

      if (!payoutResponse.ok) {
        throw new Error(payoutData?.error ?? "Unable to retrieve payout history.");
      }

      if (!methodResponse.ok) {
        throw new Error(methodData?.error ?? "Unable to retrieve payout methods.");
      }

      if (
        !payoutData ||
        !Array.isArray(payoutData.payouts) ||
        typeof payoutData.commission_rate !== "number" ||
        !Number.isFinite(payoutData.commission_rate) ||
        payoutData.commission_rate < 0 ||
        payoutData.commission_rate > 1
      ) {
        throw new Error("The payout API returned invalid wallet data.");
      }

      if (!methodData || !Array.isArray(methodData.payout_methods)) {
        throw new Error("The payout methods API returned invalid data.");
      }

      setLedger((ledgerResult.data ?? []) as WalletLedgerEntry[]);
      setPayments((paymentResult.data ?? []) as Payment[]);
      setPayouts(payoutData.payouts as Payout[]);
      setMethods(methodData.payout_methods as PayoutMethod[]);
      setCommissionRate(payoutData.commission_rate);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "Unable to load wallet information.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  useEffect(() => {
    if (availableBalances.length === 0) {
      setSelectedCurrency("");
      return;
    }

    if (!availableBalances.some((balance) => balance.currency === selectedCurrency)) {
      setSelectedCurrency(availableBalances[0].currency);
    }
  }, [availableBalances, selectedCurrency]);

  useEffect(() => {
    if (verifiedMethods.length === 0) {
      setSelectedMethod("");
      return;
    }

    if (!verifiedMethods.some((method) => method.id === selectedMethod)) {
      const defaultMethod = verifiedMethods.find((method) => method.is_default);
      setSelectedMethod(defaultMethod?.id ?? verifiedMethods[0].id);
    }
  }, [verifiedMethods, selectedMethod]);

  async function handleRefresh() {
    setRefreshing(true);
    setNotice("");
    await loadWallet();
    setRefreshing(false);
    showNotice("Wallet information refreshed.", "success");
  }

  async function handleRegisterMethod(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (registeringMethod) return;

    const account = accountReference.trim();

    if (!account) {
      showNotice("Enter your payout account details.", "error");
      return;
    }

    if (methodType === "bank" && !bankName.trim()) {
      showNotice("Enter the name of your bank.", "error");
      return;
    }

    setRegisteringMethod(true);
    setNotice("");

    try {
      const response = await fetch("/api/provider/payout-methods", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method_type: methodType,
          account_reference: account,
          ...(methodType === "bank" ? { bank_name: bankName.trim() } : {}),
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to register this payout method.");
      }

      if (!result?.success || !result?.payout_method?.id) {
        throw new Error("The server did not confirm payout method registration.");
      }

      setAccountReference("");
      setBankName("");
      setShowMethodForm(false);

      showNotice(
        "Payout method registered successfully. Verification is pending, so it cannot be used for withdrawals yet.",
        "success",
      );

      await loadWallet();
    } catch (error) {
      showNotice(
        error instanceof Error
          ? error.message
          : "Unable to register this payout method.",
        "error",
      );
    } finally {
      setRegisteringMethod(false);
    }
  }

  async function handleWithdrawal(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showNotice("Enter a valid withdrawal amount.", "error");
      return;
    }

    if (!/^\d{1,16}(?:\.\d{1,2})?$/.test(amount.trim())) {
      showNotice("Enter an amount with no more than two decimal places.", "error");
      return;
    }

    if (!selectedCurrency) {
      showNotice("No available balance currency was found.", "error");
      return;
    }

    if (commissionRate === null) {
      showNotice("The current commission rate is unavailable. Refresh your wallet and try again.", "error");
      return;
    }

    if (
      !Number.isFinite(commissionRate) ||
      commissionRate < 0 ||
      commissionRate > 1
    ) {
      showNotice("The payout commission setting is invalid.", "error");
      return;
    }

    if (!selectedMethodRecord) {
      showNotice("Choose a verified payout method before requesting a withdrawal.", "error");
      return;
    }

    const requestedCommission = calculateCommission(numericAmount, commissionRate);
    const requestedTotalDebit = roundToCents(numericAmount + requestedCommission);

    if (toCents(requestedTotalDebit) > toCents(selectedBalance)) {
      showNotice(
        `Insufficient available balance. The withdrawal plus commission requires ${formatMoney(requestedTotalDebit, selectedCurrency)}.`,
        "error",
      );
      return;
    }

    if (submitting) return;

    setSubmitting(true);
    setNotice("");

    const normalizedAmount = numericAmount.toFixed(2);
    const requestSignature = [
      normalizedAmount,
      selectedCurrency,
      selectedMethodRecord.id,
    ].join("|");

    if (
      !pendingRequestRef.current ||
      pendingRequestRef.current.signature !== requestSignature
    ) {
      pendingRequestRef.current = {
        signature: requestSignature,
        key: crypto.randomUUID(),
      };
    }

    const idempotencyKey = pendingRequestRef.current.key;

    try {
      const response = await fetch("/api/provider/payouts", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: normalizedAmount,
          currency: selectedCurrency,
          payout_method_id: selectedMethodRecord.id,
          idempotency_key: idempotencyKey,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error ?? "Unable to submit your withdrawal request.");
      }

      if (!result?.success || !result?.payout_id) {
        throw new Error("The payout request did not return a confirmation reference.");
      }

      pendingRequestRef.current = null;
      setAmount("");

      showNotice(
        `Your withdrawal request has been submitted. Reference: ${result.payout_id}. This confirms a request, not a completed transfer.`,
        "success",
      );

      await loadWallet();
    } catch (error) {
      showNotice(
        error instanceof Error
          ? error.message
          : "Unable to submit your withdrawal request.",
        "error",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const transactions: Transaction[] = [
    ...payments.map((payment) => ({
      id: payment.id,
      description: "Provider payment",
      reference: payment.payment_reference,
      date: payment.created_at,
      status: payment.status,
      amount: Number(payment.provider_amount),
      currency: payment.currency,
      type: "earning" as const,
    })),
    ...payouts.map((payout) => {
      const method = methods.find((item) => item.id === payout.payout_method_id);

      return {
        id: payout.id,
        description: method ? `Payout to ${method.provider_name}` : "Provider payout",
        reference: payout.payout_reference ?? payout.id,
        date: payout.created_at,
        status: payout.status,
        amount: Number(payout.amount),
        currency: payout.currency,
        type: "withdrawal" as const,
      };
    }),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const NoticeIcon =
    noticeType === "error"
      ? AlertCircle
      : noticeType === "success"
        ? CheckCircle2
        : Info;

  return (
    <div className="relative isolate min-h-screen bg-[#eaf0e7] text-[#243326]">
      {/* Cultural background */}
      <div
        className="fixed inset-0 z-[-2] bg-cover bg-center"
        style={{ backgroundImage: "url('/images/cultural-background.jpg')" }}
      />
      <div className="fixed inset-0 z-[-1] bg-[#eaf0e7]/65" />

      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[245px] flex-col border-r border-[#dce6d8] bg-[#f8fbf6]/95 px-5 py-6 backdrop-blur-sm lg:flex">
        <Link href="/provider/dashboard" className="mb-10 flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#4c9a2a] text-white">
            <span className="text-lg font-bold">N</span>
          </div>
          <div>
            <p className="text-xl font-extrabold tracking-tight text-[#244522]">NiaWorld</p>
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#849184]">Provider space</p>
          </div>
        </Link>

        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[0.18em] text-[#9aa697]">
          Workspace
        </p>

        <nav className="flex-1 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.label === "Wallet";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold transition ${
                  active
                    ? "bg-[#e4f1df] text-[#397c27]"
                    : "text-[#647263] hover:bg-[#edf4e9] hover:text-[#397c27]"
                }`}
              >
                <Icon size={19} />
                {item.label}
                {active && <span className="ml-auto h-2 w-2 rounded-full bg-[#4c9a2a]" />}
              </Link>
            );
          })}
        </nav>

        <div className="rounded-2xl border border-[#dce8d7] bg-[#edf5e9] p-4">
          <div className="mb-2 flex items-center gap-2 text-[#397c27]">
            <ShieldCheck size={18} />
            <span className="text-xs font-bold">Account security</span>
          </div>
          <p className="text-xs leading-relaxed text-[#718071]">
            Keep your account and payout details protected.
          </p>
          <Link href="/provider/settings" className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#397c27] hover:underline">
            Manage settings <ChevronRight size={14} />
          </Link>
        </div>
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#dce6d8] bg-[#f8fbf6]/95 px-4 py-3 backdrop-blur-sm lg:hidden">
        <Link href="/provider/dashboard" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#4c9a2a] font-bold text-white">N</div>
          <span className="text-lg font-extrabold text-[#244522]">NiaWorld</span>
        </Link>
        <button
          type="button"
          onClick={() => setMobileMenuOpen((open) => !open)}
          className="rounded-xl p-2 text-[#45613f] hover:bg-[#eaf2e5]"
          aria-label="Toggle navigation"
        >
          {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-x-0 top-[61px] z-40 border-b border-[#dce6d8] bg-[#f8fbf6] p-4 shadow-lg lg:hidden">
          <nav className="grid grid-cols-2 gap-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = item.label === "Wallet";

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-2 rounded-xl px-3 py-3 text-sm font-semibold ${
                    active ? "bg-[#e4f1df] text-[#397c27]" : "text-[#647263] hover:bg-[#edf4e9]"
                  }`}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      )}

      <main className="mx-auto min-h-screen max-w-[1600px] px-4 pb-28 pt-6 sm:px-6 lg:ml-[245px] lg:px-9 lg:pb-10 lg:pt-9">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#718071]">
              <Link href="/provider/dashboard" className="hover:text-[#397c27]">Dashboard</Link>
              <ChevronRight size={13} />
              <span className="text-[#397c27]">Wallet</span>
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-[#243326] sm:text-4xl">My Wallet</h1>
            <p className="mt-2 text-sm text-[#718071]">Track your earnings, balances and payout activity.</p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex w-fit items-center justify-center gap-2 rounded-xl border border-[#cbdac5] bg-white px-4 py-2.5 text-sm font-semibold text-[#45613f] shadow-sm transition hover:bg-[#f4f8f1] disabled:opacity-60"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            Refresh wallet
          </button>
        </div>

        {loading && (
          <div className="mb-7 flex items-center gap-3 rounded-2xl border border-[#dce6d8] bg-white/95 p-5 text-sm font-medium text-[#647263]">
            <RefreshCw size={18} className="animate-spin text-[#4c9a2a]" />
            Loading your financial records...
          </div>
        )}

        {loadError && (
          <div className="mb-7 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-800" role="alert">
            <AlertCircle size={20} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Unable to load wallet information</p>
              <p className="mt-1 text-sm">{loadError}</p>
              <button type="button" onClick={handleRefresh} className="mt-2 text-sm font-bold underline">Try again</button>
            </div>
          </div>
        )}

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Available balance" amount={formatCurrencyTotals(availableBalances)} description="Funds currently available for withdrawal" icon={Wallet} iconColor="bg-[#e6f3df] text-[#43832d]" />
          <StatCard title="Pending earnings" amount={formatCurrencyTotals(pendingBalances)} description="Earnings awaiting release" icon={Clock3} iconColor="bg-amber-100 text-amber-700" />
          <StatCard title="Lifetime earnings" amount={formatCurrencyTotals(lifetimeBalances)} description="Confirmed provider payment amounts" icon={ChartNoAxesCombined} iconColor="bg-blue-100 text-blue-700" />
          <StatCard title="Total withdrawn" amount={formatCurrencyTotals(withdrawnBalances)} description="Successfully paid payouts" icon={ArrowDownToLine} iconColor="bg-purple-100 text-purple-700" />
        </section>

        <section className="mb-8 overflow-hidden rounded-2xl border border-[#dce6d8] bg-white/95 shadow-sm">
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-[#e8f3e3] p-3 text-[#43832d]"><CalendarCheck size={22} /></div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.15em] text-[#829080]">Payout information</p>
                <h2 className="mt-1 text-lg font-bold text-[#243326]">Weekly payout model</h2>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-[#718071]">
                  Earnings are displayed according to their recorded ledger status. Weekly settlement automation and transfer processing must be configured separately.
                </p>
              </div>
            </div>
            <span className="w-fit rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">Settlement information</span>
          </div>

          <div className="grid border-t border-[#e8eee5] sm:grid-cols-3">
            <div className="flex items-center gap-3 p-5">
              <div className="rounded-lg bg-[#f0f5ed] p-2 text-[#4c8b35]"><Clock3 size={18} /></div>
              <div><p className="text-sm font-bold text-[#344735]">Earnings accumulate</p><p className="text-xs text-[#849184]">Recorded in the ledger</p></div>
            </div>
            <div className="flex items-center gap-3 border-t border-[#e8eee5] p-5 sm:border-l sm:border-t-0">
              <div className="rounded-lg bg-[#f0f5ed] p-2 text-[#4c8b35]"><Receipt size={18} /></div>
              <div><p className="text-sm font-bold text-[#344735]">Reconciliation</p><p className="text-xs text-[#849184]">Requires settlement processing</p></div>
            </div>
            <div className="flex items-center gap-3 border-t border-[#e8eee5] p-5 sm:border-l sm:border-t-0">
              <div className="rounded-lg bg-[#f0f5ed] p-2 text-[#4c8b35]"><ArrowDownToLine size={18} /></div>
              <div><p className="text-sm font-bold text-[#344735]">Payout availability</p><p className="text-xs text-[#849184]">Based on available balance</p></div>
            </div>
          </div>
        </section>

        <section className="mb-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-[#dce6d8] bg-white/95 p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#243326]">Request a withdrawal</h2>
                <p className="mt-1 text-sm text-[#849184]">Submit a payout request from your available balance.</p>
              </div>
              <div className="rounded-xl bg-[#e8f3e3] p-3 text-[#43832d]"><ArrowDownToLine size={21} /></div>
            </div>

            <div className="mb-5 rounded-xl bg-[#f3f7f0] p-4">
              <p className="text-xs font-semibold text-[#718071]">Available balance</p>
              <p className="mt-1 text-2xl font-extrabold text-[#397c27]">
                {selectedCurrency ? formatMoney(selectedBalance, selectedCurrency) : "—"}
              </p>
              <p className="mt-1 text-xs text-[#849184]">Based on available wallet ledger entries</p>
            </div>

            <form onSubmit={handleWithdrawal} className="space-y-4">
              <div>
                <label htmlFor="withdrawal-currency" className="mb-2 block text-sm font-semibold text-[#405340]">Currency</label>
                <select
                  id="withdrawal-currency"
                  value={selectedCurrency}
                  onChange={(event) => setSelectedCurrency(event.target.value)}
                  disabled={availableBalances.length === 0}
                  className="w-full rounded-xl border border-[#dce6d8] bg-white px-4 py-3.5 text-sm font-medium text-[#405340] outline-none focus:border-[#70a95c] focus:ring-2 focus:ring-[#70a95c]/15 disabled:bg-[#f3f7f0] disabled:opacity-70"
                >
                  {availableBalances.length === 0
                    ? <option value="">No available currency</option>
                    : availableBalances.map((balance) => <option key={balance.currency} value={balance.currency}>{balance.currency}</option>)}
                </select>
              </div>

              <div>
                <label htmlFor="withdrawal-amount" className="mb-2 block text-sm font-semibold text-[#405340]">Withdrawal amount</label>
                <div className="flex items-center rounded-xl border border-[#dce6d8] bg-white px-4 focus-within:border-[#70a95c] focus-within:ring-2 focus-within:ring-[#70a95c]/15">
                  <span className="font-semibold text-[#849184]">{selectedCurrency || "—"}</span>
                  <input
                    id="withdrawal-amount"
                    type="number"
                    min="0.01"
                    max={maximumNetAmount}
                    step="0.01"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Enter amount"
                    disabled={availableBalances.length === 0 || verifiedMethods.length === 0 || commissionRate === null}
                    className="w-full border-0 bg-transparent px-3 py-3.5 text-sm font-semibold text-[#243326] outline-none placeholder:font-normal placeholder:text-[#a5afa2] disabled:opacity-60"
                  />
                </div>
                <p className="mt-1 text-xs text-[#849184]">
                  Maximum withdrawal before commission: {selectedCurrency ? formatMoney(maximumNetAmount, selectedCurrency) : "—"}
                </p>
              </div>

              <div className="rounded-xl border border-[#dce8d7] bg-[#f8fbf6] p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-bold text-[#344735]">Withdrawal breakdown</p>
                  <span className="rounded-full bg-[#e5f1df] px-2.5 py-1 text-xs font-bold text-[#397c27]">
                    {commissionRate === null ? "Loading fee..." : `${(commissionRate * 100).toFixed(2)}% commission`}
                  </span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3 text-[#718071]">
                    <span>Provider withdrawal</span>
                    <span className="font-semibold text-[#344735]">{selectedCurrency && numericAmount > 0 ? formatMoney(numericAmount, selectedCurrency) : "—"}</span>
                  </div>
                  <div className="flex justify-between gap-3 text-[#718071]">
                    <span>Commission</span>
                    <span className="font-semibold text-[#344735]">{selectedCurrency && numericAmount > 0 ? formatMoney(commissionPreview, selectedCurrency) : "—"}</span>
                  </div>
                  <div className="border-t border-[#dce6d8] pt-2">
                    <div className="flex justify-between gap-3">
                      <span className="font-bold text-[#344735]">Total wallet debit</span>
                      <span className="font-extrabold text-[#397c27]">{selectedCurrency && numericAmount > 0 ? formatMoney(totalDebitPreview, selectedCurrency) : "—"}</span>
                    </div>
                  </div>
                  <div className="flex justify-between gap-3 text-xs">
                    <span className="text-[#849184]">Balance after request</span>
                    <span className={`font-semibold ${remainingBalance < 0 ? "text-red-700" : "text-[#718071]"}`}>
                      {selectedCurrency && numericAmount > 0 ? formatMoney(remainingBalance, selectedCurrency) : "—"}
                    </span>
                  </div>
                </div>

                {commissionRate === null && <p className="mt-3 text-xs text-amber-700">The commission rate could not be loaded. Withdrawals are disabled until it is available.</p>}
                {numericAmount > 0 && totalDebitPreview > selectedBalance && <p className="mt-3 text-xs font-semibold text-red-700">The total debit exceeds your available balance.</p>}
              </div>

              <div>
                <label htmlFor="payout-method" className="mb-2 block text-sm font-semibold text-[#405340]">Payout destination</label>
                <select
                  id="payout-method"
                  value={selectedMethod}
                  onChange={(event) => setSelectedMethod(event.target.value)}
                  disabled={verifiedMethods.length === 0}
                  className="w-full rounded-xl border border-[#dce6d8] bg-white px-4 py-3.5 text-sm font-medium text-[#405340] outline-none focus:border-[#70a95c] focus:ring-2 focus:ring-[#70a95c]/15 disabled:bg-[#f3f7f0] disabled:opacity-70"
                >
                  {verifiedMethods.length === 0
                    ? <option value="">No verified payout method</option>
                    : verifiedMethods.map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.provider_name} — {method.masked_account}{method.is_default ? " (Default)" : ""}
                        </option>
                      ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting || loading || !selectedMethodRecord || !selectedCurrency || selectedBalance <= 0 || commissionRate === null || !amount || numericAmount <= 0 || !/^\d{1,16}(?:\.\d{1,2})?$/.test(amount.trim()) || totalDebitPreview > selectedBalance}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4c9a2a] px-5 py-3.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#3e8422] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? <><RefreshCw size={17} className="animate-spin" />Submitting request...</> : <>Submit withdrawal request<ArrowUpRight size={17} /></>}
              </button>

              {!selectedMethodRecord && (
                <p className="text-center text-xs leading-relaxed text-amber-700">
                  A verified payout method is required before withdrawals can be requested.
                </p>
              )}

              <p className="text-center text-xs leading-relaxed text-[#849184]">
                The requested amount and commission are reserved from your wallet. Submission does not mean that a bank or mobile-money transfer has completed.
              </p>
            </form>

            {notice && (
              <div
                className={`mt-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${
                  noticeType === "error"
                    ? "border-red-200 bg-red-50 text-red-800"
                    : noticeType === "success"
                      ? "border-green-200 bg-green-50 text-green-800"
                      : "border-blue-200 bg-blue-50 text-blue-800"
                }`}
                role="status"
              >
                <NoticeIcon size={18} className="mt-0.5 shrink-0" />
                <p>{notice}</p>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-[#dce6d8] bg-white/95 p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-[#243326]">Payout methods</h2>
                <p className="mt-1 text-sm text-[#849184]">Your registered payout destinations.</p>
              </div>
              <div className="rounded-xl bg-[#e8f3e3] p-3 text-[#43832d]"><CreditCard size={21} /></div>
            </div>

            <div className="space-y-3">
              {methods.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#cbdac5] bg-[#f8fbf6] p-6 text-center">
                  <CreditCard size={27} className="mx-auto text-[#9aaa94]" />
                  <p className="mt-3 text-sm font-bold text-[#344735]">No payout methods registered</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#849184]">Register an M-Pesa number, bank account or PayPal email address.</p>
                </div>
              ) : (
                methods.map((method) => {
                  const Icon = getMethodIcon(method.method_type);
                  const selected = selectedMethod === method.id;

                  return (
                    <div key={method.id} className={`flex items-center gap-3 rounded-xl border p-4 ${selected ? "border-[#8cba7b] bg-[#f1f7ed]" : "border-[#e4ebe0] bg-white"}`}>
                      <div className="rounded-lg bg-[#e8f3e3] p-2.5 text-[#43832d]"><Icon size={20} /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-[#344735]">{method.provider_name}</p>
                        <p className="mt-1 text-xs text-[#849184]">{method.masked_account}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {method.is_default && <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Default</span>}
                          <span className={`rounded-full px-2 py-1 text-[10px] font-bold ${method.verified_at ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-800"}`}>
                            {method.verified_at ? "Verified" : "Verification pending"}
                          </span>
                        </div>
                      </div>
                      {method.verified_at && (
                        <button type="button" onClick={() => setSelectedMethod(method.id)} className="text-xs font-bold text-[#43832d] hover:underline">
                          {selected ? "Selected" : "Select"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setNotice("");
                setShowMethodForm((open) => !open);
              }}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#b9cbb2] px-4 py-3 text-sm font-bold text-[#4c8b35] transition hover:bg-[#f3f8f0]"
            >
              {showMethodForm ? <X size={17} /> : <Plus size={17} />}
              {showMethodForm ? "Close registration form" : "Add payout method"}
            </button>

            {showMethodForm && (
              <form onSubmit={handleRegisterMethod} className="mt-4 space-y-4 rounded-xl border border-[#dce8d7] bg-[#f8fbf6] p-4">
                <div>
                  <h3 className="text-sm font-bold text-[#344735]">Register a payout destination</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#849184]">
                    Enter the account details where you want to receive payouts.
                  </p>
                </div>

                <div>
                  <label htmlFor="method-type" className="mb-2 block text-sm font-semibold text-[#405340]">Payout method</label>
                  <select
                    id="method-type"
                    value={methodType}
                    onChange={(event) => {
                      setMethodType(event.target.value as PayoutMethodType);
                      setAccountReference("");
                      setBankName("");
                    }}
                    disabled={registeringMethod}
                    className="w-full rounded-xl border border-[#dce6d8] bg-white px-4 py-3 text-sm text-[#405340] outline-none focus:border-[#70a95c] focus:ring-2 focus:ring-[#70a95c]/15"
                  >
                    <option value="mpesa">M-Pesa</option>
                    <option value="bank">Bank account</option>
                    <option value="paypal">PayPal</option>
                  </select>
                </div>

                {methodType === "bank" && (
                  <div>
                    <label htmlFor="bank-name" className="mb-2 block text-sm font-semibold text-[#405340]">Bank name</label>
                    <input
                      id="bank-name"
                      type="text"
                      autoComplete="organization"
                      maxLength={100}
                      value={bankName}
                      onChange={(event) => setBankName(event.target.value)}
                      placeholder="Enter bank name"
                      disabled={registeringMethod}
                      className="w-full rounded-xl border border-[#dce6d8] bg-white px-4 py-3 text-sm text-[#405340] outline-none focus:border-[#70a95c] focus:ring-2 focus:ring-[#70a95c]/15"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="account-reference" className="mb-2 block text-sm font-semibold text-[#405340]">
                    {methodType === "mpesa" ? "M-Pesa phone number" : methodType === "bank" ? "Bank account number" : "PayPal email address"}
                  </label>
                  <input
                    id="account-reference"
                    type={methodType === "paypal" ? "email" : "text"}
                    inputMode={methodType === "mpesa" ? "tel" : "text"}
                    autoComplete={methodType === "paypal" ? "email" : "off"}
                    maxLength={254}
                    value={accountReference}
                    onChange={(event) => setAccountReference(event.target.value)}
                    placeholder={
                      methodType === "mpesa"
                        ? "e.g. 0712345678"
                        : methodType === "bank"
                          ? "Enter account number"
                          : "name@example.com"
                    }
                    disabled={registeringMethod}
                    className="w-full rounded-xl border border-[#dce6d8] bg-white px-4 py-3 text-sm text-[#405340] outline-none focus:border-[#70a95c] focus:ring-2 focus:ring-[#70a95c]/15"
                  />
                  <p className="mt-1 text-xs leading-relaxed text-[#849184]">
                    {methodType === "mpesa"
                      ? "Use a Kenyan M-Pesa number, such as 0712345678 or 254712345678."
                      : methodType === "bank"
                        ? "Enter the bank account number associated with the bank name above."
                        : "Enter the email address linked to your PayPal account."}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={registeringMethod || !accountReference.trim() || (methodType === "bank" && !bankName.trim())}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#4c9a2a] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#3e8422] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {registeringMethod ? <><RefreshCw size={16} className="animate-spin" />Registering...</> : <><Plus size={16} />Register payout method</>}
                </button>

                <p className="text-xs leading-relaxed text-[#849184]">
                  Your payout method will be registered as pending verification. Registering it does not verify account ownership or activate withdrawals.
                </p>
              </form>
            )}

            <div className="mt-5 flex items-start gap-2 rounded-xl bg-[#f5f8f3] p-3">
              <ShieldCheck size={17} className="mt-0.5 shrink-0 text-[#4c8b35]" />
              <p className="text-xs leading-relaxed text-[#718071]">
                Only verified payout destinations can be used to request withdrawals.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-[#dce6d8] bg-white/95 p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#243326]">Payout history</h2>
              <p className="mt-1 text-sm text-[#849184]">Your recorded withdrawal requests and payout results.</p>
            </div>
            <span className="w-fit rounded-full bg-[#edf5e9] px-3 py-1 text-xs font-semibold text-[#397c27]">{payouts.length} records</span>
          </div>

          <div className="space-y-3">
            {payouts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#dce6d8] p-8 text-center">
                <ArrowDownToLine size={28} className="mx-auto text-[#a5b29f]" />
                <p className="mt-3 text-sm font-bold text-[#344735]">No payout history yet</p>
                <p className="mt-1 text-xs text-[#849184]">Your withdrawal requests will appear here.</p>
              </div>
            ) : (
              payouts.map((payout) => {
                const method = methods.find((item) => item.id === payout.payout_method_id);

                return (
                  <div key={payout.id} className="flex flex-col gap-3 rounded-xl border border-[#e7ede3] p-4 sm:flex-row sm:items-center">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#f0f5ed] text-[#4c8b35]"><ArrowDownToLine size={19} /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#344735]">
                        {method ? `${method.provider_name} · ${method.masked_account}` : "Payout destination"}
                      </p>
                      <p className="mt-1 break-all text-xs text-[#849184]">{formatDate(payout.created_at)} · {payout.payout_reference ?? payout.id}</p>
                      {payout.failure_reason && <p className="mt-1 text-xs text-red-700">{payout.failure_reason}</p>}
                      <p className="mt-1 text-xs text-[#849184]">
                        Commission: {formatMoney(Number(payout.commission_amount), payout.currency)} · Total debit: {formatMoney(Number(payout.total_debit), payout.currency)}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <StatusBadge status={payout.status} />
                      <p className="whitespace-nowrap text-sm font-bold text-[#344735]">{formatMoney(Number(payout.amount), payout.currency)}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="mb-8 rounded-2xl border border-[#dce6d8] bg-white/95 p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#243326]">Transaction history</h2>
              <p className="mt-1 text-sm text-[#849184]">Your recorded payments and payout activity.</p>
            </div>
            <span className="w-fit rounded-full bg-[#edf5e9] px-3 py-1 text-xs font-semibold text-[#397c27]">{transactions.length} records</span>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[650px] text-left">
              <thead>
                <tr className="border-b border-[#e7ede3] text-xs uppercase tracking-wider text-[#849184]">
                  <th className="px-3 py-3 font-bold">Transaction</th>
                  <th className="px-3 py-3 font-bold">Reference</th>
                  <th className="px-3 py-3 font-bold">Date</th>
                  <th className="px-3 py-3 font-bold">Status</th>
                  <th className="px-3 py-3 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => {
                  const earning = transaction.type === "earning";

                  return (
                    <tr key={transaction.id} className="border-b border-[#edf1ea] last:border-0">
                      <td className="px-3 py-4">
                        <div className="flex items-center gap-3">
                          <div className={`rounded-lg p-2 ${earning ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                            {earning ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-[#344735]">{transaction.description}</p>
                            <p className="mt-1 text-xs text-[#9aa697]">{earning ? "Payment" : "Payout"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-[180px] break-all px-3 py-4 text-xs font-medium text-[#849184]">{transaction.reference}</td>
                      <td className="px-3 py-4 text-sm text-[#718071]">{formatDate(transaction.date)}</td>
                      <td className="px-3 py-4"><StatusBadge status={transaction.status} /></td>
                      <td className={`px-3 py-4 text-right text-sm font-bold ${earning ? "text-[#43832d]" : "text-[#344735]"}`}>
                        {earning ? "+" : "-"}{formatMoney(transaction.amount, transaction.currency)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {transactions.map((transaction) => {
              const earning = transaction.type === "earning";

              return (
                <div key={transaction.id} className="rounded-xl border border-[#e7ede3] p-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 ${earning ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-700"}`}>
                      {earning ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-[#344735]">{transaction.description}</p>
                      <p className="mt-1 break-all text-xs text-[#849184]">{formatDate(transaction.date)} · {transaction.reference}</p>
                    </div>
                    <p className={`whitespace-nowrap text-sm font-bold ${earning ? "text-[#43832d]" : "text-[#344735]"}`}>
                      {earning ? "+" : "-"}{formatMoney(transaction.amount, transaction.currency)}
                    </p>
                  </div>
                  <div className="mt-3 flex justify-end"><StatusBadge status={transaction.status} /></div>
                </div>
              );
            })}
          </div>

          {!loading && transactions.length === 0 && (
            <div className="mt-3 rounded-xl bg-[#f8fbf6] p-4 text-center text-xs text-[#849184]">
              No financial transactions have been recorded yet.
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#dce6d8] bg-[#f7faf4]/95 p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-[#e5f1df] p-3 text-[#43832d]"><ShieldCheck size={23} /></div>
            <div className="flex-1">
              <h2 className="font-bold text-[#344735]">Your wallet security</h2>
              <p className="mt-1 text-sm leading-relaxed text-[#718071]">
                Wallet balances are retrieved from your provider financial records. Withdrawal requests are validated by the database function, which checks your authenticated identity, verified payout destination and available balance. The database remains the authority for the final commission and debit calculation.
              </p>
              <Link href="/provider/settings" className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-[#43832d] hover:underline">
                Account settings <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        <p className="mt-7 text-center text-xs text-[#899688]">NiaWorld Provider Wallet</p>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#dce6d8] bg-[#f8fbf6]/95 px-1 py-2 backdrop-blur-sm lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-around">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = item.label === "Wallet";

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-w-0 flex-col items-center gap-1 rounded-lg px-2 py-1.5 ${active ? "text-[#397c27]" : "text-[#849184]"}`}
              >
                <Icon size={19} />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}