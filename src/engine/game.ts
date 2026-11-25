// 一局遊戲：建立、開波、每個 tick 往前推。全部是純函式，回傳新的狀態。

import { expandPath, pathEnd, positionAt } from './board';
import { limitByBlockers, runCombat } from './combat';
import { chapterOf, type Ctx } from './ctx';
import { chargeIdioms, restoreSwaps, tickSwaps } from './idioms';
import { PAGE_HP, TICK_RATE, type Enemy, type GameState, type Spawn, type WaveDef } from './types';

export interface NewGameOptions {
  chapter: string;
  seed: number;
  /** 書箱；教學章會用固定書箱。 */
  box?: string[];
}

export function createGame(ctx: Ctx, opts: NewGameOptions): GameState {
  const ch = chapterOf(ctx, opts.chapter);
  const box = ch.fixedBox ?? opts.box ?? ch.unlock;
  const s: GameState = {
    chapter: ch.id,
    seed: opts.seed,
    rng: opts.seed | 0,
    tick: 0,
    phase: 'prep',
    wave: 0,
    waveTick: 0,
    spawns: [],
    path: expandPath(ch.waypoints),
    enemies: [],
    towers: [],
    words: [],
    idioms: [],
    couplets: [],
    charge: {},
    swaps: [],
    shield: 0,
    hand: [],
    box: [...box],
    coins: ch.startCoins,
    drawsThisWave: 0,
    drawsSinceUseful: 0,
    pageHp: PAGE_HP,
    results: [],
    lostStreak: 0,
    assist: 1,
    found: [],
    nextId: 1,
    events: [],
  };
  for (const c of ch.rules?.startHand ?? []) {
    s.hand.push({ uid: s.nextId++, kind: c.kind, v: c.v, lv: 1 });
  }
  return s;
}

export function buildSpawns(wave: WaveDef): Spawn[] {
  const out: Spawn[] = [];
  for (const g of wave.groups) {
    for (let i = 0; i < g.count; i++) {
      out.push({ at: Math.round((g.delay + g.every * i) * TICK_RATE) + 1, enemy: g.enemy });
    }
  }
  return out.sort((a, b) => a.at - b.at);
}

export function startWave(ctx: Ctx, s: GameState): GameState {
  if (s.phase !== 'prep') return s;
  const ch = chapterOf(ctx, s.chapter);
  const wave = ch.waves[s.wave];
  return { ...s, phase: 'wave', waveTick: 0, spawns: buildSpawns(wave), events: [] };
}

/** 給 step 用的草稿：會被改到的物件都先複製。 */
export function draft(s: GameState): GameState {
  return {
    ...s,
    enemies: s.enemies.map((e) => ({ ...e })),
    towers: s.towers.map((t) => ({ ...t })),
    hand: [...s.hand],
    spawns: [...s.spawns],
    results: [...s.results],
    found: [...s.found],
    events: [],
  };
}

export function step(ctx: Ctx, s: GameState): GameState {
  if (s.phase !== 'wave') return s.events.length ? { ...s, events: [] } : s;
  const n = draft(s);
  const ch = chapterOf(ctx, n.chapter);
  const wave = ch.waves[n.wave];
  n.tick++;
  n.waveTick++;

  // 出怪
  while (n.spawns.length && n.spawns[0].at <= n.waveTick) {
    const sp = n.spawns.shift()!;
    const def = ctx.enemies.get(sp.enemy)!;
    const hp = Math.round(def.hp * wave.hp * n.assist);
    n.enemies.push({
      id: n.nextId++,
      def: def.id,
      hp,
      maxHp: hp,
      d: -0.5,
      slowMul: 1,
      slowLeft: 0,
      frozen: 0,
      burnDps: 0,
      burnLeft: 0,
      inkCool: TICK_RATE * 2,
      seen: !def.hidden,
    });
  }

  // 走路
  const end = pathEnd(n.path);
  for (const e of n.enemies) {
    const def = ctx.enemies.get(e.def)!;
    if (e.frozen > 0) {
      e.frozen--;
      continue;
    }
    const mul = e.slowLeft > 0 ? e.slowMul : 1;
    if (e.slowLeft > 0) e.slowLeft--;
    let stepLen = (def.speed * mul) / TICK_RATE;
    stepLen = limitByBlockers(ctx, n, e, stepLen);
    e.d += stepLen;
  }

  // 啃到書頁
  const kept: Enemy[] = [];
  for (const e of n.enemies) {
    if (e.d >= end) {
      const def = ctx.enemies.get(e.def)!;
      const dmg = n.shield > 0 ? 0 : def.leak;
      n.pageHp -= dmg;
      n.events.push({ t: 'leak', dmg });
    } else kept.push(e);
  }
  n.enemies = kept;

  runCombat(ctx, n);
  tickSwaps(ctx, n);
  chargeIdioms(ctx, n);
  if (n.shield > 0) n.shield--;

  return checkWaveEnd(ctx, n);
}

function checkWaveEnd(ctx: Ctx, n: GameState): GameState {
  const ch = chapterOf(ctx, n.chapter);
  const lost = n.pageHp <= 0;
  const cleared = n.spawns.length === 0 && n.enemies.length === 0;
  if (!lost && !cleared) return n;
  const held = !lost;
  const bonus = held ? 15 + 3 * n.wave : 10;
  n.results.push(held ? 'held' : 'lost');
  n.coins += bonus;
  n.lostStreak = held ? 0 : n.lostStreak + 1;
  // 連續兩波沒守住，下一波悄悄變弱；守住就恢復。
  n.assist = n.lostStreak >= 2 ? 0.85 : 1;
  n.events.push({ t: 'waveEnd', held, bonus });
  restoreSwaps(ctx, n);
  n.enemies = [];
  n.spawns = [];
  n.pageHp = PAGE_HP;
  n.shield = 0;
  n.wave++;
  n.waveTick = 0;
  n.drawsThisWave = 0;
  n.phase = n.wave >= ch.waves.length ? 'done' : 'prep';
  return n;
}

export function starsOf(results: ('held' | 'lost')[]): number {
  const lost = results.filter((r) => r === 'lost').length;
  if (lost === 0) return 3;
  if (lost <= 2) return 2;
  return 1;
}

export function enemyPos(s: GameState, e: Enemy) {
  return positionAt(s.path, e.d);
}
