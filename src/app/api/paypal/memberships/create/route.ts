
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalRequest } from "@/lib/paypal/server";

type MembershipCheckout = {
  membership_id: string;
  payment_id: string;
  plan_id: string;
  plan_name: string;
  amount: number | string;
  currency: string;
  billing_interval: string;
  included_minutes: number;
};

type PayPalOrder = {
  id: string;
  status: string;
  purchase_units?: Array<{
    reference_id?: string;
    custom_id?: string;
    amount?: {
      currency_code?: string;
      value?: string;
    };
  }>;
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
};

type ExistingPayment = {
  id: string;
  membership_id: string;
  amount: number | string;
  currency: string;
  status: string;
  payment_provider: string;
  payment_reference: string | null;
};

function getApplicationOrigin(): string {
  const appBaseUrl = process.env.APP_BASE_URL;

  if (!appBaseUrl) {
    throw new Error("APP_BASE_URL is not configured.");
  }

  const parsed = new URL(appBaseUrl);

  if (
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("APP_BASE_URL is invalid.");
  }

  if (
    process.env.NODE_ENV === "production" &&
    parsed.protocol !== "https:"
  ) {
    throw new Error("A secure application URL is required.");
  }

  if (
    parsed.protocol !== "https:" &&
    parsed.hostname !== "localhost" &&
    parsed.hostname !== "127.0.0.1"
  ) {
    throw new Error("APP_BASE_URL must use HTTPS.");
  }

  return parsed.origin;
}

function getApprovalUrl(order: PayPalOrder): string | null {
  const link = order.links?.find(
    (item) =>
      item.rel === "payer-action" ||
      item.rel === "approve",
  );

  if (!link?.href) {
    return null;
  }

  const url = new URL(link.href);

  if (
    url.protocol !== "https:" ||
    !(
      url.hostname === "paypal.com" ||
      url.hostname.endsWith(".paypal.com")
    )
  ) {
    throw new Error("PayPal returned an invalid approval URL.");
  }

  return url.toString();
}

