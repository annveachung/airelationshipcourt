"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import type { PatternCount } from "@/lib/analytics/stats";

const MAX_STOPS = 5;
const STEP_MS = 1800; // time for the light to travel from one stop to the next

// The ring, in SVG units.
const SIZE = 220;
const C = SIZE / 2;
const R = 78;
const NODE_R = 15;

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

// One dot per case the pattern came up in; each dot opens that case.
function Tally({ pattern }: { pattern: PatternCount }) {
  return (
    <span className="flex shrink-0 flex-wrap justify-end gap-1">
      {pattern.cases.map((c) => (
        <Link
          key={c.id}
          href={`/cases/${c.id}/report`}
          title={c.title}
          aria-label={c.title}
          className="size-2.5 rounded-full bg-stamp hover:bg-espresso focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-espresso"
        />
      ))}
    </span>
  );
}

/**
 * The couple's top conflict patterns on a loop, most frequent first. A light travels the ring and
 * lights up each stop (and its row in the list) in turn. Still for people who prefer less motion.
 */
export function ArgumentLoop({ patterns }: { patterns: PatternCount[] }) {
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
                  r={on ? NODE_R + 2 : NODE_R}
                  fill={on ? "var(--color-stamp)" : "var(--color-surface)"}
                  stroke={on ? "var(--color-stamp)" : "var(--color-espresso)"}
                  strokeWidth={2}
                  style={{ transition: "r 250ms ease, fill 250ms ease, stroke 250ms ease" }}
                />
                <text
                  x={r2(x)}
                  y={r2(y)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={13}
                  fontWeight={600}
                  fill={on ? "#ffffff" : "var(--color-espresso)"}
                  style={{ transition: "fill 250ms ease" }}
                >
                  {i + 1}
                </text>
              </g>
            );
          })}
        </svg>

        <ol className="flex w-full min-w-0 flex-col gap-1">
          {stops.map((p, i) => {
            const on = lit === i;
            return (
              <li
                key={p.pattern}
                aria-label={`${i + 1}. ${capitalize(p.pattern)}: ${t("patternCases", { count: p.count })}`}
                className={cn(
                  "flex items-center gap-3 rounded px-2 py-2 transition-colors duration-300",
                  on ? "bg-rose/40" : "bg-transparent",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-body-sm font-semibold transition-colors duration-300",
                    on ? "border-stamp bg-stamp text-white" : "border-espresso text-espresso",
                  )}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-body-md text-espresso">{capitalize(p.pattern)}</span>
                <Tally pattern={p} />
                <span className="w-6 shrink-0 text-right text-body-sm tabular-nums text-walnut">×{p.count}</span>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-col gap-1 text-body-sm">
        {!anyRecurring && <p className="text-espresso">{t("patternsNoneRecurring")}</p>}
        <p className="flex items-center gap-1.5 text-walnut">
          <span aria-hidden className="size-2.5 rounded-full bg-stamp" />
          {t("patternsLegendDot")}
        </p>
      </div>
    </Card>
  );
}
