// Small pixel-art icons drawn as SVG rects (one unit = one "pixel", crisp edges). Decorative;
// callers put the meaning in text next to them.

type Rect = [x: number, y: number, w: number, h: number];
type Layer = { className: string; rects: Rect[] };

function Sprite({ w, h, scale, layers, className }: {
  w: number;
  h: number;
  scale: number;
  layers: Layer[];
  className?: string;
}) {
  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${w} ${h}`}
      width={w * scale}
      height={h * scale}
      shapeRendering="crispEdges"
      className={className}
    >
      {layers.map((layer, i) => (
        <g key={i} className={layer.className}>
          {layer.rects.map(([x, y, rw, rh]) => (
            <rect key={`${x}-${y}-${rw}`} x={x} y={y} width={rw} height={rh} />
          ))}
        </g>
      ))}
    </svg>
  );
}

// A cut gem: one per case won on the Home scoreboard.
export function PixelGem({ scale = 2, className }: { scale?: number; className?: string }) {
  return (
    <Sprite
      w={7}
      h={6}
      scale={scale}
      className={className}
      layers={[
        { className: "fill-rose", rects: [[2, 0, 3, 1], [1, 1, 5, 1]] }, // light top facet
        { className: "fill-heart", rects: [[0, 2, 7, 1], [1, 3, 5, 1], [2, 4, 3, 1], [3, 5, 1, 1]] },
        { className: "fill-surface", rects: [[2, 0, 1, 1]] }, // shine
      ]}
    />
  );
}

// A flame: wins in a row on the Home scoreboard.
export function PixelFlame({ scale = 2, className }: { scale?: number; className?: string }) {
  return (
    <Sprite
      w={6}
      h={7}
      scale={scale}
      className={className}
      layers={[
        {
          className: "fill-heart",
          rects: [[2, 0, 1, 1], [2, 1, 2, 1], [1, 2, 3, 1], [5, 2, 1, 1], [1, 3, 5, 1], [0, 4, 6, 1], [0, 5, 6, 1], [1, 6, 4, 1]],
        },
        { className: "fill-rose", rects: [[2, 4, 2, 1], [2, 5, 2, 1]] }, // hot core
      ]}
    />
  );
}

// A rolled treaty with a heart wax seal (sealed) — or plain, for a case adjourned without one.
export function PixelTreaty({ sealed, scale = 3, className }: { sealed: boolean; scale?: number; className?: string }) {
  const seal: Layer[] = sealed
    ? [
        { className: "fill-heart", rects: [[7, 8, 2, 1], [10, 8, 2, 1], [7, 9, 5, 1], [8, 10, 3, 1], [9, 11, 1, 1]] },
      ]
    : [];
  return (
    <Sprite
      w={16}
      h={15}
      scale={scale}
      className={className}
      layers={[
        { className: "fill-surface", rects: [[4, 4, 8, 8]] }, // paper
        { className: "fill-rose", rects: [[3, 2, 10, 1], [3, 13, 10, 1]] }, // rolled ends
        {
          className: "fill-espresso",
          rects: [
            [3, 1, 10, 1], [2, 2, 1, 1], [13, 2, 1, 1], [3, 3, 10, 1], // top roll
            [3, 4, 1, 8], [12, 4, 1, 8], // paper edges
            [3, 12, 10, 1], [2, 13, 1, 1], [13, 13, 1, 1], [3, 14, 10, 1], // bottom roll
          ],
        },
        // Writing: three lines, or two above the seal when there is one.
        { className: "fill-walnut", rects: sealed ? [[5, 5, 6, 1], [5, 7, 4, 1]] : [[5, 5, 6, 1], [5, 7, 5, 1], [5, 9, 4, 1]] },
        ...seal,
      ]}
    />
  );
}
