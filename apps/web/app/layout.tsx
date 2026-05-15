import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";
import { SentryUserContext } from "@/components/sentry-user-context";
import { SITE_URL } from "@/lib/config/site";
import { auth } from "@/lib/auth";

const inter = Inter({ subsets: ["latin"] });

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
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Kivvi — Das Betriebssystem der Kreislaufwirtschaft",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Kivvi — Das Betriebssystem der Kreislaufwirtschaft",
    description:
      "Das Open-Source-ERP für Brockenhäuser, IT-Refurbisher, Repair Cafés.",
    images: ["/og-image.png"],
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
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
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
              <Toaster richColors position="bottom-right" />
            </ThemeProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
