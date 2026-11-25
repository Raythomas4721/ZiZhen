import { COLS, ROWS, type Cell } from './types';

/** 把轉折點展開成一格一格的路徑。 */
export function expandPath(waypoints: Cell[]): Cell[] {
  const out: Cell[] = [];
  for (let i = 0; i < waypoints.length; i++) {
    const p = waypoints[i];
    if (i === 0) {
      out.push({ ...p });
      continue;
    }
    const prev = waypoints[i - 1];
    const dx = Math.sign(p.x - prev.x);
    const dy = Math.sign(p.y - prev.y);
    let x = prev.x;
    let y = prev.y;
    while (x !== p.x || y !== p.y) {
      x += dx;
      y += dy;
      out.push({ x, y });
    }
  }
  return out;
}

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

export function pathIndex(path: Cell[], x: number, y: number): number {
  return path.findIndex((c) => c.x === x && c.y === y);
}

export function buildableCount(path: Cell[]): number {
  return COLS * ROWS - path.length;
}

/** 沿路徑走了 d 格的座標（格中心為整數 + 0.5）。路徑頭尾往外延伸。 */
export function positionAt(path: Cell[], d: number): { x: number; y: number } {
  const n = path.length;
  if (n === 1) return { x: path[0].x + 0.5, y: path[0].y + 0.5 };
  let i = Math.floor(d);
  if (i < 0) i = 0;
  if (i > n - 2) i = n - 2;
  const a = path[i];
  const b = path[i + 1];
  const f = d - i;
  return { x: a.x + (b.x - a.x) * f + 0.5, y: a.y + (b.y - a.y) * f + 0.5 };
}

/** 墨妖走到這裡就算啃到書頁。 */
export function pathEnd(path: Cell[]): number {
  return path.length - 0.5;
}
