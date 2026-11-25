import { describe, expect, it } from 'vitest';
import { ctx } from '../src/content';
import { expandPath, positionAt } from '../src/engine/board';
import { createGame, startWave, step } from '../src/engine/game';
import type { GameState } from '../src/engine/types';

function runWave(s: GameState, maxTicks = 20000): GameState {
  let n = startWave(ctx, s);
  for (let i = 0; i < maxTicks && n.phase === 'wave'; i++) n = step(ctx, n);
  return n;
}

describe('路徑', () => {
  it('把轉折點展開成相鄰的格子', () => {
    const p = expandPath([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 2 },
    ]);
    expect(p).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ]);
  });

  it('沿路徑內插座標', () => {
    const p = expandPath([
      { x: 0, y: 0 },
      { x: 2, y: 0 },
    ]);
    expect(positionAt(p, 0.5)).toEqual({ x: 1, y: 0.5 });
  });
});

describe('波次', () => {
  it('沒有字塔時，墨妖會走到書頁扣頁數；扣光就算沒守住，但下一波照樣開始', () => {
    let n = createGame(ctx, { chapter: 'ch01', seed: 1 });
    n = runWave(n);
    expect(n.results).toEqual(['held']); // 6 隻墨點，書頁 10 點還撐得住
    n = runWave(runWave(n));
    n = runWave(n); // 第 4 波量比較多
    expect(n.results[3]).toBe('lost');
    expect(n.phase).toBe('prep');
    expect(n.wave).toBe(4);
  });

  it('同一個種子一定重現同一局', () => {
    const a = runWave(createGame(ctx, { chapter: 'ch01', seed: 42 }));
    const b = runWave(createGame(ctx, { chapter: 'ch01', seed: 42 }));
    expect(a).toEqual(b);
  });

  it('step 不會改到舊狀態', () => {
    const s = startWave(ctx, createGame(ctx, { chapter: 'ch01', seed: 3 }));
    let n = s;
    for (let i = 0; i < 100; i++) n = step(ctx, n);
    expect(s.enemies).toEqual([]);
    expect(n.enemies.length).toBeGreaterThan(0);
  });
});
