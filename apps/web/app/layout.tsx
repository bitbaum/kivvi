import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kivvi — Software für Secondhand & Wiederverwertung",
  description:
    "Warenwirtschaft für Brockenhäuser, Refurbisher und Vintage-Läden. Wareneingang, Zustandsbewertung, flexible Preise, Impact-Messung. Gebaut in der Schweiz von revamp-it.",
  openGraph: {
    title: "Kivvi — Software für Secondhand & Wiederverwertung",
    description:
      "Jeden Artikel vom Eingang bis zum Verkauf verfolgen. Mit Zustandsbewertung, Reparatur-Protokoll und Impact-Dashboard.",
    type: "website",
    locale: "de_CH",
    siteName: "Kivvi",
  },
  twitter: {
    card: "summary",
    title: "Kivvi — Software für Secondhand & Wiederverwertung",
    description:
      "Warenwirtschaft für Brockenhäuser, Refurbisher und Vintage-Läden.",
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <body className={inter.className}>
        <NextIntlClientProvider messages={messages}>
          <SessionProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              {children}
              <Toaster richColors position="bottom-right" />
            </ThemeProvider>
          </SessionProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
