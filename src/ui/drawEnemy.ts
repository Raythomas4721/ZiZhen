// 墨妖的畫法：每一種都有自己的樣子，再疊上燃燒、減速、冰凍、被打中的回饋。全部用 Canvas 畫，不用圖檔。

import { positionAt } from '../engine/board';
import type { Ctx } from '../engine/ctx';
import type { Enemy, EnemyDef, GameState } from '../engine/types';

type G = CanvasRenderingContext2D;
const FONT = "'Noto Serif TC', 'PMingLiU', serif";
const INK = '#1f1a17';

/** 被打中後閃白多久（毫秒）。 */
export const HIT_FLASH_MS = 110;

/** 有點不規則的墨團輪廓（用 seed 決定形狀，畫面才不會抖）。 */
function inkPath(g: G, cx: number, cy: number, rx: number, ry: number, seed: number, bumps = 9, jag = 0.12) {
  g.beginPath();
  for (let i = 0; i <= bumps; i++) {
    const a = (i / bumps) * Math.PI * 2;
    const k = 1 + jag * Math.sin(seed * 1.7 + i * 2.3);
    const x = cx + Math.cos(a) * rx * k;
    const y = cy + Math.sin(a) * ry * k;
    if (i === 0) g.moveTo(x, y);
    else g.lineTo(x, y);
  }
  g.closePath();
}

