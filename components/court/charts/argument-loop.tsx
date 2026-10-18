"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { frequencyOf, type FrequencyLevel } from "@/lib/analytics/frequency";
import type { PatternCount } from "@/lib/analytics/stats";
import { LOOP_COLORS } from "@/lib/charts/palette";

const MAX_STOPS = 5;
const DOT_OPACITY = 0.8; // softer at rest; the lit stop goes to full strength

const FREQUENCY_KEY: Record<FrequencyLevel, "freqOften" | "freqSometimes" | "freqRarely"> = {
  often: "freqOften",
  sometimes: "freqSometimes",
  rarely: "freqRarely",
};
const FREQUENCY_LEGEND_KEY: Record<FrequencyLevel, "freqOftenLegend" | "freqSometimesLegend" | "freqRarelyLegend"> = {
  often: "freqOftenLegend",
  sometimes: "freqSometimesLegend",
  rarely: "freqRarelyLegend",
};
const STEP_MS = 1800; // time for the light to travel from one stop to the next

// The ring, in SVG units.
const SIZE = 220;
const C = SIZE / 2;
const R = 78;
const NODE_R = 15;

// The meter for "how often": three bars, filled up to the level (rarely 1, sometimes 2, often 3).
const LEVEL_BARS: Record<FrequencyLevel, number> = { rarely: 1, sometimes: 2, often: 3 };

function Meter({ level }: { level: FrequencyLevel }) {
  return (
    <span aria-hidden className="flex items-end gap-[2px]">
      {[1, 2, 3].map((bar) => (
        <span
          key={bar}
          className={cn("w-1 rounded-[1px]", bar <= LEVEL_BARS[level] ? "bg-espresso" : "bg-recessed")}
          style={{ height: 4 + bar * 3 }}
        />
      ))}
    </span>
  );
}

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const point = (angle: number, radius = R) => ({ x: C + radius * Math.cos(angle), y: C + radius * Math.sin(angle) });
// Stop i sits at 12 o'clock, then clockwise.
const angleOf = (i: number, n: number) => -Math.PI / 2 + (i / n) * Math.PI * 2;
const r2 = (n: number) => Math.round(n * 100) / 100;

// The arc between two stops, leaving a gap around each stop for the arrowhead.
function arcPath(i: number, n: number): string {
  const gap = (NODE_R + 6) / R;
  const from = angleOf(i, n) + gap;
  const to = angleOf(i, n) + (Math.PI * 2) / n - gap;
  const a = point(from);
  const b = point(to);
  const large = to - from > Math.PI ? 1 : 0;
  return `M ${r2(a.x)} ${r2(a.y)} A ${R} ${R} 0 ${large} 1 ${r2(b.x)} ${r2(b.y)}`;
}

const subscribeMotion = (onChange: () => void) => {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};
const useReducedMotion = () =>
  useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => true, // server: render still; the browser starts the loop
  );

/**
 * The couple's most common conflict patterns on a loop (in no particular order), each with how
 * often it comes up. A light travels the ring and lights up each stop and its row in turn. Still
 * for people who prefer less motion.
 */
