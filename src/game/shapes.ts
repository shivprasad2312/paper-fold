// ─────────────────────────────────────────────────────────────
// Board shapes. Every shape is reduced to a dense, normalized
// closed polyline (fits inside the [-1,1] box, centroid at 0).
// Slot positions are even arc-length samples of that polyline,
// so the renderer only ever has to draw polygons.
// ─────────────────────────────────────────────────────────────

export type ShapeKind =
  | 'circle'
  | 'oval'
  | 'square'
  | 'roundedSquare'
  | 'triangle'
  | 'diamond'
  | 'pentagon'
  | 'hexagon'
  | 'star5'
  | 'star6'
  | 'heart'
  | 'arrow'
  | 'plus';

export interface Pt {
  x: number;
  y: number;
}

export const SHAPE_LABELS: Record<ShapeKind, string> = {
  circle: 'Circle',
  oval: 'Oval',
  square: 'Square',
  roundedSquare: 'Rounded Square',
  triangle: 'Triangle',
  diamond: 'Diamond',
  pentagon: 'Pentagon',
  hexagon: 'Hexagon',
  star5: 'Star',
  star6: 'Nova Star',
  heart: 'Heart',
  arrow: 'Arrow',
  plus: 'Cross',
};

export const ALL_SHAPES: ShapeKind[] = [
  'circle',
  'oval',
  'square',
  'roundedSquare',
  'triangle',
  'diamond',
  'pentagon',
  'hexagon',
  'star5',
  'star6',
  'heart',
  'arrow',
  'plus',
];

const DENSE = 260;

// ── primitive builders ───────────────────────────────────────

function regularPolygon(sides: number, rot = -Math.PI / 2): Pt[] {
  const v: Pt[] = [];
  for (let i = 0; i < sides; i++) {
    const a = rot + (i / sides) * Math.PI * 2;
    v.push({ x: Math.cos(a), y: Math.sin(a) });
  }
  return v;
}

function starPolygon(points: number, outer = 1, inner = 0.46): Pt[] {
  const v: Pt[] = [];
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
    v.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return v;
}

function roundedSquare(corner = 0.28, seg = 7): Pt[] {
  const h = 1;
  const c = h - corner;
  const pts: Pt[] = [];
  const corners: [number, number, number][] = [
    [c, -c, -Math.PI / 2],
    [c, c, 0],
    [-c, c, Math.PI / 2],
    [-c, -c, Math.PI],
  ];
  for (const [cx, cy, a0] of corners) {
    for (let s = 0; s <= seg; s++) {
      const a = a0 + (s / seg) * (Math.PI / 2);
      pts.push({ x: cx + Math.cos(a) * corner, y: cy + Math.sin(a) * corner });
    }
  }
  return pts;
}

function heartCurve(n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x, y: -y }); // flip to canvas y-down
  }
  return pts;
}

function arrowShape(): Pt[] {
  return [
    { x: -1, y: -0.62 },
    { x: 0.28, y: -0.62 },
    { x: 0.28, y: -1 },
    { x: 1, y: 0 },
    { x: 0.28, y: 1 },
    { x: 0.28, y: 0.62 },
    { x: -1, y: 0.62 },
  ];
}

function plusShape(): Pt[] {
  const a = 0.36; // half arm width
  return [
    { x: -a, y: -1 },
    { x: a, y: -1 },
    { x: a, y: -a },
    { x: 1, y: -a },
    { x: 1, y: a },
    { x: a, y: a },
    { x: a, y: 1 },
    { x: -a, y: 1 },
    { x: -a, y: a },
    { x: -1, y: a },
    { x: -1, y: -a },
    { x: -a, y: -a },
  ];
}

// ── polyline helpers ─────────────────────────────────────────

function normalize(pts: Pt[]): Pt[] {
  let max = 0;
  for (const p of pts) max = Math.max(max, Math.abs(p.x), Math.abs(p.y));
  const s = max || 1;
  return pts.map((p) => ({ x: p.x / s, y: p.y / s }));
}

