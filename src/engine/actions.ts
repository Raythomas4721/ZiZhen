// 玩家的操作：抽字、放字、賣卡。每個操作都回傳新的狀態。

import { pathIndex } from './board';
import { chapterOf, type Ctx } from './ctx';
import { refresh } from './refresh';
import { pickWeighted } from './rng';
import { baseStats, kindOf } from './stats';
import { HAND_SIZE, type Card, type CardKind, type GameState, type Tower } from './types';

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

/** 能不能把這張卡放到這一格（給介面預覽用）。 */
export function placeCheck(ctx: Ctx, s: GameState, card: Card, x: number, y: number): string | null {
  const here = towerAt(s, x, y);
  if (card.kind === 'char') {
    if (here) return '這格已經有字了';
    if (pathIndex(s.path, x, y) === 0) return '硯台上不能放字';
    if (pathIndex(s.path, x, y) >= 0 && kindOf(ctx, card.v) !== 'wall') return '只有屏障字（山、木、土、石……）能放在路上';
    return null;
  }
  return '這張卡不能放在盤面上';
}

export function place(ctx: Ctx, s: GameState, uid: number, x: number, y: number): GameState {
  const card = s.hand.find((h) => h.uid === uid);
  if (!card) return s;
  const why = placeCheck(ctx, s, card, x, y);
  if (why) return invalid(s, why);
  const n = edit(s);
  n.hand = n.hand.filter((h) => h.uid !== uid);
  n.towers.push(newTower(ctx, n, card.v, card.lv, x, y));
  refresh(ctx, n);
  return n;
}
