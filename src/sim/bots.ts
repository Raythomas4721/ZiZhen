// 模擬用的機器人玩家。只透過 actions.ts 的操作玩，跟真人一樣。

import { canDraw, canMerge, combine, draw, moveTower, place, placeCheck, sell, towerAt, useTool } from '../engine/actions';
import { pathIndex } from '../engine/board';
import type { Ctx } from '../engine/ctx';
import { kindOf } from '../engine/stats';
import { COLS, ROWS, type Card, type Cell, type GameState, type ToolId } from '../engine/types';
import { pairs } from '../engine/words';

export type Rand = () => number;
export type Bot = (ctx: Ctx, s: GameState, rand: Rand) => GameState;

export function makeRand(seed: number): Rand {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) | 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function coverage(s: GameState, x: number, y: number, r = 1.6): number {
  let n = 0;
  for (const p of s.path) if (Math.hypot(p.x - x, p.y - y) <= r) n++;
  return n;
}

function freeGrass(s: GameState): Cell[] {
  const out: Cell[] = [];
  for (let y = 0; y < ROWS; y++)
    for (let x = 0; x < COLS; x++) if (pathIndex(s.path, x, y) < 0 && !towerAt(s, x, y)) out.push({ x, y });
  return out;
}

function freePath(s: GameState): Cell[] {
  return s.path.filter((p, i) => i > 0 && !towerAt(s, p.x, p.y));
}

/** 放下這個字以後，會跟鄰居連出幾個詞。 */
function wordsAt(ctx: Ctx, s: GameState, ch: string, x: number, y: number): number {
  let n = 0;
  const l = towerAt(s, x - 1, y);
  const r = towerAt(s, x + 1, y);
  const u = towerAt(s, x, y - 1);
  const d = towerAt(s, x, y + 1);
  if (l && ctx.words.has(l.ch + ch)) n++;
  if (r && ctx.words.has(ch + r.ch)) n++;
  if (u && ctx.words.has(u.ch + ch)) n++;
  if (d && ctx.words.has(ch + d.ch)) n++;
  return n;
}

/** 空格旁邊有沒有可能以後湊詞（鄰居能跟書箱裡的某個字湊）。 */
function potential(ctx: Ctx, s: GameState, ch: string, x: number, y: number): number {
  let n = 0;
  for (const [dx, dy] of [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ]) {
    const nx = x + dx;
    const ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || towerAt(s, nx, ny)) continue;
    if (pathIndex(s.path, nx, ny) >= 0) continue;
    if (s.box.some((b) => pairs(ctx, ch, b))) n++;
  }
  return n;
}

function bestCell(cells: Cell[], score: (c: Cell) => number): Cell | null {
  let best: Cell | null = null;
  let bs = -Infinity;
  for (const c of cells) {
    const v = score(c);
    if (v > bs) {
      bs = v;
      best = c;
    }
  }
  return best;
}

function sellOrKeep(s: GameState, c: Card): GameState {
  return sell(s, c.uid);
}

function mergeHand(ctx: Ctx, s: GameState): GameState {
  for (const a of s.hand) {
    for (const b of s.hand) {
      if (a.uid !== b.uid && a.kind === 'char' && b.kind === 'char' && canMerge({ ch: a.v, lv: a.lv }, { ch: b.v, lv: b.lv })) {
        return mergeHand(ctx, combine(ctx, s, a.uid, b.uid));
      }
    }
  }
  return s;
}

function combineParts(ctx: Ctx, s: GameState): GameState {
  const parts = s.hand.filter((h) => h.kind === 'part');
  for (const a of parts)
    for (const b of parts) {
      if (a.uid === b.uid) continue;
      const n = combine(ctx, s, a.uid, b.uid);
      if (!n.events.some((e) => e.t === 'invalid')) return combineParts(ctx, n);
    }
  return s;
}

function mergeBoard(ctx: Ctx, s: GameState): GameState {
  for (const a of s.towers)
    for (const b of s.towers) {
      if (a.id === b.id || !canMerge(a, b)) continue;
      const [from, to] = coverage(s, a.x, a.y) <= coverage(s, b.x, b.y) ? [a, b] : [b, a];
      const n = moveTower(ctx, s, from, to);
      if (n !== s && !n.events.some((e) => e.t === 'invalid')) return mergeBoard(ctx, n);
    }
  return s;
}

