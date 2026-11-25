// npm run validate：檢查所有字、詞、章節有沒有守規則。

import { ctx } from '../src/content';
import { recommendBox } from '../src/engine/box';
import { idiomsWithin, wordsWithin } from '../src/engine/ctx';
import { validateContent } from '../src/engine/validate';

const errors = validateContent(ctx);

for (const ch of ctx.content.chapters) {
  const box = recommendBox(ctx, ch.id);
  const ws = wordsWithin(ctx, box).map((w) => w.w);
  const is = idiomsWithin(ctx, box).map((w) => w.w);
  console.log(`《${ch.book}》書箱 ${box.join('')}｜湊得出 ${ws.length} 個詞：${ws.join('、')}${is.length ? `｜成語：${is.join('、')}` : ''}`);
}

if (errors.length) {
  console.error(`\n有 ${errors.length} 個問題：`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log(`\n全部通過：${ctx.content.chars.length} 個字、${ctx.content.words.length} 個詞、${ctx.content.idioms.length} 句成語、${ctx.content.chapters.length} 章。`);
