import { cn } from "@/lib/cn";

type Props = { value: number; label?: string; className?: string };

// A retro striped "download bar" fill instead of a soft gradient — square corners, a hard
// border, and a diagonal candy-stripe pattern classic to Windows/AOL-era progress bars.
export function ProgressBar({ value, label, className }: Props) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn("h-3 w-full overflow-hidden rounded-none border-2 border-espresso bg-recessed", className)}
    >
      <div
        className="h-full"
        style={{
          width: `${pct}%`,
          backgroundImage:
            "repeating-linear-gradient(45deg, var(--color-rose) 0, var(--color-rose) 5px, var(--color-espresso) 5px, var(--color-espresso) 10px)",
        }}
      />
    </div>
  );
}