function verifyOrder(
  order: PayPalOrder,
  checkout: MembershipCheckout,
  amount: string,
): void {
  if (order.id.length < 5) {
    throw new Error("Invalid PayPal order reference.");
  }

  const purchaseUnit = order.purchase_units?.[0];

  if (
    !purchaseUnit ||
    purchaseUnit.custom_id !== checkout.payment_id ||
    purchaseUnit.reference_id !== checkout.membership_id ||
    purchaseUnit.amount?.currency_code !== "USD" ||
    purchaseUnit.amount?.value !== amount
  ) {
    throw new Error(
      "PayPal order details do not match the membership payment.",
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Please sign in before purchasing a membership." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const slug = body?.planSlug;

    if (
      typeof slug !== "string" ||
      !/^[a-z0-9-]{3,80}$/.test(slug)
    ) {
      return NextResponse.json(
        { error: "Select a valid membership plan." },
        { status: 400 },
      );
    }

    const {
      data: checkoutData,
      error: checkoutError,
    } = await supabase.rpc("create_membership_checkout", {
      p_plan_slug: slug,
    });

    if (checkoutError) {
      console.error("Membership checkout initialization failed:", {
        code: checkoutError.code,
        message: checkoutError.message,
      });

      const conflict =
        checkoutError.message?.toLowerCase().includes("pending") ||
        checkoutError.message?.toLowerCase().includes("support review");

      return NextResponse.json(
        {
          error: conflict
            ? checkoutError.message
            : "Unable to initialize your membership checkout.",
        },
        { status: conflict ? 409 : 500 },
      );
    }

    const checkout = (
      Array.isArray(checkoutData)
        ? checkoutData[0]
        : checkoutData
    ) as MembershipCheckout | null;

    if (
      !checkout?.membership_id ||
      !checkout.payment_id ||
      !checkout.plan_id ||
      checkout.currency !== "USD"
    ) {
      return NextResponse.json(
        { error: "Unable to prepare this membership purchase." },
        { status: 500 },
      );
    }

    const amountCents = Math.round(Number(checkout.amount) * 100);

    if (!Number.isSafeInteger(amountCents) || amountCents <= 0) {
      return NextResponse.json(
        { error: "The selected membership price is invalid." },
        { status: 500 },
      );
    }

    const amount = (amountCents / 100).toFixed(2);
    const origin = getApplicationOrigin();
    const returnUrl = `${origin}/membership/return`;
    const admin = createAdminClient();

    // Confirm that the pending payment belongs to this user
    // and matches the membership returned by the database RPC.
    const { data: payment, error: paymentError } = await admin
      .from("membership_payments")
      .select(
        "id, membership_id, amount, currency, status, payment_provider, payment_reference",
      )
      .eq("id", checkout.payment_id)
      .eq("membership_id", checkout.membership_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (paymentError || !payment) {
      console.error("Membership payment record could not be verified:", {
        code: paymentError?.code,
      });

      return NextResponse.json(
        { error: "Unable to verify your membership payment." },
        { status: 503 },
      );
    }

    const existingPayment = payment as ExistingPayment;

    if (
      existingPayment.status !== "pending" ||
      existingPayment.payment_provider !== "paypal" ||
      existingPayment.currency !== "USD" ||
      Math.round(Number(existingPayment.amount) * 100) !== amountCents
    ) {
      return NextResponse.json(
        { error: "This membership payment is not eligible for checkout." },
        { status: 409 },
      );
    }

    let order: PayPalOrder;
    let resumed = false;

    // Resume an existing PayPal order instead of creating a duplicate.
    if (existingPayment.payment_reference) {
      order = await paypalRequest<PayPalOrder>(
        `/v2/checkout/orders/${encodeURIComponent(
          existingPayment.payment_reference,
        )}`,
        { method: "GET" },
      );

      verifyOrder(order, checkout, amount);

      const status = order.status?.toUpperCase();

      if (status === "APPROVED" || status === "COMPLETED") {
        const continuationUrl = new URL(returnUrl);
        continuationUrl.searchParams.set("token", order.id);

        return NextResponse.json({
          success: true,
          alreadyApproved: true,
          orderId: order.id,
          returnUrl: continuationUrl.toString(),
        });
      }

      if (
        status !== "CREATED" &&
        status !== "PAYER_ACTION_REQUIRED"
      ) {
        return NextResponse.json(
          {
            error:
              "Your existing PayPal order is no longer awaiting approval. Please contact support so we can safely reconcile it.",
          },
          { status: 409 },
        );
      }

      resumed = true;
    } else {
      // Create an order only when no PayPal order is attached.
      order = await paypalRequest<PayPalOrder>(
        "/v2/checkout/orders",
        {
          method: "POST",
          headers: {
            "PayPal-Request-Id": checkout.payment_id,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [
              {
                reference_id: checkout.membership_id,
                custom_id: checkout.payment_id,
                description: `NiaWorld ${checkout.plan_name}`,
                amount: {
                  currency_code: "USD",
                  value: amount,
                },
              },
            ],
            payment_source: {
              paypal: {
                experience_context: {
                  return_url: returnUrl,
                  cancel_url: `${origin}/membership?cancelled=1`,
                  user_action: "PAY_NOW",
                  shipping_preference: "NO_SHIPPING",
                  landing_page: "LOGIN",
                },
              },
            },
          }),
        },
      );

      if (!order.id) {
        throw new Error("PayPal did not return an order ID.");
      }

      verifyOrder(order, checkout, amount);

      const { error: attachError } = await admin.rpc(
        "attach_membership_paypal_order",
        {
          p_payment_id: checkout.payment_id,
          p_order_id: order.id,
        },
      );

      if (attachError) {
        console.error("PayPal membership order attachment failed:", {
          code: attachError.code,
          orderId: order.id,
        });

        return NextResponse.json(
          {
            error:
              "PayPal created the order, but we could not register it. Please contact support before attempting another purchase.",
          },
          { status: 503 },
        );
      }
    }

    const approvalUrl = getApprovalUrl(order);

    if (!approvalUrl) {
      return NextResponse.json(
        {
          error:
            "PayPal did not provide an approval link. Please try again or contact support.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        orderId: order.id,
        approvalUrl,
        resumed,
        membershipId: checkout.membership_id,
        plan: {
          id: checkout.plan_id,
          name: checkout.plan_name,
          billingInterval: checkout.billing_interval,
          includedMinutes: checkout.included_minutes,
        },
        amount,
        currency: "USD",
      },
      { status: resumed ? 200 : 201 },
    );
  } catch (error) {
    console.error("PayPal membership checkout failed:", {
      message:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });

    return NextResponse.json(
      { error: "Unable to start or resume your membership purchase." },
      { status: 502 },
    );
  }
}
