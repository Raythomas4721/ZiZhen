import { describe, expect, it } from 'vitest';
import { ctx } from '../src/content';
import { combine, draw, place, useTool } from '../src/engine/actions';
import { boxReport, recommendBox } from '../src/engine/box';
import { createGame, startWave, step } from '../src/engine/game';
import type { CardKind, GameState } from '../src/engine/types';

function give(s: GameState, kind: CardKind, v: string, lv = 1): [GameState, number] {
  const uid = s.nextId;
  return [{ ...s, nextId: uid + 1, hand: [...s.hand, { uid, kind, v, lv }] }, uid];
}

const ch3 = () => createGame(ctx, { chapter: 'ch03', seed: 3, box: recommendBox(ctx, 'ch03') });

describe('部件', () => {
  it('氵疊青合成清', () => {
    let s = ch3();
    let a: number;
    let b: number;
    [s, a] = give(s, 'part', '氵');
    [s, b] = give(s, 'part', '青');
    s = combine(ctx, s, a, b);
    expect(s.hand.find((h) => h.uid === b)).toEqual({ uid: b, kind: 'char', v: '清', lv: 1 });
    expect(s.hand.some((h) => h.uid === a)).toBe(false);
  });

  it('配不起來的部件不會合', () => {
    let s = ch3();
    let a: number;
    let b: number;
    [s, a] = give(s, 'part', '氵');
    [s, b] = give(s, 'part', '月');
    const n = combine(ctx, s, a, b);
    expect(n.events[0].t).toBe('invalid');
  });

  it('部件不能直接放上盤面', () => {
    let s = ch3();
    let a: number;
    [s, a] = give(s, 'part', '青');
    expect(place(ctx, s, a, 6, 6).events[0].t).toBe('invalid');
  });
});

describe('工具', () => {
  it('第三章開局送紙鎮', () => {
    expect(ch3().hand.map((h) => h.v)).toContain('weight');
  });

  it('鏟子把字收回手上，等級不變', () => {
    let s = ch3();
    let a: number;
    [s, a] = give(s, 'char', '石', 3);
    s = place(ctx, s, a, 6, 6);
    [s, a] = give(s, 'tool', 'shovel');
    s = useTool(ctx, s, a, 6, 6);
    expect(s.towers).toHaveLength(0);
    expect(s.hand.some((h) => h.kind === 'char' && h.v === '石' && h.lv === 3)).toBe(true);
  });

  it('毛筆換成同部首、能連詞的字', () => {
    let s = ch3();
    let a: number;
    [s, a] = give(s, 'char', '水');
    s = place(ctx, s, a, 6, 5);
    [s, a] = give(s, 'char', '口');
    s = place(ctx, s, a, 6, 6);
    // 水在口上面：「水口」不是詞；同部首裡「溪口」是
    [s, a] = give(s, 'tool', 'brush');
    s = useTool(ctx, s, a, 6, 5);
    expect(s.towers.find((t) => t.x === 6 && t.y === 5)?.ch).toBe('溪');
    expect(s.words.map((w) => w.w)).toContain('溪口');
  });

  it('沒有同部首的字時毛筆不能用', () => {
    let s = ch3();
    let a: number;
    [s, a] = give(s, 'char', '刀');
    s = place(ctx, s, a, 6, 6);
    [s, a] = give(s, 'tool', 'brush');
    expect(useTool(ctx, s, a, 6, 6).events[0].t).toBe('invalid');
  });

  it('紙鎮鎖住的字不會被塗改塗黑', () => {
    let s = ch3();
    let a: number;
    [s, a] = give(s, 'char', '石');
    s = place(ctx, s, a, 0, 1);
    const weight = s.hand.find((h) => h.v === 'weight')!.uid;
    s = useTool(ctx, s, weight, 0, 1);
    expect(s.towers[0].locked).toBe(true);
    // 第二波有塗改，跑完都不該被塗黑
    s = { ...s, wave: 1 };
    let n = startWave(ctx, s);
    let inked = false;
    for (let i = 0; i < 4000 && n.phase === 'wave'; i++) {
      n = step(ctx, n);
      if (n.towers.some((t) => t.inked > 0)) inked = true;
    }
    expect(inked).toBe(false);
  });
});

describe('書箱', () => {
  it('推薦書箱每個字都至少湊得出 2 個詞', () => {
    for (const ch of ctx.content.chapters) {
      expect(boxReport(ctx, recommendBox(ctx, ch.id)).weak).toEqual([]);
    }
  });

  it('只會抽到書箱裡的字', () => {
    let s = createGame(ctx, { chapter: 'ch02', seed: 8, box: ['火', '水', '山', '木', '湯', '鍋', '刀', '口'] });
    s = { ...s, coins: 9999 };
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) {
      s = { ...s, hand: [], drawsThisWave: 0 };
      s = draw(ctx, s);
      for (const h of s.hand) if (h.kind === 'char') seen.add(h.v);
    }
    expect(seen.has('煮')).toBe(false);
  });
});

