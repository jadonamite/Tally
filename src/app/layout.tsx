import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/**
 * One face, everywhere.
 *
 * General Sans is a wide geometric grotesque with a double-storey `a`, and it holds its
 * shape from label sizes up to the headline. Self-hosted rather than pulled at runtime,
 * so the page owes nothing to a third party to render its own headline. See
 * `src/fonts/LICENSE.md`.
 *
 * Figures align through `tabular-nums` rather than through a second, monospaced family.
 */
const generalSans = localFont({
  variable: "--font-general-sans",
  display: "swap",
  src: [
    { path: "../fonts/GeneralSans-400.woff2", weight: "400", style: "normal" },
    { path: "../fonts/GeneralSans-500.woff2", weight: "500", style: "normal" },
    { path: "../fonts/GeneralSans-600.woff2", weight: "600", style: "normal" },
    { path: "../fonts/GeneralSans-700.woff2", weight: "700", style: "normal" },
  ],
});

export const metadata: Metadata = {
  title: "Tally",
  description: "See which tipsters actually beat the odds, from what they said before kickoff.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${generalSans.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-plane text-ink">{children}</body>
    </html>
  );
}
