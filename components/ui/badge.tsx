import type { ComponentProps } from "react";
import { cn } from "@/lib/cn";

// A pixel chip — hard border + solid offset shadow instead of a soft pill. `.chip-pixel` (in
// globals.css) only carries the font/border/shadow; text-transform stays a Tailwind utility
// (`uppercase`, overridable by a caller's `normal-case`) since some callers show mixed-case
// names/custom text that shouldn't be forced upper.
export function Badge({ className, children, ...props }: ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={cn(
        "chip-pixel inline-flex items-center gap-1.5 border-2 border-espresso px-2.5 py-1",
        "text-[9px] uppercase text-espresso",
        "bg-rose",
        className,
      )}
    >
      {children}
    </span>
  );
}
