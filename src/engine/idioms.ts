// 成語：四個字橫排（左到右）或直排（上到下）連成一線，就開始集氣；集滿可以放全場大招。

import type { Ctx } from './ctx';
import { refresh } from './refresh';
import { PAGE_HP, TICK_RATE, type GameState, type Tower } from './types';

/** 波次進行中，排好的成語每個 tick 集一點氣。 */
export function chargeIdioms(ctx: Ctx, n: GameState) {
  if (!n.idioms.length) return;
  const charged = new Set<string>();
  for (const a of n.idioms) {
    if (charged.has(a.w)) continue; // 同一句排兩次不會集兩倍
    charged.add(a.w);
    const def = ctx.idioms.get(a.w)!;
    const before = n.charge[a.w] ?? 0;
    if (before >= 1) continue;
    const after = Math.min(1, before + 1 / (def.charge * TICK_RATE));
    n.charge = { ...n.charge, [a.w]: after };
    if (after >= 1) n.events.push({ t: 'idiomReady', w: a.w });
  }
}

export function canCast(s: GameState, w: string): boolean {
  return s.phase === 'wave' && (s.charge[w] ?? 0) >= 1;
}

export function castIdiom(ctx: Ctx, s: GameState, w: string): GameState {
  const def = ctx.idioms.get(w);
  if (!def) return s;
  if (s.phase !== 'wave') return { ...s, events: [{ t: 'invalid', reason: '墨妖來了才能放大招' }] };
  if ((s.charge[w] ?? 0) < 1) return { ...s, events: [{ t: 'invalid', reason: '還在集氣' }] };
  const n: GameState = { ...s, enemies: s.enemies.map((e) => ({ ...e })), charge: { ...s.charge, [w]: 0 }, events: [{ t: 'idiom', w }] };
  const e = def.effect;
  for (const en of n.enemies) {
    const boss = ctx.enemies.get(en.def)!.boss;
    const k = boss ? 1 / 3 : 1;
    if (e.kind === 'blast') {
      en.hp -= en.maxHp * e.frac * k;
      en.burnDps = Math.max(en.burnDps, en.maxHp * 0.05 * k);
      en.burnLeft = Math.max(en.burnLeft, e.burnSec * TICK_RATE);
    } else if (e.kind === 'push') {
      en.d = Math.max(-0.5, en.d - e.cells * k);
    } else if (e.kind === 'freeze') {
      en.frozen = Math.max(en.frozen, Math.round(e.sec * k * TICK_RATE));
    }
  }
  if (e.kind === 'shield') {
    n.pageHp = Math.min(PAGE_HP, n.pageHp + e.heal);
    n.shield = Math.max(n.shield, e.sec * TICK_RATE);
  }
  // 大招打死的墨妖在下一個 tick 收屍、給錢
  return n;
}

/** 錯字對調的時間到了就換回來。 */
export function tickSwaps(ctx: Ctx, n: GameState) {
  if (!n.swaps.length) return;
  let changed = false;
  const keep = [];
  for (const sw of n.swaps) {
    const left = sw.left - 1;
    if (left > 0) {
      keep.push({ ...sw, left });
      continue;
    }
    const a = n.towers.find((t) => t.id === sw.a);
    const b = n.towers.find((t) => t.id === sw.b);
    if (a && b) {
      swapContent(a, b);
      changed = true;
    }
  }
  n.swaps = keep;
  if (changed) refresh(ctx, n);
}

/** 交換兩座字塔上的字（位置不動）。 */
export function swapContent(a: Tower, b: Tower) {
  const ch = a.ch;
  const lv = a.lv;
  a.ch = b.ch;
  a.lv = b.lv;
  b.ch = ch;
  b.lv = lv;
}

/** 波次結束時，所有被對調的字都換回來。 */
export function restoreSwaps(ctx: Ctx, n: GameState) {
  if (!n.swaps.length) return;
  n.swaps = n.swaps.map((sw) => ({ ...sw, left: 1 }));
  tickSwaps(ctx, n);
}
