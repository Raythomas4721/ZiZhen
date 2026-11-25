// 用 Canvas 畫戰鬥畫面。只讀狀態，不改狀態。

import { enemyPos } from '../engine/game';
import type { Ctx } from '../engine/ctx';
import { COLS, ROWS, type Cell, type GameState, type Kind } from '../engine/types';

export const KIND_COLOR: Record<Kind, string> = {
  fire: '#c4472f',
  water: '#2f6f9f',
  wall: '#5d7a3a',
  metal: '#6b5d4c',
  support: '#a0662b',
  light: '#b0891c',
};

export const KIND_NAME: Record<Kind, string> = {
  fire: '範圍',
  water: '控場',
  wall: '屏障',
  metal: '單體',
  support: '輔助',
  light: '光環',
};

/** 拖曳時游標下的格子：ok 代表放得下，range 是放下後的射程。 */
export interface Hover {
  x: number;
  y: number;
  ok?: boolean;
  range?: number;
}

export interface Fx {
  kind: 'hit' | 'kill' | 'merge' | 'ink' | 'broken' | 'swap' | 'flash' | 'text' | 'pop' | 'shake';
  x: number;
  y: number;
  x2?: number;
  y2?: number;
  color?: string;
  text?: string;
  born: number;
  life: number;
}

const FONT = "'Noto Serif TC', 'PMingLiU', serif";

