// 終章：頭目「無名」不會被打死。沒血（或走到書頁）時，牠變成一張字卡回到玩家手上；
// 把這個字放進盤面、連成詞，就算把它收進字典：這一波的墨妖全部散去，故事收尾。

import { chapterOf, type Ctx } from './ctx';
import { TICK_RATE, type EnemyDef, type GameState } from './types';
import { partnersOf } from './words';

/** 字卡到手以後，這一波最多再等幾秒讓玩家放字。 */
export const FINALE_WAIT = 30;

/**
 * 頭目變成字卡。手牌滿了也照樣給（可以多一張）。
 * 退路：同時送一張能跟它湊詞的搭檔字（優先挑書箱裡有的），只要盤面還有兩格空位就一定連得成。
 */
export function becomeCard(ctx: Ctx, n: GameState, def: EnemyDef) {
  if (!def.becomes) return;
  if (n.hand.some((h) => h.kind === 'char' && h.v === def.becomes) || n.towers.some((t) => t.ch === def.becomes)) return;
  const partners = partnersOf(ctx, def.becomes, ctx.chars.keys());
  const partner = partners.find((c) => n.box.includes(c)) ?? partners[0];
  n.hand = [...n.hand, { uid: n.nextId++, kind: 'char', v: def.becomes, lv: 1 }];
  if (partner) n.hand.push({ uid: n.nextId++, kind: 'char', v: partner, lv: 1 });
  n.events.push({ t: 'becomeCard', ch: def.becomes });
  n.finaleWait = FINALE_WAIT * TICK_RATE;
}

/** 盤面上出現含有終章字的詞時，收進字典。 */
export function checkArchive(ctx: Ctx, s: GameState) {
  if (s.archived || s.phase !== 'wave') return;
  const fin = chapterOf(ctx, s.chapter).rules?.finale;
  if (!fin) return;
  const hit = [...s.words, ...s.idioms].find((w) => w.w.includes(fin.char));
  if (!hit) return;
  s.archived = true;
  s.events.push({ t: 'archived', w: hit.w });
  // 被遺忘的字回到書裡，墨妖就不再啃了
  s.enemies = [];
  s.spawns = [];
  s.finaleWait = 0;
}
