import { describe, expect, it } from 'vitest';
import { ctx } from '../src/content';
import { draw, place } from '../src/engine/actions';
import { createGame, startWave, step } from '../src/engine/game';
import { castIdiom } from '../src/engine/idioms';
import { kindOf } from '../src/engine/stats';
import { TICK_RATE, type GameState } from '../src/engine/types';

const BOX = ['火', '水', '山', '刀', '口', '海', '千', '萬'];
const ch4 = () => createGame(ctx, { chapter: 'ch04', seed: 4, box: BOX });

function putAll(s: GameState, items: [string, number, number][]): GameState {
  for (const [v, x, y] of items) {
    const uid = s.nextId;
    s = { ...s, nextId: uid + 1, hand: [...s.hand, { uid, kind: 'char', v, lv: 1 }] };
    s = place(ctx, s, uid, x, y);
  }
  return s;
}

const LINE: [string, number, number][] = [
  ['刀', 1, 1],
  ['山', 2, 1],
  ['火', 3, 1],
  ['海', 4, 1],
];

describe('成語', () => {
  it('四個字橫排連成一線就排出成語，也會記進發現過的詞', () => {
    const s = putAll(ch4(), LINE);
    expect(s.idioms.map((i) => i.w)).toEqual(['刀山火海']);
    expect(s.found).toContain('刀山火海');
    // 裡面的二字詞也照樣發動
    expect(s.words.map((w) => w.w).sort()).toEqual(['刀山', '火海'].sort());
  });

  it('順序不對不算', () => {
    const s = putAll(ch4(), [
      ['山', 1, 1],
      ['刀', 2, 1],
      ['火', 3, 1],
      ['海', 4, 1],
    ]);
    expect(s.idioms).toEqual([]);
  });

  it('只在波次進行中集氣，集滿才放得出來；大招打全場', () => {
    let s = putAll(ch4(), LINE);
    expect(castIdiom(ctx, s, '刀山火海').events[0].t).toBe('invalid');
    s = startWave(ctx, s);
    for (let i = 0; i < 40; i++) s = step(ctx, s);
    expect(s.charge['刀山火海']).toBeGreaterThan(0);
    expect(castIdiom(ctx, s, '刀山火海').events[0]).toEqual({ t: 'invalid', reason: '還在集氣' });
    s = { ...s, charge: { 刀山火海: 1 } };
    const hp = s.enemies.map((e) => e.hp);
    const n = castIdiom(ctx, s, '刀山火海');
    expect(n.charge['刀山火海']).toBe(0);
    expect(n.events[0]).toEqual({ t: 'idiom', w: '刀山火海' });
    n.enemies.forEach((e, i) => expect(e.hp).toBeLessThan(hp[i]));
    expect(n.enemies.every((e) => e.burnLeft > 0)).toBe(true);
  });

  it('千山萬水把墨妖往回推', () => {
    let s = startWave(ctx, ch4());
    for (let i = 0; i < 200; i++) s = step(ctx, s);
    s = { ...s, charge: { 千山萬水: 1 } };
    const d = s.enemies.map((e) => e.d);
    const n = castIdiom(ctx, s, '千山萬水');
    n.enemies.forEach((e, i) => expect(e.d).toBeLessThan(d[i]));
  });
});

describe('錯字', () => {
  function withSwapper(s: GameState): GameState {
    s = startWave(ctx, s);
    // 把一隻錯字放在詞旁邊的路上
    return {
      ...s,
      spawns: [],
      enemies: [{ id: 999, def: 'cuozi', hp: 1e9, maxHp: 1e9, d: 2, slowMul: 1, slowLeft: 0, frozen: 1e9, burnDps: 0, burnLeft: 0, inkCool: 0 }],
    };
  }

  it('把附近的詞對調，五秒後自己換回來', () => {
    let s = putAll(ch4(), [
      ['火', 2, 1],
      ['海', 3, 1],
    ]);
    s = withSwapper(s);
    s = step(ctx, s);
    expect(s.events.some((e) => e.t === 'swap')).toBe(true);
    expect(s.towers.map((t) => t.ch).join('')).toBe('海火');
    expect(s.words).toEqual([]);
    for (let i = 0; i < TICK_RATE * 5 + 2; i++) s = step(ctx, s);
    expect(s.towers.map((t) => t.ch).join('')).toBe('火海');
    expect(s.words.map((w) => w.w)).toEqual(['火海']);
  });

  it('紙鎮鎖住的字不會被換', () => {
    let s = putAll(ch4(), [
      ['火', 2, 1],
      ['海', 3, 1],
    ]);
    s = { ...s, towers: s.towers.map((t) => ({ ...t, locked: t.ch === '火' })) };
    s = withSwapper(s);
    s = step(ctx, s);
    expect(s.towers.map((t) => t.ch).join('')).toBe('火海');
  });
});

describe('抽字保底', () => {
  it('盤面和手上都沒有會攻擊的字時，一定抽到會攻擊的字', () => {
    for (let seed = 0; seed < 40; seed++) {
      let s = createGame(ctx, { chapter: 'ch04', seed, box: ['口', '萬', '火', '水', '山', '刀', '海', '千'] });
      s = { ...s, hand: [], coins: 99 };
      let guard = 0;
      while (guard++ < 10) {
        s = draw(ctx, { ...s, hand: s.hand.filter((h) => h.kind === 'char') });
        const last = s.hand[s.hand.length - 1];
        if (last.kind === 'char') {
          expect(kindOf(ctx, last.v)).not.toBe('support');
          break;
        }
      }
    }
  });
});
