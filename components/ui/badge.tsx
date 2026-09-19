import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

export function Badge({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border-[0.5px] border-hairline-strong",
        "bg-rose/35 px-3 py-1 text-label-docket uppercase text-espresso",
        className,
      )}
    />
  );
}
