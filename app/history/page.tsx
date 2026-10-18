import { getLocale, getTranslations } from "next-intl/server";
import Link from "next/link";
import { redirect } from "next/navigation";
import { BlameDistribution } from "@/components/court/charts/blame-distribution";
import { ArgumentLoop } from "@/components/court/charts/argument-loop";
import { PeaceCalendar, type ConflictDay } from "@/components/court/charts/peace-calendar";
import { PastCases, type PastCaseRow } from "@/components/court/past-cases";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Page } from "@/components/ui/page";
import { SectionHeading } from "@/components/ui/section-heading";
import { getCoupleHistory } from "@/lib/analytics/history";
import { getCoupleStats } from "@/lib/analytics/stats";
import { getMyCouple } from "@/lib/couples";
import { optionLabel } from "@/lib/i18n-labels";
import { createClient } from "@/lib/db/server";
import { getUser } from "@/lib/session";

const THIN_DATA = 3;

// The Archive: one place for a couple's relationship history — the open case (if any), the
// analytics dashboard, and every closed case, instead of splitting these across separate tabs.
export default async function HistoryPage() {
  const t = await getTranslations("history");
  const tAll = await getTranslations();
  const locale = await getLocale();

  const db = await createClient();
  const user = await getUser();
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

  const [{ data: openCases }, { data: coupleRow }, cases] = await Promise.all([
    db.from("cases").select("id, title, stage, created_at").neq("stage", "CLOSED"),
    db.from("couples").select("created_at").eq("id", couple.coupleId).maybeSingle(),
    getCoupleHistory(db, couple.coupleId),
  ]);
  const openCase = openCases?.[0] ?? null;

  const stats = await getCoupleStats(db, couple.coupleId, cases);
  const nameA = couple.me.role === "partner_a" ? couple.me.name : couple.partner.name;
  const nameB = couple.me.role === "partner_b" ? couple.me.name : couple.partner.name;

  // Every filed case marks a conflict day, including the one still in progress.
  const conflictDays: ConflictDay[] = [
    ...cases.map((c) => ({ filedAt: c.filedAt, title: c.title, href: `/cases/${c.id}/report` })),
    ...(openCase ? [{ filedAt: openCase.created_at as string, title: openCase.title as string, href: `/cases/${openCase.id}` }] : []),
  ];
  const courtOpenedAt = (coupleRow?.created_at as string | undefined) ?? cases[cases.length - 1]?.filedAt ?? new Date().toISOString();

  const moreResponsible = {
    a: stats.results.filter((r) => r === "partner_a").length,
    b: stats.results.filter((r) => r === "partner_b").length,
  };

  const monthFormat = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
  const dayFormat = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });
  const pastCases: PastCaseRow[] = cases.map((c) => {
    const closed = new Date(c.closedAt);
    const issue = c.primaryIssue ? optionLabel(tAll, "issues", c.primaryIssue) : null;
    return {
      id: c.id,
      href: `/cases/${c.id}/report`,
      title: c.title,
      month: monthFormat.format(closed),
      meta: [dayFormat.format(closed), issue].filter(Boolean).join(" · "),
      split: { a: c.finalA, b: c.finalB },
      splitLabel: `${nameA} ${c.finalA}%, ${nameB} ${c.finalB}%`,
    };
  });

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
                  [
                    t("avgResponsibility"),
                    <>
                      <span className="block">{`${nameA} ${stats.avgResponsibility.a}%`}</span>
                      <span className="block">{`${nameB} ${stats.avgResponsibility.b}%`}</span>
                    </>,
                  ],
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
            <PeaceCalendar conflicts={conflictDays} courtOpenedAt={courtOpenedAt} />
            <BlameDistribution names={{ a: nameA, b: nameB }} avg={stats.avgResponsibility} moreResponsible={moreResponsible} />
            <ArgumentLoop patterns={stats.conflictPatternCounts} totalCases={stats.casesCompleted} />
          </div>

          <section className="flex flex-col gap-3">
            <h2 className="text-label-docket uppercase text-walnut">{t("caseListHeading")}</h2>
            <PastCases rows={pastCases} />
          </section>
        </>
      )}
    </Page>
  );
}
