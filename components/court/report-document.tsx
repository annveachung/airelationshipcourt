import { getTranslations } from "next-intl/server";
import { ChevronDown, Lightbulb } from "lucide-react";
import { CourtSeal } from "@/components/court/court-seal";
import { ChargeList } from "@/components/court/charge-list";
import { Card } from "@/components/ui/card";
import { renderNames } from "@/lib/ai/names";
import type { ReportTexts, VerdictTexts } from "@/lib/ai/schemas";
import { PANEL_ROLES, type PanelRole } from "@/lib/cases/aggregate";
import type { VerdictCharges } from "@/lib/cases/charges";
import type { PanelAgreement } from "@/lib/cases/panel-agreement";
import { PARTNER_COLOR } from "@/lib/charts/palette";

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

const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

function Heading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-headline-sm text-espresso">{children}</h3>;
}

// The written record, laid out for a couple rather than a researcher: the short version first
// (what it was about, the verdict), then feelings and differences as short lists, then advice.
// The panel's longer notes are folded away. Testimonies are deliberately left out — each partner
// only ever sees their own.
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

  const glance: [string, string][] = [
    [t("mainIssue"), texts.primary_issue],
    [t("underneath"), texts.underlying_issue],
    [t("madeItWorse"), texts.main_escalation_factor],
    [t("misunderstanding"), texts.biggest_misunderstanding],
  ];

  const summaries: Record<PanelRole, string> = {
    jury: texts.summary_jury,
    family_counsellor: texts.summary_family_counsellor,
    social_worker: texts.summary_social_worker,
  };

  const advice: [string, string, string][] = [
    [names.a, texts.feedback_partner_a, texts.suggestion_partner_a],
    [names.b, texts.feedback_partner_b, texts.suggestion_partner_b],
    [t("together"), texts.joint_feedback, texts.suggestion_together],
  ];

  const panelNotes = (
    <div className="flex flex-col gap-3">
      {PANEL_ROLES.map((role) => (
        <div key={role} className="flex flex-col gap-0.5">
          <h4 className="text-body-sm font-semibold text-espresso">{tRoles(role)}</h4>
          <p className="break-words text-body-md text-ink">{r(summaries[role])}</p>
        </div>
      ))}
    </div>
  );

  return (
    <Card variant="verdict" className="flex flex-col gap-8 md:p-8">
      <div className="flex items-center gap-4">
        <CourtSeal />
        <div className="flex flex-col">
          <h2 className="text-headline-lg text-espresso">{t("title")}</h2>
          <span className="text-label-docket uppercase text-walnut">{t("docket", { id: caseNumber })}</span>
        </div>
      </div>

      {!hideCaseSummary && <p className="break-words text-body-lg text-espresso">{r(report.case_summary)}</p>}

      {/* At a glance: four short facts, then the side issues as chips. */}
      <section className="flex flex-col gap-3 break-inside-avoid">
        <Heading>{t("atAGlance")}</Heading>
        <dl className="grid gap-3 sm:grid-cols-2">
          {glance.map(([label, value]) => (
            <div key={label} className="flex flex-col gap-1 rounded-card bg-canvas p-4">
              <dt className="text-label-docket uppercase text-walnut">{label}</dt>
              <dd className="break-words text-body-md text-ink">{r(value)}</dd>
            </div>
          ))}
        </dl>
        {lines(report.secondary_issues).length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-body-sm text-walnut">{t("alsoCameUp")}</span>
            {lines(r(report.secondary_issues)).map((issue, i) => (
              <span key={i} className="rounded-full bg-rose/40 px-3 py-1 text-body-sm text-espresso">
                {issue}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* The verdict: the split as a bar, the court's words, then the charges. */}
      <section className="flex flex-col gap-3 break-inside-avoid">
        <Heading>{t("theVerdict")}</Heading>
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between gap-4">
            <span className="flex min-w-0 flex-col">
              <span className="text-[24px] font-semibold leading-8 tabular-nums text-espresso">{verdict.finalA}%</span>
              <span className="truncate text-body-sm text-walnut">{names.a}</span>
            </span>
            <span className="flex min-w-0 flex-col items-end">
              <span className="text-[24px] font-semibold leading-8 tabular-nums text-espresso">{verdict.finalB}%</span>
              <span className="truncate text-body-sm text-walnut">{names.b}</span>
            </span>
          </div>
          <div
            className="flex h-4 w-full gap-[2px]"
            role="img"
            aria-label={`${names.a} ${verdict.finalA}%, ${names.b} ${verdict.finalB}%`}
          >
            <div
              className="h-full rounded-l-[4px] shadow-[inset_0_0_0_1px_var(--color-hairline-strong)]"
              style={{ width: `${verdict.finalA}%`, background: PARTNER_COLOR.a }}
            />
            <div className="h-full rounded-r-[4px]" style={{ width: `${verdict.finalB}%`, background: PARTNER_COLOR.b }} />
          </div>
          {agreement && <p className="text-body-sm text-walnut">{t(`agreement.${agreement}`, names)}</p>}
        </div>
        <p className="break-words text-body-md text-ink">{r(texts.verdict_text)}</p>
        <div className="flex flex-col gap-2 pt-1">
          <h4 className="text-label-docket uppercase text-walnut">{t("charges")}</h4>
          <ChargeList charges={verdict.charges} names={names} customA={texts.charge_custom_a} customB={texts.charge_custom_b} />
        </div>
      </section>

      {/* Feelings and the places the two stories split, as short lists side by side on wide screens. */}
      <div className="grid gap-8 md:grid-cols-2">
        <section className="flex flex-col gap-3 break-inside-avoid">
          <Heading>{t("howYouFelt")}</Heading>
          <ul className="flex flex-col gap-2">
            {lines(r(report.emotional_themes)).map((line, i) => {
              const [who, ...rest] = line.split(/:\s*/);
              const feeling = rest.join(": ");
              return (
                <li key={i} className="break-words text-body-md text-ink">
                  {feeling ? (
                    <>
                      <span className="font-semibold text-espresso">{who}</span> · {feeling}
                    </>
                  ) : (
                    line
                  )}
                </li>
              );
            })}
          </ul>
        </section>
        <section className="flex flex-col gap-3 break-inside-avoid">
          <Heading>{t("storiesDiffered")}</Heading>
          <ul className="flex flex-col gap-2">
            {lines(r(report.key_discrepancies)).map((line, i) => (
              <li key={i} className="flex gap-2 break-words text-body-md text-ink">
                <span aria-hidden className="text-walnut">
                  ⇄
                </span>
                <span className="min-w-0">{line}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {/* Advice: what each of you (and both of you) could do next, with one concrete step each. */}
      <section className="flex flex-col gap-3">
        <Heading>{t("advice")}</Heading>
        <div className="grid gap-3 md:grid-cols-3">
          {advice.map(([who, feedback, suggestion]) => (
            <div key={who} className="flex break-inside-avoid flex-col gap-2 rounded-card border border-hairline-strong p-4">
              <h4 className="text-body-md font-semibold text-espresso">{who}</h4>
              <p className="break-words text-body-sm text-ink">{r(feedback)}</p>
              <p className="mt-auto flex gap-2 rounded bg-rose/30 p-2.5 text-body-sm text-espresso">
                <Lightbulb size={16} aria-hidden className="mt-0.5 shrink-0" />
                <span className="min-w-0 break-words">
                  <span className="font-semibold">{t("tryThis")}: </span>
                  {r(suggestion)}
                </span>
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* The panel's longer notes: folded away on screen, always included when printed. */}
      <section className="flex flex-col gap-3">
        <details className="group print:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 [&::-webkit-details-marker]:hidden">
            <Heading>{t("panelSaid")}</Heading>
            <span className="flex shrink-0 items-center gap-1 text-body-sm text-walnut">
              {t("readMore")}
              <ChevronDown size={16} aria-hidden className="transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="pt-3">{panelNotes}</div>
        </details>
        <div className="hidden flex-col gap-3 print:flex">
          <Heading>{t("panelSaid")}</Heading>
          {panelNotes}
        </div>
      </section>
    </Card>
  );
}
