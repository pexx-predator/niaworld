
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { paypalRequest } from "@/lib/paypal/server";

type PayPalOrder = {
  id: string;
  status: string;
  purchase_units?: Array<{
    custom_id?: string;
    reference_id?: string;
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

type PreparedDeposit = {
  transaction_id: string;
  deposit_id: string;
  provider_reference: string | null;
  reused: boolean;
};

function getReturnUrl(baseUrl: string, orderId: string) {
  const url = new URL("/wallet/deposit/return", baseUrl);
  url.searchParams.set("token", orderId);
  return url.toString();
}

function getApprovalUrl(order: PayPalOrder) {
  const link = order.links?.find(
    (item) =>
      item.rel === "payer-action" || item.rel === "approve",
  );

  if (!link?.href) return null;

  try {
    const url = new URL(link.href);

    if (
      url.protocol !== "https:" ||
      !(
        url.hostname === "paypal.com" ||
        url.hostname.endsWith(".paypal.com")
      )
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

function verifyPayPalOrder(
  order: PayPalOrder,
  orderId: string,
  depositId: string,
  amount: string,
) {
  if (order.id !== orderId) return false;

  const unit = order.purchase_units?.find(
    (item) =>
      item.custom_id === depositId &&
      item.reference_id === depositId,
  );

  if (!unit) return false;

  const expectedCents = Math.round(Number(amount) * 100);
  const actualCents = Math.round(
    Number(unit.amount?.value) * 100,
  );

  return (
    unit.amount?.currency_code === "USD" &&
    Number.isSafeInteger(expectedCents) &&
    Number.isSafeInteger(actualCents) &&
    actualCents === expectedCents
  );
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
        { error: "Please sign in before making a deposit." },
        { status: 401 },
      );
    }

    const body = await request.json().catch(() => null);
    const rawAmount = body?.amount;

    if (
      (typeof rawAmount !== "string" &&
        typeof rawAmount !== "number") ||
      !/^\d{1,4}(\.\d{1,2})?$/.test(String(rawAmount))
    ) {
      return NextResponse.json(
        { error: "Enter a valid USD deposit amount." },
        { status: 400 },
      );
    }

    const amountCents = Math.round(Number(rawAmount) * 100);

    if (
      !Number.isSafeInteger(amountCents) ||
      amountCents < 100 ||
      amountCents > 100000
    ) {
      return NextResponse.json(
        { error: "Deposits must be between $1.00 and $1,000.00." },
        { status: 400 },
      );
    }

    const amount = (amountCents / 100).toFixed(2);

    const {
      data: walletId,
      error: initializeError,
    } = await supabase.rpc("ensure_my_wallet_account");

    if (initializeError || !walletId) {
      console.error("PayPal wallet initialization failed:", {
        code: initializeError?.code,
      });

      return NextResponse.json(
        { error: "Unable to initialize your USD wallet." },
        { status: 500 },
      );
    }

    const { data: wallet, error: walletError } = await supabase
      .from("wallet_accounts")
      .select("id, currency")
      .eq("id", walletId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (walletError || !wallet || wallet.currency !== "USD") {
      console.error("PayPal wallet verification failed:", {
        code: walletError?.code,
      });

      return NextResponse.json(
        { error: "Unable to verify your USD wallet." },
        { status: 500 },
      );
    }

    const appBaseUrl = process.env.APP_BASE_URL;

    if (!appBaseUrl) {
      return NextResponse.json(
        { error: "The application URL is not configured." },
        { status: 500 },
      );
    }

    let parsedBaseUrl: URL;

    try {
      parsedBaseUrl = new URL(appBaseUrl);
    } catch {
      return NextResponse.json(
        { error: "The application URL is invalid." },
        { status: 500 },
      );
    }

    if (
      process.env.NODE_ENV === "production" &&
      parsedBaseUrl.protocol !== "https:"
    ) {
      return NextResponse.json(
        { error: "A secure application URL is required." },
        { status: 500 },
      );
    }

    const admin = createAdminClient();

    for (let attempt = 0; attempt < 20; attempt++) {
      const {
        data: prepared,
        error: prepareError,
      } = await admin.rpc("prepare_paypal_wallet_deposit", {
        p_wallet_id: wallet.id,
        p_user_id: user.id,
        p_amount: amount,
      });

      if (prepareError || !prepared) {
        console.error("PayPal deposit preparation failed:", {
          code: prepareError?.code,
          message: prepareError?.message,
        });

        return NextResponse.json(
          { error: "Unable to prepare your wallet deposit." },
          { status: 500 },
        );
      }

      const deposit = prepared as PreparedDeposit;

      if (!deposit.transaction_id || !deposit.deposit_id) {
        return NextResponse.json(
          { error: "Unable to verify the prepared deposit." },
          { status: 500 },
        );
      }

      const { data: transaction, error: lookupError } =
        await admin
          .from("wallet_transactions")
          .select(
            "id, amount, status, metadata, provider_reference",
          )
          .eq("id", deposit.transaction_id)
          .eq("wallet_id", wallet.id)
          .eq("created_by", user.id)
          .eq("payment_provider", "paypal")
          .eq("type", "deposit")
          .eq("direction", "credit")
          .maybeSingle();

      if (
        lookupError ||
        !transaction ||
        transaction.status !== "pending" ||
        Number(transaction.amount) !== Number(amount)
      ) {
        console.error("Prepared deposit verification failed:", {
          transactionId: deposit.transaction_id,
          code: lookupError?.code,
        });

        return NextResponse.json(
          { error: "Unable to verify your pending deposit." },
          { status: 409 },
        );
      }

      const metadata =
        (transaction.metadata as Record<string, unknown> | null) ?? {};

      if (metadata.paypal_deposit_id !== deposit.deposit_id) {
        return NextResponse.json(
          { error: "The deposit reference could not be verified." },
          { status: 409 },
        );
      }

      // Check an existing PayPal order before attempting reuse.
      if (transaction.provider_reference) {
        let existingOrder: PayPalOrder;

        try {
          existingOrder = await paypalRequest<PayPalOrder>(
            `/v2/checkout/orders/${encodeURIComponent(
              transaction.provider_reference,
            )}`,
            { method: "GET" },
          );
        } catch (error) {
          console.error("Existing PayPal order retrieval failed:", {
            orderId: transaction.provider_reference,
            message:
              error instanceof Error
                ? error.message
                : "Unknown error",
          });

          return NextResponse.json(
            {
              error:
                "We could not verify your existing PayPal order. Please try again shortly.",
            },
            { status: 502 },
          );
        }

        if (
          !verifyPayPalOrder(
            existingOrder,
            transaction.provider_reference,
            deposit.deposit_id,
            amount,
          )
        ) {
          return NextResponse.json(
            { error: "The existing PayPal order failed verification." },
            { status: 409 },
          );
        }

        // Never reuse a voided order.
        if (existingOrder.status === "VOIDED") {
          const { error: voidUpdateError } = await admin
            .from("wallet_transactions")
            .update({
              metadata: {
                ...metadata,
                paypal_order_id: existingOrder.id,
                paypal_order_status: "VOIDED",
              },
            })
            .eq("id", transaction.id)
            .eq("status", "pending");

          if (voidUpdateError) {
            return NextResponse.json(
              { error: "Unable to update the expired deposit." },
              { status: 500 },
            );
          }

          continue;
        }

        // Do not restart checkout for a completed order.
        if (existingOrder.status === "COMPLETED") {
          return NextResponse.json(
            {
              error:
                "This deposit has already been submitted to PayPal and is awaiting payment confirmation. Do not submit it again.",
              status: "PENDING_REVIEW",
              orderId: existingOrder.id,
            },
            { status: 409 },
          );
        }

        // Approved orders go through capture verification.
        if (existingOrder.status === "APPROVED") {
          return NextResponse.json({
            success: true,
            reused: true,
            orderId: existingOrder.id,
            approvalUrl: getReturnUrl(
              parsedBaseUrl.origin,
              existingOrder.id,
            ),
            amount,
            currency: "USD",
          });
        }

        // Existing orders retain their original checkout settings.
        const approvalUrl = getApprovalUrl(existingOrder);

        if (!approvalUrl) {
          return NextResponse.json(
            {
              error:
                "PayPal has not provided a valid checkout link. Please try again shortly.",
            },
            { status: 409 },
          );
        }

        const { error: metadataUpdateError } = await admin
          .from("wallet_transactions")
          .update({
            metadata: {
              ...metadata,
              paypal_order_id: existingOrder.id,
              paypal_order_status: existingOrder.status,
            },
          })
          .eq("id", transaction.id)
          .eq("status", "pending");

        if (metadataUpdateError) {
          return NextResponse.json(
            { error: "Unable to update the pending deposit." },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          reused: true,
          orderId: existingOrder.id,
          approvalUrl,
          amount,
          currency: "USD",
        });
      }

      // Create a new PayPal order.
      // LOGIN asks PayPal to show its sign-in experience.
      const order = await paypalRequest<PayPalOrder>(
        "/v2/checkout/orders",
        {
          method: "POST",
          headers: {
            "PayPal-Request-Id": deposit.deposit_id,
            Prefer: "return=representation",
          },
          body: JSON.stringify({
            intent: "CAPTURE",
            purchase_units: [
              {
                reference_id: deposit.deposit_id,
                custom_id: deposit.deposit_id,
                description: "NiaWorld USD wallet deposit",
                amount: {
                  currency_code: "USD",
                  value: amount,
                },
              },
            ],
            payment_source: {
              paypal: {
                experience_context: {
                  landing_page: "LOGIN",
                  return_url: `${parsedBaseUrl.origin}/wallet/deposit/return`,
                  cancel_url: `${parsedBaseUrl.origin}/wallet/deposit?cancelled=1`,
                  user_action: "PAY_NOW",
                  shipping_preference: "NO_SHIPPING",
                },
              },
            },
          }),
        },
      );

      if (
        !order.id ||
        !verifyPayPalOrder(
          order,
          order.id,
          deposit.deposit_id,
          amount,
        )
      ) {
        console.error("New PayPal order verification failed:", {
          orderId: order.id,
          depositId: deposit.deposit_id,
        });

        return NextResponse.json(
          { error: "PayPal returned an invalid deposit order." },
          { status: 502 },
        );
      }

      const approvalUrl = getApprovalUrl(order);

      if (!approvalUrl) {
        return NextResponse.json(
          { error: "PayPal did not return a valid approval link." },
          { status: 502 },
        );
      }

      // Link PayPal's order to the pending NiaWorld deposit.
      const { data: linkedTransaction, error: updateError } =
        await admin
          .from("wallet_transactions")
          .update({
            provider_reference: order.id,
            metadata: {
              ...metadata,
              paypal_deposit_id: deposit.deposit_id,
              paypal_order_id: order.id,
              paypal_order_status: order.status,
            },
          })
          .eq("id", transaction.id)
          .eq("status", "pending")
          .is("provider_reference", null)
          .select("id")
          .maybeSingle();

      if (updateError || !linkedTransaction) {
        console.error("Unable to link PayPal order to deposit:", {
          orderId: order.id,
          transactionId: transaction.id,
          code: updateError?.code,
        });

        return NextResponse.json(
          {
            error:
              "The PayPal order was created but could not be linked to your deposit. Please retry before creating another payment.",
          },
          { status: 503 },
        );
      }

      return NextResponse.json(
        {
          success: true,
          reused: false,
          orderId: order.id,
          approvalUrl,
          amount,
          currency: "USD",
        },
        { status: 201 },
      );
    }

    return NextResponse.json(
      {
        error:
          "Too many expired pending orders were encountered. Please contact support before trying again.",
      },
      { status: 409 },
    );
  } catch (error) {
    console.error("PayPal order creation failed:", {
      message:
        error instanceof Error ? error.message : "Unknown error",
    });

    return NextResponse.json(
      { error: "Unable to start your PayPal deposit." },
      { status: 502 },
    );
  }
}
