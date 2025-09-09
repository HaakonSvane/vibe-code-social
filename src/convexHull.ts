// Simple Graham scan convex hull for lat/lng points.
import type { LatLngExpression } from 'leaflet';

interface Pt { x: number; y: number; }

function cross(o: Pt, a: Pt, b: Pt) { return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x); }

export function convexHull(points: LatLngExpression[]): LatLngExpression[] {
  const pts = points.map(p => Array.isArray(p) ? { x: p[1], y: p[0] } : { x: (p as any).lng, y: (p as any).lat });
  if (pts.length <= 3) return points;
  const sorted = pts.slice().sort((a,b)=> a.x===b.x ? a.y-b.y : a.x-b.x);
  const lower: Pt[] = [];
  for (const p of sorted) {
    while (lower.length >=2 && cross(lower[lower.length-2], lower[lower.length-1], p) <=0) lower.pop();
    lower.push(p);
  }
  const upper: Pt[] = [];
  for (let i=sorted.length-1;i>=0;i--) {
    const p = sorted[i];
    while (upper.length >=2 && cross(upper[upper.length-2], upper[upper.length-1], p) <=0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  const hull = lower.concat(upper);
  return hull.map(p => [p.y, p.x]);
}
