import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Inter, Press_Start_2P, Silkscreen } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { SoundProvider } from "@/components/sound-provider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// The pixel display face for headings and docket labels/case numbers only (see globals.css) — a
// clean bitmap font with real regular + bold weights (unlike VT323's single thin weight, so
// label-docket's bold token renders as an actual bold face, not a browser-synthesized fake).
// Chinese text falls back to Inter/PingFang automatically (Silkscreen has no CJK glyphs).
const pixelDisplay = Silkscreen({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// The literal 8-bit pixel face for buttons/badges (from the Stitch "Y2K Pixel Button Design
// System"). Only ships weight 400 — that's all Google Fonts has for it. Chinese text falls back
// to Inter/PingFang (no CJK glyphs in this font, same as Baloo above).
const pixel = Press_Start_2P({
  variable: "--font-pixel-raw",
  subsets: ["latin"],
  weight: ["400"],
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
      className={`${inter.variable} ${pixelDisplay.variable} ${pixel.variable} h-full antialiased`}
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
