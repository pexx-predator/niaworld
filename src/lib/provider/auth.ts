
import "server-only";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function requireApprovedProvider() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/auth");
  }

  const { data: application, error: applicationError } =
    await supabase
      .from("provider_applications")
      .select("id, status")
      .eq("user_id", user.id)
      .maybeSingle();

  if (applicationError || application?.status !== "approved") {
    redirect("/provider/dashboard");
  }

  return {
    user,
    application,
  };
}
