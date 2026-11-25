// 內容驗證：每一章都要守的規則。scripts/validate.ts 和測試都會跑。

import { buildableCount, expandPath, inBounds } from './board';
import { boxCandidates, boxReport, recommendBox } from './box';
import { idiomsWithin, unlockedChars, wordsWithin, type Ctx } from './ctx';
import { partnersOf } from './words';

export const MIN_BUILDABLE = 30;
export const MIN_WORDS = 3;
/** 第幾章開始，書箱裡一定要湊得出成語。 */
export const IDIOM_FROM = 4;

const KINDS = new Set(['fire', 'water', 'wall', 'metal', 'support', 'light']);
const TOOLS = new Set(['shovel', 'brush', 'weight']);

export function validateContent(ctx: Ctx): string[] {
  const errors: string[] = [];
  const err = (where: string, msg: string) => errors.push(`${where}：${msg}`);
  const c = ctx.content;

  // 字
  const seen = new Set<string>();
  for (const ch of c.chars) {
    if ([...ch.ch].length !== 1) err('字', `「${ch.ch}」不是單一個字`);
    if (seen.has(ch.ch)) err('字', `「${ch.ch}」重複`);
    seen.add(ch.ch);
    if (!KINDS.has(ch.kind)) err('字', `「${ch.ch}」的類型 ${ch.kind} 不存在`);
  }

  // 詞
  const seenW = new Set<string>();
  for (const w of c.words) {
    const cs = [...w.w];
    if (cs.length !== 2) err('詞', `「${w.w}」不是兩個字`);
    if (seenW.has(w.w)) err('詞', `「${w.w}」重複`);
    seenW.add(w.w);
    for (const x of cs) if (!ctx.chars.has(x)) err('詞', `「${w.w}」用到沒定義的字「${x}」`);
    if (cs[0] === cs[1]) err('詞', `「${w.w}」兩個字一樣`);
    if (Object.keys(w.effect).length === 0) err('詞', `「${w.w}」沒有效果`);
    if (!w.cat) err('詞', `「${w.w}」沒有類別`);
  }

  // 成語
  const seenI = new Set<string>();
  for (const w of c.idioms) {
    const cs = [...w.w];
    if (cs.length !== 4) err('成語', `「${w.w}」不是四個字`);
    if (seenI.has(w.w)) err('成語', `「${w.w}」重複`);
    seenI.add(w.w);
    for (const x of cs) if (!ctx.chars.has(x)) err('成語', `「${w.w}」用到沒定義的字「${x}」`);
    if (new Set(cs).size !== 4) err('成語', `「${w.w}」有重複的字`);
    if (w.charge <= 0) err('成語', `「${w.w}」集氣時間不對`);
  }

  // 部件配方
  for (const r of c.recipes) {
    if (!ctx.chars.has(r.out)) err('部件', `${r.a}＋${r.b} 合成的「${r.out}」沒有定義`);
  }

  // 墨妖
  for (const e of c.enemies) {
    if (e.hp <= 0 || e.speed <= 0) err('墨妖', `${e.name} 的血量或速度不對`);
  }

  // 章
  const ids = new Set<string>();
  c.chapters.forEach((ch, i) => {
    const where = `《${ch.book}》`;
    if (ids.has(ch.id)) err(where, `章節 id ${ch.id} 重複`);
    ids.add(ch.id);
    if (ch.index !== i + 1) err(where, `index 應該是 ${i + 1}`);

    // 路徑
    for (let k = 1; k < ch.waypoints.length; k++) {
      const a = ch.waypoints[k - 1];
      const b = ch.waypoints[k];
      if (a.x !== b.x && a.y !== b.y) err(where, `路徑第 ${k} 段不是直線`);
      if (a.x === b.x && a.y === b.y) err(where, `路徑第 ${k} 段長度是 0`);
    }
    const path = expandPath(ch.waypoints);
    const cellSet = new Set<string>();
    for (const p of path) {
      if (!inBounds(p.x, p.y)) err(where, `路徑跑出盤面 (${p.x},${p.y})`);
      const key = `${p.x},${p.y}`;
      if (cellSet.has(key)) err(where, `路徑重疊在 (${p.x},${p.y})`);
      cellSet.add(key);
    }
    for (let k = 1; k < path.length; k++) {
      if (Math.abs(path[k].x - path[k - 1].x) + Math.abs(path[k].y - path[k - 1].y) !== 1) err(where, '路徑沒有連通');
    }
    if (buildableCount(path) < MIN_BUILDABLE) err(where, `可放字的格子只有 ${buildableCount(path)} 格（至少 ${MIN_BUILDABLE}）`);

    // 字與書箱
    for (const x of ch.unlock) if (!ctx.chars.has(x)) err(where, `解鎖的「${x}」沒有定義`);
    const unlocked = unlockedChars(ctx, ch.id);
    for (const x of ch.fixedBox ?? []) if (!unlocked.includes(x)) err(where, `固定書箱的「${x}」還沒解鎖`);
    const cands = boxCandidates(ctx, ch.id);
    for (const x of cands) {
      const n = partnersOf(ctx, x, cands).length;
      if (n < 2) err(where, `「${x}」只能跟 ${n} 個字湊成詞（至少 2 個），會變死牌`);
    }
    const box = recommendBox(ctx, ch.id);
    const rep = boxReport(ctx, box);
    if (rep.weak.length) err(where, `推薦書箱裡的「${rep.weak.join('、')}」湊不到 2 個詞`);
    const makeable = wordsWithin(ctx, cands).length;
    if (makeable < MIN_WORDS) err(where, `只湊得出 ${makeable} 個詞（至少 ${MIN_WORDS}）`);
    if (ch.rules?.couplets) {
      const ws = wordsWithin(ctx, box);
      const pairs = ws.filter((a) => ws.some((b) => a.w !== b.w && a.cat === b.cat));
      if (pairs.length < 2) err(where, '推薦書箱裡找不到兩個同類的詞，排不出對仗');
    }
    if (ch.index >= IDIOM_FROM) {
      if (idiomsWithin(ctx, cands).length === 0) err(where, '湊不出任何成語');
      if (rep.idioms === 0) err(where, '推薦書箱裡湊不出成語');
    }

    // 部件
    for (const p of ch.parts) {
      const rs = c.recipes.filter((r) => (r.a === p && ch.parts.includes(r.b)) || (r.b === p && ch.parts.includes(r.a)));
      if (!rs.length) err(where, `部件「${p}」在這章找不到能合的另一半`);
      for (const r of rs) if (!unlocked.includes(r.out)) err(where, `部件合出的「${r.out}」在這章還沒解鎖`);
    }
    for (const t of ch.tools) if (!TOOLS.has(t)) err(where, `沒有工具 ${t}`);
    for (const h of ch.rules?.startHand ?? []) {
      if (h.kind === 'tool' && !TOOLS.has(h.v)) err(where, `開局手牌的工具 ${h.v} 不存在`);
      if (h.kind === 'char' && !ctx.chars.has(h.v)) err(where, `開局手牌的字 ${h.v} 不存在`);
    }

    // 波次
    if (ch.waves.length === 0) err(where, '沒有波次');
    let lastHp = 0;
    ch.waves.forEach((w, k) => {
      if (!w.groups.length) err(where, `第 ${k + 1} 波沒有墨妖`);
      for (const g of w.groups) {
        if (!ctx.enemies.has(g.enemy)) err(where, `第 ${k + 1} 波的墨妖 ${g.enemy} 不存在`);
        if (g.count <= 0 || g.every <= 0) err(where, `第 ${k + 1} 波的數量或間隔不對`);
      }
      if (w.boss) {
        if (!w.groups.some((g) => ctx.enemies.get(g.enemy)?.boss)) err(where, `第 ${k + 1} 波標成頭目波，但沒有頭目`);
        return;
      }
      if (w.hp <= lastHp) err(where, `第 ${k + 1} 波的血量倍率 ${w.hp} 沒有比前一個非頭目波高`);
      lastHp = w.hp;
    });
  });

  return errors;
}
