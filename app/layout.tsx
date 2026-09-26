import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Inter, Silkscreen, Unbounded } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { SoundProvider } from "@/components/sound-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// Headline display face (see globals.css) — from the Stitch "01 Cyber-Cute / Tamagotchi"
// pairing: wide, rounded, 1999–2003 cyber-tech proportions. Headings/case titles only. Chinese
// text falls back to Inter/PingFang automatically (Unbounded has no CJK glyphs).
const headlineDisplay = Unbounded({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["800"],
});

// The pixel face for buttons/badges/docket labels (same Stitch pairing) — a clean bitmap font
// with real regular + bold weights. Chinese text falls back to Inter/PingFang (no CJK glyphs).
const pixel = Silkscreen({
  variable: "--font-pixel-raw",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return { title: t("title"), description: t("description") };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f5f0e6",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html
      lang={locale}
      className={`${inter.variable} ${headlineDisplay.variable} ${pixel.variable} h-full antialiased`}
    >
      <body className="min-h-full font-sans">
        <NextIntlClientProvider>
          <SoundProvider>
            <AppShell>{children}</AppShell>
          </SoundProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
