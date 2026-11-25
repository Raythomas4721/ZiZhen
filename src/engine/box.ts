// 書箱：每章開始前挑 8 個字，抽卡只會從書箱裡抽。

import { chapterOf, idiomsWithin, unlockedChars, wordsWithin, type Ctx } from './ctx';
import type { IdiomDef } from './types';
import { partnersOf } from './words';

export const BOX_SIZE = 8;
/** 推薦書箱時，這章新解鎖的字加分，讓玩家碰到新東西。 */
const FRESH_BONUS = 12;
/** 推薦書箱時，湊得出成語很加分。 */
const IDIOM_BONUS = 40;

/** 這一章可以挑進書箱的字。 */
export function boxCandidates(ctx: Ctx, chapterId: string): string[] {
  const ch = chapterOf(ctx, chapterId);
  return ch.fixedBox ? [...ch.fixedBox] : unlockedChars(ctx, chapterId);
}

export function boxSize(ctx: Ctx, chapterId: string): number {
  return Math.min(BOX_SIZE, boxCandidates(ctx, chapterId).length);
}

export interface BoxReport {
  words: number;
  idioms: number;
  /** 在這個書箱裡湊不到 2 個詞的字。 */
  weak: string[];
}

export function boxReport(ctx: Ctx, box: string[]): BoxReport {
  return {
    words: wordsWithin(ctx, box).length,
    idioms: idiomsWithin(ctx, box).length,
    weak: box.filter((c) => partnersOf(ctx, c, box).length < 2),
  };
}

const recommendCache = new Map<string, string[]>();

/**
 * 推薦的書箱：詞多、成語多、每個字都至少湊得出 2 個詞，新字優先。
 * 候選字最多二十幾個、挑 8 個，組合有幾十萬種，所以用位元遮罩算，算過就記住。
 */
export function recommendBox(ctx: Ctx, chapterId: string): string[] {
  const cached = recommendCache.get(chapterId);
  if (cached) return [...cached];
  const cands = boxCandidates(ctx, chapterId);
  const k = boxSize(ctx, chapterId);
  if (cands.length <= k) return cands;
  const idx = new Map(cands.map((c, i) => [c, i]));
  const bit = (c: string) => 1 << idx.get(c)!;
  const wordMasks: [number, number, number][] = [];
  for (const w of ctx.content.words) {
    const [a, b] = [...w.w];
    if (idx.has(a) && idx.has(b)) wordMasks.push([bit(a) | bit(b), idx.get(a)!, idx.get(b)!]);
  }
  const idiomMasks = ctx.content.idioms.filter((w) => [...w.w].every((c) => idx.has(c))).map((w) => [...w.w].reduce((m, c) => m | bit(c), 0));
  const freshMask = chapterOf(ctx, chapterId).unlock.reduce((m, c) => (idx.has(c) ? m | bit(c) : m), 0);
  const popcount = (x: number) => {
    let n = 0;
    while (x) {
      x &= x - 1;
      n++;
    }
    return n;
  };
  const n = cands.length;
  const partners: number[] = new Array(n).fill(0);
  let best = (1 << k) - 1;
  let bestScore = -Infinity;
  const visit = (mask: number) => {
    let words = 0;
    partners.fill(0);
    for (const [m, a, b] of wordMasks) {
      if ((mask & m) !== m) continue;
      words++;
      partners[a] |= 1 << b;
      partners[b] |= 1 << a;
    }
    let weak = 0;
    for (let i = 0; i < n; i++) if (mask & (1 << i) && popcount(partners[i]) < 2) weak++;
    let idioms = 0;
    for (const m of idiomMasks) if ((mask & m) === m) idioms++;
    const score = words * 10 + idioms * IDIOM_BONUS - weak * 100 + popcount(mask & freshMask) * FRESH_BONUS;
    if (score > bestScore) {
      bestScore = score;
      best = mask;
    }
  };
  const walk = (start: number, left: number, mask: number) => {
    if (left === 0) return visit(mask);
    for (let i = start; i <= n - left; i++) walk(i + 1, left - 1, mask | (1 << i));
  };
  walk(0, k, 0);
  const out = cands.filter((_, i) => best & (1 << i));
  recommendCache.set(chapterId, out);
  return [...out];
}

const reachCache = new Map<string, IdiomDef[]>();

/** 這一局有機會排出來的成語（書箱的字，加上部件合得出的字）。 */
export function reachableIdioms(ctx: Ctx, chapterId: string, box: string[]): IdiomDef[] {
  const key = chapterId + '|' + box.join('');
  const hit = reachCache.get(key);
  if (hit) return hit;
  const ch = chapterOf(ctx, chapterId);
  const fromParts = ctx.recipes.filter((r) => ch.parts.includes(r.a) && ch.parts.includes(r.b)).map((r) => r.out);
  const out = idiomsWithin(ctx, [...box, ...fromParts]);
  reachCache.set(key, out);
  return out;
}
