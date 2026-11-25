import type { ChapterDef } from '../../engine/types';

export const ch05: ChapterDef = {
  id: 'ch05',
  index: 5,
  title: '第五章',
  book: '夜吟集',
  intro: '一本手抄的詩集，每首詩都寫在夜裡。這次墨妖裡混著「隱墨」：看不見、打不到，要靠日、月、星、燈這些光環字照出來；牠們走到離書頁很近時也會自己現形。詩集還藏著一個規矩：對仗。',
  // 兩段長長的橫路，中間各夾著兩排空格，剛好上下疊兩個詞
  waypoints: [
    { x: 0, y: 1 },
    { x: 5, y: 1 },
    { x: 5, y: 4 },
    { x: 1, y: 4 },
    { x: 1, y: 7 },
    { x: 6, y: 7 },
    { x: 6, y: 8 },
  ],
  waves: [
    { hp: 1.25, groups: [{ enemy: 'dot', count: 10, every: 1.6, delay: 1 }] },
    { hp: 1.45, groups: [{ enemy: 'dot', count: 8, every: 1.5, delay: 1 }, { enemy: 'yinmo', count: 3, every: 3, delay: 6 }] },
    { hp: 1.55, groups: [{ enemy: 'dot', count: 10, every: 1.2, delay: 1 }, { enemy: 'blob', count: 3, every: 4, delay: 5 }, { enemy: 'yinmo', count: 3, every: 3, delay: 9 }] },
    { hp: 2.0, groups: [{ enemy: 'yinmo', count: 8, every: 1.4, delay: 1 }, { enemy: 'cuozi', count: 3, every: 4, delay: 5 }] },
    { hp: 1.8, boss: true, groups: [{ enemy: 'dot', count: 10, every: 1.2, delay: 1 }, { enemy: 'nightink', count: 1, every: 1, delay: 8 }] },
    { hp: 2.1, groups: [{ enemy: 'dot', count: 18, every: 0.8, delay: 1 }, { enemy: 'yinmo', count: 6, every: 2, delay: 4 }, { enemy: 'tugai', count: 3, every: 4, delay: 8 }] },
    { hp: 2.7, groups: [{ enemy: 'blob', count: 9, every: 2.2, delay: 1 }, { enemy: 'feibai', count: 10, every: 1.0, delay: 5 }, { enemy: 'yinmo', count: 4, every: 2, delay: 9 }] },
    { hp: 3.05, groups: [{ enemy: 'yinmo', count: 14, every: 1.0, delay: 1 }, { enemy: 'cuozi', count: 4, every: 3, delay: 4 }] },
    { hp: 3.2, groups: [{ enemy: 'blob', count: 12, every: 1.9, delay: 1 }, { enemy: 'yinmo', count: 10, every: 1.2, delay: 4 }, { enemy: 'tugai', count: 4, every: 4, delay: 8 }] },
    { hp: 2.9, boss: true, groups: [{ enemy: 'dot', count: 14, every: 0.9, delay: 1 }, { enemy: 'nightink', count: 1, every: 1, delay: 6 }, { enemy: 'jumble', count: 1, every: 1, delay: 18 }] },
  ],
  unlock: ['星', '燈', '夜', '雪', '花', '江'],
  parts: ['氵', '青', '木', '日', '月'],
  tools: ['shovel', 'brush', 'weight'],
  startCoins: 60,
  rules: {
    startHand: [{ kind: 'tool', v: 'weight' }],
    couplets: true,
  },
  tips: {
    0: '對仗：兩個「同類」的詞上下疊在一起（兩橫排對齊），或左右並排（兩直排對齊），四個字都會變強。例如「明月」疊在「清風」上面，都是寫天上的。沒排出對仗也能過關。',
    1: '隱墨來了：看不見也打不到。日、月、星、燈、明、夜、風這些光環字的射程內才照得出來；牠們走到離書頁剩六格時也會現形。',
    3: '這一波幾乎都是隱墨，記得在路邊多放幾個光環字。',
    4: '頭目「夜墨」也是隱形的。',
  },
  story: [
    '詩集最後一首沒寫完：上聯寫好了，下聯空著。',
    '上聯最後一個字，就是新版字典刪掉的那個字，也是那家人的姓。',
    '空白處有兩種筆跡。先生寫：「可惜。」孩子寫：「不可惜，我會記得。」',
  ],
};
