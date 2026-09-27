import { getTranslations } from "next-intl/server";
import { CourtSeal } from "@/components/court/court-seal";
import { ChargeList } from "@/components/court/charge-list";
import { Card } from "@/components/ui/card";
import { renderNames } from "@/lib/ai/names";
import type { ReportTexts, VerdictTexts } from "@/lib/ai/schemas";
import { PANEL_ROLES, type PanelRole } from "@/lib/cases/aggregate";
import type { VerdictCharges } from "@/lib/cases/charges";
import type { PanelAgreement } from "@/lib/cases/panel-agreement";

type Section = { key: string; title: string; body: React.ReactNode };

type Props = {
  caseNumber: string;
  names: { a: string; b: string };
  verdict: { finalA: number; finalB: number; charges: VerdictCharges };
  texts: VerdictTexts;
  report: ReportTexts;
  agreement: PanelAgreement | null;
  // The closed-case page already shows the case summary in its banner, so it can drop it here.
  hideCaseSummary?: boolean;
};

// The full written record: the 13 sections from the spec. Testimonies are deliberately left out —
// each partner only ever sees their own.
export async function ReportDocument({
  caseNumber,
  names,
  verdict,
  texts,
  report,
  agreement,
  hideCaseSummary = false,
}: Props) {
  const t = await getTranslations("report");
  const tRoles = await getTranslations("panelRoles");
  const r = (text: string) => renderNames(text, names);

  const lines = (text: string) =>
    text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  const list = (text: string) => (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-body-md text-ink">
      {lines(r(text)).map((line, i) => (
        <li key={i} className="break-words">
          {line}
        </li>
      ))}
    </ul>
  );
  const para = (text: string) => <p className="break-words text-body-md text-ink">{r(text)}</p>;

  const summaries: Record<PanelRole, string> = {
    jury: texts.summary_jury,
    family_counsellor: texts.summary_family_counsellor,
    social_worker: texts.summary_social_worker,
  };

  // Numbered by position after skipping any left out (no panel agreement, or the summary shown
  // elsewhere), so the numbering never has gaps.
  const sections: (Section | false | null)[] = [
    !hideCaseSummary && { key: "caseSummary", title: t("caseSummary"), body: para(report.case_summary) },
    { key: "primaryConflict", title: t("primaryConflict"), body: para(report.primary_conflict) },
    { key: "secondaryIssues", title: t("secondaryIssues"), body: list(report.secondary_issues) },
    { key: "emotionalThemes", title: t("emotionalThemes"), body: list(report.emotional_themes) },
    { key: "keyDiscrepancies", title: t("keyDiscrepancies"), body: list(report.key_discrepancies) },
    { key: "followUpFindings", title: t("followUpFindings"), body: list(report.follow_up_findings) },
    {
      key: "panelPerspectives",
      title: t("panelPerspectives"),
      body: (
        <div className="flex flex-col gap-3">
          {PANEL_ROLES.map((role) => (
            <div key={role} className="flex flex-col gap-0.5">
              <h4 className="text-body-sm font-medium text-espresso">{tRoles(role)}</h4>
              {para(summaries[role])}
            </div>
          ))}
        </div>
      ),
    },
    agreement && {
      key: "panelAgreement",
      title: t("panelAgreement"),
      body: <p className="text-body-md text-ink">{t(`agreement.${agreement}`, names)}</p>,
    },
    {
      key: "charges",
      title: t("charges"),
      body: (
        <ChargeList charges={verdict.charges} names={names} customA={texts.charge_custom_a} customB={texts.charge_custom_b} />
      ),
    },
    {
      key: "finalResponsibility",
      title: t("finalResponsibility"),
      body: (
        <p className="text-body-lg text-espresso">
          {names.a} <strong>{verdict.finalA}%</strong> · {names.b} <strong>{verdict.finalB}%</strong>
        </p>
      ),
    },
    { key: "finalVerdict", title: t("finalVerdict"), body: para(texts.verdict_text) },
    {
      key: "courtSummary",
      title: t("courtSummary"),
      body: (
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body-md text-ink">
          {[texts.primary_issue, texts.underlying_issue, texts.main_escalation_factor, texts.biggest_misunderstanding].map(
            (line, i) => (
              <li key={i} className="break-words">
                {r(line)}
              </li>
            ),
          )}
        </ul>
      ),
    },
    {
      key: "feedback",
      title: t("feedback"),
      body: (
        <div className="flex flex-col gap-3">
          {[
            [names.a, texts.feedback_partner_a, texts.suggestion_partner_a],
            [names.b, texts.feedback_partner_b, texts.suggestion_partner_b],
            ["", texts.joint_feedback, texts.suggestion_together],
          ].map(([who, feedback, suggestion], i) => (
            <div key={i} className="flex flex-col gap-0.5">
              {who && <h4 className="text-body-sm font-medium text-espresso">{who}</h4>}
              {para(feedback)}
              <p className="break-words text-body-sm text-walnut">{r(suggestion)}</p>
            </div>
          ))}
        </div>
      ),
    },
  ];

  return (
    <Card variant="verdict" className="flex flex-col gap-6 md:p-8">
      <div className="flex items-center gap-4">
        <CourtSeal />
        <div className="flex flex-col">
          <h2 className="text-headline-lg text-espresso">{t("title")}</h2>
          <span className="text-label-docket uppercase text-walnut">{t("docket", { id: caseNumber })}</span>
        </div>
      </div>

      {sections
        .filter((x): x is Section => Boolean(x))
        .map((x, i) => (
          <section key={x.key} className="flex flex-col gap-2 break-inside-avoid">
            <h3 className="flex items-baseline gap-2 text-headline-sm text-espresso">
              <span className="text-label-docket text-walnut">{i + 1}.</span>
              {x.title}
            </h3>
            {x.body}
          </section>
        ))}
    </Card>
  );
}
