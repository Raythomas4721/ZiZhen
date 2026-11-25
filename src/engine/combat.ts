// 戰鬥：字塔攻擊、屏障擋路、燃燒、塗改。都在 step 的草稿狀態上改。

import { pathIndex, positionAt } from './board';
import type { Ctx } from './ctx';
import { becomeCard } from './finale';
import { swapContent } from './idioms';
import { refresh } from './refresh';
import { roll } from './rng';
import { kindOf } from './stats';
import { TICK_RATE, type Enemy, type GameState, type Tower } from './types';

const STOP_GAP = 0.55;

/** 非飛白的墨妖遇到路上的屏障會停下來啃。回傳這個 tick 實際能走多遠。 */
export function limitByBlockers(ctx: Ctx, n: GameState, e: Enemy, stepLen: number): number {
  const def = ctx.enemies.get(e.def)!;
  if (def.flying) return stepLen;
  let best: Tower | null = null;
  let bestStop = Infinity;
  for (const t of n.towers) {
    if (!t.onPath || t.block <= 0) continue;
    const stop = pathIndex(n.path, t.x, t.y) - STOP_GAP;
    if (stop >= e.d - 1e-6 && stop < bestStop) {
      bestStop = stop;
      best = t;
    }
  }
  if (!best || e.d + stepLen < bestStop) return stepLen;
  best.block -= def.bite / TICK_RATE;
  return Math.max(0, bestStop - e.d);
}

export function runCombat(ctx: Ctx, n: GameState): void {
  // 燃燒
  for (const e of n.enemies) {
    if (e.burnLeft > 0) {
      e.burnLeft--;
      e.hp -= e.burnDps / TICK_RATE;
    }
  }

  // 塗改：把附近一個字塗黑
  let boardChanged = false;
  for (const e of n.enemies) {
    const def = ctx.enemies.get(e.def)!;
    if (!def.inker) continue;
    if (e.inkCool > 0) {
      e.inkCool--;
      continue;
    }
    const p = positionAt(n.path, e.d);
    let target: Tower | null = null;
    let bestD = def.boss ? 2.2 : 1.6;
    for (const t of n.towers) {
      if (t.locked || t.inked > 0) continue;
      const dist = Math.hypot(t.x + 0.5 - p.x, t.y + 0.5 - p.y);
      if (dist < bestD) {
        bestD = dist;
        target = t;
      }
    }
    e.inkCool = TICK_RATE * (def.boss ? 4 : 5);
    if (target) {
      target.inked = TICK_RATE * 2;
      n.events.push({ t: 'ink', x: target.x, y: target.y });
      boardChanged = true;
    }
  }

  // 錯字：把附近一個詞的兩個字對調（紙鎮鎖住的字不會被動）
  for (const e of n.enemies) {
    const def = ctx.enemies.get(e.def)!;
    if (!def.swapper) continue;
    if (e.inkCool > 0) {
      e.inkCool--;
      continue;
    }
    e.inkCool = TICK_RATE * (def.boss ? 4 : 6);
    const p = positionAt(n.path, e.d);
    const busy = new Set(n.swaps.flatMap((sw) => [sw.a, sw.b]));
    let best: [Tower, Tower] | null = null;
    let bestD = def.boss ? 2.6 : 2.2;
    for (const w of n.words) {
      const a = n.towers.find((t) => t.x === w.a.x && t.y === w.a.y);
      const b = n.towers.find((t) => t.x === w.b.x && t.y === w.b.y);
      if (!a || !b || a.locked || b.locked || a.onPath || b.onPath || busy.has(a.id) || busy.has(b.id)) continue;
      const dist = Math.hypot((a.x + b.x) / 2 + 0.5 - p.x, (a.y + b.y) / 2 + 0.5 - p.y);
      if (dist < bestD) {
        bestD = dist;
        best = [a, b];
      }
    }
    if (best) {
      swapContent(best[0], best[1]);
      n.swaps = [...n.swaps, { a: best[0].id, b: best[1].id, left: TICK_RATE * 5 }];
      n.events.push({ t: 'swap', a: { x: best[0].x, y: best[0].y }, b: { x: best[1].x, y: best[1].y } });
      boardChanged = true;
    }
  }

  // 字塔攻擊
  const positions = new Map<number, { x: number; y: number }>();
  for (const e of n.enemies) positions.set(e.id, positionAt(n.path, e.d));
  revealHidden(ctx, n, positions);
  for (const t of n.towers) {
    if (t.inked > 0) {
      t.inked--;
      if (t.inked === 0) boardChanged = true;
      continue;
    }
    if (t.cool > 0) t.cool--;
    if (!t.stats.attacks || t.cool > 0) continue;
    const cx = t.x + 0.5;
    const cy = t.y + 0.5;
    let target: Enemy | null = null;
    for (const e of n.enemies) {
      if (e.hp <= 0) continue;
      const p = positions.get(e.id)!;
      if (!e.seen) continue;
      if (Math.hypot(p.x - cx, p.y - cy) > t.stats.range) continue;
      if (!target || e.d > target.d) target = e;
    }
    if (!target) continue;
    const st = t.stats;
    t.cool = Math.max(2, Math.round(st.cd));
    const crit = st.crit > 0 && roll(n) < st.crit;
    const dmg = st.dmg * (crit ? 2 : 1);
    target.hp -= dmg;
    const tp = positions.get(target.id)!;
    n.events.push({ t: 'hit', from: { x: t.x, y: t.y }, to: tp, kind: kindOf(ctx, t.ch), crit, id: target.id });
    if (st.slow > 0) applySlow(target, st.slow, st.slowTicks);
    if (st.burn > 0) applyBurn(target, dmg * st.burn);
    if (st.freeze > 0 && roll(n) < st.freeze) {
      const boss = ctx.enemies.get(target.def)!.boss;
      target.frozen = Math.max(target.frozen, boss ? 6 : 20);
    }
    if (st.splash > 0) {
      for (const o of n.enemies) {
        if (o === target || o.hp <= 0) continue;
        const p = positions.get(o.id)!;
        if (Math.hypot(p.x - tp.x, p.y - tp.y) > st.splash) continue;
        o.hp -= dmg * 0.5;
        if (st.burn > 0) applyBurn(o, dmg * 0.5 * st.burn);
      }
    }
  }

  // 收屍
  const alive: Enemy[] = [];
  for (const e of n.enemies) {
    if (e.hp > 0) {
      alive.push(e);
      continue;
    }
    const def = ctx.enemies.get(e.def)!;
    const p = positions.get(e.id) ?? positionAt(n.path, e.d);
    becomeCard(ctx, n, def);
    n.coins += def.reward;
    n.events.push({ t: 'kill', x: p.x, y: p.y, reward: def.reward, size: def.size });
  }
  n.enemies = alive;

  // 被啃穿的屏障
  const standing: Tower[] = [];
  for (const t of n.towers) {
    if (t.onPath && t.block <= 0) {
      n.events.push({ t: 'broken', x: t.x, y: t.y });
      boardChanged = true;
    } else standing.push(t);
  }
  n.towers = standing;

  if (boardChanged) refresh(ctx, n);
}

