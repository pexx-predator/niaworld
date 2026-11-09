
import { NextResponse, connection } from "next/server";
import { getApprovedProviderForApi } from "@/lib/provider/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";


const NO_STORE_HEADERS = {
  "Cache-Control": "no-store",
};

type PayoutMethodType = "mpesa" | "bank" | "paypal";

type RegistrationBody = {
  method_type?: unknown;
  account_reference?: unknown;
  bank_name?: unknown;
};

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    { status, headers: NO_STORE_HEADERS },
  );
}

function maskPhone(phone: string) {
  return `${phone.slice(0, 3)}••••${phone.slice(-3)}`;
}

function maskBankAccount(account: string) {
  return `${"•".repeat(Math.max(4, account.length - 4))}${account.slice(-4)}`;
}

function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  const visible = local.length > 1 ? local[0] : "";
  return `${visible}•••@${domain}`;
}

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (/^0[17]\d{8}$/.test(digits)) {
    return `254${digits.slice(1)}`;
  }

  if (/^254[17]\d{8}$/.test(digits)) {
    return digits;
  }

  return null;
}

function normalizeAccountReference(
  methodType: PayoutMethodType,
  value: string,
) {
  if (methodType === "mpesa") {
    const phone = normalizePhone(value);

    if (!phone) return null;

    return {
      reference: phone,
      masked: maskPhone(phone),
      providerName: "M-Pesa",
    };
  }

  if (methodType === "bank") {
    const account = value.replace(/\s+/g, "");

    if (!/^[A-Za-z0-9-]{5,34}$/.test(account)) {
      return null;
    }

    return {
      reference: account,
      masked: maskBankAccount(account),
      providerName: "",
    };
  }

  const email = value.trim().toLowerCase();

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  return {
    reference: email,
    masked: maskEmail(email),
    providerName: "PayPal",
  };
}

export async function GET() {
  await connection();

  try {
    const auth = await getApprovedProviderForApi();

    if ("response" in auth) {
      return auth.response;
    }

    const { data, error } = await auth.supabase
      .from("provider_payout_methods")
      .select(
        [
          "id",
          "method_type",
          "provider_name",
          "masked_account",
          "is_default",
          "verified_at",
          "created_at",
          "updated_at",
        ].join(", "),
      )
      .eq("provider_id", auth.user.id)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Payout methods lookup failed:", error.code);
      return jsonError("Unable to retrieve payout methods.", 500);
    }

    return NextResponse.json(
      { payout_methods: data ?? [] },
      { status: 200, headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    console.error("Payout methods API error:", error);
    return jsonError("An unexpected error occurred.", 500);
  }
}

export async function POST(request: Request) {
  await connection();

  try {
    const auth = await getApprovedProviderForApi();

    if ("response" in auth) {
      return auth.response;
    }

    const body = (await request.json().catch(() => null)) as
      | RegistrationBody
      | null;

    if (!body || typeof body !== "object") {
      return jsonError("Invalid registration request.", 400);
    }

    const methodType = body.method_type;

    if (
      methodType !== "mpesa" &&
      methodType !== "bank" &&
      methodType !== "paypal"
    ) {
      return jsonError("Choose a supported payout method.", 400);
    }

    if (
      typeof body.account_reference !== "string" ||
      body.account_reference.trim().length === 0 ||
      body.account_reference.length > 254
    ) {
      return jsonError("Enter valid payout account details.", 400);
    }

    const normalized = normalizeAccountReference(
      methodType,
      body.account_reference,
    );

    if (!normalized) {
      return jsonError(
        methodType === "mpesa"
          ? "Enter a valid Kenyan M-Pesa number."
          : methodType === "bank"
            ? "Enter a valid bank account number."
            : "Enter a valid PayPal email address.",
        400,
      );
    }

    let providerName = normalized.providerName;

    if (methodType === "bank") {
      if (typeof body.bank_name !== "string") {
        return jsonError("Enter the bank name.", 400);
      }

      providerName = body.bank_name.trim();

      if (
        providerName.length < 2 ||
        providerName.length > 100 ||
        /[<>]/.test(providerName)
      ) {
        return jsonError("Enter a valid bank name.", 400);
      }
    }

    const admin = createAdminClient();

    const { data: existing, error: lookupError } = await admin
      .from("provider_payout_methods")
      .select("id")
      .eq("provider_id", auth.user.id)
      .eq("method_type", methodType)
      .eq(
        "provider_account_reference",
        normalized.reference,
      )
      .maybeSingle();

    if (lookupError) {
      console.error(
        "Payout method duplicate lookup failed:",
        lookupError.code,
      );

      return jsonError(
        "Unable to validate the payout account.",
        500,
      );
    }

    if (existing) {
      return jsonError(
        "This payout account is already registered.",
        409,
      );
    }

    const { data: inserted, error: insertError } = await admin
      .from("provider_payout_methods")
      .insert({
        provider_id: auth.user.id,
        method_type: methodType,
        provider_name: providerName,
        masked_account: normalized.masked,
        provider_account_reference: normalized.reference,
        is_default: false,
        verified_at: null,
      })
      .select(
        [
          "id",
          "method_type",
          "provider_name",
          "masked_account",
          "is_default",
          "verified_at",
          "created_at",
          "updated_at",
        ].join(", "),
      )
      .single();

    if (insertError) {
      if (insertError.code === "23505") {
        return jsonError(
          "This payout account is already registered.",
          409,
        );
      }

      console.error(
        "Payout method registration failed:",
        insertError.code,
      );

      return jsonError(
        "Unable to register this payout method.",
        500,
      );
    }

    return NextResponse.json(
      {
        success: true,
        payout_method: inserted,
        message:
          "Payout method registered. Verification is still pending.",
      },
      {
        status: 201,
        headers: NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    console.error("Payout method registration error:", error);
    return jsonError("An unexpected error occurred.", 500);
  }
}