function drawAll(ctx: Ctx, s: GameState, keep = 0): GameState {
  while (canDraw(s) && s.coins - keep >= 0) {
    const n = draw(ctx, s);
    if (n.events.some((e) => e.t === 'invalid')) break;
    s = n;
    if (s.coins < keep) break;
  }
  return s;
}

/** 亂放：抽到就隨便放。 */
export const randomBot: Bot = (ctx, s, rand) => {
  while (canDraw(s) && rand() < 0.8) s = draw(ctx, s);
  s = combineParts(ctx, s);
  for (const c of [...s.hand]) {
    if (c.kind !== 'char') {
      s = sellOrKeep(s, c);
      continue;
    }
    const onPath = kindOf(ctx, c.v) === 'wall' && rand() < 0.3;
    const cells = onPath ? freePath(s) : freeGrass(s);
    if (!cells.length) continue;
    const cell = cells[Math.floor(rand() * cells.length)];
    s = place(ctx, s, c.uid, cell.x, cell.y);
  }
  return s;
};

interface SmartOpts {
  words: boolean;
}

function smart(opts: SmartOpts): Bot {
  return (ctx, s) => {
    s = drawAll(ctx, s);
    s = combineParts(ctx, s);
    s = mergeHand(ctx, s);
    for (const c of [...s.hand]) {
      if (c.kind === 'part') continue;
      if (c.kind === 'tool') {
        s = useToolSmart(ctx, s, c, opts);
        continue;
      }
      // 先找同字同級的字合成
      const same = s.towers.filter((t) => canMerge({ ch: c.v, lv: c.lv }, t));
      if (same.length) {
        const t = bestCell(same, (x) => coverage(s, x.x, x.y));
        if (t) {
          s = place(ctx, s, c.uid, t.x, t.y);
          continue;
        }
      }
      const wall = kindOf(ctx, c.v) === 'wall';
      let cell: Cell | null;
      if (wall && freePath(s).length && (!opts.words || s.towers.filter((t) => t.onPath).length < 2)) {
        // 屏障放在旁邊字塔最多的路上
        cell = bestCell(freePath(s), (p) => s.towers.filter((t) => Math.hypot(t.x - p.x, t.y - p.y) <= 1.6).length + pathIndex(s.path, p.x, p.y) * 0.01);
      } else {
        cell = bestCell(freeGrass(s), (p) => {
          let v = coverage(s, p.x, p.y);
          if (opts.words) v += wordsAt(ctx, s, c.v, p.x, p.y) * 8 + potential(ctx, s, c.v, p.x, p.y) * 0.5;
          return v;
        });
      }
      if (cell && !placeCheck(ctx, s, c, cell.x, cell.y)) s = place(ctx, s, c.uid, cell.x, cell.y);
    }
    s = mergeBoard(ctx, s);
    // 剩下放不出去的部件就賣掉，空出手牌
    if (s.hand.length >= 4) for (const c of s.hand.filter((h) => h.kind === 'part')) s = sell(s, c.uid);
    return s;
  };
}

function useToolSmart(ctx: Ctx, s: GameState, c: Card, opts: SmartOpts): GameState {
  const tool = c.v as ToolId;
  if (tool === 'weight') {
    const t = [...s.towers].filter((x) => !x.locked).sort((a, b) => b.lv - a.lv)[0];
    return t ? useTool(ctx, s, c.uid, t.x, t.y) : s;
  }
  if (tool === 'brush' && opts.words) {
    const inWord = new Set(s.words.flatMap((w) => [`${w.a.x},${w.a.y}`, `${w.b.x},${w.b.y}`]));
    for (const t of s.towers) {
      if (inWord.has(`${t.x},${t.y}`)) continue;
      const n = useTool(ctx, s, c.uid, t.x, t.y);
      if (n.words.length > s.words.length) return n;
    }
    return sell(s, c.uid);
  }
  return sell(s, c.uid);
}

/** 只合成：不管詞，只顧升級和射程。 */
export const mergeBot: Bot = smart({ words: false });
/** 湊詞：放字時優先連成詞。 */
export const wordBot: Bot = smart({ words: true });

export const BOTS: Record<string, Bot> = { random: randomBot, merge: mergeBot, word: wordBot };
