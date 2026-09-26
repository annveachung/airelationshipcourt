import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

type Props = ComponentProps<"div"> & { variant?: "default" | "verdict" };

export function Card({ variant = "default", className, children, ...props }: Props) {
  return (
    <div
      {...props}
      className={cn(
        "relative rounded-card border-2 border-espresso bg-surface p-4 shadow-card",
        variant === "verdict" && "p-6",
        className,
      )}
    >
      {variant === "verdict" && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-[3px] rounded-[calc(var(--radius-card)-3px)] border border-espresso"
        />
      )}
      {children}
    </div>
  );
}
