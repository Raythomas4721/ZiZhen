// 書箱：每章開始前挑 8 個字，抽卡只會從書箱裡抽。

import { chapterOf, idiomsWithin, unlockedChars, wordsWithin, type Ctx } from './ctx';
import type { IdiomDef } from './types';
import { partnersOf } from './words';

export const BOX_SIZE = 8;
/** 推薦書箱時，這章新解鎖的字加分，讓玩家碰到新東西。 */
const FRESH_BONUS = 12;
/** 推薦書箱時，湊得出成語很加分。 */
const IDIOM_BONUS = 40;
/** 終章：書箱裡要有能跟終章字湊詞的字。 */
const FINALE_BONUS = 500;
/** 組合數在這以下就全部算一遍，超過就用貪心加交換改良。 */
const EXACT_LIMIT = 250_000;

/** 這一章可以挑進書箱的字。unlockedSecrets 是存檔裡已經找回的隱藏字。 */
export function boxCandidates(ctx: Ctx, chapterId: string, unlockedSecrets: string[] = []): string[] {
  const ch = chapterOf(ctx, chapterId);
  if (ch.fixedBox) return [...ch.fixedBox];
  const secrets = (ch.secret ?? []).filter((c) => unlockedSecrets.includes(c));
  return [...unlockedChars(ctx, chapterId), ...secrets];
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

/** 終章字能跟哪些字湊詞（書箱裡要有其中一個）。 */
export function finalePartners(ctx: Ctx, chapterId: string): string[] {
  const fin = chapterOf(ctx, chapterId).rules?.finale;
  if (!fin) return [];
  return partnersOf(ctx, fin.char, ctx.chars.keys());
}

function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 0; i < k; i++) r = (r * (n - i)) / (i + 1);
  return r;
}

const recommendCache = new Map<string, string[]>();

/**
 * 推薦的書箱：詞多、成語多、每個字都至少湊得出 2 個詞，新字優先；終章一定放得進終章字的搭檔。
 * 候選字少時全部組合算一遍；多時（後面幾章有三十幾個字）先貪心挑，再一個一個換到不能更好為止。
 */
export function recommendBox(ctx: Ctx, chapterId: string): string[] {
  const cached = recommendCache.get(chapterId);
  if (cached) return [...cached];
  const cands = boxCandidates(ctx, chapterId);
  const k = boxSize(ctx, chapterId);
  if (cands.length <= k) return cands;
  const n = cands.length;
  const idx = new Map(cands.map((c, i) => [c, i]));

  // 不分順序的字對（夜雨、雨夜算同一對）
  const pairKeys = new Set<string>();
  const pairs: [number, number][] = [];
  const words: [number, number][] = [];
  for (const w of ctx.content.words) {
    const [a, b] = [...w.w];
    if (!idx.has(a) || !idx.has(b)) continue;
    const i = idx.get(a)!;
    const j = idx.get(b)!;
    words.push([i, j]);
    const key = i < j ? `${i},${j}` : `${j},${i}`;
    if (!pairKeys.has(key)) {
      pairKeys.add(key);
      pairs.push([i, j]);
    }
  }
  const idioms = ctx.content.idioms.filter((w) => [...w.w].every((c) => idx.has(c))).map((w) => [...w.w].map((c) => idx.get(c)!));
  const fresh = new Set(chapterOf(ctx, chapterId).unlock.filter((c) => idx.has(c)).map((c) => idx.get(c)!));
  const finale = finalePartners(ctx, chapterId).filter((c) => idx.has(c)).map((c) => idx.get(c)!);

  const sel = new Uint8Array(n);
  const partnerCount = new Int32Array(n);
  const score = (): number => {
    let ws = 0;
    for (const [a, b] of words) if (sel[a] && sel[b]) ws++;
    partnerCount.fill(0);
    for (const [a, b] of pairs) {
      if (sel[a] && sel[b]) {
        partnerCount[a]++;
        partnerCount[b]++;
      }
    }
    let weak = 0;
    let fr = 0;
    for (let i = 0; i < n; i++) {
      if (!sel[i]) continue;
      if (partnerCount[i] < 2) weak++;
      if (fresh.has(i)) fr++;
    }
    let id = 0;
    for (const q of idioms) if (q.every((i) => sel[i])) id++;
    const fin = finale.length && finale.some((i) => sel[i]) ? FINALE_BONUS : 0;
    return ws * 10 + id * IDIOM_BONUS - weak * 100 + fr * FRESH_BONUS + fin;
  };

  let best: number[] = [];
  if (choose(n, k) <= EXACT_LIMIT) {
    let bestScore = -Infinity;
    const pick: number[] = [];
    const walk = (start: number) => {
      if (pick.length === k) {
        const v = score();
        if (v > bestScore) {
          bestScore = v;
          best = [...pick];
        }
        return;
      }
      for (let i = start; i <= n - (k - pick.length); i++) {
        sel[i] = 1;
        pick.push(i);
        walk(i + 1);
        pick.pop();
        sel[i] = 0;
      }
    };
    walk(0);
  } else {
    // 從幾個起點出發（空箱、每句成語的四個字先放進去），各自貪心再交換改良，取最好的
    const seeds: number[][] = [[], ...idioms.filter((q) => q.length <= k)];
    let bestScore = -Infinity;
    for (const seed of seeds) {
      sel.fill(0);
      const chosen = [...new Set(seed)];
      for (const i of chosen) sel[i] = 1;
      while (chosen.length < k) {
        let bi = -1;
        let bv = -Infinity;
        for (let i = 0; i < n; i++) {
          if (sel[i]) continue;
          sel[i] = 1;
          const v = score();
          sel[i] = 0;
          if (v > bv) {
            bv = v;
            bi = i;
          }
        }
        sel[bi] = 1;
        chosen.push(bi);
      }
      let cur = score();
      let improved = true;
      while (improved) {
        improved = false;
        for (let a = 0; a < chosen.length && !improved; a++) {
          for (let b = 0; b < n && !improved; b++) {
            if (sel[b]) continue;
            const out = chosen[a];
            sel[out] = 0;
            sel[b] = 1;
            const v = score();
            if (v > cur) {
              cur = v;
              chosen[a] = b;
              improved = true;
            } else {
              sel[b] = 0;
              sel[out] = 1;
            }
          }
        }
      }
      if (cur > bestScore) {
        bestScore = cur;
        best = [...chosen];
      }
    }
  }
  const set = new Set(best);
  const out = cands.filter((_, i) => set.has(i));
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
