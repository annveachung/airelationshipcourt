import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export const fieldClasses =
  "w-full rounded-field border border-hairline-strong bg-surface px-3.5 py-3 text-body-md text-espresso " +
  "placeholder:text-walnut/70 focus:border-espresso focus:outline-none";

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
