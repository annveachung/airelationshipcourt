import { getTranslations } from "next-intl/server";
import { CourtSeal } from "@/components/court/court-seal";
import { ChargeList } from "@/components/court/charge-list";
import { TestimoniesView, type TestimonyView } from "@/components/court/testimonies-view";
import { Card } from "@/components/ui/card";
import { renderNames } from "@/lib/ai/names";
import type { ReportTexts, VerdictTexts } from "@/lib/ai/schemas";
import { PANEL_ROLES, type PanelRole } from "@/lib/cases/aggregate";
import type { VerdictCharges } from "@/lib/cases/charges";
import type { PanelAgreement } from "@/lib/cases/panel-agreement";

type Props = {
  caseNumber: string;
  names: { a: string; b: string };
  verdict: { finalA: number; finalB: number; charges: VerdictCharges };
  texts: VerdictTexts;
  report: ReportTexts;
  agreement: PanelAgreement | null;
  testimonies: TestimonyView[];
};

// The full written record: the 13 sections from the spec, then the raw answers and testimonies.
export async function ReportDocument({
  caseNumber,
  names,
  verdict,
  texts,
  report,
  agreement,
  testimonies,
}: Props) {
  const t = await getTranslations("report");
  const tRoles = await getTranslations("panelRoles");
  const r = (text: string) => renderNames(text, names);

  const lines = (text: string) =>
    text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

  const section = (n: number, title: string, body: React.ReactNode) => (
    <section className="flex flex-col gap-2 break-inside-avoid">
      <h3 className="flex items-baseline gap-2 text-headline-sm text-espresso">
        <span className="text-label-docket text-walnut">{n}.</span>
        {title}
      </h3>
      {body}
    </section>
  );
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

  return (
    <Card variant="verdict" className="flex flex-col gap-6 md:p-8">
      <div className="flex items-center gap-4">
        <CourtSeal />
        <div className="flex flex-col">
          <h2 className="text-headline-lg text-espresso">{t("title")}</h2>
          <span className="text-label-docket uppercase text-walnut">{t("docket", { id: caseNumber })}</span>
        </div>
      </div>

      {section(1, t("caseSummary"), para(report.case_summary))}
      {section(2, t("primaryConflict"), para(report.primary_conflict))}
      {section(3, t("secondaryIssues"), list(report.secondary_issues))}
      {section(4, t("emotionalThemes"), list(report.emotional_themes))}
      {section(5, t("keyDiscrepancies"), list(report.key_discrepancies))}
      {section(6, t("followUpFindings"), list(report.follow_up_findings))}
      {section(
        7,
        t("panelPerspectives"),
        <div className="flex flex-col gap-3">
          {PANEL_ROLES.map((role) => (
            <div key={role} className="flex flex-col gap-0.5">
              <h4 className="text-body-sm font-medium text-espresso">{tRoles(role)}</h4>
              {para(summaries[role])}
            </div>
          ))}
        </div>,
      )}
      {agreement &&
        section(8, t("panelAgreement"), <p className="text-body-md text-ink">{t(`agreement.${agreement}`, names)}</p>)}
      {section(
        9,
        t("charges"),
        <ChargeList charges={verdict.charges} names={names} customA={texts.charge_custom_a} customB={texts.charge_custom_b} />,
      )}
      {section(
        10,
        t("finalResponsibility"),
        <p className="text-body-lg text-espresso">
          {names.a} <strong>{verdict.finalA}%</strong> · {names.b} <strong>{verdict.finalB}%</strong>
        </p>,
      )}
      {section(11, t("finalVerdict"), para(texts.verdict_text))}
      {section(
        12,
        t("courtSummary"),
        <ul className="flex list-disc flex-col gap-1 pl-5 text-body-md text-ink">
          {[texts.primary_issue, texts.underlying_issue, texts.main_escalation_factor, texts.biggest_misunderstanding].map(
            (line, i) => (
              <li key={i} className="break-words">
                {r(line)}
              </li>
            ),
          )}
        </ul>,
      )}
      {section(
        13,
        t("feedback"),
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
        </div>,
      )}

      {testimonies.length > 0 && <TestimoniesView testimonies={testimonies} />}
    </Card>
  );
}
