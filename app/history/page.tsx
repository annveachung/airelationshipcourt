import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArgumentStockMarket } from "@/components/court/charts/argument-stock-market";
import { ConflictPatterns } from "@/components/court/charts/conflict-patterns";
import { EmotionCounts } from "@/components/court/charts/emotion-counts";
import { IntensityOverTime } from "@/components/court/charts/intensity-over-time";
import { ResponsibilityDistribution } from "@/components/court/charts/responsibility-distribution";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCoupleHistory } from "@/lib/analytics/history";
import { getCoupleStats } from "@/lib/analytics/stats";
import { stockMarket, whosWinning } from "@/lib/analytics/stock-market";
import { getMyCouple } from "@/lib/couples";
import { optionLabel } from "@/lib/i18n-labels";
import { createClient } from "@/lib/supabase/server";

const THIN_DATA = 3;

// The Archive: one place for a couple's relationship history — the open case (if any), the
// analytics dashboard, and every closed case, instead of splitting these across separate tabs.
export default async function HistoryPage() {
  const t = await getTranslations("history");
  const tAll = await getTranslations();
  const locale = await getLocale();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const couple = await getMyCouple(user.id);
  if (couple.kind !== "active") {
    return (
      <Page className="gap-4">
        <SectionHeading label={t("label")} title={t("title")} />
        <Card className="flex flex-col gap-4">
          <p className="text-body-md text-walnut">{t("empty")}</p>
          <Button href={couple.kind === "none" ? "/couple/new" : "/couple/invite"}>
            {couple.kind === "none" ? "Create a couple" : "Invite your partner"}
          </Button>
        </Card>
      </Page>
    );
  }

  const [{ data: openCases }, cases] = await Promise.all([
    supabase.from("cases").select("id, title, stage").neq("stage", "CLOSED"),
    getCoupleHistory(supabase, couple.coupleId),
  ]);
  const openCase = openCases?.[0] ?? null;

  const stats = await getCoupleStats(supabase, couple.coupleId, cases);
  const dateFormat = new Intl.DateTimeFormat(locale);
  const nameA = couple.me.role === "partner_a" ? couple.me.name : couple.partner.name;
  const nameB = couple.me.role === "partner_b" ? couple.me.name : couple.partner.name;

  return (
    <Page className="gap-6 md:max-w-3xl">
      <SectionHeading label={t("label")} title={t("title")} />

      {openCase && (
        <Link
          href={`/cases/${openCase.id}`}
          className="flex items-center justify-between gap-3 rounded-card border border-hairline-strong bg-rose/20 p-4 shadow-card focus-visible:outline-2 focus-visible:outline-espresso"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-label-docket uppercase text-walnut">{t("inProgress")}</span>
            <span className="truncate text-body-md font-medium text-espresso">{openCase.title}</span>
          </div>
          <span className="shrink-0 text-body-sm font-medium text-espresso">{t("goToCase")}</span>
        </Link>
      )}

      {stats.casesCompleted === 0 ? (
        <Card>
          <p className="text-body-md text-walnut">{t("empty")}</p>
        </Card>
      ) : (
        <>
          <Card className="flex flex-col gap-4">
            <h2 className="text-headline-sm text-espresso">{t("summaryHeading")}</h2>
            <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {(
                [
                  [t("casesCompleted"), String(stats.casesCompleted)],
                  [t("topIssue"), stats.topIssues[0] ? optionLabel(tAll, "issues", stats.topIssues[0].issue) : t("none")],
                  [t("runnerUp"), stats.topIssues[1] ? optionLabel(tAll, "issues", stats.topIssues[1].issue) : t("none")],
                  [t("avgResponsibility"), `${nameA} ${stats.avgResponsibility.a}% / ${nameB} ${stats.avgResponsibility.b}%`],
                ] as const
              ).map(([label, value]) => (
                <div key={label} className="flex flex-col gap-0.5">
                  <dt className="text-label-docket uppercase text-walnut">{label}</dt>
                  <dd className="break-words text-body-lg text-espresso">{value}</dd>
                </div>
              ))}
            </dl>
            {stats.casesCompleted < THIN_DATA && <p className="text-body-sm text-walnut">{t("thin")}</p>}
          </Card>

          <div className="flex flex-col gap-6">
            <h2 className="text-label-docket uppercase text-walnut">{t("dashboardHeading")}</h2>
            <ResponsibilityDistribution
              points={stats.responsibilityOverTime}
              names={{ a: nameA, b: nameB }}
              avg={stats.avgResponsibility}
            />
            <IntensityOverTime points={stats.intensityOverTime} />
            <EmotionCounts counts={stats.emotionCounts} />
            <ConflictPatterns counts={stats.conflictPatternCounts} />
            <ArgumentStockMarket
              rows={stockMarket(stats.issueSharePerPeriod.current, stats.issueSharePerPeriod.previous)}
              winning={whosWinning(stats.results)}
              names={{ a: nameA, b: nameB }}
            />
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-label-docket uppercase text-walnut">{t("caseListHeading")}</h2>
            <ul className="flex flex-col gap-3">
              {cases.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/cases/${c.id}/report`}
                    className="flex flex-col gap-2 rounded-card border border-hairline bg-surface p-4 shadow-card focus-visible:outline-2 focus-visible:outline-espresso md:flex-row md:items-center md:justify-between"
                  >
                    <div className="flex min-w-0 flex-col gap-1">
                      <span className="truncate text-body-md font-medium text-espresso">{c.title}</span>
                      <span className="text-body-sm text-walnut">{dateFormat.format(new Date(c.closedAt))}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.primaryIssue && <Badge>{optionLabel(tAll, "issues", c.primaryIssue)}</Badge>}
                      <span className="whitespace-nowrap text-body-sm text-espresso">
                        {c.finalA}% / {c.finalB}%
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </Page>
  );
}