/** 一雙眼睛；dx、dy 是看的方向（單位向量）。 */
function eyes(g: G, cx: number, cy: number, r: number, dx: number, dy: number, opts: { angry?: boolean; flip?: boolean } = {}) {
  const ey = cy + (opts.flip ? r * 0.28 : -r * 0.12);
  const gap = r * 0.36;
  const er = r * 0.24;
  for (const side of [-1, 1]) {
    const ex = cx + side * gap;
    g.fillStyle = '#fffaf0';
    g.beginPath();
    g.ellipse(ex, ey, er, er * 1.15, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = INK;
    g.beginPath();
    g.arc(ex + dx * er * 0.45, ey + dy * er * 0.45, er * 0.5, 0, Math.PI * 2);
    g.fill();
    if (opts.angry) {
      g.strokeStyle = '#fffaf0';
      g.lineWidth = Math.max(1.2, r * 0.09);
      g.beginPath();
      const by = ey - er * 1.5 * (opts.flip ? -1 : 1);
      g.moveTo(ex - side * er * 1.1, by - er * 0.5 * (opts.flip ? -1 : 1));
      g.lineTo(ex + side * er * 0.6, by + er * 0.2 * (opts.flip ? -1 : 1));
      g.stroke();
    }
  }
}

/** 頭目的嘴（一道歪歪的線）。 */
function mouth(g: G, cx: number, cy: number, r: number, flip = false) {
  g.strokeStyle = '#fffaf0';
  g.lineWidth = Math.max(1.2, r * 0.08);
  g.beginPath();
  const y = cy + (flip ? -r * 0.35 : r * 0.38);
  g.moveTo(cx - r * 0.3, y);
  g.quadraticCurveTo(cx, y + (flip ? -1 : 1) * r * 0.12, cx + r * 0.3, y - r * 0.05);
  g.stroke();
}

function direction(s: GameState, e: Enemy): { dx: number; dy: number } {
  const a = positionAt(s.path, e.d);
  const b = positionAt(s.path, e.d + 0.15);
  const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  return { dx: (b.x - a.x) / len, dy: (b.y - a.y) / len };
}

/** 主體：依種類畫出外型。回傳 false 代表這隻目前看不見主體（隱墨沒被照到）。 */
function body(g: G, def: EnemyDef, e: Enemy, cx: number, cy: number, r: number, now: number, dir: { dx: number; dy: number }) {
  const t = now / 1000 + e.id * 0.37;
  switch (def.id) {
    case 'dot': {
      // 小墨滴：走路一壓一彈，身後滴兩滴墨
      const sq = 1 + 0.12 * Math.sin(t * 9);
      g.fillStyle = 'rgba(31,26,23,0.35)';
      for (let i = 1; i <= 2; i++) {
        g.beginPath();
        g.arc(cx - dir.dx * r * (0.9 + i * 0.55), cy - dir.dy * r * (0.9 + i * 0.55), r * (0.22 - i * 0.05), 0, Math.PI * 2);
        g.fill();
      }
      g.fillStyle = INK;
      inkPath(g, cx, cy, r * sq, r / sq, e.id);
      g.fill();
      eyes(g, cx, cy, r, dir.dx, dir.dy);
      return true;
    }
    case 'blob': {
      // 墨團：好幾團疊在一起，走得很重
      const bob = Math.abs(Math.sin(t * 3.2)) * r * 0.12;
      g.fillStyle = INK;
      inkPath(g, cx - r * 0.55, cy + r * 0.25 - bob * 0.5, r * 0.55, r * 0.5, e.id + 3);
      g.fill();
      inkPath(g, cx + r * 0.55, cy + r * 0.25 - bob * 0.5, r * 0.55, r * 0.5, e.id + 7);
      g.fill();
      inkPath(g, cx, cy - bob, r * 0.9, r * 0.85, e.id, 11, 0.1);
      g.fill();
      eyes(g, cx, cy - bob, r, dir.dx, dir.dy, { angry: true });
      return true;
    }
    case 'feibai': {
      // 飛白：乾筆掃過的筆觸，斷斷續續，順著前進方向拉長
      const ang = Math.atan2(dir.dy, dir.dx);
      g.save();
      g.translate(cx, cy);
      g.rotate(ang);
      g.lineCap = 'round';
      for (let i = 0; i < 5; i++) {
        const y = (i - 2) * r * 0.32;
        const len = r * (2.2 - Math.abs(i - 2) * 0.45);
        g.strokeStyle = `rgba(31,26,23,${0.75 - Math.abs(i - 2) * 0.15})`;
        g.lineWidth = r * 0.22;
        // 斷成兩截，中間留白
        const gapAt = 0.35 + 0.25 * Math.sin(e.id + i * 1.9 + t * 2);
        g.beginPath();
        g.moveTo(-len, y);
        g.lineTo(-len + len * 1.2 * gapAt, y);
        g.moveTo(-len + len * 1.2 * gapAt + r * 0.25, y);
        g.lineTo(r * 0.2, y);
        g.stroke();
      }
      g.lineCap = 'butt';
      g.restore();
      g.fillStyle = INK;
      inkPath(g, cx, cy, r * 0.7, r * 0.7, e.id);
      g.fill();
      eyes(g, cx, cy, r * 0.75, dir.dx, dir.dy);
      return true;
    }
    case 'tugai':
    case 'bigbrush': {
      // 塗改：扛著一支紅頭毛筆
      const big = def.id === 'bigbrush';
      const sway = Math.sin(t * 4) * 0.25;
      g.save();
      g.translate(cx + r * 0.5, cy - r * 0.2);
      g.rotate(-0.9 + sway);
      g.fillStyle = '#8a6a3e';
      g.fillRect(-r * 0.08, -r * 1.5, r * 0.16, r * 1.3);
      g.fillStyle = '#b33a2b';
      g.beginPath();
      g.moveTo(-r * 0.16, -r * 1.5);
      g.quadraticCurveTo(0, -r * 2.15, r * 0.16, -r * 1.5);
      g.closePath();
      g.fill();
      g.restore();
      g.fillStyle = INK;
      inkPath(g, cx, cy, r, r * 0.95, e.id);
      g.fill();
      // 身上沾到的紅墨
      g.fillStyle = 'rgba(179,58,43,0.8)';
      g.beginPath();
      g.arc(cx - r * 0.45, cy + r * 0.45, r * 0.16, 0, Math.PI * 2);
      g.fill();
      eyes(g, cx, cy, r, dir.dx, dir.dy, { angry: big });
      if (big) mouth(g, cx, cy, r);
      return true;
    }
    case 'cuozi':
    case 'jumble': {
      // 錯字：像訊號不良一樣抖，身上有「⇄」；顛倒的臉是倒過來的
      const big = def.id === 'jumble';
      const jx = Math.sin(now / 37 + e.id) > 0.85 ? r * 0.12 : 0;
      g.fillStyle = 'rgba(122,63,160,0.35)';
      inkPath(g, cx + jx + r * 0.12, cy, r, r * 0.95, e.id + 5);
      g.fill();
      g.fillStyle = INK;
      inkPath(g, cx - jx, cy, r, r * 0.95, e.id);
      g.fill();
      eyes(g, cx - jx, cy, r, dir.dx, dir.dy, { flip: big, angry: big });
      if (big) mouth(g, cx - jx, cy, r, true);
      g.fillStyle = '#d9b8ea';
      g.font = `900 ${r * (big ? 0.6 : 0.7)}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('⇄', cx - jx, cy + (big ? -r * 0.05 : r * 0.45));
      return true;
    }
    case 'yinmo':
    case 'nightink': {
      // 隱墨：沒被照到只看得到眼睛；照到了現出虛線輪廓
      const big = def.id === 'nightink';
      if (!e.seen) {
        g.save();
        g.globalAlpha = 0.16;
        g.fillStyle = INK;
        inkPath(g, cx, cy, r, r, e.id);
        g.fill();
        g.restore();
        // 只剩一雙眼睛在眨
        const blink = Math.sin(t * 2.3) > 0.93;
        if (!blink) eyes(g, cx, cy, r * 0.8, dir.dx, dir.dy);
        return false;
      }
      g.save();
      g.globalAlpha = 0.85;
      g.fillStyle = big ? '#1c1f33' : INK;
      inkPath(g, cx, cy, r, r, e.id);
      g.fill();
      g.restore();
      if (big) {
        // 夜墨身上有星點
        g.fillStyle = '#e8d37a';
        for (let i = 0; i < 6; i++) {
          const a = e.id + i * 1.3;
          const tw = 0.5 + 0.5 * Math.sin(t * 3 + i);
          g.globalAlpha = 0.4 + 0.6 * tw;
          g.beginPath();
          g.arc(cx + Math.cos(a) * r * 0.6, cy + Math.sin(a * 1.7) * r * 0.55, r * 0.07, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }
      g.strokeStyle = 'rgba(176,137,28,0.85)';
      g.lineWidth = 1.5;
      g.setLineDash([4, 3]);
      inkPath(g, cx, cy, r * 1.18, r * 1.18, e.id);
      g.stroke();
      g.setLineDash([]);
      eyes(g, cx, cy, r, dir.dx, dir.dy, { angry: big });
      return true;
    }
    case 'bigblob': {
      // 大墨團：頭上一圈往上翹的墨滴，像頂皇冠
      const bob = Math.abs(Math.sin(t * 2.4)) * r * 0.08;
      g.fillStyle = INK;
      for (let i = -2; i <= 2; i++) {
        g.beginPath();
        const bx = cx + i * r * 0.33;
        const by = cy - r * 0.85 - bob;
        g.moveTo(bx - r * 0.12, by + r * 0.15);
        g.quadraticCurveTo(bx, by - r * (0.35 + (i === 0 ? 0.15 : 0)), bx + r * 0.12, by + r * 0.15);
        g.fill();
      }
      inkPath(g, cx, cy - bob, r, r * 0.92, e.id, 12, 0.08);
      g.fill();
      eyes(g, cx, cy - bob, r, dir.dx, dir.dy, { angry: true });
      mouth(g, cx, cy - bob, r);
      return true;
    }
    case 'scorch': {
      // 焦痕：焦黑的身體，裂紋一閃一閃發紅
      g.fillStyle = '#2b1a12';
      inkPath(g, cx, cy, r, r * 0.95, e.id, 10, 0.16);
      g.fill();
      const glow = 0.5 + 0.5 * Math.sin(t * 5);
      g.strokeStyle = `rgba(230,110,40,${0.5 + 0.5 * glow})`;
      g.lineWidth = Math.max(1.5, r * 0.08);
      g.beginPath();
      g.moveTo(cx - r * 0.7, cy + r * 0.1);
      g.lineTo(cx - r * 0.35, cy + r * 0.35);
      g.lineTo(cx - r * 0.05, cy + r * 0.05);
      g.lineTo(cx + r * 0.3, cy + r * 0.45);
      g.lineTo(cx + r * 0.65, cy + r * 0.2);
      g.moveTo(cx + r * 0.1, cy - r * 0.75);
      g.lineTo(cx + r * 0.25, cy - r * 0.45);
      g.stroke();
      eyes(g, cx, cy, r, dir.dx, dir.dy, { angry: true });
      return true;
    }
    case 'wuming': {
      // 無名：身體裡有個模糊的「雨」字頭，血越少字越清楚
      g.fillStyle = INK;
      inkPath(g, cx, cy, r, r, e.id, 14, 0.06);
      g.fill();
      const clear = 1 - Math.max(0, e.hp / e.maxHp);
      g.save();
      g.globalAlpha = 0.25 + 0.75 * clear;
      g.fillStyle = '#e8eef5';
      g.font = `900 ${r * 1.15}px ${FONT}`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      // 字越清楚，模糊的殘影越少
      const blur = (1 - clear) * r * 0.12;
      if (blur > 0.5) {
        g.globalAlpha *= 0.5;
        g.fillText('雨', cx - blur, cy + r * 0.05);
        g.fillText('雨', cx + blur, cy + r * 0.05);
        g.globalAlpha /= 0.5;
      }
      g.fillText('雨', cx, cy + r * 0.05);
      g.restore();
      return true;
    }
    default: {
      g.fillStyle = INK;
      inkPath(g, cx, cy, r, r, e.id);
      g.fill();
      eyes(g, cx, cy, r, dir.dx, dir.dy);
      return true;
    }
  }
}

/** 狀態：燃燒的小火苗、減速的水滴、冰凍的冰框、被打中的閃白。 */
function status(g: G, e: Enemy, cx: number, cy: number, r: number, now: number, hitAt: number | undefined) {
  const t = now / 1000 + e.id;
  if (hitAt !== undefined && now - hitAt < HIT_FLASH_MS) {
    g.save();
    g.globalAlpha = 0.65 * (1 - (now - hitAt) / HIT_FLASH_MS);
    g.fillStyle = '#ffffff';
    inkPath(g, cx, cy, r * 1.02, r * 1.02, e.id);
    g.fill();
    g.restore();
  }
  if (e.burnLeft > 0) {
    for (let i = 0; i < 2; i++) {
      const fx = cx + (i ? r * 0.4 : -r * 0.35);
      const fy = cy - r * 0.75;
      const h = r * (0.45 + 0.15 * Math.sin(t * 14 + i * 2));
      g.fillStyle = 'rgba(232,110,38,0.9)';
      g.beginPath();
      g.moveTo(fx - r * 0.15, fy);
      g.quadraticCurveTo(fx, fy - h * 1.4, fx + r * 0.15, fy);
      g.closePath();
      g.fill();
      g.fillStyle = 'rgba(255,214,120,0.9)';
      g.beginPath();
      g.moveTo(fx - r * 0.07, fy);
      g.quadraticCurveTo(fx, fy - h * 0.8, fx + r * 0.07, fy);
      g.closePath();
      g.fill();
    }
  }
  if (e.frozen > 0) {
    g.fillStyle = 'rgba(160,205,235,0.45)';
    g.strokeStyle = 'rgba(120,180,225,0.95)';
    g.lineWidth = 1.5;
    g.beginPath();
    for (let i = 0; i <= 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = cx + Math.cos(a) * r * 1.25;
      const y = cy + Math.sin(a) * r * 1.25;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.fill();
    g.stroke();
  } else if (e.slowLeft > 0 && e.slowMul < 1) {
    // 減速：身上往下滴水
    g.fillStyle = 'rgba(47,111,159,0.8)';
    for (let i = 0; i < 2; i++) {
      const phase = (t * 1.6 + i * 0.5) % 1;
      const x = cx + (i ? r * 0.55 : -r * 0.5);
      const y = cy + r * 0.3 + phase * r * 0.9;
      g.globalAlpha = 1 - phase;
      g.beginPath();
      g.moveTo(x, y - r * 0.18);
      g.quadraticCurveTo(x + r * 0.12, y, x, y + r * 0.08);
      g.quadraticCurveTo(x - r * 0.12, y, x, y - r * 0.18);
      g.fill();
    }
    g.globalAlpha = 1;
  }
}

export function drawEnemy(g: G, ctx: Ctx, s: GameState, e: Enemy, cell: number, now: number, hitAt?: number) {
  const def = ctx.enemies.get(e.def)!;
  const p = positionAt(s.path, e.d);
  const r = def.size * cell * 0.5;
  const cx = p.x * cell;
  const cy = p.y * cell;
  const dir = direction(s, e);
  // 影子
  g.fillStyle = 'rgba(31,26,23,0.12)';
  g.beginPath();
  g.ellipse(cx, cy + r * 0.95, r * 0.85, r * 0.25, 0, 0, Math.PI * 2);
  g.fill();
  const visible = body(g, def, e, cx, cy, r, now, dir);
  if (!visible) return;
  status(g, e, cx, cy, r, now, hitAt);
  // 一般墨妖受傷才顯示血條；頭目的血條畫在盤面上方
  const f = e.hp / e.maxHp;
  if (!def.boss && f < 1) {
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.fillRect(cx - r, cy - r - 7, r * 2, 3);
    g.fillStyle = '#b33a2b';
    g.fillRect(cx - r, cy - r - 7, r * 2 * Math.max(0, f), 3);
  }
}

/** 頭目在場時，盤面上方顯示名字和血條。 */
export function drawBossBar(g: G, ctx: Ctx, s: GameState, cell: number, width: number) {
  const bosses = s.enemies.filter((e) => ctx.enemies.get(e.def)!.boss);
  bosses.forEach((e, i) => {
    const def = ctx.enemies.get(e.def)!;
    const h = cell * 0.28;
    const y = 4 + i * (h + 4);
    const x = width * 0.12;
    const w = width * 0.76;
    g.fillStyle = 'rgba(31,26,23,0.55)';
    g.fillRect(x, y, w, h);
    // 隱形的頭目沒被照到時，看不到血量
    const f = def.hidden && !e.seen ? 1 : Math.max(0, e.hp / e.maxHp);
    g.fillStyle = def.hidden && !e.seen ? 'rgba(176,137,28,0.35)' : '#b33a2b';
    g.fillRect(x + 2, y + 2, (w - 4) * f, h - 4);
    g.fillStyle = '#fffaf0';
    g.font = `700 ${h * 0.62}px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(def.hidden && !e.seen ? `${def.name}（看不見）` : def.name, x + w / 2, y + h / 2 + 1);
  });
}

/** 打倒墨妖後留在紙上的墨漬，慢慢淡掉。 */
export function drawStain(g: G, x: number, y: number, size: number, cell: number, age: number, seed: number) {
  const r = size * cell * 0.55;
  g.fillStyle = `rgba(31,26,23,${0.16 * (1 - age)})`;
  inkPath(g, x * cell, y * cell, r, r * 0.7, seed, 10, 0.22);
  g.fill();
  // 濺出去的小點
  for (let i = 0; i < 3; i++) {
    const a = seed * 2.1 + i * 2.2;
    g.beginPath();
    g.arc(x * cell + Math.cos(a) * r * 1.3, y * cell + Math.sin(a) * r * 0.9, r * 0.12, 0, Math.PI * 2);
    g.fill();
  }
}