function applySlow(e: Enemy, mul: number, ticks: number) {
  if (e.slowLeft > 0 && e.slowMul < mul) {
    e.slowLeft = Math.max(e.slowLeft, ticks);
    return;
  }
  e.slowMul = mul;
  e.slowLeft = Math.max(e.slowLeft, ticks);
}

function applyBurn(e: Enemy, dps: number) {
  e.burnDps = Math.max(e.burnDps, dps);
  e.burnLeft = TICK_RATE * 3;
}

/** 隱墨離書頁剩幾格時一定現形（退路：沒有光環字也打得到）。 */
export const REVEAL_NEAR_PAGE = 6;

/** 隱墨：在光環字（沒被塗黑）的射程內，或快走到書頁時，才看得到。 */
function revealHidden(ctx: Ctx, n: GameState, positions: Map<number, { x: number; y: number }>) {
  let lights: Tower[] | null = null;
  for (const e of n.enemies) {
    const def = ctx.enemies.get(e.def)!;
    if (!def.hidden) {
      e.seen = true;
      continue;
    }
    if (e.d >= n.path.length - REVEAL_NEAR_PAGE) {
      e.seen = true;
      continue;
    }
    lights ??= n.towers.filter((t) => t.inked === 0 && kindOf(ctx, t.ch) === 'light');
    const p = positions.get(e.id)!;
    e.seen = lights.some((t) => Math.hypot(t.x + 0.5 - p.x, t.y + 0.5 - p.y) <= t.stats.range);
  }
}
