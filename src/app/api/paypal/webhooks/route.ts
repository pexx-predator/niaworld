
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalRequest } from "@/lib/paypal/server";


type PayPalWebhookEvent = {
  id: string;
  event_type: string;
  resource?: {
    id?: string;
    supplementary_data?: {
      related_ids?: {
        order_id?: string;
      };
    };
  };
  [key: string]: unknown;
};

type PayPalCapture = {
  id: string;
  status: string;
  amount?: {
    currency_code?: string;
    value?: string;
  };
  supplementary_data?: {
    related_ids?: {
      order_id?: string;
    };
  };
};

type PayPalOrder = {
  id: string;
  status: string;
  purchase_units?: Array<{
    custom_id?: string;
    payments?: {
      captures?: Array<{
        id: string;
        status: string;
        amount?: {
          currency_code?: string;
          value?: string;
        };
      }>;
    };
  }>;
};

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function toCents(value: string | number): number {
  const amount = Number(value);

  if (!Number.isFinite(amount)) {
    return -1;
  }

  return Math.round(amount * 100);
}

export async function POST(request: Request) {
  let admin: ReturnType<typeof createAdminClient> | undefined;
  let claimedEventId: string | undefined;

  try {
    const webhookId = process.env.PAYPAL_WEBHOOK_ID;

    if (!webhookId) {
      console.error("PayPal webhook ID is not configured.");
      return jsonError("Webhook configuration is incomplete.", 500);
    }

    const rawBody = await request.text();

    if (!rawBody || rawBody.length > 1_000_000) {
      return jsonError("Invalid webhook request body.", 400);
    }

    let event: PayPalWebhookEvent;

    try {
      event = JSON.parse(rawBody) as PayPalWebhookEvent;
    } catch {
      return jsonError("Invalid webhook JSON.", 400);
    }

    if (
      !event ||
      typeof event.id !== "string" ||
      !event.id ||
      typeof event.event_type !== "string" ||
      !event.event_type
    ) {
      return jsonError("Invalid PayPal event.", 400);
    }

    const headers = request.headers;

    const authAlgo = headers.get("paypal-auth-algo");
    const certUrl = headers.get("paypal-cert-url");
    const transmissionId = headers.get("paypal-transmission-id");
    const transmissionSig = headers.get("paypal-transmission-sig");
    const transmissionTime = headers.get("paypal-transmission-time");

    if (
      !authAlgo ||
      !certUrl ||
      !transmissionId ||
      !transmissionSig ||
      !transmissionTime
    ) {
      return jsonError("Missing PayPal signature headers.", 400);
    }

    // Verify the event with PayPal before storing or processing it.
    const verification = await paypalRequest<{
      verification_status?: string;
    }>("/v1/notifications/verify-webhook-signature", {
      method: "POST",
      body: JSON.stringify({
        auth_algo: authAlgo,
        cert_url: certUrl,
        transmission_id: transmissionId,
        transmission_sig: transmissionSig,
        transmission_time: transmissionTime,
        webhook_id: webhookId,
        webhook_event: event,
      }),
    });

    if (verification.verification_status !== "SUCCESS") {
      console.error("PayPal webhook signature verification failed.");
      return jsonError("Invalid PayPal webhook signature.", 401);
    }

    admin = createAdminClient();

    const resourceId =
      typeof event.resource?.id === "string"
        ? event.resource.id
        : null;

    const eventOrderId =
      event.resource?.supplementary_data?.related_ids?.order_id ?? null;

    // Store only signature-verified events.
    const { error: insertError } = await admin
      .from("paypal_deposit_webhook_events")
      .upsert(
        {
          payment_provider: "paypal",
          provider_event_id: event.id,
          event_type: event.event_type,
          paypal_order_id: eventOrderId,
          paypal_capture_id: resourceId,
          payload: event,
          status: "received",
        },
        {
          onConflict: "payment_provider,provider_event_id",
          ignoreDuplicates: true,
        },
      );

    if (insertError) {
      console.error(
        "PayPal webhook event storage failed:",
        insertError.code,
      );
      return jsonError("Unable to record the PayPal event.", 500);
    }

    const { data: storedEvent, error: lookupError } = await admin
      .from("paypal_deposit_webhook_events")
      .select("id,status,attempts")
      .eq("payment_provider", "paypal")
      .eq("provider_event_id", event.id)
      .maybeSingle();

    if (lookupError || !storedEvent) {
      console.error(
        "PayPal webhook event lookup failed:",
        lookupError?.code,
      );
      return jsonError("Unable to retrieve the PayPal event.", 500);
    }

    if (
      storedEvent.status === "processed" ||
      storedEvent.status === "ignored" ||
      storedEvent.status === "processing"
    ) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        status: storedEvent.status,
      });
    }

    // Atomically claim received or failed events.
    // Only one concurrent request can change the row from these states.
    const { data: claimedEvent, error: claimError } = await admin
      .from("paypal_deposit_webhook_events")
      .update({
        status: "processing",
        attempts: storedEvent.attempts + 1,
        last_error: null,
      })
      .eq("id", storedEvent.id)
      .in("status", ["received", "failed"])
      .select("id")
      .maybeSingle();

    if (claimError) {
      console.error("PayPal webhook claim failed:", claimError.code);
      return jsonError("Unable to process the PayPal event.", 500);
    }

    if (!claimedEvent) {
      return NextResponse.json({
        success: true,
        duplicate: true,
        status: "already_claimed",
      });
    }

    claimedEventId = claimedEvent.id;

    const markIgnored = async (reason: string) => {
      const { error } = await admin!
        .from("paypal_deposit_webhook_events")
        .update({
          status: "ignored",
          last_error: reason,
          processed_at: new Date().toISOString(),
        })
        .eq("id", claimedEvent.id);

      if (error) {
        throw new Error("Unable to update ignored webhook event.");
      }
    };

    // These events are recorded but must never credit the wallet.
    if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") {
      await markIgnored(
        `No wallet credit action for event type ${event.event_type}.`,
      );

      return NextResponse.json({
        success: true,
        status: "ignored",
      });
    }

    if (!resourceId) {
      await markIgnored("Completed event did not contain a capture ID.");

      return NextResponse.json({
        success: true,
        status: "ignored",
      });
    }

    // Retrieve the capture directly from PayPal.
    const capture = await paypalRequest<PayPalCapture>(
      `/v2/payments/captures/${encodeURIComponent(resourceId)}`,
    );

    if (capture.id !== resourceId || capture.status !== "COMPLETED") {
      await markIgnored("PayPal capture is not confirmed as completed.");

      return NextResponse.json({
        success: true,
        status: "ignored",
      });
    }

    const orderId =
      capture.supplementary_data?.related_ids?.order_id ??
      eventOrderId;

    if (!orderId) {
      await markIgnored("PayPal capture did not identify its order.");

      return NextResponse.json({
        success: true,
        status: "ignored",
      });
    }

    if (eventOrderId && eventOrderId !== orderId) {
      await markIgnored("Webhook and capture order IDs do not match.");

      return NextResponse.json({
        success: true,
        status: "ignored",
      });
    }

    // Retrieve the order independently from PayPal.
    const order = await paypalRequest<PayPalOrder>(
      `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    );

    if (order.id !== orderId || order.status !== "COMPLETED") {
      await markIgnored("PayPal order is not confirmed as completed.");

      return NextResponse.json({
        success: true,
        status: "ignored",
      });
    }

    const matchingPurchaseUnit = order.purchase_units?.find(
      (unit) =>
        unit.payments?.captures?.some(
          (item) => item.id === resourceId,
        ),
    );

    const matchingCapture = matchingPurchaseUnit?.payments?.captures?.find(
      (item) => item.id === resourceId,
    );

    if (
      !matchingPurchaseUnit ||
      !matchingCapture ||
      matchingCapture.status !== "COMPLETED"
    ) {
      await markIgnored(
        "The completed capture was not found in the PayPal order.",
      );

      return NextResponse.json({
        success: true,
        status: "ignored",
      });
    }

    // Find the pending deposit registered when the order was created.
    const { data: transaction, error: transactionError } = await admin
      .from("wallet_transactions")
      .select(
        "id,wallet_id,amount,currency,status,metadata,payment_provider,type,direction,provider_reference",
      )
      .eq("provider_reference", orderId)
      .eq("payment_provider", "paypal")
      .eq("type", "deposit")
      .eq("direction", "credit")
      .maybeSingle();

    if (transactionError) {
      throw new Error("Unable to retrieve the wallet deposit.");
    }

    if (!transaction) {
      // A temporary database timing issue may be retried by PayPal.
      throw new Error("Registered wallet deposit was not found.");
    }

    const metadata =
      transaction.metadata as Record<string, unknown> | null;

    const depositId = metadata?.paypal_deposit_id;

    if (
      typeof depositId !== "string" ||
      matchingPurchaseUnit.custom_id !== depositId
    ) {
      await markIgnored(
        "PayPal order does not match the registered deposit ID.",
      );

      return NextResponse.json({
        success: true,
        status: "ignored",
      });
    }

    // Verify the wallet and its owner independently.
    const { data: wallet, error: walletError } = await admin
      .from("wallet_accounts")
      .select("id,user_id,currency")
      .eq("id", transaction.wallet_id)
      .maybeSingle();

    if (walletError || !wallet) {
      throw new Error("Unable to verify the deposit wallet.");
    }

    if (
      transaction.currency !== "USD" ||
      wallet.currency !== "USD" ||
      matchingCapture.amount?.currency_code !== "USD" ||
      capture.amount?.currency_code !== "USD"
    ) {
      await markIgnored("PayPal deposit currency verification failed.");

      return NextResponse.json({
        success: true,
        status: "ignored",
      });
    }

    const expectedCents = toCents(transaction.amount);
    const orderCaptureCents = toCents(
      matchingCapture.amount?.value ?? "",
    );
    const captureCents = toCents(capture.amount?.value ?? "");

    if (
      expectedCents < 100 ||
      orderCaptureCents !== expectedCents ||
      captureCents !== expectedCents
    ) {
      await markIgnored("PayPal deposit amount verification failed.");

      return NextResponse.json({
        success: true,
        status: "ignored",
      });
    }

    if (
      transaction.status !== "pending" &&
      transaction.status !== "posted"
    ) {
      await markIgnored("Wallet deposit is not eligible for completion.");

      return NextResponse.json({
        success: true,
        status: "ignored",
      });
    }

    // The database function handles posting and repeat-call protection.
    const { data: completion, error: completionError } = await admin.rpc(
      "complete_paypal_wallet_deposit",
      {
        p_order_id: orderId,
        p_user_id: wallet.user_id,
        p_capture_id: resourceId,
      },
    );

    if (completionError || !completion) {
      throw new Error("Wallet deposit completion failed.");
    }

    const { error: processedError } = await admin
      .from("paypal_deposit_webhook_events")
      .update({
        status: "processed",
        paypal_order_id: orderId,
        paypal_capture_id: resourceId,
        deposit_reference: depositId,
        processed_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", claimedEvent.id);

    if (processedError) {
      // The RPC is idempotent. A retry can safely confirm this capture.
      throw new Error("Unable to mark the PayPal event as processed.");
    }

    claimedEventId = undefined;

    return NextResponse.json({
      success: true,
      status: "processed",
      orderId,
    });
  } catch (error) {
    console.error(
      "PayPal webhook processing failed:",
      error instanceof Error ? error.message : "Unknown error",
    );

    if (admin && claimedEventId) {
      const { error: updateError } = await admin
        .from("paypal_deposit_webhook_events")
        .update({
          status: "failed",
          last_error:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown webhook processing error.",
        })
        .eq("id", claimedEventId);

      if (updateError) {
        console.error(
          "PayPal webhook failure status update failed:",
          updateError.code,
        );
      }
    }

    return jsonError("PayPal webhook processing failed.", 500);
  }
}
