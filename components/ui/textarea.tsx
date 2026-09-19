import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { fieldClasses } from "./input";

type Props = ComponentProps<"textarea"> & { label: string };

export function Textarea({ label, className, id, rows = 4, ...props }: Props) {
  const fieldId = id ?? props.name;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-label-docket uppercase text-walnut">
        {label}
      </label>
      <textarea
        {...props}
        id={fieldId}
        rows={rows}
        className={cn(fieldClasses, "resize-y", className)}
      />
    </div>
  );
}
