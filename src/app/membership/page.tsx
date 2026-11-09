
import { Suspense } from "react";
import MembershipCheckoutClient from "./MembershipCheckoutClient";

type MembershipPageProps = {
  searchParams: Promise<{
    plan?: string;
    cancelled?: string;
  }>;
};

async function MembershipPageContent({
  searchParams,
}: MembershipPageProps) {
  const params = await searchParams;

  return (
    <MembershipCheckoutClient
      initialPlanSlug={params.plan ?? ""}
      cancelled={params.cancelled === "1"}
    />
  );
}

export default function MembershipPage({
  searchParams,
}: MembershipPageProps) {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center">
          Loading membership plans...
        </main>
      }
    >
      <MembershipPageContent searchParams={searchParams} />
    </Suspense>
  );
}
