import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getTranslations } from "next-intl/server";
import { Figtree, IBM_Plex_Mono, Press_Start_2P, Silkscreen } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { SoundProvider } from "@/components/sound-provider";
import "./globals.css";

// Body text and the nav bar: a warm, rounded sans that stays easy to read in long testimony.
const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

// Brand mark, docket labels and case numbers (text-label-docket, Badge): a computer-terminal
// mono that reads as "official record" without being a second pixel font. Chinese text falls
// back to Figtree/PingFang (no CJK glyphs in this font).
const labelMono = IBM_Plex_Mono({
  variable: "--font-label",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// The pixel display face for headings only (see globals.css) — a clean bitmap font with real
// regular + bold weights. Chinese text falls back to Figtree/PingFang automatically (Silkscreen
// has no CJK glyphs).
const pixelDisplay = Silkscreen({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// The literal 8-bit pixel face for buttons and the segmented control (from the Stitch "Y2K Pixel
// Button Design System"). Only ships weight 400 — that's all Google Fonts has for it. Chinese
// text falls back to Figtree/PingFang (no CJK glyphs in this font).
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
      className={`${figtree.variable} ${labelMono.variable} ${pixelDisplay.variable} ${pixel.variable} h-full antialiased`}
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
