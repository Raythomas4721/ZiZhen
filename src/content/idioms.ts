import type { IdiomDef } from '../engine/types';

// 成語：四個字橫排（左到右）或直排（上到下）連成一線，開始集氣，集滿可以放全場大招。
export const idioms: IdiomDef[] = [
  { w: '刀山火海', effect: { kind: 'blast', frac: 0.35, burnSec: 3 }, charge: 25, note: '四面都是刀和火：全場重傷，再燒三秒。' },
  { w: '千山萬水', effect: { kind: 'push', cells: 4 }, charge: 22, note: '隔著千山萬水：全場墨妖被推回四格。' },
  { w: '風花雪月', effect: { kind: 'shield', heal: 4, sec: 6 }, charge: 24, note: '風花雪月，一片安靜：書頁回 4 點，六秒內不會被啃。' },
  { w: '明月清風', effect: { kind: 'freeze', sec: 3 }, charge: 20, note: '清風一吹，月光一照：全場凍住三秒。' },
];