export function ArgumentLoop({ patterns, totalCases }: { patterns: PatternCount[]; totalCases: number }) {
  const t = useTranslations("insights");
  const stops = patterns.slice(0, MAX_STOPS);
  const n = stops.length;
  const reducedMotion = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  const dot = useRef<SVGGElement>(null);

  useEffect(() => {
    if (reducedMotion || n === 0) return;
    let frame = 0;
    let shown = -1;
    const start = performance.now();
    const tick = (now: number) => {
      const progress = ((now - start) / (STEP_MS * n)) % 1; // 0..1 around the ring
      const p = point(-Math.PI / 2 + progress * Math.PI * 2);
      dot.current?.setAttribute("transform", `translate(${p.x} ${p.y})`);
      // A stop stays lit from the moment the light reaches it until it reaches the next one.
      const lit = Math.min(n - 1, Math.floor(progress * n));
      if (lit !== shown) {
        shown = lit;
        setActive(lit);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [reducedMotion, n]);

  if (n === 0) return null;
  const anyRecurring = stops.some((p) => p.count >= 2);
  const lit = reducedMotion ? null : active;

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h3 className="text-headline-sm text-espresso">{t("loopHeading")}</h3>
        <p className="text-body-sm text-walnut">{t("loopBody")}</p>
      </div>

      <div className="flex flex-col items-center gap-4 md:flex-row md:items-center md:gap-8">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="w-full max-w-[240px] shrink-0" aria-hidden>
          <defs>
            <marker id="loop-arrow" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-walnut)" />
            </marker>
            <radialGradient id="loop-glow">
              <stop offset="0%" stopColor="var(--color-stamp)" stopOpacity="0.55" />
              <stop offset="100%" stopColor="var(--color-stamp)" stopOpacity="0" />
            </radialGradient>
          </defs>

          <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-hairline)" strokeWidth={10} />
          {stops.map((_, i) => (
            <path
              key={`arc-${i}`}
              d={arcPath(i, n)}
              fill="none"
              stroke="var(--color-walnut)"
              strokeWidth={1.5}
              strokeDasharray="3 4"
              markerEnd="url(#loop-arrow)"
            />
          ))}

          {!reducedMotion && (
            <g ref={dot} transform={`translate(${C} ${C - R})`}>
              <circle r={16} fill="url(#loop-glow)" />
              <circle r={4} fill="var(--color-stamp)" />
            </g>
          )}

          {stops.map((p, i) => {
            const { x, y } = point(angleOf(i, n));
            const on = lit === i;
            return (
              <g key={p.pattern}>
                <circle
                  cx={r2(x)}
                  cy={r2(y)}
                  r={NODE_R + 5}
                  fill="none"
                  stroke="var(--color-espresso)"
                  strokeWidth={2}
                  opacity={on ? 1 : 0}
                  style={{ transition: "opacity 250ms ease" }}
                />
                <circle
                  cx={r2(x)}
                  cy={r2(y)}
                  r={on ? NODE_R + 1 : NODE_R - 3}
                  fill={LOOP_COLORS[i]}
                  fillOpacity={on ? 1 : DOT_OPACITY}
                  stroke="var(--color-hairline-strong)"
                  strokeWidth={1}
                  style={{ transition: "r 250ms ease, fill-opacity 250ms ease" }}
                />
              </g>
            );
          })}
        </svg>

        <ul className="flex w-full min-w-0 flex-col gap-1">
          {stops.map((p, i) => {
            const on = lit === i;
            const { percent, level } = frequencyOf(p.count, totalCases);
            const levelLabel = t(FREQUENCY_KEY[level]);
            return (
              <li
                key={p.pattern}
                aria-label={`${capitalize(p.pattern)}: ${levelLabel}, ${t("freqShare", { percent })}`}
                className={cn(
                  "flex items-center gap-3 rounded px-2 py-2 transition-colors duration-300",
                  on ? "bg-rose/40" : "bg-transparent",
                )}
              >
                <span aria-hidden className="flex size-7 shrink-0 items-center justify-center">
                  <span
                    className={cn(
                      "rounded-full shadow-[inset_0_0_0_1px_var(--color-hairline-strong)] transition-all duration-300",
                      on ? "size-6 ring-2 ring-espresso ring-offset-2 ring-offset-rose/40" : "size-4",
                    )}
                    style={{ background: LOOP_COLORS[i], opacity: on ? 1 : DOT_OPACITY }}
                  />
                </span>
                <span className="min-w-0 flex-1 text-body-md text-espresso">{capitalize(p.pattern)}</span>
                <span className="flex shrink-0 flex-col items-end">
                  <span className="flex items-center gap-1.5 text-body-sm font-medium text-espresso">
                    <Meter level={level} />
                    {levelLabel}
                  </span>
                  <span className="text-body-sm tabular-nums text-walnut">{t("freqShare", { percent })}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="flex flex-col gap-1 text-body-sm">
        {!anyRecurring && <p className="text-espresso">{t("patternsNoneRecurring")}</p>}
        <p className="flex flex-wrap gap-x-4 gap-y-1 text-walnut">
          {(["often", "sometimes", "rarely"] as const).map((level) => (
            <span key={level} className="flex items-center gap-1.5">
              <Meter level={level} />
              {t(FREQUENCY_LEGEND_KEY[level])}
            </span>
          ))}
        </p>
      </div>
    </Card>
  );
}
