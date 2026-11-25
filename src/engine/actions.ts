// 玩家的操作：抽字、放字、賣卡。每個操作都回傳新的狀態。

import { pathIndex } from './board';
import { chapterOf, unlockedChars, type Ctx } from './ctx';
import { refresh } from './refresh';
import { pickWeighted } from './rng';
import { baseStats, kindOf } from './stats';
import { findWords, partnersOf } from './words';
import { HAND_SIZE, MAX_LEVEL, type Card, type CardKind, type Cell, type GameState, type ToolId, type Tower } from './types';

export function drawCost(s: GameState): number {
  return 8 + 3 * s.drawsThisWave;
}

function invalid(s: GameState, reason: string): GameState {
  return { ...s, events: [{ t: 'invalid', reason }] };
}

/** 給操作用的草稿。 */
function edit(s: GameState): GameState {
  return { ...s, towers: s.towers.map((t) => ({ ...t })), hand: [...s.hand], found: [...s.found], events: [] };
}

interface PoolItem {
  kind: CardKind;
  v: string;
  w: number;
}

export function drawPool(ctx: Ctx, s: GameState): PoolItem[] {
  const ch = chapterOf(ctx, s.chapter);
  const items: PoolItem[] = s.box.map((v) => ({ kind: 'char', v, w: 1 }));
  for (const p of ch.parts) items.push({ kind: 'part', v: p, w: 0.35 });
  for (const t of ch.tools) items.push({ kind: 'tool', v: t, w: 0.2 });
  return items;
}

export function canDraw(s: GameState): boolean {
  return s.phase !== 'done' && s.hand.length < HAND_SIZE && s.coins >= drawCost(s);
}

export function draw(ctx: Ctx, s: GameState): GameState {
  if (s.phase === 'done') return invalid(s, '這本書已經守完了');
  if (s.hand.length >= HAND_SIZE) return invalid(s, '手牌滿了');
  const cost = drawCost(s);
  if (s.coins < cost) return invalid(s, '文錢不夠');
  const n = edit(s);
  n.coins -= cost;
  n.drawsThisWave++;
  // 保底：連續三張都湊不出詞，下一張一定抽到能跟盤面或手上的字湊詞的字。
  const onTable = [...n.towers.map((t) => t.ch), ...n.hand.filter((h) => h.kind === 'char').map((h) => h.v)];
  const useful = (v: string) => partnersOf(ctx, v, onTable).length > 0;
  let pool = drawPool(ctx, n);
  const attacks = (v: string) => kindOf(ctx, v) !== 'support';
  if (!onTable.some(attacks)) {
    // 保底：盤面和手上都沒有會攻擊的字時，一定抽到會攻擊的字
    const fighters = pool.filter((p) => p.kind === 'char' && attacks(p.v));
    if (fighters.length) pool = fighters;
  } else if (n.drawsSinceUseful >= GUARANTEE_AFTER && onTable.length > 0) {
    const helpful = pool.filter((p) => p.kind === 'char' && useful(p.v));
    if (helpful.length) pool = helpful;
  }
  const pick = pickWeighted(n, pool, (i) => i.w)!;
  n.drawsSinceUseful = pick.kind === 'char' && useful(pick.v) ? 0 : n.drawsSinceUseful + 1;
  n.hand.push({ uid: n.nextId++, kind: pick.kind, v: pick.v, lv: 1 });
  return n;
}

export const GUARANTEE_AFTER = 3;

export function sellValue(c: Card): number {
  return c.kind === 'char' ? 4 * c.lv : 3;
}

export function sell(s: GameState, uid: number): GameState {
  const c = s.hand.find((h) => h.uid === uid);
  if (!c) return s;
  const n = edit(s);
  n.hand = n.hand.filter((h) => h.uid !== uid);
  n.coins += sellValue(c);
  return n;
}

export function towerAt(s: GameState, x: number, y: number): Tower | undefined {
  return s.towers.find((t) => t.x === x && t.y === y);
}

