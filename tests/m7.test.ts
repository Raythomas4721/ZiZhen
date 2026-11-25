import { describe, expect, it } from 'vitest';
import { ctx } from '../src/content';
import { place } from '../src/engine/actions';
import { REVEAL_NEAR_PAGE } from '../src/engine/combat';
import { createGame, startWave, step } from '../src/engine/game';
import { COUPLET_DMG } from '../src/engine/refresh';
import type { Enemy, GameState } from '../src/engine/types';

const BOX = ['山', '清', '明', '月', '風', '星', '雪', '花'];

function putAll(s: GameState, items: [string, number, number][]): GameState {
  for (const [v, x, y] of items) {
    const uid = s.nextId;
    s = { ...s, nextId: uid + 1, hand: [...s.hand, { uid, kind: 'char', v, lv: 1 }] };
    s = place(ctx, s, uid, x, y);
  }
  return s;
}

function ghost(d: number): Enemy {
  return { id: 900, def: 'yinmo', hp: 1e6, maxHp: 1e6, d, slowMul: 1, slowLeft: 0, frozen: 1e9, burnDps: 0, burnLeft: 0, inkCool: 0, seen: false };
}

function withGhost(s: GameState, d: number): GameState {
  return { ...startWave(ctx, s), spawns: [], enemies: [ghost(d)] };
}

describe('隱墨', () => {
  // 第五章的路：第 1 列由左往右，(2,1) 是路上第 2 格
  it('沒有光環字照著時，字塔打不到牠', () => {
    let s = putAll(createGame(ctx, { chapter: 'ch05', seed: 1, box: BOX }), [['雪', 2, 2]]);
    s = withGhost(s, 2);
    s = step(ctx, s);
    expect(s.enemies[0].seen).toBe(false);
    expect(s.events.some((e) => e.t === 'hit')).toBe(false);
  });

  it('光環字的射程內就現形，會被打', () => {
    let s = putAll(createGame(ctx, { chapter: 'ch05', seed: 1, box: BOX }), [
      ['雪', 2, 2],
      ['星', 3, 2],
    ]);
    s = withGhost(s, 2);
    s = step(ctx, s);
    expect(s.enemies[0].seen).toBe(true);
    expect(s.events.some((e) => e.t === 'hit')).toBe(true);
  });

  it('退路：快走到書頁時一定現形', () => {
    let s = createGame(ctx, { chapter: 'ch05', seed: 1, box: BOX });
    s = withGhost(s, s.path.length - REVEAL_NEAR_PAGE + 0.1);
    s = step(ctx, s);
    expect(s.enemies[0].seen).toBe(true);
  });
});

describe('對仗', () => {
  // 第 2、3 列在兩條路之間，可以上下疊兩個橫的詞
  it('兩個同類的詞上下疊就是對仗，四個字都變強', () => {
    let s = putAll(createGame(ctx, { chapter: 'ch05', seed: 1, box: BOX }), [
      ['明', 1, 2],
      ['月', 2, 2],
    ]);
    const before = s.towers.find((t) => t.ch === '明')!.stats.dmg;
    s = putAll(s, [
      ['清', 1, 3],
      ['風', 2, 3],
    ]);
    expect(s.couplets.map((c) => [c.a, c.b])).toEqual([['明月', '清風']]);
    expect(s.events).toContainEqual({ t: 'couplet', a: '明月', b: '清風', fresh: true });
    const after = s.towers.find((t) => t.ch === '明')!.stats.dmg;
    expect(after).toBeCloseTo(before * (1 + COUPLET_DMG));
  });

  it('不同類就不算', () => {
    const s = putAll(createGame(ctx, { chapter: 'ch05', seed: 1, box: BOX }), [
      ['明', 1, 2],
      ['月', 2, 2],
      ['雪', 1, 3],
      ['山', 2, 3],
    ]);
    // 明月是天文、雪山是地理
    expect(s.words.map((w) => w.w)).toContain('雪山');
    expect(s.couplets).toEqual([]);
  });

  it('沒開對仗規則的章不算', () => {
    // 第四章沒開對仗；第 7、8 列的 x=1、2 都是空格
    const s = putAll(createGame(ctx, { chapter: 'ch04', seed: 1 }), [
      ['明', 1, 7],
      ['月', 2, 7],
      ['清', 1, 8],
      ['風', 2, 8],
    ]);
    expect(s.words.map((w) => w.w).sort()).toEqual(['明月', '清風'].sort());
    expect(s.couplets).toEqual([]);
  });

  it('對仗不會記進字典本', () => {
    let s = putAll(createGame(ctx, { chapter: 'ch05', seed: 1, box: BOX }), [
      ['明', 1, 2],
      ['月', 2, 2],
      ['清', 1, 3],
      ['風', 2, 3],
    ]);
    s = step(ctx, s);
    expect(s.found.every((w) => ctx.words.has(w) || ctx.idioms.has(w))).toBe(true);
  });
});
