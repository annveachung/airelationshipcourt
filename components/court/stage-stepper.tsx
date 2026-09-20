import { getTranslations } from "next-intl/server";
import { cn } from "@/lib/cn";
import type { CaseStage } from "@/lib/cases/stages";

const STEPS = ["verdict", "advice", "report", "treaty"] as const;
const INDEX: Partial<Record<CaseStage, number>> = { VERDICT: 0, RECOMMENDATIONS: 1, REPORT: 2, CLOSED: 3 };

// "Verdict · Advice · Report · Treaty" — where you are in the walk-through after the verdict.
export async function StageStepper({ stage }: { stage: CaseStage }) {
  const t = await getTranslations("stepper");
  const current = INDEX[stage] ?? 0;
  return (
    <ol className="flex items-center gap-2 print:hidden" aria-label={t("label")}>
      {STEPS.map((step, i) => (
        <li key={step} className="flex items-center gap-2" aria-current={i === current ? "step" : undefined}>
          <span
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3 py-1 text-label-docket uppercase",
              i === current ? "bg-espresso text-canvas" : i < current ? "bg-rose/40 text-espresso" : "bg-recessed text-walnut",
            )}
          >
            {t(step)}
          </span>
          {i < STEPS.length - 1 && <span aria-hidden className="h-px w-3 bg-hairline-strong" />}
        </li>
      ))}
    </ol>
  );
}
