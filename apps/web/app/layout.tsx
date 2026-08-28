import type { Metadata } from "next";
import Script from "next/script";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { ThemedToaster } from "@/components/themed-toaster";
import { SentryUserContext } from "@/components/sentry-user-context";
import { SITE_URL } from "@/lib/config/site";
import { auth } from "@/lib/auth";

// Body font — Space Grotesk for x.ai-aligned aesthetic.
// Inter stays loaded as fallback for any explicit `font-['Inter']` references.
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

// Display variant — used for h1/h2/h3 via the font-display Tailwind utility.
// Same family, different CSS variable so we can swap to a true display face
// later without touching markup.
const spaceGroteskDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk-display",
  display: "swap",
  weight: ["500", "600", "700"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const ORGANIZATION_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Kivvi",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    "Das Open-Source-ERP für Kreislaufbetriebe — Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops.",
  sameAs: ["https://github.com/g-but/kivvi"],
  contactPoint: {
    "@type": "ContactPoint",
    email: "info@revamp-it.ch",
    contactType: "customer support",
  },
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "Kivvi — Das Betriebssystem der Kreislaufwirtschaft",
  description:
    "Das Open-Source-ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés und Vintage-Shops. Einzelartikel-Tracking, KI-Schnelleingabe, Schweizer QR-Rechnungen.",
  openGraph: {
    title: "Kivvi — Das Betriebssystem der Kreislaufwirtschaft",
    description:
      "Das Open-Source-ERP für Betriebe, die Waren ein zweites Leben geben. Einzelartikel-Tracking, KI, Swiss QR-Rechnungen.",
    type: "website",
    locale: "de_CH",
    siteName: "Kivvi",
    // No `images` key on purpose — see buildPageMeta in lib/config/site.ts.
    // /og-image.png was never shipped, and naming it explicitly overrode the
    // generated opengraph-image.tsx cards that do exist.
  },
  twitter: {
    card: "summary_large_image",
    title: "Kivvi — Das Betriebssystem der Kreislaufwirtschaft",
    description:
      "Das Open-Source-ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés.",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();
  const session = await auth();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${spaceGrotesk.variable} ${spaceGroteskDisplay.variable} ${inter.variable}`}
    >
      <body className="font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_LD) }}
        />
        <NextIntlClientProvider messages={messages}>
          <SessionProvider session={session}>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <SentryUserContext />
              {children}
              <ThemedToaster />
            </ThemeProvider>
          </SessionProvider>
        </NextIntlClientProvider>

        {/* FleetCrown feedback widget — env-gated, see docs/architecture/feedback-widget.md */}
        {process.env.NEXT_PUBLIC_FC_WIDGET_TOKEN && (
          <Script
            src="https://fleetcrown.orangecat.ch/widget.js"
            strategy="afterInteractive"
            data-fc-project={process.env.NEXT_PUBLIC_FC_WIDGET_TOKEN}
          />
        )}
      </body>
    </html>
  );
}
