// 戰鬥：字塔攻擊、屏障擋路。M1 先留空，M2 補上。

import type { Ctx } from './ctx';
import type { Enemy, GameState } from './types';

export function limitByBlockers(_ctx: Ctx, _n: GameState, _e: Enemy, stepLen: number): number {
  return stepLen;
}

export function runCombat(_ctx: Ctx, _n: GameState): void {}
