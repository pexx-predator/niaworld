
import { NextResponse, connection } from "next/server";
import { getApprovedProviderForApi } from "@/lib/provider/api-auth";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const AMOUNT_PATTERN = /^\d{1,16}(?:\.\d{1,2})?$/;

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

export async function GET() {
  await connection();

  try {
    const auth = await getApprovedProviderForApi();

    if ("response" in auth) {
      return auth.response;
    }

    const [payoutResult, commissionResult] = await Promise.all([
      auth.supabase
        .from("provider_payouts")
        .select(
          [
            "id",
            "payout_method_id",
            "amount",
            "currency",
            "status",
            "payout_reference",
            "failure_reason",
            "processed_at",
            "created_at",
            "updated_at",
            "commission_rate",
            "commission_amount",
            "total_debit",
          ].join(", "),
        )
        .eq("provider_id", auth.user.id)
        .order("created_at", { ascending: false })
        .limit(50),

      auth.supabase.rpc("get_provider_payout_commission_rate"),
    ]);

    if (payoutResult.error) {
      console.error(
        "Payout history lookup failed:",
        payoutResult.error.code,
      );

      return NextResponse.json(
        { error: "Unable to retrieve payout history." },
        {
          status: 500,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    if (commissionResult.error || commissionResult.data === null) {
      console.error(
        "Payout commission lookup failed:",
        commissionResult.error?.code ?? "COMMISSION_RATE_NOT_FOUND",
      );

      return NextResponse.json(
        { error: "Unable to retrieve the payout commission setting." },
        {
          status: 500,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    const commissionRate = Number(commissionResult.data);

    if (
      !Number.isFinite(commissionRate) ||
      commissionRate < 0 ||
      commissionRate > 1
    ) {
      console.error("Invalid payout commission rate configuration.");

      return NextResponse.json(
        { error: "The payout commission configuration is invalid." },
        {
          status: 500,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    return NextResponse.json(
      {
        payouts: payoutResult.data ?? [],
        commission_rate: commissionRate,
      },
      {
        status: 200,
        headers: NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    console.error("Payout history API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      },
    );
  }
}

export async function POST(request: Request) {
  await connection();

  try {
    const auth = await getApprovedProviderForApi();

    if ("response" in auth) {
      return auth.response;
    }

    const body: unknown = await request.json().catch(() => null);

    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body)
    ) {
      return NextResponse.json(
        { error: "A valid JSON request body is required." },
        {
          status: 400,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    const input = body as Record<string, unknown>;

    const amount =
      typeof input.amount === "string" ? input.amount : "";

    const currency =
      typeof input.currency === "string"
        ? input.currency.toUpperCase()
        : "";

    const payoutMethodId =
      typeof input.payout_method_id === "string"
        ? input.payout_method_id
        : "";

    const idempotencyKey =
      typeof input.idempotency_key === "string"
        ? input.idempotency_key
        : "";

    if (!AMOUNT_PATTERN.test(amount)) {
      return NextResponse.json(
        {
          error:
            "Amount must be a positive decimal with no more than two decimal places.",
        },
        {
          status: 400,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    if (!/[1-9]/.test(amount)) {
      return NextResponse.json(
        { error: "Amount must be greater than zero." },
        {
          status: 400,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    if (currency !== "KES") {
      return NextResponse.json(
        { error: "Only KES withdrawals are currently supported." },
        {
          status: 400,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    if (!UUID_PATTERN.test(payoutMethodId)) {
      return NextResponse.json(
        { error: "A valid payout method ID is required." },
        {
          status: 400,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    if (!UUID_PATTERN.test(idempotencyKey)) {
      return NextResponse.json(
        { error: "A valid idempotency key is required." },
        {
          status: 400,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    const { data, error } = await auth.supabase.rpc(
      "request_provider_payout",
      {
        p_amount: amount,
        p_currency: "KES",
        p_payout_method_id: payoutMethodId,
        p_idempotency_key: idempotencyKey,
      },
    );

    if (error) {
      console.error(
        "Provider payout request rejected:",
        error.code,
      );

      return NextResponse.json(
        {
          error:
            "The payout request could not be accepted. Check your balance, payout method, and withdrawal eligibility.",
        },
        {
          status: 409,
          headers: NO_STORE_HEADERS,
        },
      );
    }

    return NextResponse.json(
      {
        success: true,
        payout_id: data,
        message: "Payout request submitted for processing.",
        payment_status: "pending",
      },
      {
        status: 201,
        headers: NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    console.error("Payout request API error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      {
        status: 500,
        headers: NO_STORE_HEADERS,
      },
    );
  }
}