/** Densify a closed polygon into roughly `n` evenly-arc-spaced points. */
function densifyPolygon(vertices: Pt[], n: number): Pt[] {
  const edges: { a: Pt; b: Pt; len: number }[] = [];
  let perimeter = 0;
  for (let i = 0; i < vertices.length; i++) {
    const a = vertices[i];
    const b = vertices[(i + 1) % vertices.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    edges.push({ a, b, len });
    perimeter += len;
  }
  const out: Pt[] = [];
  let edgeIdx = 0;
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const target = (i / n) * perimeter;
    while (edgeIdx < edges.length - 1 && acc + edges[edgeIdx].len < target) {
      acc += edges[edgeIdx].len;
      edgeIdx++;
    }
    const e = edges[edgeIdx];
    const t = (target - acc) / e.len;
    out.push({ x: e.a.x + (e.b.x - e.a.x) * t, y: e.a.y + (e.b.y - e.a.y) * t });
  }
  return out;
}

function ellipsePolyline(rx: number, ry: number, n: number): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    pts.push({ x: Math.cos(a) * rx, y: Math.sin(a) * ry });
  }
  return pts;
}

const polylineCache = new Map<ShapeKind, Pt[]>();

/** Dense normalized closed polyline for a shape (cached). */
export function shapePolyline(shape: ShapeKind): Pt[] {
  const cached = polylineCache.get(shape);
  if (cached) return cached;

  let pts: Pt[];
  switch (shape) {
    case 'circle':
      pts = ellipsePolyline(1, 1, DENSE);
      break;
    case 'oval':
      pts = ellipsePolyline(1, 0.72, DENSE);
      break;
    case 'square':
      pts = densifyPolygon(
        [
          { x: -1, y: -1 },
          { x: 1, y: -1 },
          { x: 1, y: 1 },
          { x: -1, y: 1 },
        ],
        DENSE,
      );
      break;
    case 'roundedSquare':
      pts = densifyPolygon(roundedSquare(), DENSE);
      break;
    case 'triangle':
      pts = densifyPolygon(regularPolygon(3), DENSE);
      break;
    case 'diamond':
      pts = densifyPolygon(regularPolygon(4), DENSE);
      break;
    case 'pentagon':
      pts = densifyPolygon(regularPolygon(5), DENSE);
      break;
    case 'hexagon':
      pts = densifyPolygon(regularPolygon(6), DENSE);
      break;
    case 'star5':
      pts = densifyPolygon(starPolygon(5), DENSE);
      break;
    case 'star6':
      pts = densifyPolygon(starPolygon(6, 1, 0.5), DENSE);
      break;
    case 'heart':
      pts = normalize(heartCurve(DENSE));
      polylineCache.set(shape, pts);
      return pts;
    case 'arrow':
      pts = densifyPolygon(arrowShape(), DENSE);
      break;
    case 'plus':
      pts = densifyPolygon(plusShape(), DENSE);
      break;
  }
  pts = normalize(pts);
  polylineCache.set(shape, pts);
  return pts;
}

/** Even arc-length samples of the shape polyline — the peg slots. */
export function sampleSlots(shape: ShapeKind, total: number): Pt[] {
  const line = shapePolyline(shape);
  const n = line.length;
  const chord: number[] = [];
  let perimeter = 0;
  for (let i = 0; i < n; i++) {
    const a = line[i];
    const b = line[(i + 1) % n];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    chord.push(len);
    perimeter += len;
  }
  const out: Pt[] = [];
  let idx = 0;
  let acc = 0;
  for (let i = 0; i < total; i++) {
    const target = (i / total) * perimeter;
    while (idx < n - 1 && acc + chord[idx] < target) {
      acc += chord[idx];
      idx++;
    }
    const a = line[idx];
    const b = line[(idx + 1) % n];
    const t = (target - acc) / chord[idx];
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/** Scale a normalized polyline about the origin. */
export function scalePolyline(line: Pt[], factor: number): Pt[] {
  return line.map((p) => ({ x: p.x * factor, y: p.y * factor }));
}
