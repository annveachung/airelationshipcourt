import { Scale } from "lucide-react";
import { cn } from "@/lib/cn";

// The court's seal: espresso disc, rose ring, scales. Used on the verdict, report and closing screens.
export function CourtSeal({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "grid size-16 shrink-0 place-items-center rounded-full bg-espresso text-canvas ring-2 ring-rose ring-offset-2 ring-offset-canvas",
        className,
      )}
    >
      <Scale size={28} strokeWidth={1.75} />
    </div>
  );
}
