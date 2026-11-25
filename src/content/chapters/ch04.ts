import type { ChapterDef } from '../../engine/types';

export const ch04: ChapterDef = {
  id: 'ch04',
  index: 4,
  title: '第四章',
  book: '寄不出的家書',
  intro: '一疊用麻繩綁著的信，信封上都蓋著「查無此人」。這次墨妖裡混進了「錯字」：牠會把詞裡的兩個字對調。好消息是，這章第一次能排出四個字的成語。',
  // 來回四趟的長路，中間每一排都夾在兩條路之間，適合排成語。
  waypoints: [
    { x: 6, y: 0 },
    { x: 0, y: 0 },
    { x: 0, y: 2 },
    { x: 5, y: 2 },
    { x: 5, y: 4 },
    { x: 0, y: 4 },
    { x: 0, y: 6 },
    { x: 5, y: 6 },
    { x: 5, y: 8 },
  ],
  waves: [
    { hp: 1.2, groups: [{ enemy: 'dot', count: 10, every: 1.6, delay: 1 }] },
    { hp: 1.5, groups: [{ enemy: 'dot', count: 10, every: 1.4, delay: 1 }, { enemy: 'cuozi', count: 2, every: 5, delay: 6 }] },
    { hp: 2.0, groups: [{ enemy: 'dot', count: 10, every: 1.2, delay: 1 }, { enemy: 'blob', count: 3, every: 4, delay: 5 }, { enemy: 'cuozi', count: 2, every: 6, delay: 8 }] },
    { hp: 2.8, groups: [{ enemy: 'feibai', count: 10, every: 1.0, delay: 1 }, { enemy: 'tugai', count: 3, every: 4, delay: 4 }] },
    { hp: 2.5, boss: true, groups: [{ enemy: 'dot', count: 10, every: 1.2, delay: 1 }, { enemy: 'jumble', count: 1, every: 1, delay: 8 }] },
    { hp: 3.9, groups: [{ enemy: 'dot', count: 18, every: 0.8, delay: 1 }, { enemy: 'cuozi', count: 4, every: 3, delay: 4 }, { enemy: 'blob', count: 3, every: 4, delay: 8 }] },
    { hp: 4.5, groups: [{ enemy: 'blob', count: 9, every: 2.2, delay: 1 }, { enemy: 'feibai', count: 10, every: 1.0, delay: 5 }] },
    { hp: 5.1, groups: [{ enemy: 'dot', count: 22, every: 0.7, delay: 1 }, { enemy: 'tugai', count: 4, every: 3, delay: 3 }, { enemy: 'cuozi', count: 4, every: 3, delay: 6 }] },
    { hp: 5.6, groups: [{ enemy: 'blob', count: 12, every: 1.9, delay: 1 }, { enemy: 'feibai', count: 12, every: 0.9, delay: 4 }, { enemy: 'cuozi', count: 4, every: 4, delay: 8 }] },
    { hp: 4.7, boss: true, groups: [{ enemy: 'dot', count: 14, every: 0.9, delay: 1 }, { enemy: 'jumble', count: 1, every: 1, delay: 6 }, { enemy: 'bigbrush', count: 1, every: 1, delay: 18 }] },
  ],
  unlock: ['海', '雨', '風', '千', '萬'],
  parts: ['氵', '青', '木', '日', '月'],
  tools: ['shovel', 'brush', 'weight'],
  startCoins: 60,
  rules: {
    startHand: [{ kind: 'tool', v: 'weight' }],
    idiomHint: true,
  },
  tips: {
    0: '成語：把一句成語的四個字橫排由左到右（或直排由上到下）連著放，就會開始集氣，集滿後按下面的按鈕放大招。這章的書箱裡有哪幾句，下面都列出來了。',
    1: '錯字來了：牠會把附近一個詞的兩個字對調，詞就斷了。五秒後會自己換回來；用紙鎮鎖住的字不會被換。',
    3: '大招集滿了不用急著放，留給墨妖最多、或頭目快到書頁的時候。',
    4: '頭目「顛倒」換字換得更兇，記得先鎖住成語裡的字。',
  },
  story: [
    '最上面那封家書，是寄給書院先生的。信封上蓋著「查無此人」。',
    '郵局的人在背面寫：收信人名字裡有一個字，新版字典裡沒有了，打字機打不出來。',
    '信紙最後一行寫著：「先生，那個字，我還記得怎麼寫。」',
  ],
};
