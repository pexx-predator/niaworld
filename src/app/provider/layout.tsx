
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ProviderLayoutProps {
  children: React.ReactNode;
}

async function AuthenticatedProviderContent({
  children,
}: ProviderLayoutProps) {
  // Wait for an incoming request before running authentication.
  await connection();

  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth");
  }

  return <>{children}</>;
}

function ProviderLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F2F5F0]">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-200 border-t-green-700" />
    </div>
  );
}

export default function ProviderLayout({
  children,
}: ProviderLayoutProps) {
  return (
    <Suspense fallback={<ProviderLoading />}>
      <AuthenticatedProviderContent>
        {children}
      </AuthenticatedProviderContent>
    </Suspense>
  );
}
