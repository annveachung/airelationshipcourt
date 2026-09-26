import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

// Text itself stays on Inter/text-body-md — paragraphs of testimony need to read cleanly, not
// look pixelated. Only the chrome (hard border + offset shadow on focus) picks up the same
// Y2K pixel-arcade treatment as Button/Card/Badge, so the field doesn't look like a leftover
// from the old soft design next to them.
export const fieldClasses =
  "w-full rounded-field border-2 border-espresso bg-surface px-3.5 py-3 text-body-md text-espresso " +
  "placeholder:text-walnut/70 transition-shadow focus:shadow-[3px_3px_0_0_var(--color-espresso)] focus:outline-none";

type Props = ComponentProps<"input"> & { label: string };

export function Input({ label, className, id, ...props }: Props) {
  const fieldId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-label-docket uppercase text-walnut">
        {label}
      </label>
      <input {...props} id={fieldId} className={cn(fieldClasses, className)} />
    </div>
  );
}
