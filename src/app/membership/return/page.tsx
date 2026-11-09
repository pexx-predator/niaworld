import { Suspense } from "react";
import MembershipReturnClient from "./MembershipReturnClient";

type MembershipReturnPageProps = {
  searchParams: Promise<{
    token?: string;
  }>;
};

async function MembershipReturnContent({
  searchParams,
}: MembershipReturnPageProps) {
  const params = await searchParams;

  return <MembershipReturnClient orderId={params.token ?? ""} />;
}

export default function MembershipReturnPage(
  props: MembershipReturnPageProps
) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p>Preparing your membership confirmation...</p>
        </main>
      }
    >
      <MembershipReturnContent {...props} />
    </Suspense>
  );
}