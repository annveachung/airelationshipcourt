import { getTranslations } from "next-intl/server";
import { continueCase } from "@/app/cases/actions";
import { CourtSeal } from "@/components/court/court-seal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { renderNames } from "@/lib/ai/names";
import type { VerdictTexts } from "@/lib/ai/schemas";
import { PANEL_ROLES, type PanelRole } from "@/lib/cases/aggregate";
import { cn } from "@/lib/cn";

type Props = {
  caseId: string;
  caseNumber: string;
  names: { a: string; b: string };
  finalA: number;
  finalB: number;
  moreResponsible: "partner_a" | "partner_b";
  decidedBy: "percentage" | "jury" | "fallback";
  texts: VerdictTexts;
  panel: Partial<Record<PanelRole, { a: number; b: number }>>;
  /** Show the "Continue to advice" button (only on the VERDICT stage). */
  showContinue: boolean;
};

// The verdict itself: seal, headline, the fault allocation meter, and the panel's views.
export async function VerdictScreen({
  caseId,
  caseNumber,
  names,
  finalA,
  finalB,
  moreResponsible,
  decidedBy,
  texts,
  panel,
  showContinue,
}: Props) {
  const t = await getTranslations("verdict");
  const tRoles = await getTranslations("panelRoles");
  const tPartner = await getTranslations("roles");
  const r = (text: string) => renderNames(text, names);
  const winnerName = moreResponsible === "partner_a" ? names.a : names.b;

  const summaries: Record<PanelRole, string> = {
    jury: texts.summary_jury,
    family_counsellor: texts.summary_family_counsellor,
    social_worker: texts.summary_social_worker,
  };

  const side = (who: "a" | "b") => {
    const pct = who === "a" ? finalA : finalB;
    const isWinner = (who === "a") === (moreResponsible === "partner_a");
    return (
      <div
        className={cn(
          "flex min-w-0 flex-col gap-1 rounded-card border p-4",
          isWinner ? "border-espresso bg-espresso text-canvas" : "border-hairline bg-surface text-espresso",
        )}
      >
        <span className="truncate text-body-md font-medium">{names[who]}</span>
        <span className={cn("text-label-docket uppercase", isWinner ? "text-rose" : "text-walnut")}>
          {who === "a" ? tPartner("partnerA") : tPartner("partnerB")}
        </span>
        <span className="text-display-verdict">{pct}%</span>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-6">
      <Card variant="verdict" className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <CourtSeal />
          <Badge className="normal-case">{t("decree", { id: caseNumber })}</Badge>
        </div>

        <h2 className="break-words text-headline-lg text-espresso md:text-display-verdict">
          {t("moreResponsible", { name: winnerName })}
        </h2>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {side("a")}
            {side("b")}
          </div>
          <div
            role="img"
            aria-label={`${names.a} ${finalA}%, ${names.b} ${finalB}%`}
            className="flex h-3 overflow-hidden rounded-full bg-recessed"
          >
            <span className="bg-rose" style={{ width: `${finalA}%` }} />
            <span className="bg-espresso" style={{ width: `${finalB}%` }} />
          </div>
          <p className="text-body-sm text-walnut">{t("estimated")}</p>
          {decidedBy !== "percentage" && (
            <p className="text-body-sm text-walnut">
              {decidedBy === "jury" ? t("tiebreakJury") : t("tiebreakFallback")}
            </p>
          )}
        </div>

        <p className="text-body-lg text-ink">{r(texts.verdict_text)}</p>
      </Card>

      <section className="flex flex-col gap-3" aria-labelledby="panel-heading">
        <div className="flex flex-col gap-1">
          <h3 id="panel-heading" className="text-label-docket uppercase text-walnut">
            {t("panelHeading")}
          </h3>
          <p className="text-body-sm text-walnut">{t("panelTap")}</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {PANEL_ROLES.map((role) => (
            <details key={role} className="rounded-card border border-hairline bg-surface shadow-card">
              <summary className="flex cursor-pointer flex-col gap-0.5 px-4 py-3 focus-visible:outline-2 focus-visible:outline-espresso">
                <span className="text-headline-sm text-espresso">{tRoles(role)}</span>
                {panel[role] && (
                  <span className="text-body-sm text-walnut">
                    {t("panelScores", { a: names.a, pa: panel[role]!.a, b: names.b, pb: panel[role]!.b })}
                  </span>
                )}
              </summary>
              <p className="break-words border-t border-hairline px-4 py-3 text-body-md text-ink">
                {r(summaries[role])}
              </p>
            </details>
          ))}
        </div>
      </section>

      <Card className="flex flex-col gap-4">
        <h3 className="text-headline-md text-espresso">{t("keyFindings")}</h3>
        <dl className="flex flex-col gap-3">
          {(
            [
              ["primaryIssue", texts.primary_issue],
              ["underlyingIssue", texts.underlying_issue],
              ["escalation", texts.main_escalation_factor],
              ["misunderstanding", texts.biggest_misunderstanding],
            ] as const
          ).map(([key, value]) => (
            <div key={key} className="flex flex-col gap-0.5">
              <dt className="text-label-docket uppercase text-walnut">{t(key)}</dt>
              <dd className="break-words text-body-md text-ink">{r(value)}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {showContinue && (
        <form action={continueCase} className="print:hidden">
          <input type="hidden" name="caseId" value={caseId} />
          <Button type="submit" className="w-full md:w-auto md:px-10">
            {t("continueAdvice")}
          </Button>
        </form>
      )}
    </div>
  );
}
