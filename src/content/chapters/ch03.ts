import type { ChapterDef } from '../../engine/types';

export const ch03: ChapterDef = {
  id: 'ch03',
  index: 3,
  title: '第三章',
  book: '溪口鄉志',
  intro: '記載溪口這個小地方的鄉志，地名、橋名、廟名一個一個寫得仔細。這次的墨妖會拿筆亂塗：被「塗改」塗黑的字會暫時失效，詞也會斷掉。',
  // 繞成一圈往裡走，書頁在正中間。
  waypoints: [
    { x: 0, y: 0 },
    { x: 5, y: 0 },
    { x: 5, y: 7 },
    { x: 1, y: 7 },
    { x: 1, y: 2 },
    { x: 3, y: 2 },
    { x: 3, y: 5 },
  ],
  waves: [
    { hp: 1.4, groups: [{ enemy: 'dot', count: 8, every: 1.8, delay: 1 }] },
    { hp: 1.5, groups: [{ enemy: 'dot', count: 8, every: 1.6, delay: 1 }, { enemy: 'tugai', count: 2, every: 5, delay: 6 }] },
    { hp: 1.6, groups: [{ enemy: 'dot', count: 10, every: 1.4, delay: 1 }, { enemy: 'blob', count: 3, every: 4, delay: 6 }] },
    { hp: 1.95, groups: [{ enemy: 'tugai', count: 4, every: 3, delay: 1 }, { enemy: 'feibai', count: 6, every: 1.2, delay: 4 }] },
    { hp: 1.7, boss: true, groups: [{ enemy: 'dot', count: 8, every: 1.4, delay: 1 }, { enemy: 'bigbrush', count: 1, every: 1, delay: 8 }] },
    { hp: 2.15, groups: [{ enemy: 'dot', count: 16, every: 0.9, delay: 1 }, { enemy: 'tugai', count: 3, every: 4, delay: 4 }, { enemy: 'blob', count: 3, every: 4, delay: 8 }] },
    { hp: 2.35, groups: [{ enemy: 'blob', count: 8, every: 2.4, delay: 1 }, { enemy: 'feibai', count: 8, every: 1.2, delay: 5 }] },
    { hp: 2.6, groups: [{ enemy: 'dot', count: 20, every: 0.8, delay: 1 }, { enemy: 'tugai', count: 5, every: 3, delay: 3 }] },
    { hp: 2.85, groups: [{ enemy: 'blob', count: 10, every: 2.2, delay: 1 }, { enemy: 'feibai', count: 10, every: 1.0, delay: 4 }, { enemy: 'tugai', count: 3, every: 5, delay: 8 }] },
    { hp: 2.45, boss: true, groups: [{ enemy: 'dot', count: 12, every: 1, delay: 1 }, { enemy: 'bigbrush', count: 1, every: 1, delay: 6 }, { enemy: 'scorch', count: 1, every: 1, delay: 16 }] },
  ],
  unlock: ['溪', '清', '石', '林', '日', '明', '月'],
  parts: ['氵', '青', '木', '日', '月'],
  tools: ['shovel', 'brush', 'weight'],
  startCoins: 60,
  rules: {
    startHand: [{ kind: 'tool', v: 'weight' }],
  },
  tips: {
    0: '開局送你一個「紙鎮」：拖到字上鎖住它，塗改就塗不黑。部件卡（虛線框）要兩張疊在一起才會變成字，例如「氵」疊「青」變「清」。',
    1: '塗改來了：牠會把附近的字塗黑三秒，被塗黑的字不攻擊，詞也會斷。',
    2: '「毛筆」可以把一個字換成同部首的另一個字，例如「水」換成「溪」，會自動挑能連成詞的那個。',
    3: '「日」「月」「明」是光環字：打得不重，但會讓旁邊的字射程變長。',
  },
  story: [
    '鄉志記載：溪口有一座小石橋，橋名的第二個字，在新版裡被換成了常用字。',
    '旁邊有人用鉛筆補了一行小字：「原本那個字，現在只剩阿嬤會寫。」',
    '那行字的筆跡，跟《蒙學》空白處的那個孩子一模一樣，只是大了很多。',
  ],
};
