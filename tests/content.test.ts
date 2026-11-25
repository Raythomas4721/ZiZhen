import { describe, expect, it } from 'vitest';
import { ctx } from '../src/content';
import { validateContent } from '../src/engine/validate';
import { wordBot } from '../src/sim/bots';
import { runChapter } from '../src/sim/run';

describe('內容', () => {
  it('通過 validate', () => {
    expect(validateContent(ctx)).toEqual([]);
  });

  it('湊詞機器人每一章都打得完', () => {
    for (const ch of ctx.content.chapters) {
      const r = runChapter(ctx, ch.id, 1, wordBot);
      expect(r.final.phase).toBe('done');
      expect(r.stars).toBeGreaterThanOrEqual(1);
    }
  });
});
