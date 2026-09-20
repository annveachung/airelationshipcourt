"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useFormStatus } from "react-dom";
import { submitTestimony } from "@/app/cases/actions";
import { Button } from "@/components/ui/button";
import { fieldClasses } from "@/components/ui/input";
import { cn } from "@/lib/cn";
import { CAUSES, EMOTIONS, FREQUENCIES, LIMITS, NEEDS } from "@/lib/cases/testimony";
import { optionLabel } from "@/lib/i18n-labels";

const label = "text-label-docket uppercase text-walnut";

const chipClasses = cn(
  "inline-flex min-h-11 items-center rounded-full border border-hairline-strong bg-surface px-4 text-body-sm text-espresso",
  "peer-checked:border-espresso peer-checked:bg-espresso peer-checked:text-canvas",
  "peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-espresso",
);

// A group of tappable chips. `multiple` = pick several (checkboxes); otherwise pick one (radios).
function ChipGroup({
  name,
  legend,
  hint,
  options,
  group,
  multiple = true,
  onCount,
  children,
}: {
  name: string;
  legend: string;
  hint?: string;
  options: readonly string[];
  group: "emotions" | "causes" | "needs" | "frequency";
  multiple?: boolean;
  onCount?: (n: number) => void;
  children?: React.ReactNode;
}) {
  const t = useTranslations();
  const [selected, setSelected] = useState<string[]>([]);

  function toggle(value: string, checked: boolean) {
    const next = multiple
      ? checked
        ? [...selected, value]
        : selected.filter((v) => v !== value)
      : [value];
    setSelected(next);
    onCount?.(next.length);
  }

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1">
        <span className={label}>{legend}</span>
        {hint && <span className="ml-2 text-body-sm normal-case text-walnut">{hint}</span>}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((value) => {
          const text = optionLabel(t, group, value);
          return (
            <label key={value} className="cursor-pointer">
              <input
                type={multiple ? "checkbox" : "radio"}
                name={name}
                value={value}
                required={!multiple}
                checked={selected.includes(value)}
                onChange={(e) => toggle(value, e.target.checked)}
                className="peer sr-only"
              />
              <span className={chipClasses}>{text}</span>
            </label>
          );
        })}
      </div>
      {children}
    </fieldset>
  );
}

function Note({ name, prompt }: { name: string; prompt: string }) {
  const [length, setLength] = useState(0);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-body-sm text-walnut">
        {prompt}
      </label>
      <input
        id={name}
        name={name}
        maxLength={LIMITS.note}
        onChange={(e) => setLength(e.target.value.length)}
        className={fieldClasses}
      />
      <span className="self-end text-body-sm text-walnut">
        {length}/{LIMITS.note}
      </span>
    </div>
  );
}

function CountedTextarea({
  name,
  legend,
  max,
  rows = 5,
}: {
  name: string;
  legend: string;
  max: number;
  rows?: number;
}) {
  const [length, setLength] = useState(0);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className={label}>
        {legend}
      </label>
      <textarea
        id={name}
        name={name}
        rows={rows}
        maxLength={max}
        required
        onChange={(e) => setLength(e.target.value.length)}
        className={cn(fieldClasses, "min-h-28 resize-y")}
      />
      <span className="self-end text-body-sm text-walnut">
        {length}/{max}
      </span>
    </div>
  );
}

function Submit({ ready }: { ready: boolean }) {
  const t = useTranslations("testimony");
  const { pending } = useFormStatus();
  return (
    <div className="flex flex-col gap-2">
      <Button type="submit" disabled={pending || !ready} className="w-full md:w-auto md:min-w-56">
        {pending ? t("submitting") : t("submit")}
      </Button>
      {!ready && (
        <p className="text-body-sm text-walnut">{t("pickHint")}</p>
      )}
    </div>
  );
}

export function TestimonyForm({ caseId }: { caseId: string }) {
  const t = useTranslations("testimony");
  const [severity, setSeverity] = useState(5);
  const [counts, setCounts] = useState({ emotions: 0, causes: 0, needs: 0 });
  const ready = counts.emotions > 0 && counts.causes > 0 && counts.needs > 0;
  const count = (key: keyof typeof counts) => (n: number) =>
    setCounts((c) => ({ ...c, [key]: n }));

  return (
    <form action={submitTestimony} className="flex flex-col gap-8">
      <input type="hidden" name="caseId" value={caseId} />

      {/* 1. The story first: everything below is a detail about it. */}
      <CountedTextarea name="whatHappened" legend={t("whatHappened")} max={LIMITS.story} />

      {/* 2. Quick context about the story. */}
      <ChipGroup
        name="frequency"
        legend={t("frequencyLegend")}
        multiple={false}
        options={FREQUENCIES.map((f) => f.value)}
        group="frequency"
      />

      {/* 3. Still about the event. */}
      <ChipGroup
        name="causes"
        legend={t("causesLegend")}
        hint={t("pickAll")}
        options={CAUSES}
        group="causes"
        onCount={count("causes")}
      >
        <Note name="causeNote" prompt={t("noteOptional")} />
      </ChipGroup>

      {/* 4. Then the reaction... */}
      <ChipGroup
        name="emotions"
        legend={t("emotionsLegend")}
        hint={t("pickAll")}
        options={EMOTIONS}
        group="emotions"
        onCount={count("emotions")}
      />

      {/* 5. ...summed up as a rating. */}
      <div className="flex flex-col gap-3">
        <label htmlFor="severity" className={label}>
          {t("severityLegend")}{" "}
          <span className="normal-case text-body-sm">{t("severityScale")}</span>
        </label>
        <div className="flex items-center gap-4">
          <input
            id="severity"
            name="severity"
            type="range"
            min={1}
            max={10}
            value={severity}
            onChange={(e) => setSeverity(Number(e.target.value))}
            className="h-11 w-full accent-espresso md:max-w-md"
          />
          <span className="w-8 text-right text-headline-md text-espresso">{severity}</span>
        </div>
      </div>

      {/* 6. The specific complaint. */}
      <CountedTextarea
        name="partnerDidWrong"
        legend={t("partnerWrong")}
        max={LIMITS.wrong}
        rows={4}
      />

      {/* 7. End on something constructive. */}
      <ChipGroup
        name="needs"
        legend={t("needsLegend")}
        hint={t("pickAll")}
        options={NEEDS}
        group="needs"
        onCount={count("needs")}
      >
        <Note name="needsNote" prompt={t("noteOptional")} />
      </ChipGroup>

      <p className="text-body-sm text-walnut">{t("finalNote")}</p>
      <Submit ready={ready} />
    </form>
  );
}
