import { describe, expect, it } from 'vitest';
import { ctx } from '../src/content';
import { place } from '../src/engine/actions';
import { boxCandidates, recommendBox } from '../src/engine/box';
import { FINALE_WAIT } from '../src/engine/finale';
import { createGame, startWave, step } from '../src/engine/game';
import { TICK_RATE, type Enemy, type GameState } from '../src/engine/types';

const BOX = recommendBox(ctx, 'ch06');

function wuming(hp: number, d = 3): Enemy {
  return { id: 777, def: 'wuming', hp, maxHp: 2600, d, slowMul: 1, slowLeft: 0, frozen: 1e9, burnDps: 0, burnLeft: 0, inkCool: 1e9, seen: true };
}

/** 直接跳到最後一波，場上只有無名。 */
function finalWave(enemy: Enemy): GameState {
  const s = createGame(ctx, { chapter: 'ch06', seed: 6, box: BOX });
  return { ...startWave(ctx, { ...s, wave: 9 }), spawns: [], enemies: [enemy] };
}

describe('終章', () => {
  it('無名沒血時變成字卡「霽」，還附一張能湊詞的搭檔字；這一波會等玩家放字', () => {
    let s = finalWave(wuming(0));
    s = step(ctx, s);
    expect(s.events).toContainEqual({ t: 'becomeCard', ch: '霽' });
    const chars = s.hand.filter((h) => h.kind === 'char').map((h) => h.v);
    expect(chars).toContain('霽');
    expect(chars.some((c) => c === '月' || c === '雪')).toBe(true);
    expect(s.enemies).toEqual([]);
    expect(s.phase).toBe('wave'); // 墨妖清光了，但還在等
    expect(s.finaleWait).toBeGreaterThan(0);
  });

  it('把霽放在月左邊連成「霽月」，就收進字典，這一波守住', () => {
    let s = finalWave(wuming(0));
    s = step(ctx, s);
    // 第 7 列 x=1、2 是空格
    const ji = s.hand.find((h) => h.v === '霽')!.uid;
    const yue = s.hand.find((h) => h.v === '月')!.uid;
    s = place(ctx, s, yue, 2, 7);
    s = place(ctx, s, ji, 1, 7);
    expect(s.archived).toBe(true);
    expect(s.events).toContainEqual({ t: 'archived', w: '霽月' });
    s = step(ctx, s);
    expect(s.phase).toBe('done');
    expect(s.results[s.results.length - 1]).toBe('held');
  });

  it('無名走到書頁也會變成字卡（不會卡關）', () => {
    let s = finalWave(wuming(2600, s0PathEnd() - 0.01));
    s = { ...s, enemies: s.enemies.map((e) => ({ ...e, frozen: 0 })) };
    s = step(ctx, s);
    expect(s.hand.some((h) => h.v === '霽')).toBe(true);
  });

  it('沒放字的話，等時間到這一波也會結束（還是能看到結局）', () => {
    let s = finalWave(wuming(0));
    for (let i = 0; i < FINALE_WAIT * TICK_RATE + 5 && s.phase === 'wave'; i++) s = step(ctx, s);
    expect(s.phase).toBe('done');
    expect(s.archived).toBe(false);
  });

  it('隱藏字要在存檔找回以後才會出現在書箱候選裡', () => {
    expect(boxCandidates(ctx, 'ch06')).not.toContain('霽');
    expect(boxCandidates(ctx, 'ch06', ['霽'])).toContain('霽');
  });

  it('推薦書箱剛好 8 個字，而且有終章字的搭檔', () => {
    for (const ch of ctx.content.chapters) {
      const box = recommendBox(ctx, ch.id);
      expect(box.length).toBe(Math.min(8, boxCandidates(ctx, ch.id).length));
    }
    expect(BOX.some((c) => c === '月' || c === '雪')).toBe(true);
  });
});

function s0PathEnd(): number {
  return createGame(ctx, { chapter: 'ch06', seed: 1, box: BOX }).path.length - 0.5;
}
