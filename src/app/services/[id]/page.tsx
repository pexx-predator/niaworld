import ServiceDetailsClient from "./ServiceDetailsClient";

export const instant = false;

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ServiceDetailsPage({ params }: PageProps) {
  const { id } = await params;

  return <ServiceDetailsClient serviceId={id} />;
}