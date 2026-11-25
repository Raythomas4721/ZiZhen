// 新手教學：第一章第一波開打前，一步一步教放字、連詞（橫排、直排）、一字多詞、合成。
// 每一步可以送卡、在盤面上亮出建議的格子；有完成條件的步驟，做到了就自動往下。

import { towerAt } from '../engine/actions';
import { inBounds, pathIndex } from '../engine/board';
import type { CardKind, Cell, GameState } from '../engine/types';

export interface TutorialStep {
  text: string;
  /** 進到這一步時送的卡。 */
  give?: { kind: CardKind; v: string; lv?: number }[];
  /** 建議放的格子（依目前盤面算，找不到就不亮）。 */
  guide?: (s: GameState) => Cell[];
  /** 完成條件；沒有的話要按「下一步」。 */
  done?: (s: GameState) => boolean;
  /** 「下一步」按鈕上的字。 */
  next?: string;
}

function free(s: GameState, x: number, y: number): boolean {
  return inBounds(x, y) && pathIndex(s.path, x, y) < 0 && !towerAt(s, x, y);
}

function firstTower(s: GameState, ch: string) {
  return s.towers.find((t) => t.ch === ch);
}

/** 某個字旁邊的格子（dx、dy 是方向），空著才回傳。 */
function beside(s: GameState, ch: string, dx: number, dy: number): Cell[] {
  const t = firstTower(s, ch);
  if (!t) return [];
  return free(s, t.x + dx, t.y + dy) ? [{ x: t.x + dx, y: t.y + dy }] : [];
}

const hasWord = (s: GameState, w: string) => s.words.some((x) => x.w === w);

/** 第一章的教學。建議的格子都在右邊那一欄附近：左邊和下面都是空地，剛好示範橫排和直排。 */
export const WORD_TUTORIAL: TutorialStep[] = [
  {
    text: '先學這個遊戲最重要的一件事：字放在一起，會連成「詞」。這一關先送你幾張字。',
    next: '好',
  },
  {
    text: '把「山」拖到亮起來的格子。（也可以先點一下卡，再點格子。）',
    give: [{ kind: 'char', v: '山' }],
    guide: (s) => (free(s, 6, 3) ? [{ x: 6, y: 3 }] : []),
    done: (s) => !!firstTower(s, '山'),
  },
  {
    text: '再把「火」放在「山」的左邊。橫排要由左讀到右：「火山」是詞，「山火」就不算。',
    give: [{ kind: 'char', v: '火' }],
    guide: (s) => beside(s, '山', -1, 0),
    done: (s) => hasWord(s, '火山'),
  },
  {
    text: '連成「火山」了！紅色的條就是詞。兩個字都會變強：這個詞讓傷害變高、濺得更遠。每個詞的效果都不一樣。',
    next: '下一步',
  },
  {
    text: '直排也算，要由上讀到下。把「水」放在「山」的下面，連成「山水」。',
    give: [{ kind: 'char', v: '水' }],
    guide: (s) => beside(s, '山', 0, 1),
    done: (s) => hasWord(s, '山水'),
  },
  {
    text: '「山」現在同時在「火山」和「山水」兩個詞裡，兩個詞的加成都拿得到。點一下盤面上的字，下面會列出它在哪些詞裡、數值多少。',
    next: '下一步',
  },
  {
    text: '兩張一樣的字疊在一起會升級。把一張「木」拖到另一張「木」上。',
    give: [
      { kind: 'char', v: '木' },
      { kind: 'char', v: '木' },
    ],
    done: (s) => s.hand.some((h) => h.v === '木' && h.lv >= 2) || s.towers.some((t) => t.ch === '木' && t.lv >= 2),
  },
  {
    text: '升到 2 級了！「山」「木」這種屏障字還能直接放在路上擋墨妖。把「木」放到路上，或放在「水」旁邊試試看。',
    done: (s) => !!firstTower(s, '木'),
  },
  {
    text: '準備好了。按「開始第 1 波」，墨妖走進字的射程就會被打。之後要自己按「抽字」（越抽越貴），排字、湊詞，守住書頁。忘記規則的話，書架上有「怎麼玩」。',
    next: '知道了',
  },
];
