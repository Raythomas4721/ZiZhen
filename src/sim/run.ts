// 用機器人從頭到尾打一章。

import { recommendBox } from '../engine/box';
import type { Ctx } from '../engine/ctx';
import { createGame, starsOf, startWave, step } from '../engine/game';
import type { GameState } from '../engine/types';
import { makeRand, type Bot } from './bots';

export interface RunResult {
  stars: number;
  lost: number;
  found: string[];
  ticks: number;
  final: GameState;
}

/** 每幾個 tick 讓機器人想一次。 */
const THINK_EVERY = 10;
const MAX_TICKS = 20 * 60 * 40;

export function runChapter(ctx: Ctx, chapter: string, seed: number, bot: Bot): RunResult {
  const rand = makeRand(seed * 7919 + 13);
  let s = createGame(ctx, { chapter, seed, box: recommendBox(ctx, chapter) });
  let guard = 0;
  while (s.phase !== 'done' && guard < MAX_TICKS) {
    s = bot(ctx, s, rand);
    s = startWave(ctx, s);
    while (s.phase === 'wave' && guard < MAX_TICKS) {
      s = step(ctx, s);
      guard++;
      if (s.tick % THINK_EVERY === 0 && s.phase === 'wave') s = bot(ctx, s, rand);
    }
  }
  const lost = s.results.filter((r) => r === 'lost').length;
  return { stars: starsOf(s.results), lost, found: s.found, ticks: s.tick, final: s };
}
