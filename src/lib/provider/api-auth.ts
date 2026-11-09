
import "server-only";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function getApprovedProviderForApi() {
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

  const { data: application, error: applicationError } =
    await supabase
      .from("provider_applications")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

  if (applicationError) {
    console.error(
      "Provider application lookup failed:",
      applicationError.code,
    );

    return {
      response: NextResponse.json(
        { error: "Unable to verify provider access." },
        { status: 500 },
      ),
    };
  }

  if (application?.status !== "approved") {
    return {
      response: NextResponse.json(
        { error: "An approved provider account is required." },
        { status: 403 },
      ),
    };
  }

  return {
    supabase,
    user,
  };
}
