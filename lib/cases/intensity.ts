// Pure and unit-tested. The single source of truth for "how do we turn an average severity
// (1-10) into a band". `court_status()` (Phase 7, supabase/migrations/20260924000001_*.sql)
// has its own copy of these exact thresholds in SQL for a single case's poll; Phase 8 uses
// this TypeScript copy to aggregate across many cases. Keep the two numerically identical.
export type IntensityBand = "low" | "moderate" | "high" | "severe";

export function intensityBand(avgSeverity: number): IntensityBand {
  if (avgSeverity < 4) return "low";
  if (avgSeverity < 6) return "moderate";
  if (avgSeverity < 8) return "high";
  return "severe";
}

export const INTENSITY_LEVEL: Record<IntensityBand, number> = { low: 1, moderate: 2, high: 3, severe: 4 };
