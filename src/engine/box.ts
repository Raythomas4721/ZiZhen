// 書箱：每章開始前挑 8 個字，抽卡只會從書箱裡抽。

import { chapterOf, unlockedChars, wordsWithin, type Ctx } from './ctx';
import { partnersOf } from './words';

export const BOX_SIZE = 8;

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
  /** 在這個書箱裡湊不到 2 個詞的字。 */
  weak: string[];
}

export function boxReport(ctx: Ctx, box: string[]): BoxReport {
  return {
    words: wordsWithin(ctx, box).length,
    weak: box.filter((c) => partnersOf(ctx, c, box).length < 2),
  };
}

function combos<T>(items: T[], k: number, cb: (pick: T[]) => void, start = 0, acc: T[] = []) {
  if (acc.length === k) {
    cb(acc);
    return;
  }
  for (let i = start; i <= items.length - (k - acc.length); i++) {
    acc.push(items[i]);
    combos(items, k, cb, i + 1, acc);
    acc.pop();
  }
}

/** 推薦的書箱：詞最多、而且每個字都至少湊得出 2 個詞。 */
export function recommendBox(ctx: Ctx, chapterId: string): string[] {
  const cands = boxCandidates(ctx, chapterId);
  const k = boxSize(ctx, chapterId);
  if (cands.length <= k) return cands;
  // 新解鎖的字排前面，同分時優先選，玩家才會碰到新東西。
  const fresh = new Set(chapterOf(ctx, chapterId).unlock);
  let best: string[] = cands.slice(0, k);
  let bestScore = -Infinity;
  combos(cands, k, (pick) => {
    const r = boxReport(ctx, pick);
    const score = r.words * 10 - r.weak.length * 100 + pick.filter((c) => fresh.has(c)).length;
    if (score > bestScore) {
      bestScore = score;
      best = [...pick];
    }
  });
  return best;
}
