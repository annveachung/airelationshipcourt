// The sign-in emblem: pixel-art scales of justice where the two weights are hearts hanging from the
// beam, drawn on a 22×14 grid (one SVG unit = one "pixel"). The hearts take turns hopping — see
// .animate-pixel-hop in globals.css. Decorative only.

type Rect = [x: number, y: number, w: number, h: number];

const frame: Rect[] = [
  [9, 1, 4, 2], // finial
  [1, 3, 20, 1], // beam
  [10, 4, 2, 8], // post
  [7, 12, 8, 1], // base
  [5, 13, 12, 1],
  [4, 4, 1, 2], // chains, ending in each heart's notch
  [17, 4, 1, 2],
];

const leftHeart: Rect[] = [
  [2, 5, 2, 1],
  [5, 5, 2, 1],
  [2, 6, 5, 1],
  [2, 7, 5, 1],
  [3, 8, 3, 1],
  [4, 9, 1, 1],
];
// Both hearts catch the light on their upper-left, so the shine is placed, not mirrored.
const leftShine: Rect[] = [[3, 6, 1, 1]];
const rightShine: Rect[] = [[16, 6, 1, 1]];

// Mirror a rect across the 22-unit width.
const mirror = (list: Rect[]): Rect[] => list.map(([x, y, w, h]) => [22 - x - w, y, w, h]);

const rects = (list: Rect[]) =>
  list.map(([x, y, w, h]) => <rect key={`${x}-${y}-${w}`} x={x} y={y} width={w} height={h} />);

export function PixelScales() {
  return (
    <div
      aria-hidden
      className="border-2 border-espresso bg-surface px-4 py-3 shadow-[4px_4px_0_0_var(--color-espresso)]"
    >
      <svg viewBox="0 0 22 14" width={110} height={70} shapeRendering="crispEdges" className="block">
        <g className="fill-espresso">{rects(frame)}</g>
        <g className="animate-pixel-hop">
          <g className="fill-heart">{rects(leftHeart)}</g>
          <g className="fill-surface">{rects(leftShine)}</g>
        </g>
        <g className="animate-pixel-hop-late">
          <g className="fill-heart">{rects(mirror(leftHeart))}</g>
          <g className="fill-surface">{rects(rightShine)}</g>
        </g>
      </svg>
    </div>
  );
}
