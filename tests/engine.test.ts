import { describe, expect, it } from 'vitest';
import { ctx } from '../src/content';
import { combine, draw, drawCost, moveTower, place } from '../src/engine/actions';
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

function withCard(s: GameState, v: string, lv = 1): [GameState, number] {
  const uid = s.nextId;
  return [{ ...s, nextId: s.nextId + 1, hand: [...s.hand, { uid, kind: 'char', v, lv }] }, uid];
}

describe('抽字與放字', () => {
  it('抽字越抽越貴，手牌滿了就不能抽', () => {
    let s = createGame(ctx, { chapter: 'ch01', seed: 5 });
    s = { ...s, coins: 999 };
    const costs: number[] = [];
    for (let i = 0; i < 6; i++) {
      costs.push(drawCost(s));
      s = draw(ctx, s);
    }
    expect(costs.slice(0, 3)).toEqual([8, 11, 14]);
    expect(s.hand.length).toBe(5);
    expect(s.events[0]).toEqual({ t: 'invalid', reason: '手牌滿了' });
  });

  it('只有屏障字能放在路上', () => {
    let s = createGame(ctx, { chapter: 'ch01', seed: 5 });
    let uid: number;
    [s, uid] = withCard(s, '火');
    const bad = place(ctx, s, uid, 1, 0);
    expect(bad.towers.length).toBe(0);
    expect(bad.events[0].t).toBe('invalid');
    [s, uid] = withCard(s, '山');
    s = place(ctx, s, uid, 1, 0);
    expect(s.towers[0].onPath).toBe(true);
    expect(s.towers[0].block).toBeGreaterThan(0);
  });

  it('放了字塔，第一波能全部打倒並拿到文錢', () => {
    let s = createGame(ctx, { chapter: 'ch01', seed: 7 });
    let uid: number;
    [s, uid] = withCard(s, '火');
    s = place(ctx, s, uid, 0, 1);
    [s, uid] = withCard(s, '火');
    s = place(ctx, s, uid, 2, 1);
    const coins = s.coins;
    const n = runWave(s);
    expect(n.results).toEqual(['held']);
    expect(n.coins).toBeGreaterThan(coins + 15);
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

describe('合成', () => {
  it('卡放到同字同級的字上會升級，屏障血量補滿', () => {
    let s = createGame(ctx, { chapter: 'ch01', seed: 9 });
    let uid: number;
    [s, uid] = withCard(s, '山');
    s = place(ctx, s, uid, 1, 0);
    s = { ...s, towers: s.towers.map((t) => ({ ...t, block: 1 })) };
    [s, uid] = withCard(s, '山');
    s = place(ctx, s, uid, 1, 0);
    expect(s.towers).toHaveLength(1);
    expect(s.towers[0].lv).toBe(2);
    expect(s.towers[0].block).toBe(s.towers[0].stats.blockMax);
    expect(s.events.some((e) => e.t === 'merge')).toBe(true);
  });

  it('等級不同不能合成', () => {
    let s = createGame(ctx, { chapter: 'ch01', seed: 9 });
    let a: number;
    let b: number;
    [s, a] = withCard(s, '火', 2);
    [s, b] = withCard(s, '火', 1);
    const n = combine(ctx, s, a, b);
    expect(n.hand).toHaveLength(2);
    expect(n.events[0]).toEqual({ t: 'invalid', reason: '等級不同，不能合成' });
  });

  it('手上兩張同字同級的卡可以疊成一張', () => {
    let s = createGame(ctx, { chapter: 'ch01', seed: 9 });
    let a: number;
    let b: number;
    [s, a] = withCard(s, '水');
    [s, b] = withCard(s, '水');
    s = combine(ctx, s, a, b);
    expect(s.hand).toEqual([{ uid: b, kind: 'char', v: '水', lv: 2 }]);
  });

  it('盤面上的字拖到同字同級的字上會合成，原本那格空出來', () => {
    let s = createGame(ctx, { chapter: 'ch01', seed: 9 });
    let uid: number;
    [s, uid] = withCard(s, '火');
    s = place(ctx, s, uid, 0, 1);
    [s, uid] = withCard(s, '火');
    s = place(ctx, s, uid, 2, 1);
    s = moveTower(ctx, s, { x: 0, y: 1 }, { x: 2, y: 1 });
    expect(s.towers).toHaveLength(1);
    expect(s.towers[0]).toMatchObject({ x: 2, y: 1, lv: 2 });
  });
});
