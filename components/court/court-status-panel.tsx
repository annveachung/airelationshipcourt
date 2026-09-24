"use client";

import { Check, Circle, CircleDot, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCaseLive } from "@/components/court/case-live";
import { useNotifications } from "@/components/notifications-provider";
import { Card } from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress-bar";
import {
  buildChecklist,
  INTENSITY_LEVEL,
  trialProgress,
  type ChecklistItem,
  type PanelState,
} from "@/lib/cases/court-status";
import { cn } from "@/lib/cn";
import { optionLabel } from "@/lib/i18n-labels";
import { notificationHref } from "@/lib/notification-types";

type Names = { a: string; b: string };

const label = "text-label-docket uppercase text-walnut";

function StatusBody({ caseId, names, context }: { caseId: string; names: Names; context: string | null }) {
  const t = useTranslations("courtStatus");
  const tAll = useTranslations();
  const tStages = useTranslations("stages");
  const tRoles = useTranslations("panelRoles");
  const tNotes = useTranslations("notifications");
  const { status } = useCaseLive();
  const notifications = useNotifications();

  const progress = Math.round(trialProgress(status));
  const checklist = buildChecklist(status);
  const style = notifications?.playful === false ? "plain" : "playful";
  const news = (notifications?.items ?? []).filter((n) => n.caseId === caseId).slice(0, 3);

  const icon = (state: ChecklistItem["state"]) =>
    state === "done" ? (
      <Check size={16} className="text-espresso" aria-hidden />
    ) : state === "current" ? (
      <CircleDot size={16} className="text-rose-deep" aria-hidden />
    ) : (
      <Circle size={16} className="text-outline-soft" aria-hidden />
    );

  const itemText = (item: ChecklistItem) =>
    item.key === "testified" ? t("testified", { name: names[item.who] }) : t(item.key);

  const panel: { role: "jury" | "family_counsellor" | "social_worker"; state: PanelState }[] = [
    { role: "jury", state: status.juryState },
    { role: "family_counsellor", state: status.counsellorState },
    { role: "social_worker", state: status.socialWorkerState },
  ];
  const panelIcon = { jury: "⚖️", family_counsellor: "👨‍👩‍👧", social_worker: "🧑‍⚖️" } as const;

  return (
    <div className="flex flex-col gap-5">
      {context && <p className="break-words text-body-md text-ink">{context}</p>}

      <div className="flex flex-col gap-2">
        <span className={label}>{t("progress")}</span>
        <ProgressBar value={progress} label={`${t("progress")} ${progress}%`} />
        <p className="text-body-sm text-walnut">
          {progress}% · <span className="text-espresso">{tStages(status.stage)}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>{t("checklist")}</span>
        <ul className="flex flex-col gap-1.5">
          {checklist.map((item, i) => (
            <li
              key={i}
              aria-current={item.state === "current" ? "step" : undefined}
              className={cn(
                "flex items-center gap-2 text-body-sm",
                item.state === "todo" ? "text-walnut" : "text-ink",
                item.state === "current" && "font-medium",
              )}
            >
              {icon(item.state)}
              <span className="break-words">{itemText(item)}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 border-t border-hairline pt-4">
        <span className={label}>{t("profile")}</span>
        {status.primaryIssue ? (
          <dl className="flex flex-col gap-1.5 text-body-sm">
            {[
              [t("primary"), optionLabel(tAll, "issues", status.primaryIssue)],
              [t("secondary"), status.secondaryIssue ? optionLabel(tAll, "issues", status.secondaryIssue) : null],
              [t("conflictType"), status.conflictType ? optionLabel(tAll, "conflictTypes", status.conflictType) : null],
            ].map(([term, value]) =>
              value ? (
                <div key={term} className="flex justify-between gap-3">
                  <dt className="text-walnut">{term}</dt>
                  <dd className="break-words text-right text-ink">{value}</dd>
                </div>
              ) : null,
            )}
          </dl>
        ) : (
          <p className="text-body-sm text-walnut">{t("profileLocked")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className={label}>{t("intensity")}</span>
        {status.intensityBand ? (
          <>
            <div
              role="img"
              aria-label={`${t("intensity")}: ${t(`bands.${status.intensityBand}`)}`}
              className="flex gap-1"
            >
              {[1, 2, 3, 4].map((n) => (
                <span
                  key={n}
                  className={cn(
                    "h-2 flex-1 rounded-full",
                    n <= INTENSITY_LEVEL[status.intensityBand!] ? "bg-espresso" : "bg-recessed",
                  )}
                />
              ))}
            </div>
            <p className="text-body-sm text-ink">{t(`bands.${status.intensityBand}`)}</p>
          </>
        ) : (
          <p className="text-body-sm text-walnut">{t("intensityLocked")}</p>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-hairline pt-4">
        <span className={label}>{t("panelHeading")}</span>
        <ul className="flex flex-col gap-1.5">
          {panel.map(({ role, state }) => (
            <li key={role} className="flex items-center justify-between gap-3 text-body-sm">
              <span className="text-ink">
                <span aria-hidden>{panelIcon[role]}</span> {tRoles(role)}
              </span>
              <span
                className={cn(
                  "flex items-center gap-1",
                  state === "ready" ? "text-espresso" : state === "working" ? "text-rose-deep" : "text-walnut",
                )}
              >
                {state === "working" && <LoaderCircle size={14} className="animate-spin" aria-hidden />}
                {state === "ready" && <Check size={14} aria-hidden />}
                {t(`panelStates.${state}`)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {notifications && (
        <div className="flex flex-col gap-2 border-t border-hairline pt-4">
          <span className={label}>{t("news")}</span>
          {news.length === 0 ? (
            <p className="text-body-sm text-walnut">{t("noNews")}</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {news.map((n) => (
                <li key={n.id}>
                  <a href={notificationHref(n.caseId)} className="break-words text-body-sm text-ink hover:underline">
                    {tNotes(`${style}.${n.type}`, { name: n.params.name ?? tNotes("partnerFallback") })}
                  </a>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** The full panel: used as the desktop sidebar before the verdict. */
export function CourtStatusFull(props: { caseId: string; names: Names; context: string | null }) {
  const t = useTranslations("courtStatus");
  return (
    <Card className="flex flex-col gap-4">
      <h2 className="text-headline-sm text-espresso">{t("title")}</h2>
      <StatusBody {...props} />
    </Card>
  );
}

/** A collapsible summary strip (progress + stage): the phone layout, and the compact form after the verdict. */
export function CourtStatusStrip(props: { caseId: string; names: Names; context: string | null }) {
  const t = useTranslations("courtStatus");
  const tStages = useTranslations("stages");
  const { status } = useCaseLive();
  const progress = Math.round(trialProgress(status));

  return (
    <details className="group rounded-card border border-hairline bg-surface shadow-card print:hidden">
      <summary
        aria-label={t("show")}
        className="flex cursor-pointer list-none flex-col gap-2 px-4 py-3 focus-visible:outline-2 focus-visible:outline-espresso"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="text-label-docket uppercase text-walnut">{t("title")}</span>
          <span className="text-body-sm text-espresso">
            {progress}% · {tStages(status.stage)}
          </span>
        </span>
        <ProgressBar value={progress} label={`${t("progress")} ${progress}%`} />
      </summary>
      <div className="border-t border-hairline p-4">
        <StatusBody {...props} />
      </div>
    </details>
  );
}
