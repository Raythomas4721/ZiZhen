// 詞：字照閱讀順序相鄰就會連成詞（橫排左到右、直排上到下）。被塗黑的字不算。

import type { Ctx } from './ctx';
import type { ActiveIdiom, ActiveWord, Cell, Tower } from './types';

export function findWords(ctx: Ctx, towers: Tower[]): ActiveWord[] {
  const at = new Map<string, Tower>();
  for (const t of towers) at.set(`${t.x},${t.y}`, t);
  const out: ActiveWord[] = [];
  for (const t of towers) {
    if (t.inked > 0) continue;
    const right = at.get(`${t.x + 1},${t.y}`);
    if (right && right.inked === 0 && ctx.words.has(t.ch + right.ch)) {
      out.push({ w: t.ch + right.ch, a: { x: t.x, y: t.y }, b: { x: right.x, y: right.y }, lv: Math.min(t.lv, right.lv), dir: 'h' });
    }
    const down = at.get(`${t.x},${t.y + 1}`);
    if (down && down.inked === 0 && ctx.words.has(t.ch + down.ch)) {
      out.push({ w: t.ch + down.ch, a: { x: t.x, y: t.y }, b: { x: down.x, y: down.y }, lv: Math.min(t.lv, down.lv), dir: 'v' });
    }
  }
  return out;
}

/** 這兩個字（不分順序）能不能湊成詞。 */
export function pairs(ctx: Ctx, a: string, b: string): boolean {
  return ctx.words.has(a + b) || ctx.words.has(b + a);
}

/** 這個字能跟這些字裡的哪些湊成詞。 */
export function partnersOf(ctx: Ctx, ch: string, pool: Iterable<string>): string[] {
  const out: string[] = [];
  for (const o of pool) if (o !== ch && pairs(ctx, ch, o) && !out.includes(o)) out.push(o);
  return out;
}

/** 成語：四個字橫排（左到右）或直排（上到下）連成一線。被塗黑的字不算。 */
export function findIdioms(ctx: Ctx, towers: Tower[]): ActiveIdiom[] {
  if (!ctx.content.idioms.length) return [];
  const at = new Map<string, Tower>();
  for (const t of towers) at.set(`${t.x},${t.y}`, t);
  const out: ActiveIdiom[] = [];
  for (const t of towers) {
    for (const [dx, dy, dir] of [
      [1, 0, 'h'],
      [0, 1, 'v'],
    ] as const) {
      const cells: Cell[] = [];
      let text = '';
      for (let i = 0; i < 4; i++) {
        const o = at.get(`${t.x + dx * i},${t.y + dy * i}`);
        if (!o || o.inked > 0) break;
        cells.push({ x: o.x, y: o.y });
        text += o.ch;
      }
      if (cells.length === 4 && ctx.idioms.has(text)) out.push({ w: text, cells, dir });
    }
  }
  return out;
}
