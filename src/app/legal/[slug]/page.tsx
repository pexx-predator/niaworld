import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  LEGAL_DOCUMENTS,
  LEGAL_OWNER,
  LEGAL_UPDATED,
  type LegalDocumentSlug,
} from "@/lib/legal-documents";

type PageProps = {
  params: Promise<{ slug: string }>;
};


export function generateStaticParams() {
  return Object.keys(LEGAL_DOCUMENTS).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const document =
    LEGAL_DOCUMENTS[slug as LegalDocumentSlug];

  if (!document) {
    return { title: "Legal Information | NiaWorld" };
  }

  return {
    title: `${document.title} | NiaWorld`,
    description: document.description,
  };
}

export default async function LegalDocumentPage({
  params,
}: PageProps) {
  const { slug } = await params;
  const document =
    LEGAL_DOCUMENTS[slug as LegalDocumentSlug];

  if (!document) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#f7f9f4] px-5 py-12 text-[#263426] sm:px-8">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xl font-bold tracking-tight text-[#285b2b]"
          >
            Nia<span className="text-[#78a942]">World</span>
          </Link>

          <Link
            href="/"
            className="rounded-full border border-[#d8e2d3] px-5 py-2 text-sm font-medium transition hover:bg-[#eaf1e5]"
          >
            ← Back to NiaWorld
          </Link>
        </header>

        <article className="rounded-3xl border border-[#e1e9dc] bg-white px-6 py-9 shadow-sm sm:px-10 sm:py-12">
          <div className="mb-8 border-b border-[#e8eee4] pb-7">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#71964c]">
              NiaWorld Legal
            </p>

            <h1 className="mb-4 text-3xl font-bold tracking-tight text-[#244b28] sm:text-4xl">
              {document.title}
            </h1>

            <p className="max-w-2xl text-sm leading-7 text-[#657264]">
              {document.description}
            </p>

            <p className="mt-5 text-xs text-[#788477]">
              Last updated: {LEGAL_UPDATED}
            </p>
          </div>

          <p className="mb-9 text-base leading-8 text-[#455345]">
            {document.introduction}
          </p>

          <div className="space-y-9">
            {document.sections.map((section, index) => (
              <section key={`${section.heading}-${index}`}>
                <h2 className="mb-3 text-lg font-semibold text-[#315d32]">
                  {section.heading}
                </h2>

                <div className="space-y-3">
                  {section.paragraphs.map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      className="text-sm leading-8 text-[#536052] sm:text-base"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-12 border-t border-[#e8eee4] pt-7">
            <h2 className="mb-3 text-base font-semibold text-[#315d32]">
              Contact NiaWorld
            </h2>

            <p className="text-sm leading-7 text-[#536052]">
              {LEGAL_OWNER.name}
              <br />
              {LEGAL_OWNER.address}
              <br />
              <a
                href={`mailto:${LEGAL_OWNER.email}`}
                className="font-medium text-[#477d36] underline underline-offset-4"
              >
                {LEGAL_OWNER.email}
              </a>
            </p>
          </div>
        </article>

        <nav
          aria-label="Other legal documents"
          className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-3 text-sm text-[#52734b]"
        >
          {Object.entries(LEGAL_DOCUMENTS).map(([documentSlug, item]) => (
            <Link
              key={documentSlug}
              href={`/legal/${documentSlug}`}
              className="transition hover:text-[#244b28] hover:underline"
            >
              {item.title}
            </Link>
          ))}
        </nav>

        <p className="mt-8 text-center text-xs text-[#879184]">
          © 2026 NiaWorld. All rights reserved.
        </p>
      </div>
    </main>
  );
}