export function newTower(ctx: Ctx, s: GameState, ch: string, lv: number, x: number, y: number): Tower {
  const onPath = pathIndex(s.path, x, y) >= 0;
  const stats = baseStats(ctx, ch, lv);
  return { id: s.nextId++, ch, lv, x, y, onPath, cool: 0, inked: 0, locked: false, block: onPath ? stats.blockMax : 0, stats };
}

export function canMerge(a: { ch: string; lv: number }, b: { ch: string; lv: number }): boolean {
  return a.ch === b.ch && a.lv === b.lv && a.lv < MAX_LEVEL;
}

/** 能不能把這張卡放到這一格（給介面預覽用）。回傳 null 代表可以。 */
export function placeCheck(ctx: Ctx, s: GameState, card: Card, x: number, y: number): string | null {
  const here = towerAt(s, x, y);
  if (card.kind === 'char') {
    if (here) {
      if (canMerge({ ch: card.v, lv: card.lv }, here)) return null;
      if (here.ch === card.v && here.lv >= MAX_LEVEL) return '已經是最高級了';
      if (here.ch === card.v) return '等級不同，不能合成';
      return '這格已經有字了';
    }
    const k = pathIndex(s.path, x, y);
    if (k === 0) return '硯台上不能放字';
    if (k >= 0 && kindOf(ctx, card.v) !== 'wall') return '只有屏障字（山、木、石……）能放在路上';
    return null;
  }
  if (card.kind === 'tool') return here ? toolCheck(ctx, s, card.v as ToolId, here) : '工具要拖到盤面上的字';
  return '部件要先跟另一個部件疊成字';
}

function levelUp(ctx: Ctx, n: GameState, t: Tower) {
  t.lv++;
  if (t.onPath) t.block = baseStats(ctx, t.ch, t.lv).blockMax * 10; // 先給滿，refresh 會壓回上限
  n.events.push({ t: 'merge', x: t.x, y: t.y, lv: t.lv });
}

export function place(ctx: Ctx, s: GameState, uid: number, x: number, y: number): GameState {
  const card = s.hand.find((h) => h.uid === uid);
  if (!card) return s;
  const why = placeCheck(ctx, s, card, x, y);
  if (why) return invalid(s, why);
  if (card.kind === 'tool') return useTool(ctx, s, uid, x, y);
  const n = edit(s);
  n.hand = n.hand.filter((h) => h.uid !== uid);
  const here = towerAt(n, x, y);
  if (here) levelUp(ctx, n, here);
  else n.towers.push(newTower(ctx, n, card.v, card.lv, x, y));
  refresh(ctx, n);
  return n;
}

/** 手上的卡疊到另一張卡上：同字同級就升級。 */
export function combine(ctx: Ctx, s: GameState, fromUid: number, toUid: number): GameState {
  if (fromUid === toUid) return s;
  const a = s.hand.find((h) => h.uid === fromUid);
  const b = s.hand.find((h) => h.uid === toUid);
  if (!a || !b) return s;
  if (a.kind === 'char' && b.kind === 'char') {
    if (!canMerge({ ch: a.v, lv: a.lv }, { ch: b.v, lv: b.lv })) {
      return invalid(s, a.v === b.v ? '等級不同，不能合成' : '不同的字不能疊');
    }
    const n = edit(s);
    n.hand = n.hand.filter((h) => h.uid !== fromUid).map((h) => (h.uid === toUid ? { ...h, lv: h.lv + 1 } : h));
    return n;
  }
  return combineExtra(ctx, s, a, b);
}

export function recipeFor(ctx: Ctx, a: string, b: string): string | undefined {
  return ctx.recipes.find((r) => (r.a === a && r.b === b) || (r.a === b && r.b === a))?.out;
}

