import { cn } from "@/lib/cn";

type Props = { value: number; label?: string; className?: string };

export function ProgressBar({ value, label, className }: Props) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-2 w-full overflow-hidden rounded-full bg-recessed", className)}
    >
      <div
        className="h-full rounded-full bg-gradient-to-r from-rose to-espresso"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
