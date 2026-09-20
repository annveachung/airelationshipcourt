import { getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { renderNames } from "@/lib/ai/names";
import type { VerdictTexts } from "@/lib/ai/schemas";
import { PANEL_ROLES, type PanelRole } from "@/lib/cases/aggregate";
import type { ChargeId, VerdictCharges } from "@/lib/cases/charges";

type Props = {
  names: { a: string; b: string };
  finalA: number;
  finalB: number;
  moreResponsible: "partner_a" | "partner_b";
  decidedBy: "percentage" | "jury" | "fallback";
  texts: VerdictTexts;
  charges: VerdictCharges;
  panel: Partial<Record<PanelRole, { a: number; b: number }>>;
};

// The plain results screen for Phase 5. Phase 6 replaces this with the designed verdict screen.
export async function VerdictSummary({ names, finalA, finalB, moreResponsible, decidedBy, texts, charges, panel }: Props) {
  const t = await getTranslations("verdict");
  const tRoles = await getTranslations("panelRoles");
  const tCharges = await getTranslations("charges");
  const r = (text: string) => renderNames(text, names);
  const winner = moreResponsible === "partner_a" ? names.a : names.b;

  const summaries: Record<PanelRole, string> = {
    jury: texts.summary_jury,
    family_counsellor: texts.summary_family_counsellor,
    social_worker: texts.summary_social_worker,
  };

  const chargeBlock = (label: string, ids: ChargeId[], custom?: string) => (
    <div className="flex flex-col gap-2">
      <h4 className="text-body-sm font-medium text-espresso">{label}</h4>
      <div className="flex flex-wrap gap-2">
        {ids.map((id) => (
          <Badge key={id} className="normal-case">
            ⚠️ {tCharges(id)}
          </Badge>
        ))}
        {custom && (
          <Badge className="border-espresso/30 bg-surface normal-case">⚠️ {r(custom)}</Badge>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* The answer */}
      <Card variant="verdict" className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Badge className="self-start">{t("heading")}</Badge>
          <h2 className="break-words text-headline-lg text-espresso md:text-display-verdict">
            {t("moreResponsible", { name: winner })}
          </h2>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-4">
            <span className="min-w-0 truncate text-body-md text-espresso">
              {names.a} <strong className="text-headline-md">{finalA}%</strong>
            </span>
            <span className="min-w-0 truncate text-right text-body-md text-espresso">
              <strong className="text-headline-md">{finalB}%</strong> {names.b}
            </span>
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

      {/* The panel */}
      <section className="flex flex-col gap-3" aria-labelledby="panel-heading">
        <h3 id="panel-heading" className="text-label-docket uppercase text-walnut">
          {t("panelHeading")}
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          {PANEL_ROLES.map((role) => (
            <Card key={role} className="flex flex-col gap-2">
              <h4 className="text-headline-sm text-espresso">{tRoles(role)}</h4>
              {panel[role] && (
                <p className="text-body-sm text-walnut">
                  {names.a} {panel[role]!.a}% · {names.b} {panel[role]!.b}%
                </p>
              )}
              <p className="break-words text-body-md text-ink">{r(summaries[role])}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Key findings */}
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

      {/* Feedback and suggestions */}
      <div className="grid gap-3 md:grid-cols-2">
        <Card className="flex flex-col gap-2">
          <h3 className="text-headline-sm text-espresso">{t("feedbackFor", { name: names.a })}</h3>
          <p className="text-body-md text-ink">{r(texts.feedback_partner_a)}</p>
          <p className="border-t border-hairline pt-2 text-body-sm text-walnut">{r(texts.suggestion_partner_a)}</p>
        </Card>
        <Card className="flex flex-col gap-2">
          <h3 className="text-headline-sm text-espresso">{t("feedbackFor", { name: names.b })}</h3>
          <p className="text-body-md text-ink">{r(texts.feedback_partner_b)}</p>
          <p className="border-t border-hairline pt-2 text-body-sm text-walnut">{r(texts.suggestion_partner_b)}</p>
        </Card>
      </div>
      <Card className="flex flex-col gap-2">
        <h3 className="text-headline-sm text-espresso">{t("jointFeedback")}</h3>
        <p className="text-body-md text-ink">{r(texts.joint_feedback)}</p>
        <p className="border-t border-hairline pt-2 text-body-sm text-walnut">
          <strong>{t("together")}:</strong> {r(texts.suggestion_together)}
        </p>
      </Card>

      {/* Charges */}
      <Card className="flex flex-col gap-4">
        <h3 className="text-headline-md text-espresso">{t("charges")}</h3>
        {chargeBlock(names.a, charges.a, texts.charge_custom_a)}
        {chargeBlock(names.b, charges.b, texts.charge_custom_b)}
        {chargeBlock(t("both"), charges.both)}
      </Card>
    </div>
  );
}