/** 部件疊部件：照配方合成一個字（放在被疊的那張卡的位置）。 */
function combineExtra(ctx: Ctx, s: GameState, a: Card, b: Card): GameState {
  if (a.kind === 'part' && b.kind === 'part') {
    const out = recipeFor(ctx, a.v, b.v);
    if (!out) return invalid(s, `${a.v}＋${b.v} 合不成字`);
    const n = edit(s);
    n.hand = n.hand.filter((h) => h.uid !== a.uid).map((h) => (h.uid === b.uid ? { uid: h.uid, kind: 'char', v: out, lv: 1 } : h));
    n.events.push({ t: 'compose', a: a.v, b: b.v, out });
    return n;
  }
  if (a.kind === 'part' || b.kind === 'part') return invalid(s, '部件只能跟部件疊');
  return invalid(s, '工具要拖到盤面上的字');
}

/** 把盤面上的字拖到另一個同字同級的字上合成。 */
export function moveTower(ctx: Ctx, s: GameState, from: Cell, to: Cell): GameState {
  if (from.x === to.x && from.y === to.y) return s;
  const a = towerAt(s, from.x, from.y);
  const b = towerAt(s, to.x, to.y);
  if (!a) return s;
  if (!b) return invalid(s, '要挪位置得用鏟子');
  if (!canMerge(a, b)) return invalid(s, a.ch === b.ch ? (b.lv >= MAX_LEVEL ? '已經是最高級了' : '等級不同，不能合成') : '不同的字不能疊');
  const n = edit(s);
  n.towers = n.towers.filter((t) => t.id !== a.id);
  levelUp(ctx, n, towerAt(n, to.x, to.y)!);
  refresh(ctx, n);
  return n;
}

/** 毛筆：同部首、這章拿得到、而且不是自己的字。 */
export function brushOptions(ctx: Ctx, s: GameState, t: Tower): string[] {
  const rad = ctx.chars.get(t.ch)?.radical;
  return unlockedChars(ctx, s.chapter).filter((c) => c !== t.ch && ctx.chars.get(c)?.radical === rad);
}

function toolCheck(ctx: Ctx, s: GameState, tool: ToolId, t: Tower): string | null {
  if (tool === 'weight' && t.locked) return '這個字已經鎖住了';
  if (tool === 'brush' && brushOptions(ctx, s, t).length === 0) return `「${t.ch}」沒有同部首的字可以換`;
  if (tool === 'brush' && t.onPath) return '路上的屏障不能換字';
  return null;
}

/** 工具卡拖到盤面上的字。 */
export function useTool(ctx: Ctx, s: GameState, uid: number, x: number, y: number): GameState {
  const card = s.hand.find((h) => h.uid === uid);
  const here = towerAt(s, x, y);
  if (!card || card.kind !== 'tool') return s;
  if (!here) return invalid(s, '工具要拖到盤面上的字');
  const tool = card.v as ToolId;
  const why = toolCheck(ctx, s, tool, here);
  if (why) return invalid(s, why);
  const n = edit(s);
  n.hand = n.hand.filter((h) => h.uid !== uid);
  const t = towerAt(n, x, y)!;
  if (tool === 'shovel') {
    // 收回手上；手一定有空位，因為工具卡剛用掉
    n.towers = n.towers.filter((o) => o.id !== t.id);
    n.hand.push({ uid: n.nextId++, kind: 'char', v: t.ch, lv: t.lv });
  } else if (tool === 'weight') {
    t.locked = true;
    t.inked = 0;
  } else if (tool === 'brush') {
    // 換成能連最多詞的同部首字
    const opts = brushOptions(ctx, n, t);
    let best = opts[0];
    let bestWords = -1;
    for (const o of opts) {
      const trial = n.towers.map((x) => (x.id === t.id ? { ...x, ch: o } : x));
      const w = findWords(ctx, trial).length;
      if (w > bestWords) {
        bestWords = w;
        best = o;
      }
    }
    t.ch = best;
  }
  refresh(ctx, n);
  return n;
}
