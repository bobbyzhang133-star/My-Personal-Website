import { FlipCalculation } from '../vendor/st-page-flip-geometry.js?v=1935067ad971';

const rectangle = (w, h) => [{ x: 0, y: 0 }, { x: w, y: 0 }, { x: w, y: h }, { x: 0, y: h }];

function clip(points, normal, distance, side) {
  const result = [];
  const value = p => side * (normal.x * p.x + normal.y * p.y - distance);
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    const av = value(a), bv = value(b);
    if (av >= -1e-7) result.push(a);
    if ((av > 0 && bv < 0) || (av < 0 && bv > 0)) {
      const t = av / (av - bv);
      result.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  return result;
}

export const foldPolygon = points => points.length > 2
  ? `polygon(${points.map(p => `${p.x.toFixed(3)}px ${p.y.toFixed(3)}px`).join(',')})`
  : 'polygon(0 0,0 0,0 0)';

// StPageFlip's licensed constraints keep both spine corners attached. Our DOM
// adapter reflects only the folded portion across the cursor/corner bisector.
// Its matrix is a pure rotation + translation: text/paper never stretch.
export function pageFold(point, width, height, corner = 'bottom', direction = 1) {
  const cornerY = corner === 'top' ? 0 : height;
  let position = { x: Math.max(-width, Math.min(width, point.x)), y: point.y };
  // Guard exact vertical/extreme drags before calling the upstream solver.
  const constrain = p => {
    let result = p;
    for (let i = 0; i < 12; i++) for (const [cy, radius] of [[cornerY, width], [height - cornerY, Math.hypot(width, height)]]) {
      const length = Math.hypot(result.x, result.y - cy);
      if (length > radius) result = { x: result.x * radius / length, y: cy + (result.y - cy) * radius / length };
    }
    return result;
  };
  position = constrain(position);
  const calc = new FlipCalculation(0, corner, String(width), String(height));
  if (calc.calc(position) && Number.isFinite(calc.getPosition().x + calc.getPosition().y)) position = calc.getPosition();
  position = constrain(position);
  const delta = { x: width - position.x, y: cornerY - position.y };
  const length = Math.hypot(delta.x, delta.y);
  const normal = length < 1e-7 ? { x: 1, y: 0 } : { x: delta.x / length, y: delta.y / length };
  const midpoint = { x: (width + position.x) / 2, y: (cornerY + position.y) / 2 };
  const distance = normal.x * midpoint.x + normal.y * midpoint.y;
  const points = rectangle(width, height);
  const unfolded = clip(points, normal, distance, -1);
  const folded = length < 1e-7 ? [] : clip(points, normal, distance, 1);
  const front = unfolded.map(p => ({ x: direction > 0 ? p.x : width - p.x, y: p.y }));
  const back = folded.map(p => ({ x: direction > 0 ? width - p.x : p.x, y: p.y }));
  const rxx = 1 - 2 * normal.x ** 2, rxy = -2 * normal.x * normal.y, ryy = 1 - 2 * normal.y ** 2;
  const base = direction > 0 ? width : 0;
  const matrix = [-rxx, -direction * rxy, direction * rxy, ryy,
    direction * (rxx * base + 2 * distance * normal.x), rxy * base + 2 * distance * normal.y];
  return {
    front, back, matrix, position, normal, midpoint,
    frontX: direction > 0 ? 0 : -width,
    progress: Math.max(0, Math.min(1, (width - position.x) / (2 * width))),
    angle: Math.atan2(matrix[1], matrix[0]) * 180 / Math.PI,
    shadow: Math.min(1, length / (width * .25)) * Math.min(1, Math.abs(position.x + width) / (width * .25))
  };
}
