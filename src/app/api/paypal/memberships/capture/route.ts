
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
};

type PayPalOrder = {
  id: string;
  status: string;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    payments?: {
      captures?: PayPalCapture[];
    };
  }>;
};

type MembershipPayment = {
  id: string;
  membership_id: string;
  user_id: string;
  plan_id: string;
  amount: number | string;
  currency: string;
  status: string;
  provider_capture_id: string | null;
  payment_reference: string | null;
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
        { error: "Please sign in before confirming your membership." },
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

    // Find the exact payment and verify its ownership.
    const {
      data: payment,
      error: paymentError,
    } = await admin
      .from("membership_payments")
      .select(
        [
          "id",
          "membership_id",
          "user_id",
          "plan_id",
          "amount",
          "currency",
          "status",
          "provider_capture_id",
          "payment_reference",
        ].join(","),
      )
      .eq("payment_reference", orderId)
      .eq("payment_provider", "paypal")
      .eq("user_id", user.id)
      .maybeSingle<MembershipPayment>();

    if (paymentError) {
      console.error("Membership payment lookup failed:", {
        code: paymentError.code,
        orderId,
      });

      return NextResponse.json(
        { error: "Unable to verify this membership payment." },
        { status: 500 },
      );
    }

    if (!payment) {
      return NextResponse.json(
        { error: "Membership payment not found." },
        { status: 404 },
      );
    }

    // A successful payment was already verified and finalized
    // by the server. Do not capture or credit it again.
    if (payment.status === "successful") {
      const { data: summary, error: summaryError } =
        await supabase.rpc("get_my_membership_summary");

      if (summaryError) {
        console.error("Membership summary lookup failed:", {
          code: summaryError.code,
        });

        return NextResponse.json(
          {
            success: true,
            alreadyProcessed: true,
            membershipId: payment.membership_id,
            message:
              "Your payment was already processed. Refresh to view your membership.",
          },
        );
      }

      return NextResponse.json({
        success: true,
        alreadyProcessed: true,
        membershipId: payment.membership_id,
        membership: Array.isArray(summary)
          ? summary[0] ?? null
          : summary,
      });
    }

    if (payment.status !== "pending") {
      return NextResponse.json(
        { error: "This membership payment is no longer pending." },
        { status: 409 },
      );
    }

    if (payment.currency !== "USD") {
      return NextResponse.json(
        { error: "This membership payment has an invalid currency." },
        { status: 409 },
      );
    }

    let order: PayPalOrder;
    let captureRequestError: string | null = null;

    // First attempt to capture the approved PayPal order.
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
        error instanceof Error
          ? error.message
          : "Unknown capture error";

      console.warn(
        "PayPal membership capture did not return normally. Retrieving order.",
        {
          orderId,
          error: captureRequestError,
        },
      );

      // A capture request can fail after PayPal has actually
      // completed the payment. Retrieve the order before failing.
      try {
        order = await paypalRequest<PayPalOrder>(
          `/v2/checkout/orders/${encodeURIComponent(orderId)}`,
          { method: "GET" },
        );
      } catch (lookupError) {
        console.error("PayPal membership order retrieval failed:", {
          orderId,
          error:
            lookupError instanceof Error
              ? lookupError.message
              : "Unknown retrieval error",
        });

        return NextResponse.json(
          {
            error:
              "We could not retrieve the PayPal payment status. Your membership has not been activated.",
          },
          { status: 502 },
        );
      }
    }

    if (order.id !== orderId) {
      console.error("PayPal membership order ID mismatch:", {
        expected: orderId,
        received: order.id,
      });

      return NextResponse.json(
        { error: "PayPal returned an unexpected order." },
        { status: 502 },
      );
    }

    // Verify both database references against the PayPal order.
    const purchaseUnit = order.purchase_units?.find(
      (unit) =>
        unit.custom_id === payment.id &&
        unit.reference_id === payment.membership_id,
    );

    if (!purchaseUnit) {
      console.error("PayPal membership reference mismatch:", {
        orderId,
        paymentId: payment.id,
        membershipId: payment.membership_id,
      });

      return NextResponse.json(
        {
          error:
            "The PayPal order does not match this membership purchase.",
        },
        { status: 409 },
      );
    }

    const captures = purchaseUnit.payments?.captures ?? [];

    const capture = captures.find(
      (item) =>
        item.status === "COMPLETED" &&
        typeof item.id === "string" &&
        item.id.length > 0,
    );

    if (!capture?.id) {
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
            "PayPal has not confirmed a completed payment. Your membership has not been activated.",
        },
        { status: 202 },
      );
    }

    // Compare integer cents to avoid floating-point money errors.
    const expectedCents = Math.round(
      Number(payment.amount) * 100,
    );

    const capturedCents = Math.round(
      Number(capture.amount?.value) * 100,
    );

    if (
      capture.amount?.currency_code !== "USD" ||
      !Number.isSafeInteger(expectedCents) ||
      !Number.isSafeInteger(capturedCents) ||
      capturedCents !== expectedCents
    ) {
      console.error("PayPal membership amount mismatch:", {
        orderId,
        captureId: capture.id,
        expectedAmount: payment.amount,
        capturedAmount: capture.amount?.value,
        capturedCurrency: capture.amount?.currency_code,
      });

      return NextResponse.json(
        {
          error:
            "The captured payment does not match the membership price.",
        },
        { status: 409 },
      );
    }

    // Only the trusted server-side database function can
    // finalize payment and grant membership minutes.
    const {
      data: completion,
      error: completionError,
    } = await admin.rpc(
      "complete_paypal_membership_payment",
      {
        p_order_id: orderId,
        p_user_id: user.id,
        p_capture_id: capture.id,
        p_amount: (capturedCents / 100).toFixed(2),
      },
    );

    if (completionError) {
      console.error("Membership payment finalization failed:", {
        code: completionError.code,
        message: completionError.message,
        orderId,
        captureId: capture.id,
      });

      return NextResponse.json(
        {
          error:
            "PayPal confirmed your payment, but membership activation needs another attempt. Please refresh and retry.",
        },
        { status: 503 },
      );
    }

    // Read the result using the authenticated customer client.
    const {
      data: summary,
      error: summaryError,
    } = await supabase.rpc("get_my_membership_summary");

    if (summaryError) {
      console.error("Membership summary retrieval failed:", {
        code: summaryError.code,
      });
    }

    console.info("PAYPAL_MEMBERSHIP_PAYMENT_COMPLETED", {
      orderId,
      captureId: capture.id,
      membershipId: payment.membership_id,
      userId: user.id,
      amount: payment.amount,
      currency: payment.currency,
      captureRequestError,
    });

    return NextResponse.json({
      success: true,
      alreadyProcessed:
        completion?.already_processed ?? false,
      membershipId: payment.membership_id,
      completion,
      membership: summaryError
        ? null
        : Array.isArray(summary)
          ? summary[0] ?? null
          : summary,
    });
  } catch (error) {
    console.error("PayPal membership capture failed:", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });

    return NextResponse.json(
      {
        error:
          "We could not confirm the PayPal payment. Your membership has not been activated.",
      },
      { status: 502 },
    );
  }
}
