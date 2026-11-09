
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

async function getActiveAdmin() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      response: NextResponse.json(
        { error: "Authentication required." },
        { status: 401 },
      ),
    };
  }

  const { data: adminRecord, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (adminError) {
    return {
      response: NextResponse.json(
        { error: "Unable to verify admin access." },
        { status: 500 },
      ),
    };
  }

  if (!adminRecord) {
    return {
      response: NextResponse.json(
        { error: "Active admin access is required." },
        { status: 403 },
      ),
    };
  }

  return { user };
}

export async function GET() {
  try {
    const adminAuth = await getActiveAdmin();

    if ("response" in adminAuth) {
      return adminAuth.response;
    }

    const adminClient = createAdminClient();

    const { data: methods, error } = await adminClient
      .from("provider_payout_methods")
      .select(
        "id, provider_id, method_type, provider_name, masked_account, is_default, verification_status, verification_note, created_at",
      )
      .eq("verification_status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Admin payout methods query failed:", error);

      return NextResponse.json(
        { error: "Unable to load pending payout methods." },
        { status: 500 },
      );
    }

    const providerIds = [
      ...new Set((methods ?? []).map((method) => method.provider_id)),
    ];

    let profiles: {
      user_id: string;
      display_name: string | null;
      username: string | null;
    }[] = [];

    if (providerIds.length > 0) {
      const { data: profileData, error: profileError } = await adminClient
        .from("profiles")
        .select("user_id, display_name, username")
        .in("user_id", providerIds);

      if (profileError) {
        console.error("Provider profiles query failed:", profileError);

        return NextResponse.json(
          { error: "Unable to load provider information." },
          { status: 500 },
        );
      }

      profiles = profileData ?? [];
    }

    const profileMap = new Map(
      profiles.map((profile) => [profile.user_id, profile]),
    );

    const results = (methods ?? []).map((method) => ({
      ...method,
      provider: profileMap.get(method.provider_id) ?? null,
    }));

    return NextResponse.json(
      { methods: results },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  } catch (error) {
    console.error("Admin payout methods GET error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminAuth = await getActiveAdmin();

    if ("response" in adminAuth) {
      return adminAuth.response;
    }

    const parsedBody: unknown = await request.json().catch(() => null);

    const body =
      parsedBody !== null &&
      typeof parsedBody === "object" &&
      !Array.isArray(parsedBody)
        ? (parsedBody as Record<string, unknown>)
        : {};

    const id = typeof body.id === "string" ? body.id.trim() : "";
    const action =
      typeof body.action === "string" ? body.action.trim() : "";
    const note = typeof body.note === "string" ? body.note.trim() : "";

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(id)) {
      return NextResponse.json(
        { error: "A valid payout method ID is required." },
        { status: 400 },
      );
    }

    if (action !== "verify" && action !== "reject") {
      return NextResponse.json(
        { error: "Action must be verify or reject." },
        { status: 400 },
      );
    }

    if (action === "reject" && !note) {
      return NextResponse.json(
        { error: "A rejection reason is required." },
        { status: 400 },
      );
    }

    if (note.length > 500) {
      return NextResponse.json(
        { error: "The rejection reason must be 500 characters or fewer." },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();

    const { data: method, error: lookupError } = await adminClient
      .from("provider_payout_methods")
      .select("id, verification_status")
      .eq("id", id)
      .maybeSingle();

    if (lookupError) {
      console.error("Payout method lookup failed:", lookupError);

      return NextResponse.json(
        { error: "Unable to find the payout method." },
        { status: 500 },
      );
    }

    if (!method) {
      return NextResponse.json(
        { error: "Payout method not found." },
        { status: 404 },
      );
    }

    if (method.verification_status !== "pending") {
      return NextResponse.json(
        { error: "This payout method has already been reviewed." },
        { status: 409 },
      );
    }

    const now = new Date().toISOString();

    const update =
      action === "verify"
        ? {
            verification_status: "verified",
            verification_note: null,
            verified_at: now,
            verified_by: adminAuth.user.id,
            updated_at: now,
          }
        : {
            verification_status: "rejected",
            verification_note: note,
            verified_at: null,
            verified_by: adminAuth.user.id,
            updated_at: now,
          };

    const { data: updatedMethod, error: updateError } =
      await adminClient
        .from("provider_payout_methods")
        .update(update)
        .eq("id", id)
        .eq("verification_status", "pending")
        .select(
          "id, verification_status, verification_note, verified_at",
        )
        .maybeSingle();

    if (updateError) {
      console.error("Payout method update failed:", updateError);

      return NextResponse.json(
        { error: "Unable to update payout method verification." },
        { status: 500 },
      );
    }

    if (!updatedMethod) {
      return NextResponse.json(
        { error: "This payout method has already been reviewed." },
        { status: 409 },
      );
    }

    return NextResponse.json({
      message:
        action === "verify"
          ? "Payout method verified successfully."
          : "Payout method rejected.",
      method: updatedMethod,
    });
  } catch (error) {
    console.error("Admin payout methods POST error:", error);

    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 },
    );
  }
}
