import { cn } from "@/lib/cn";

// Flecks of missing ink, as [x, y, size] in a 100×40 box. Fixed (not random) so the stamp looks
// the same on every render and on the server and client alike.
const SPECKS: [number, number, number][] = [
  [4, 6, 2], [11, 31, 1.5], [17, 3, 1], [23, 19, 2], [29, 35, 1], [34, 8, 1.5], [41, 27, 1],
  [46, 14, 2.5], [52, 36, 1.5], [57, 4, 1], [63, 22, 1.5], [68, 31, 2], [73, 9, 1], [79, 17, 1.5],
  [84, 33, 1], [89, 5, 2], [94, 25, 1.5], [8, 22, 1], [38, 38, 1], [60, 12, 1], [86, 13, 1],
  [26, 10, 1], [49, 5, 1], [71, 26, 1], [15, 13, 1], [97, 36, 1],
];

// A rubber "CASE CLOSED" stamp inked onto the page: tilted, double-bordered, in stamp red, with a
// few gaps in the ink. Multiplied onto whatever is under it, so it can overlap words and they stay
// readable. Purely decorative — callers keep the words "case closed" in the page as real text.
// Callers position it (absolute or relative) via className; the ink flecks are laid over it.
export function CaseStamp({ label, date, className }: { label: string; date: string | null; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none flex -rotate-[9deg] flex-col items-center gap-0.5 rounded-md border-[3px] border-double border-stamp px-2 py-1 text-stamp opacity-85 mix-blend-multiply sm:gap-1 sm:px-3 sm:py-1.5",
        "animate-stamp-in",
        className,
      )}
    >
      <span className="whitespace-nowrap font-[family-name:var(--font-display)] text-[10px] font-bold sm:text-[14px] uppercase leading-none tracking-[0.12em]">
        {label}
      </span>
      {date && (
        <span className="whitespace-nowrap border-t border-stamp/60 pt-1 font-[family-name:var(--font-label)] text-[8px] font-bold sm:text-[9px] uppercase leading-none tracking-[0.18em]">
          {date}
        </span>
      )}
      <svg className="absolute inset-0 size-full" viewBox="0 0 100 40" preserveAspectRatio="none">
        {SPECKS.map(([x, y, s]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={s} height={s * 1.2} className="fill-surface" />
        ))}
      </svg>
    </span>
  );
}
