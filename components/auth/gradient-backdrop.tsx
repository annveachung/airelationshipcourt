// A slow, subtle colour-gradient animation behind the landing hero, built from the app's own
// tokens (canvas/rose/espresso) — no new colours, no animation library. Respects
// prefers-reduced-motion: no-preference (see the CSS rule in app/globals.css).
export function GradientBackdrop() {
  return <div aria-hidden className="gradient-backdrop pointer-events-none absolute inset-0 -z-10" />;
}
