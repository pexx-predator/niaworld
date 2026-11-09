
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalRequest } from "@/lib/paypal/server";

type PayPalCapture = {
  id?: string;
  status?: string;
  status_details?: {
    reason?: string;
  };
  amount?: {
    currency_code?: string;
    value?: string;
  };
  create_time?: string;
  update_time?: string;
};

type PayPalOrder = {
  id: string;
  status: string;
  purchase_units?: Array<{
    custom_id?: string;
    reference_id?: string;
    payments?: {
      captures?: PayPalCapture[];
    };
  }>;
};

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in before confirming a deposit." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const orderId = body?.orderId;

    if (
      typeof orderId !== "string" ||
      !/^[A-Z0-9]{8,64}$/.test(orderId)
    ) {
      return NextResponse.json(
        { error: "Invalid PayPal order ID." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    const { data: transaction, error: transactionError } =
      await admin
        .from("wallet_transactions")
        .select(
          "id, wallet_id, amount, currency, status, metadata, provider_reference",
        )
        .eq("provider_reference", orderId)
        .eq("payment_provider", "paypal")
        .eq("type", "deposit")
        .eq("direction", "credit")
        .maybeSingle();

    if (transactionError) {
      console.error("PayPal deposit lookup failed:", {
        code: transactionError.code,
        orderId,
      });

      return NextResponse.json(
        { error: "Unable to verify this deposit." },
        { status: 500 },
      );
    }

    if (!transaction) {
      return NextResponse.json(
        { error: "Deposit not found." },
        { status: 404 },
      );
    }

    const { data: wallet, error: walletError } = await admin
      .from("wallet_accounts")
      .select("user_id, currency")
      .eq("id", transaction.wallet_id)
      .maybeSingle();

    if (
      walletError ||
      !wallet ||
      wallet.user_id !== user.id ||
      wallet.currency !== "USD" ||
      transaction.currency !== "USD"
    ) {
      return NextResponse.json(
        { error: "This deposit does not belong to your USD wallet." },
        { status: 403 },
      );
    }

    if (transaction.status === "posted") {
      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        amount: transaction.amount,
        currency: "USD",
        status: "posted",
        transactionId: transaction.id,
      });
    }

    if (transaction.status !== "pending") {
      return NextResponse.json(
        { error: "This deposit is no longer pending." },
        { status: 409 },
      );
    }

    const expectedDepositId =
      transaction.metadata?.paypal_deposit_id;

    if (
      typeof expectedDepositId !== "string" ||
      !expectedDepositId.trim()
    ) {
      console.error("Missing PayPal deposit ID in transaction metadata:", {
        transactionId: transaction.id,
        orderId,
      });

      return NextResponse.json(
        { error: "The deposit reference could not be verified." },
        { status: 409 },
      );
    }

    let order: PayPalOrder;
    let captureRequestError: string | null = null;

    try {
      order = await paypalRequest<PayPalOrder>(
        `/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`,
        {
          method: "POST",
          headers: {
            "PayPal-Request-Id": `cap-${orderId}`,
            Prefer: "return=representation",
          },
          body: "{}",
        },
      );
    } catch (error) {
      captureRequestError =
        error instanceof Error ? error.message : "Unknown capture error";

      console.warn(
        "PayPal capture request did not return normally. Retrieving order.",
        {
          orderId,
          error: captureRequestError,
        },
      );

      try {
        order = await paypalRequest<PayPalOrder>(
          `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
          { method: "GET" },
        );
      } catch (lookupError) {
        console.error("PayPal order retrieval failed:", {
          orderId,
          error:
            lookupError instanceof Error
              ? lookupError.message
              : "Unknown retrieval error",
        });

        return NextResponse.json(
          {
            error:
              "We could not retrieve the PayPal payment status. Your wallet has not been credited.",
          },
          { status: 502 },
        );
      }
    }

    if (order.id !== orderId) {
      console.error("PayPal order ID mismatch:", {
        expected: orderId,
        received: order.id,
      });

      return NextResponse.json(
        { error: "PayPal returned an unexpected order." },
        { status: 502 },
      );
    }

    const purchaseUnit = order.purchase_units?.find(
      (unit) =>
        unit.custom_id === expectedDepositId &&
        unit.reference_id === expectedDepositId,
    );

    if (!purchaseUnit) {
      console.error("PayPal deposit reference mismatch:", {
        orderId,
        expectedDepositId,
        orderStatus: order.status,
      });

      return NextResponse.json(
        { error: "The PayPal order does not match this deposit." },
        { status: 409 },
      );
    }

    const captures = purchaseUnit.payments?.captures ?? [];

    console.info("PAYPAL_CAPTURE_DIAGNOSTIC", {
      orderId,
      orderStatus: order.status,
      expectedDepositId,
      captureRequestError,
      captures: captures.map((item) => ({
        id: item.id ?? null,
        status: item.status ?? null,
        reason: item.status_details?.reason ?? null,
        amount: item.amount?.value ?? null,
        currency: item.amount?.currency_code ?? null,
        createdAt: item.create_time ?? null,
        updatedAt: item.update_time ?? null,
      })),
    });

    const capture = captures.find(
      (item) => item.status === "COMPLETED",
    );

    if (!capture || !capture.id) {
      const pendingCapture = captures.find(
        (item) => item.status === "PENDING",
      );

      return NextResponse.json(
        {
          success: false,
          status:
            pendingCapture?.status ??
            captures[0]?.status ??
            order.status,
          reason:
            pendingCapture?.status_details?.reason ?? null,
          message:
            "PayPal has not confirmed a completed payment. Your wallet has not been credited.",
        },
        { status: 202 },
      );
    }

    const expectedAmount = Number(transaction.amount);
    const capturedAmount = Number(capture.amount?.value);

    const expectedCents = Math.round(expectedAmount * 100);
    const capturedCents = Math.round(capturedAmount * 100);

    if (
      !Number.isFinite(expectedAmount) ||
      !Number.isSafeInteger(expectedCents) ||
      !Number.isFinite(capturedAmount) ||
      !Number.isSafeInteger(capturedCents) ||
      capture.amount?.currency_code !== "USD" ||
      capturedCents !== expectedCents
    ) {
      console.error("PayPal capture amount mismatch:", {
        orderId,
        captureId: capture.id,
        expectedAmount: transaction.amount,
        capturedAmount: capture.amount?.value,
        capturedCurrency: capture.amount?.currency_code,
      });

      return NextResponse.json(
        {
          error:
            "The captured payment does not match the deposit amount.",
        },
        { status: 409 },
      );
    }

    const {
      data: completion,
      error: completionError,
    } = await admin.rpc("complete_paypal_wallet_deposit", {
      p_order_id: orderId,
      p_user_id: user.id,
      p_capture_id: capture.id,
    });

    if (completionError) {
      console.error("PayPal wallet credit failed:", {
        code: completionError.code,
        message: completionError.message,
        orderId,
        captureId: capture.id,
      });

      return NextResponse.json(
        {
          error:
            "PayPal confirmed the payment, but wallet posting needs another attempt. Please refresh and retry.",
        },
        { status: 503 },
      );
    }

    console.info("PAYPAL_WALLET_DEPOSIT_POSTED", {
      orderId,
      captureId: capture.id,
      transactionId:
        completion?.transaction_id ?? transaction.id,
      amount: transaction.amount,
    });

    return NextResponse.json({
      success: true,
      amount: transaction.amount,
      currency: "USD",
      status: "posted",
      transactionId:
        completion?.transaction_id ?? transaction.id,
      alreadyProcessed:
        completion?.already_processed ?? false,
    });
  } catch (error) {
    console.error("PayPal capture failed:", {
      message:
        error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      {
        error:
          "We could not confirm the PayPal payment. Your wallet has not been credited.",
      },
      { status: 502 },
    );
  }
}
