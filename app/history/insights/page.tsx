import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArgumentStockMarket } from "@/components/court/charts/argument-stock-market";
import { ConflictPatterns } from "@/components/court/charts/conflict-patterns";
import { EmotionCounts } from "@/components/court/charts/emotion-counts";
import { IntensityOverTime } from "@/components/court/charts/intensity-over-time";
import { ResponsibilityDistribution } from "@/components/court/charts/responsibility-distribution";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCoupleHistory } from "@/lib/analytics/history";
import { getCoupleStats } from "@/lib/analytics/stats";
import { stockMarket, whosWinning } from "@/lib/analytics/stock-market";
import { getMyCouple } from "@/lib/couples";
import { createClient } from "@/lib/supabase/server";

export default async function InsightsPage() {
  const t = await getTranslations("insights");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const couple = await getMyCouple(user.id);
  if (couple.kind !== "active") redirect("/history");

  const cases = await getCoupleHistory(supabase, couple.coupleId);
  const stats = await getCoupleStats(supabase, couple.coupleId, cases);
  const nameA = couple.me.role === "partner_a" ? couple.me.name : couple.partner.name;
  const nameB = couple.me.role === "partner_b" ? couple.me.name : couple.partner.name;

  if (stats.casesCompleted === 0) {
    return (
      <Page className="gap-4">
        <SectionHeading label={t("label")} title={t("title")} />
        <Card>
          <p className="text-body-md text-walnut">{t("empty")}</p>
        </Card>
      </Page>
    );
  }

  const stock = stockMarket(stats.issueSharePerPeriod.current, stats.issueSharePerPeriod.previous);
  const winning = whosWinning(stats.results);

  return (
    <Page className="gap-6 md:max-w-3xl">
      <div className="flex flex-col gap-3">
        <SectionHeading label={t("label")} title={t("title")} />
        <Link href="/history" className="text-body-sm text-walnut underline">
          {t("back")}
        </Link>
      </div>

      <ResponsibilityDistribution points={stats.responsibilityOverTime} names={{ a: nameA, b: nameB }} avg={stats.avgResponsibility} />
      <IntensityOverTime points={stats.intensityOverTime} />
      <EmotionCounts counts={stats.emotionCounts} />
      <ConflictPatterns counts={stats.conflictPatternCounts} />
      <ArgumentStockMarket rows={stock} winning={winning} names={{ a: nameA, b: nameB }} />
    </Page>
  );
}
