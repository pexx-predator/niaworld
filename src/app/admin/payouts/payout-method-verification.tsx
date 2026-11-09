
"use client";

import { useCallback, useEffect, useState } from "react";

type PayoutMethod = {
  id: string;
  provider_id: string;
  method_type: "mpesa" | "bank" | "paypal";
  provider_name: string;
  masked_account: string;
  is_default: boolean;
  verification_status: string;
  verification_note: string | null;
  created_at: string;
  provider: {
    user_id: string;
    display_name: string | null;
    username: string | null;
  } | null;
};

type ApiResponse = {
  error?: string;
  message?: string;
  methods?: PayoutMethod[];
};

async function readApiResponse(response: Response): Promise<ApiResponse> {
  const data: unknown = await response.json().catch(() => null);

  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    return {};
  }

  return data as ApiResponse;
}

export default function PayoutMethodVerification() {
  const [methods, setMethods] = useState<PayoutMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectionId, setRejectionId] = useState<string | null>(null);
  const [rejectionNote, setRejectionNote] = useState("");

  const loadMethods = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/payout-methods", {
        cache: "no-store",
      });

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "Unable to load payout methods.");
      }

      setMethods(Array.isArray(result.methods) ? result.methods : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMethods();
  }, [loadMethods]);

  async function reviewMethod(
    id: string,
    action: "verify" | "reject",
    note = "",
  ) {
    setProcessingId(id);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/admin/payout-methods", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id, action, note }),
      });

      const result = await readApiResponse(response);

      if (!response.ok) {
        throw new Error(result.error || "Unable to review payout method.");
      }

      setMessage(result.message || "Payout method updated.");
      setRejectionId(null);
      setRejectionNote("");

      await loadMethods();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong.",
      );
    } finally {
      setProcessingId(null);
    }
  }

  function providerLabel(method: PayoutMethod) {
    return (
      method.provider?.display_name ||
      (method.provider?.username
        ? `@${method.provider.username}`
        : method.provider_id)
    );
  }

  function methodLabel(type: PayoutMethod["method_type"]) {
    switch (type) {
      case "mpesa":
        return "M-Pesa";
      case "bank":
        return "Bank";
      case "paypal":
        return "PayPal";
      default:
        return type;
    }
  }

  return (
    <section className="mb-8 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Payout method verification
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Review provider payout destinations before they can be used.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadMethods()}
          disabled={loading}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {message && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800 dark:border-green-900 dark:bg-green-950 dark:text-green-300"
        >
          {message}
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        >
          {error}
        </div>
      )}

      {loading ? (
        <p className="py-8 text-center text-sm text-gray-500">
          Loading pending payout methods...
        </p>
      ) : methods.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center dark:border-gray-700">
          <p className="font-medium text-gray-700 dark:text-gray-200">
            No pending payout methods
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Newly registered payout methods will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {methods.map((method) => (
            <article
              key={method.id}
              className="rounded-xl border border-gray-200 p-4 dark:border-gray-800"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {methodLabel(method.method_type)}
                    </h3>

                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Awaiting verification
                    </span>

                    {method.is_default && (
                      <span className="rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                        Default
                      </span>
                    )}
                  </div>

                  <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">
                        Provider
                      </dt>
                      <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                        {providerLabel(method)}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">
                        Account name
                      </dt>
                      <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                        {method.provider_name}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">
                        Account details
                      </dt>
                      <dd className="mt-1 font-medium text-gray-900 dark:text-white">
                        {method.masked_account}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-gray-500 dark:text-gray-400">
                        Submitted
                      </dt>
                      <dd className="mt-1 text-gray-900 dark:text-white">
                        {new Date(method.created_at).toLocaleString()}
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-3 break-all text-xs text-gray-400">
                    Method ID: {method.id}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={processingId !== null}
                    onClick={() => void reviewMethod(method.id, "verify")}
                    className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {processingId === method.id ? "Processing..." : "Verify"}
                  </button>

                  <button
                    type="button"
                    disabled={processingId !== null}
                    onClick={() => {
                      setRejectionId(
                        rejectionId === method.id ? null : method.id,
                      );
                      setRejectionNote("");
                    }}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {rejectionId === method.id && (
                <div className="mt-4 border-t border-gray-200 pt-4 dark:border-gray-800">
                  <label
                    htmlFor={`rejection-${method.id}`}
                    className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200"
                  >
                    Reason for rejection
                  </label>

                  <textarea
                    id={`rejection-${method.id}`}
                    value={rejectionNote}
                    onChange={(event) =>
                      setRejectionNote(event.target.value)
                    }
                    maxLength={500}
                    rows={3}
                    placeholder="Explain what the provider needs to correct..."
                    className="w-full rounded-lg border border-gray-300 bg-white p-3 text-sm text-gray-900 outline-none focus:border-red-500 dark:border-gray-700 dark:bg-gray-950 dark:text-white"
                  />

                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setRejectionId(null);
                        setRejectionNote("");
                      }}
                      className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-800"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      disabled={!rejectionNote.trim() || processingId !== null}
                      onClick={() =>
                        void reviewMethod(
                          method.id,
                          "reject",
                          rejectionNote.trim(),
                        )
                      }
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Confirm rejection
                    </button>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
