import { Suspense } from "react";
import BookingFormClient from "./BookingFormClient";

type PageProps = {
  params: Promise<{ id: string }>;
};

async function BookingPageContent({ params }: PageProps) {
  const { id } = await params;

  return <BookingFormClient serviceId={id} />;
}

export default function BookingPage(props: PageProps) {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p>Loading booking form...</p>
        </main>
      }
    >
      <BookingPageContent {...props} />
    </Suspense>
  );
}