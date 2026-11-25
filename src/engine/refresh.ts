// 盤面一變（放字、合成、拆字、屏障被啃穿），就重算詞和每座字塔的數值。

import type { Ctx } from './ctx';
import { baseStats, kindOf, LIGHT_RANGE, SUPPORT_RATE } from './stats';
import type { GameState, Tower } from './types';
import { chapterOf } from './ctx';
import { checkArchive } from './finale';
import { findCouplets, findIdioms, findWords } from './words';

function neighbors(towers: Tower[], t: Tower): Tower[] {
  return towers.filter((o) => o !== t && Math.abs(o.x - t.x) <= 1 && Math.abs(o.y - t.y) <= 1);
}

/** 在草稿狀態上重算；回傳這次新發現的詞。 */
export function refresh(ctx: Ctx, s: GameState): string[] {
  const before = new Set([...s.words.map((w) => w.w), ...s.idioms.map((w) => w.w)]);
  s.words = findWords(ctx, s.towers);
  s.idioms = findIdioms(ctx, s.towers);
  const beforeCouplets = new Set(s.couplets.map((c) => c.a + c.b));
  s.couplets = chapterOf(ctx, s.chapter).rules?.couplets ? findCouplets(ctx, s.words) : [];
  const inCouplet = new Set(s.couplets.flatMap((c) => c.cells.map((p) => `${p.x},${p.y}`)));

  for (const t of s.towers) {
    const st = baseStats(ctx, t.ch, t.lv);
    let rate = 0;
    for (const w of s.words) {
      const member = (w.a.x === t.x && w.a.y === t.y) || (w.b.x === t.x && w.b.y === t.y);
      if (!member) continue;
      const def = ctx.words.get(w.w);
      if (!def) continue;
      const e = def.effect;
      if (e.dmg) st.dmg *= 1 + e.dmg;
      if (e.range && st.range > 0) st.range += e.range;
      if (e.rate) rate += e.rate;
      if (e.splash) st.splash += e.splash;
      if (e.burn) st.burn += e.burn;
      if (e.slow) {
        st.slow = st.slow > 0 ? Math.max(0.15, st.slow - e.slow) : Math.max(0.15, 1 - e.slow);
        st.slowTicks = Math.max(st.slowTicks, 30);
      }
      if (e.freeze) st.freeze += e.freeze;
      if (e.crit) st.crit += e.crit;
      if (e.block) st.blockMax *= 1 + e.block;
    }
    for (const o of neighbors(s.towers, t)) {
      if (o.inked > 0) continue;
      const k = kindOf(ctx, o.ch);
      if (k === 'support') rate += SUPPORT_RATE * (1 + 0.25 * (o.lv - 1));
      if (k === 'light' && st.range > 0) st.range += LIGHT_RANGE + 0.05 * (o.lv - 1);
    }
    if (inCouplet.has(`${t.x},${t.y}`)) {
      st.dmg *= 1 + COUPLET_DMG;
      rate += COUPLET_RATE;
    }
    st.cd = st.cd / (1 + rate);
    // 不在路上的屏障字不擋路
    if (!t.onPath) st.blockMax = 0;
    t.stats = st;
    if (t.onPath) t.block = Math.min(t.block, st.blockMax);
  }

  const fresh: string[] = [];
  for (const w of [...s.words, ...s.idioms]) {
    if (!before.has(w.w)) {
      const isNew = !s.found.includes(w.w);
      if (isNew) {
        s.found.push(w.w);
        fresh.push(w.w);
      }
      s.events.push({ t: 'word', w: w.w, fresh: isNew });
    }
  }
  for (const c of s.couplets) {
    const key = c.a + c.b;
    if (beforeCouplets.has(key)) continue;
    // 對仗不記進字典本，只在剛排出來時提示
    s.events.push({ t: 'couplet', a: c.a, b: c.b, fresh: true });
  }
  checkArchive(ctx, s);
  return fresh;
}

/** 對仗的加成：四個字傷害和攻速都提高。 */
export const COUPLET_DMG = 0.3;
export const COUPLET_RATE = 0.2;
