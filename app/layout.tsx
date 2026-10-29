import type { Metadata, Viewport } from "next";
import { Poppins, Fira_Code, Outfit, Manrope, Caveat } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import { siteBaseUrl } from "@/lib/siteUrl";

// D-Maths Board has its own look: Outfit for headings, Manrope for text and
// Caveat for "handwriting" on the board. Poppins and Fira Code are used inside
// the live classroom, games and labs.
const display = Outfit({ subsets: ["latin"], variable: "--font-dmb-display", weight: ["300", "400", "500", "600", "700"] });
const body = Manrope({ subsets: ["latin"], variable: "--font-dmb-body", weight: ["400", "500", "600", "700", "800"] });
const hand = Caveat({ subsets: ["latin"], variable: "--font-dmb-hand", weight: ["600", "700"] });
const poppins = Poppins({ subsets: ["latin"], variable: "--font-poppins", weight: ["400", "500", "600", "700", "800"] });
const fira = Fira_Code({ subsets: ["latin"], variable: "--font-fira", weight: ["400", "500"] });

const description = "The interactive whiteboard for teachers: teach live with a PIN, slides, activities, quizzes and class reports. 7-day free trial.";

export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl()),
  title: { default: "D-Maths Board — the interactive whiteboard for teachers", template: "%s · D-Maths Board" },
  description,
  applicationName: "D-Maths Board",
  openGraph: {
    siteName: "D-Maths Board",
    title: "D-Maths Board",
    description,
    url: "/",
    images: [{ url: "/brand/d-maths-board-logo.webp", width: 1774, height: 887, alt: "D-Maths Board" }],
    locale: "en_NG",
    type: "website",
  },
  alternates: { canonical: "/" },
  appleWebApp: { capable: true, statusBarStyle: "default", title: "D-Maths Board" },
  icons: { icon: "/icons/icon-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { themeColor: "#0E6E72", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${poppins.variable} ${fira.variable} ${display.variable} ${body.variable} ${hand.variable}`}>
      <body>
        <div className="font-dmbBody text-dmb-ink">{children}</div>
        <Analytics />
      </body>
    </html>
  );
}
