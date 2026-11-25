// 玩家的操作：抽字、放字、賣卡。每個操作都回傳新的狀態。

import { pathIndex } from './board';
import { chapterOf, type Ctx } from './ctx';
import { refresh } from './refresh';
import { pickWeighted } from './rng';
import { baseStats, kindOf } from './stats';
import { HAND_SIZE, MAX_LEVEL, type Card, type CardKind, type Cell, type GameState, type Tower } from './types';

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
  for (const p of ch.parts) items.push({ kind: 'part', v: p, w: 0.5 });
  for (const t of ch.tools) items.push({ kind: 'tool', v: t, w: 0.25 });
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
  const pick = pickWeighted(n, drawPool(ctx, n), (i) => i.w)!;
  n.hand.push({ uid: n.nextId++, kind: pick.kind, v: pick.v, lv: 1 });
  return n;
}

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
  return '這張卡不能放在盤面上';
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

/** 部件合字等其他組合；M5 補上。 */
function combineExtra(_ctx: Ctx, s: GameState, _a: Card, _b: Card): GameState {
  return invalid(s, '這兩張卡不能疊');
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
