import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { cn } from "@/lib/cn";
import type { CaseStage } from "@/lib/cases/stages";
import { stageView, VERDICT_VIEWS, type VerdictView } from "@/lib/cases/verdict-view";

const STEPS = ["verdict", "advice", "report", "treaty"] as const;
type Step = (typeof STEPS)[number];

// The treaty is signed on the report screen, so its step opens the report at the treaty.
const viewOf = (step: Step): VerdictView => (step === "treaty" ? "report" : step);

// "Verdict · Advice · Report · Treaty": where the case is, and links back to any screen already
// reached. Steps not reached yet aren't links.
export async function StageStepper({ caseId, stage, view }: { caseId: string; stage: CaseStage; view: VerdictView }) {
  const t = await getTranslations("stepper");
  const reached = VERDICT_VIEWS.indexOf(stageView(stage));

  return (
    <ol className="flex flex-wrap items-center gap-2 print:hidden" aria-label={t("label")}>
      {STEPS.map((step, i) => {
        const stepView = viewOf(step);
        const available = VERDICT_VIEWS.indexOf(stepView) <= reached;
        const showing = step !== "treaty" && stepView === view;
        const pill = cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1 text-label-docket uppercase",
          showing ? "bg-espresso text-canvas" : available ? "bg-rose/40 text-espresso" : "bg-recessed text-walnut",
        );
        return (
          <li key={step} className="flex items-center gap-2">
            {available ? (
              <Link
                href={`/cases/${caseId}?view=${stepView}${step === "treaty" ? "#treaty" : ""}`}
                aria-current={showing ? "page" : undefined}
                className={cn(
                  pill,
                  !showing && "hover:bg-rose/70",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso",
                )}
              >
                {t(step)}
              </Link>
            ) : (
              <span className={pill}>{t(step)}</span>
            )}
            {i < STEPS.length - 1 && <span aria-hidden className="h-px w-3 bg-hairline-strong" />}
          </li>
        );
      })}
    </ol>
  );
}
