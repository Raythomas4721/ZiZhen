import type { ChapterDef, CharDef, Content, EnemyDef, RecipeDef, WordDef } from './types';

/** 把內容整理成查表用的形狀。 */
export interface Ctx {
  content: Content;
  chars: Map<string, CharDef>;
  words: Map<string, WordDef>;
  enemies: Map<string, EnemyDef>;
  chapters: Map<string, ChapterDef>;
  recipes: RecipeDef[];
}

export function buildCtx(content: Content): Ctx {
  return {
    content,
    chars: new Map(content.chars.map((c) => [c.ch, c])),
    words: new Map(content.words.map((w) => [w.w, w])),
    enemies: new Map(content.enemies.map((e) => [e.id, e])),
    chapters: new Map(content.chapters.map((c) => [c.id, c])),
    recipes: content.recipes,
  };
}

export function chapterOf(ctx: Ctx, id: string): ChapterDef {
  const ch = ctx.chapters.get(id);
  if (!ch) throw new Error(`沒有這一章：${id}`);
  return ch;
}

/** 到這一章為止解鎖的所有字。 */
export function unlockedChars(ctx: Ctx, chapterId: string): string[] {
  const target = chapterOf(ctx, chapterId);
  const out: string[] = [];
  for (const ch of ctx.content.chapters) {
    if (ch.index > target.index) continue;
    for (const c of ch.unlock) if (!out.includes(c)) out.push(c);
  }
  return out;
}

/** 只用這些字就湊得出來的詞。 */
export function wordsWithin(ctx: Ctx, chars: string[]): WordDef[] {
  const set = new Set(chars);
  return ctx.content.words.filter((w) => [...w.w].every((c) => set.has(c)));
}
