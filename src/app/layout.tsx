
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NiaWorld — Real People. Real Cultures. Real Connections.",
  description:
    "Explore cultures, discover traditions, experience food and travel, and connect through the stories that make our world extraordinary.",
  applicationName: "NiaWorld",
  openGraph: {
    title: "NiaWorld — The world is full of stories",
    description:
      "Discover traditions, explore extraordinary places, and connect with people from around the world.",
    siteName: "NiaWorld",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