export function drawBoard(
  g: CanvasRenderingContext2D,
  ctx: Ctx,
  s: GameState,
  cell: number,
  fx: Fx[],
  now: number,
  hover: Hover | null,
  guide: Cell[] = [],
) {
  const W = COLS * cell;
  const H = ROWS * cell;
  g.clearRect(0, 0, W, H);

  // 紙底與格線
  g.fillStyle = '#f6eedd';
  g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(90,70,50,0.12)';
  g.lineWidth = 1;
  for (let x = 0; x <= COLS; x++) {
    g.beginPath();
    g.moveTo(x * cell + 0.5, 0);
    g.lineTo(x * cell + 0.5, H);
    g.stroke();
  }
  for (let y = 0; y <= ROWS; y++) {
    g.beginPath();
    g.moveTo(0, y * cell + 0.5);
    g.lineTo(W, y * cell + 0.5);
    g.stroke();
  }

  // 路
  g.fillStyle = '#ddcdab';
  for (const c of s.path) g.fillRect(c.x * cell + 1, c.y * cell + 1, cell - 2, cell - 2);
  g.strokeStyle = 'rgba(60,45,30,0.25)';
  g.lineWidth = cell * 0.07;
  g.setLineDash([cell * 0.12, cell * 0.16]);
  g.beginPath();
  s.path.forEach((c, i) => {
    const px = (c.x + 0.5) * cell;
    const py = (c.y + 0.5) * cell;
    if (i === 0) g.moveTo(px, py);
    else g.lineTo(px, py);
  });
  g.stroke();
  g.setLineDash([]);

  // 起點的硯台、終點的書頁
  const first = s.path[0];
  const last = s.path[s.path.length - 1];
  g.fillStyle = '#2a2420';
  g.beginPath();
  g.arc((first.x + 0.5) * cell, (first.y + 0.5) * cell, cell * 0.24, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#fffaf0';
  g.strokeStyle = '#8a7356';
  g.lineWidth = 2;
  g.fillRect((last.x + 0.18) * cell, (last.y + 0.18) * cell, cell * 0.64, cell * 0.68);
  g.strokeRect((last.x + 0.18) * cell, (last.y + 0.18) * cell, cell * 0.64, cell * 0.68);
  g.fillStyle = '#8a7356';
  g.font = `${cell * 0.3}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('頁', (last.x + 0.5) * cell, (last.y + 0.53) * cell);

  // 教學：建議放字的格子
  if (guide.length) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 220);
    for (const c of guide) {
      g.fillStyle = `rgba(176,137,28,${0.12 + 0.18 * pulse})`;
      g.fillRect(c.x * cell + 2, c.y * cell + 2, cell - 4, cell - 4);
      g.strokeStyle = '#b0891c';
      g.lineWidth = 2 + pulse * 2;
      g.strokeRect(c.x * cell + 3, c.y * cell + 3, cell - 6, cell - 6);
    }
  }

  if (hover) {
    const ok = hover.ok ?? true;
    g.fillStyle = ok ? 'rgba(93,122,58,0.28)' : 'rgba(179,58,43,0.28)';
    g.fillRect(hover.x * cell, hover.y * cell, cell, cell);
    if (ok && hover.range) {
      g.strokeStyle = 'rgba(93,122,58,0.7)';
      g.fillStyle = 'rgba(93,122,58,0.07)';
      g.lineWidth = 1.5;
      g.setLineDash([5, 4]);
      g.beginPath();
      g.arc((hover.x + 0.5) * cell, (hover.y + 0.5) * cell, hover.range * cell, 0, Math.PI * 2);
      g.fill();
      g.stroke();
      g.setLineDash([]);
    }
  }

  // 詞的連線（畫在字塔底下）
  for (const w of s.words) {
    g.strokeStyle = 'rgba(179,58,43,0.45)';
    g.lineWidth = cell * 0.42;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo((w.a.x + 0.5) * cell, (w.a.y + 0.5) * cell);
    g.lineTo((w.b.x + 0.5) * cell, (w.b.y + 0.5) * cell);
    g.stroke();
    g.lineCap = 'butt';
  }

  // 成語：金色外框把四格框起來
  for (const idi of s.idioms) {
    const xs = idi.cells.map((c) => c.x);
    const ys = idi.cells.map((c) => c.y);
    const x0 = Math.min(...xs) * cell + 2;
    const y0 = Math.min(...ys) * cell + 2;
    const w = (Math.max(...xs) - Math.min(...xs) + 1) * cell - 4;
    const h = (Math.max(...ys) - Math.min(...ys) + 1) * cell - 4;
    const full = (s.charge[idi.w] ?? 0) >= 1;
    g.fillStyle = full ? 'rgba(176,137,28,0.35)' : 'rgba(176,137,28,0.18)';
    roundRect(g, x0, y0, w, h, cell * 0.18);
    g.fill();
  }

  // 字塔
  for (const t of s.towers) {
    const def = ctx.chars.get(t.ch);
    const color = def ? KIND_COLOR[def.kind] : '#444';
    const px = t.x * cell;
    const py = t.y * cell;
    const pad = cell * 0.08;
    g.fillStyle = t.inked > 0 ? '#2a2420' : '#fffaf0';
    roundRect(g, px + pad, py + pad, cell - pad * 2, cell - pad * 2, cell * 0.14);
    g.fill();
    g.strokeStyle = color;
    g.lineWidth = cell * 0.05 + t.lv * 0.7;
    g.stroke();
    g.fillStyle = t.inked > 0 ? '#5b514a' : color;
    g.font = `700 ${cell * 0.54}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(t.ch, px + cell / 2, py + cell / 2 + cell * 0.02);
    for (let i = 0; i < t.lv; i++) {
      g.fillStyle = color;
      g.beginPath();
      g.arc(px + cell * 0.22 + i * cell * 0.14, py + cell * 0.8, cell * 0.045, 0, Math.PI * 2);
      g.fill();
    }
    if (t.locked) {
      g.fillStyle = '#6b5d4c';
      g.fillRect(px + cell * 0.66, py + cell * 0.14, cell * 0.2, cell * 0.1);
    }
    if (t.onPath && t.stats.blockMax > 0) {
      const f = Math.max(0, t.block / t.stats.blockMax);
      g.fillStyle = 'rgba(0,0,0,0.15)';
      g.fillRect(px + pad, py + pad, cell - pad * 2, 4);
      g.fillStyle = '#5d7a3a';
      g.fillRect(px + pad, py + pad, (cell - pad * 2) * f, 4);
    }
  }

  for (const idi of s.idioms) {
    const xs = idi.cells.map((c) => c.x);
    const ys = idi.cells.map((c) => c.y);
    g.strokeStyle = '#b0891c';
    g.lineWidth = 3;
    roundRect(g, Math.min(...xs) * cell + 2, Math.min(...ys) * cell + 2, (Math.max(...xs) - Math.min(...xs) + 1) * cell - 4, (Math.max(...ys) - Math.min(...ys) + 1) * cell - 4, cell * 0.18);
    g.stroke();
  }

  // 墨妖
  for (const e of s.enemies) {
    const def = ctx.enemies.get(e.def)!;
    const p = enemyPos(s, e);
    const r = def.size * cell * 0.5;
    const cx = p.x * cell;
    const cy = p.y * cell;
    g.fillStyle = def.flying ? 'rgba(40,34,30,0.5)' : '#1f1a17';
    if (e.frozen > 0) g.fillStyle = '#4b6d8a';
    // 隱墨：沒被照到時只剩淡淡的影子
    if (def.hidden) g.globalAlpha = e.seen ? 0.85 : 0.18;
    blob(g, cx, cy, r, e.id);
    g.fill();
    if (def.flying) {
      g.strokeStyle = 'rgba(40,34,30,0.35)';
      g.lineWidth = r * 0.3;
      g.beginPath();
      g.moveTo(cx - r * 1.8, cy);
      g.lineTo(cx - r, cy);
      g.stroke();
    }
    if (def.inker) {
      g.fillStyle = '#b33a2b';
      g.beginPath();
      g.arc(cx + r * 0.4, cy - r * 0.4, r * 0.28, 0, Math.PI * 2);
      g.fill();
    }
    if (e.burnLeft > 0) {
      g.fillStyle = 'rgba(220,90,40,0.75)';
      g.beginPath();
      g.arc(cx, cy - r, r * 0.25, 0, Math.PI * 2);
      g.fill();
    }
    g.globalAlpha = 1;
    if (def.hidden && e.seen) {
      g.strokeStyle = 'rgba(176,137,28,0.8)';
      g.lineWidth = 1.5;
      g.beginPath();
      g.arc(cx, cy, r * 1.25, 0, Math.PI * 2);
      g.stroke();
    }
    const f = e.hp / e.maxHp;
    if (f < 1 && (!def.hidden || e.seen)) {
      g.fillStyle = 'rgba(0,0,0,0.2)';
      g.fillRect(cx - r, cy - r - 6, r * 2, 3);
      g.fillStyle = '#b33a2b';
      g.fillRect(cx - r, cy - r - 6, r * 2 * f, 3);
    }
  }

  // 特效
  for (const f of fx) {
    const age = (now - f.born) / f.life;
    if (age >= 1 || age < 0) continue;
    const a = 1 - age;
    if (f.kind === 'hit' && f.x2 !== undefined && f.y2 !== undefined) {
      g.strokeStyle = withAlpha(f.color ?? '#000000', a * 0.8);
      g.lineWidth = 2;
      g.beginPath();
      g.moveTo(f.x * cell, f.y * cell);
      g.lineTo(f.x2 * cell, f.y2 * cell);
      g.stroke();
    } else if (f.kind === 'text' && f.text) {
      const rise = cell * 0.6 * age;
      g.font = `900 ${cell * 0.36}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineWidth = 4;
      g.strokeStyle = withAlpha('#fffaf0', a);
      g.strokeText(f.text, f.x * cell, f.y * cell - rise);
      g.fillStyle = withAlpha(f.color ?? '#b33a2b', a);
      g.fillText(f.text, f.x * cell, f.y * cell - rise);
    } else if (f.kind === 'pop') {
      g.strokeStyle = withAlpha('#5d7a3a', a);
      g.lineWidth = 2;
      g.strokeRect((f.x - 0.5 + age * -0.1) * cell, (f.y - 0.5 + age * -0.1) * cell, cell * (1 + age * 0.2), cell * (1 + age * 0.2));
    } else if (f.kind === 'shake') {
      // 震動由 BoardCanvas 處理
    } else if (f.kind === 'flash') {
      g.fillStyle = withAlpha('#b0891c', a * 0.35);
      g.fillRect(0, 0, W, H);
    } else if (f.kind === 'swap' && f.x2 !== undefined && f.y2 !== undefined) {
      g.strokeStyle = withAlpha('#7a3fa0', a);
      g.lineWidth = 3;
      g.setLineDash([6, 4]);
      g.beginPath();
      g.moveTo(f.x * cell, f.y * cell);
      g.lineTo(f.x2 * cell, f.y2 * cell);
      g.stroke();
      g.setLineDash([]);
      for (const [px, py] of [[f.x, f.y], [f.x2, f.y2]]) {
        g.beginPath();
        g.arc(px * cell, py * cell, cell * (0.35 + age * 0.2), 0, Math.PI * 2);
        g.stroke();
      }
    } else if (f.kind === 'kill') {
      g.fillStyle = withAlpha('#1f1a17', a * 0.4);
      g.beginPath();
      g.arc(f.x * cell, f.y * cell, cell * (0.15 + age * 0.35), 0, Math.PI * 2);
      g.fill();
      if (f.text) {
        g.fillStyle = withAlpha('#a0662b', a);
        g.font = `700 ${cell * 0.26}px ${FONT}`;
        g.textAlign = 'center';
        g.fillText(f.text, f.x * cell, f.y * cell - cell * (0.2 + 0.4 * age));
      }
    } else {
      g.strokeStyle = withAlpha(f.kind === 'merge' ? '#b0891c' : '#1f1a17', a);
      g.lineWidth = 3;
      g.beginPath();
      g.arc(f.x * cell, f.y * cell, cell * (0.3 + age * 0.5), 0, Math.PI * 2);
      g.stroke();
    }
  }

  // 對仗：四個字外面框一圈金色虛線，角落蓋一個「對」字印
  for (const c of s.couplets) {
    const xs = c.cells.map((p) => p.x);
    const ys = c.cells.map((p) => p.y);
    const x0 = Math.min(...xs) * cell + 1;
    const y0 = Math.min(...ys) * cell + 1;
    const w = (Math.max(...xs) - Math.min(...xs) + 1) * cell - 2;
    const h = (Math.max(...ys) - Math.min(...ys) + 1) * cell - 2;
    g.strokeStyle = '#b0891c';
    g.lineWidth = 2.5;
    g.setLineDash([cell * 0.14, cell * 0.08]);
    roundRect(g, x0, y0, w, h, cell * 0.16);
    g.stroke();
    g.setLineDash([]);
    const r = cell * 0.17;
    g.fillStyle = '#b0891c';
    g.beginPath();
    g.arc(x0 + w - r * 0.6, y0 + r * 0.6, r, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#fffaf0';
    g.font = `700 ${r * 1.3}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('對', x0 + w - r * 0.6, y0 + r * 0.6 + 1);
  }

  // 詞名（畫在最上層）
  for (const w of s.words) {
    const mx = ((w.a.x + w.b.x) / 2 + 0.5) * cell;
    const my = ((w.a.y + w.b.y) / 2 + 0.5) * cell;
    g.font = `700 ${cell * 0.22}px ${FONT}`;
    const tw = g.measureText(w.w).width + 8;
    g.fillStyle = '#b33a2b';
    g.fillRect(mx - tw / 2, my - cell * 0.15, tw, cell * 0.3);
    g.fillStyle = '#fffaf0';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(w.w, mx, my + 1);
  }
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/** 有點不規則的墨點形狀，用 id 決定，畫面才不會抖。 */
function blob(g: CanvasRenderingContext2D, cx: number, cy: number, r: number, seed: number) {
  const n = 9;
  g.beginPath();
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + 0.12 * Math.sin(seed * 1.7 + i * 2.3);
    const x = cx + Math.cos(a) * r * k;
    const y = cy + Math.sin(a) * r * k;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
}

function withAlpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const gg = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${gg},${b},${Math.max(0, a).toFixed(3)})`;
}
