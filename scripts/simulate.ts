// npm run simulate -- --runs 40 [--chapter ch01] [--bot word]
// 讓三種機器人各打很多局，看勝率（勝 = 至少 2 星，也就是最多丟 2 波）。

import { ctx } from '../src/content';
import { BOTS } from '../src/sim/bots';
import { runChapter } from '../src/sim/run';

const args = process.argv.slice(2);
const arg = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const runs = Number(arg('runs') ?? 40);
const onlyChapter = arg('chapter');
const onlyBot = arg('bot');

/** 目標：亂放第一章 ≥ 70%、只合成前三章 ≥ 50%、湊詞每章 ≥ 85%。 */
function target(bot: string, index: number): number | null {
  if (bot === 'random') return index === 1 ? 0.7 : null;
  if (bot === 'merge') return index <= 3 ? 0.5 : null;
  if (bot === 'word') return 0.85;
  return null;
}

let failed = 0;
const t0 = Date.now();
for (const ch of ctx.content.chapters) {
  if (onlyChapter && ch.id !== onlyChapter) continue;
  console.log(`\n《${ch.book}》`);
  for (const [name, bot] of Object.entries(BOTS)) {
    if (onlyBot && name !== onlyBot) continue;
    let wins = 0;
    let stars = 0;
    const lostByWave = new Array(ch.waves.length).fill(0);
    const wordUse = new Map<string, number>();
    for (let i = 0; i < runs; i++) {
      const r = runChapter(ctx, ch.id, 1000 + i, bot);
      if (r.stars >= 2) wins++;
      stars += r.stars;
      r.final.results.forEach((x, k) => {
        if (x === 'lost') lostByWave[k]++;
      });
      for (const w of r.final.words) wordUse.set(w.w, (wordUse.get(w.w) ?? 0) + 1);
    }
    const rate = wins / runs;
    const goal = target(name, ch.index);
    const ok = goal === null || rate >= goal;
    if (!ok) failed++;
    const topWords = [...wordUse.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([w, n]) => `${w}×${n}`)
      .join(' ');
    console.log(
      `  ${ok ? '✓' : '✗'} ${name.padEnd(6)} 勝率 ${(rate * 100).toFixed(0).padStart(3)}%` +
        `${goal !== null ? `（目標 ${goal * 100}%）` : ''}  平均 ${(stars / runs).toFixed(2)} 星` +
        `  各波失守 [${lostByWave.join(' ')}]${topWords ? `  終盤常見詞 ${topWords}` : ''}`,
    );
  }
}
console.log(`\n${runs} 局／組，花了 ${((Date.now() - t0) / 1000).toFixed(1)} 秒。`);
if (failed) {
  console.error(`有 ${failed} 組沒達標。`);
  process.exit(1);
}
