// A slow, subtle colour-gradient animation behind the landing page, built from the app's own
// tokens (canvas/rose) — no new colours, no animation library. Fixed to the viewport so it fills
// the whole screen edge to edge (under the translucent header too) and stays put while the page
// scrolls down to sign-in. Respects prefers-reduced-motion (see the CSS rule in app/globals.css).
export function GradientBackdrop() {
  return <div aria-hidden className="gradient-backdrop pointer-events-none fixed inset-0 -z-10" />;
}
