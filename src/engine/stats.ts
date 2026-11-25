// 字塔數值：部首決定類型，等級放大，詞和光環再往上加。

import type { Ctx } from './ctx';
import type { Kind, TowerStats } from './types';

/** 每一級的強度倍率。 */
export const LV_MUL = [1, 2.2, 4.8, 10, 20];

export const BASE: Record<Kind, TowerStats> = {
  fire: { dmg: 8, range: 1.6, cd: 20, splash: 0.85, slow: 0, slowTicks: 0, burn: 0, freeze: 0, crit: 0, blockMax: 0, attacks: true },
  water: { dmg: 4, range: 1.6, cd: 16, splash: 0, slow: 0.5, slowTicks: 30, burn: 0, freeze: 0, crit: 0, blockMax: 0, attacks: true },
  wall: { dmg: 5, range: 1.5, cd: 20, splash: 0, slow: 0.8, slowTicks: 15, burn: 0, freeze: 0, crit: 0, blockMax: 90, attacks: true },
  metal: { dmg: 20, range: 1.9, cd: 28, splash: 0, slow: 0, slowTicks: 0, burn: 0, freeze: 0, crit: 0.15, blockMax: 0, attacks: true },
  support: { dmg: 0, range: 0, cd: 20, splash: 0, slow: 0, slowTicks: 0, burn: 0, freeze: 0, crit: 0, blockMax: 0, attacks: false },
  light: { dmg: 5, range: 2.2, cd: 20, splash: 0, slow: 0, slowTicks: 0, burn: 0, freeze: 0, crit: 0, blockMax: 0, attacks: true },
};

/** 輔助字給相鄰（含斜角）字塔的攻速加成。 */
export const SUPPORT_RATE = 0.25;
/** 光環字給相鄰字塔的射程加成。 */
export const LIGHT_RANGE = 0.4;

export function kindOf(ctx: Ctx, ch: string): Kind {
  const def = ctx.chars.get(ch);
  if (!def) throw new Error(`沒有這個字：${ch}`);
  return def.kind;
}

export function baseStats(ctx: Ctx, ch: string, lv: number): TowerStats {
  const b = BASE[kindOf(ctx, ch)];
  const m = LV_MUL[Math.max(0, Math.min(LV_MUL.length - 1, lv - 1))];
  return {
    ...b,
    dmg: b.dmg * m,
    blockMax: b.blockMax * m,
    range: b.range > 0 ? b.range + 0.1 * (lv - 1) : 0,
  };
}
