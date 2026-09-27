// The brand mark beside "AI Relationship Court" in the header: a 10×8 pixel heart split down the
// middle, espresso on one side and rose on the other. Two partners, two sides of the story, one
// heart. Drawn at 2px per pixel; decorative (the brand name next to it carries the meaning).

type Rect = [x: number, y: number, w: number, h: number];

// Each row of the heart as a horizontal run; split into halves at x = 5 below.
const rows: Rect[] = [
  [1, 0, 2, 1],
  [7, 0, 2, 1],
  [0, 1, 4, 1],
  [6, 1, 4, 1],
  [0, 2, 10, 1],
  [0, 3, 10, 1],
  [1, 4, 8, 1],
  [2, 5, 6, 1],
  [3, 6, 4, 1],
  [4, 7, 2, 1],
];

const clip = (list: Rect[], from: number, to: number): Rect[] =>
  list
    .map(([x, y, w, h]): Rect => {
      const start = Math.max(x, from);
      const end = Math.min(x + w, to);
      return [start, y, end - start, h];
    })
    .filter(([, , w]) => w > 0);

const rects = (list: Rect[]) =>
  list.map(([x, y, w, h]) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} />);

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg aria-hidden viewBox="0 0 10 8" width={20} height={16} shapeRendering="crispEdges" className={className}>
      <g className="fill-espresso">{rects(clip(rows, 0, 5))}</g>
      <g className="fill-heart">{rects(clip(rows, 5, 10))}</g>
      {/* A single highlight pixel on the rose half, like a sprite catching the light. */}
      <rect x={7} y={1} width={1} height={1} className="fill-surface" />
    </svg>
  );
}
