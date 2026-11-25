import { describe, expect, it } from 'vitest';
import { ctx } from '../src/content';
import { combine, drawPool, grant, place, TOOL_WEIGHT } from '../src/engine/actions';
import { createGame } from '../src/engine/game';
import type { GameState } from '../src/engine/types';
import { WORD_TUTORIAL } from '../src/ui/tutorial';

describe('新手教學', () => {
  it('照著亮起來的格子做，每一步都完成得了', () => {
    let s: GameState = createGame(ctx, { chapter: 'ch01', seed: 1 });
    WORD_TUTORIAL.forEach((step, i) => {
      if (step.give) s = grant(s, step.give);
      if (!step.done) return; // 按「下一步」的步驟
      const guide = step.guide?.(s) ?? [];
      const card = step.give?.length ? s.hand[s.hand.length - 1] : s.hand.find((h) => h.kind === 'char');
      if (step.give && step.give.length === 2) {
        // 合成那一步：兩張疊起來
        const [a, b] = s.hand.slice(-2);
        s = combine(ctx, s, a.uid, b.uid);
      } else if (guide.length) {
        s = place(ctx, s, card!.uid, guide[0].x, guide[0].y);
      } else {
        // 沒有建議格子的步驟：放在路上（屏障字可以）
        s = place(ctx, s, card!.uid, 3, 0);
      }
      expect(s.events.some((e) => e.t === 'invalid'), `第 ${i + 1} 步放不下去`).toBe(false);
      expect(step.done(s), `第 ${i + 1} 步沒完成`).toBe(true);
    });
    expect(s.words.map((w) => w.w).sort()).toEqual(['山水', '火山'].sort());
  });

  it('教學送的卡不扣文錢', () => {
    const s = createGame(ctx, { chapter: 'ch01', seed: 1 });
    const n = grant(s, [{ kind: 'char', v: '山' }]);
    expect(n.coins).toBe(s.coins);
    expect(n.hand).toHaveLength(1);
  });
});

describe('鏟子', () => {
  it('鏟子的權重是其他工具的兩倍', () => {
    expect(TOOL_WEIGHT.shovel).toBe(0.4);
    const s = createGame(ctx, { chapter: 'ch03', seed: 1, box: ['水', '山', '木', '刀', '口', '溪', '石', '林'] });
    const pool = drawPool(ctx, s);
    expect(pool.find((p) => p.v === 'shovel')?.w).toBe(0.4);
    expect(pool.find((p) => p.v === 'brush')?.w).toBe(0.2);
  });
});
